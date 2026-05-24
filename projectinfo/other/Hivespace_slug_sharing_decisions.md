# Hivespace — Slug & Sharing Architecture Decisions

> Internal Architecture Document | For Team Review
> Covers decisions made during schema and product design review

---

## Table of Contents

1. [Slug Strategy](#1-slug-strategy)
2. [Sharing Architecture](#2-sharing-architecture)
3. [Internal Visibility — What We Don't Need](#3-internal-visibility--what-we-dont-need)
4. [Schema Changes Required](#4-schema-changes-required)
5. [Decision Summary](#5-decision-summary)

---

## 1. Slug Strategy

### 1.1 What a Slug Is

When a user creates an organization, a unique human-readable identifier (slug) is generated alongside the UUID. This slug appears in all external-facing URLs.

Example invite link with slug:
```
hivespace.com/invite/acmecorp/abc123
```
vs without:
```
hivespace.com/invite/abc123
```

The `tenants` table already has the `slug` column — the foundation is in place.

### 1.2 Advantages of Org-Level Slugs

**Human readability and trust.** `hivespace.com/invite/acmecorp/abc123` immediately tells the recipient which company they're being invited to before they click. This is especially valuable for invite links and stakeholder sharing — external users feel confident they're landing in the right place.

**Brand presence.** Organizations feel like a first-class product when their name is in the URL. This matters in B2B SaaS where the product is frequently demoed to decision-makers.

**Phishing resistance (partial).** A slug makes it harder to spoof invite links for a different org — the slug must also match. The token is still the real security layer, but the slug adds a visible identity check.

**Debugging and support.** `acmecorp/abc123` is far easier to reason about in logs and support tickets than a raw UUID. Your team will appreciate this during incident response.

**Shareability.** Stakeholder progress links become more meaningful:
```
hivespace.com/share/acmecorp/progress/{token}
```
The slug communicates context to the external stakeholder opening it.

### 1.3 Disadvantages of Org-Level Slugs

**Slug changes are painful.** If a company rebrands from `acmecorp` to `nova`, every existing URL breaks — invite links embedded in emails, bookmarked URLs, Slack messages, documentation. You'd need either permanent redirects from old slugs, a slug history table, or a strict immutability policy.

**Collision and squatting.** Common names like `engineering`, `dev`, `admin`, `api`, `app`, `support` will be grabbed early and unavailable to others. A blocklist of reserved slugs is mandatory.

**Extra validation on every request.** Every URL-facing endpoint must resolve the slug to a `tenant UUID` and verify it matches before serving. This is an extra lookup on every request — mitigated by caching slug-to-UUID resolution in Upstash Redis.

**Auto-generation quality.** "Acme Corp & Partners" auto-generates to something ugly. You need generation logic, uniqueness checks, and a manual override flow at org creation.

**Security theater on tokens.** For invite links, the slug adds almost no real security since the token is already cryptographically random and validated server-side. It's a UX improvement, not a security one.

### 1.4 Decision — Org Slugs

**Build it in Phase 1. The schema already has the column.**

The cost of using slugs now is low — one generation function, one uniqueness check, one Redis cache entry. The cost of retrofitting after URLs have been shared and embedded everywhere is high.

**Implementation rules:**

- Slugs are **immutable after creation** — no rename allowed (simplest policy; avoids redirect infrastructure)
- Allow manual override at org creation time with a sensible auto-generated default
- Maintain a **blocklist** of reserved words covering your own route namespaces: `api`, `app`, `auth`, `invite`, `share`, `admin`, `billing`, `settings`, `health`, `static`, `support`, `www`
- Cache slug → UUID resolution in Upstash Redis to avoid a DB lookup on every request
- Treat the slug as **display-only in URLs** — UUID remains the canonical primary key internally

### 1.5 Should Projects, Teams, and Workspaces Also Have Slugs?

**No — at least not now.**

The core distinction is this: org slugs appear in **external-facing URLs** seen by people outside Hivespace. Project, team, and workspace URLs are **internal navigation** — they only appear in the browser address bar while a logged-in member is already inside the app. Nobody copies an internal project URL and sends it to a client.

Additional problems at lower levels:

- **Uniqueness scope gets complicated.** An org slug is globally unique — simple. A project slug must be unique within a workspace. A team slug must be unique within a workspace. You now have scoped uniqueness constraints and collision checks at every level.
- **Names change constantly.** Organizations rename rarely. Projects and teams rename all the time — "Q3 Redesign" becomes "Product Refresh", sprint teams split and merge. Every rename either breaks URLs or requires redirect chains.
- **Depth makes URLs unwieldy anyway.** A fully-slugged URL would look like `hivespace.com/acmecorp/product-workspace/auth-service/backend-team/task-456`. That's not meaningfully more readable than UUIDs, and far more brittle.

**The practical rule for Hivespace:** if the URL leaves the authenticated app and is seen by outsiders, use a slug. If it stays inside the app between logged-in users, use a UUID.

The one future exception worth noting: if you build a **public developer API**, project-level slugs become useful for readability in API documentation (`GET /api/acmecorp/projects/auth-service/tasks`). That's a Phase 7+ concern.

---

## 2. Sharing Architecture

### 2.1 What Currently Exists in the Schema

The current schema has exactly **one sharing mechanism**:

```sql
shareable_links (
  id UUID PRIMARY KEY,
  token VARCHAR NOT NULL UNIQUE,
  project_id UUID NOT NULL REFERENCES projects(id),  -- hardcoded to project level
  created_by UUID REFERENCES users(id),
  scope JSONB,
  password_hash VARCHAR,
  expires_at TIMESTAMP,
  last_accessed_at TIMESTAMP,
  access_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT now()
)
```

**Project-level only.** Created by a Project Lead. Visible to anyone with the link. No login required.

### 2.2 What the Public View Shows (Per Blueprint)

- Project name and description
- Milestone progress (e.g. "Sprint 3 of 5 — 68% complete")
- Task breakdown by status as a visual chart
- Docs explicitly marked as "share with stakeholders" by the Project Lead
- Last updated timestamp

**Never exposed:** internal comments, team discussions, private docs, sensitive assignee details.

**Target audience:** clients and investors — purely external, read-only, no login required.

### 2.3 What's Missing at Each Level

**Workspace level — not in schema.**
No mechanism exists for a Workspace Admin to share an overall workspace progress view. If a CTO wants to show an investor the health of an entire product division across multiple projects simultaneously, there is currently no way to do that.

**Team level — not in schema.**
A Team Lead has no way to share their team's progress externally. If the backend team wants to demonstrate to a client what they've shipped this sprint, there is no sharing link scoped to that team.

**Individual level — not in schema.**
An individual member has no way to share their personal progress or contributions externally. This matters less than workspace and team level but is worth noting.

### 2.4 What We Don't Need — Internal Upward Reporting

A "share upward internally" mechanism was considered — a way for a junior developer to push a progress report to their manager, or a Team Lead to formally report to an Org Admin.

**This is not needed.** The existing permission model already solves this problem. An Org Admin can log in and directly view any workspace, project, team, or task board they have access to. A Team Lead's work is already visible to anyone above them in the hierarchy without a special report being generated. The data is live, always up to date, and accessible through normal navigation.

A dedicated upward reporting feature would be a worse version of what already exists — a manually triggered snapshot of data the senior can see in real time anyway. The gap exists at the schema level but is not a real product problem given how the access model works.

**The only external sharing gap that genuinely matters is public links at workspace and team scope** — for audiences outside Hivespace entirely.

---

## 3. Internal Visibility — What We Don't Need

To be explicit for the team:

| Scenario | Needed? | Reason |
|---|---|---|
| Senior views junior's task progress | No | Already visible via existing board/project access |
| Org Admin views team output | No | Org Admin has access to all workspaces and projects by default |
| Team Lead reports upward to Org Admin | No | Org Admin can view team boards directly |
| Structured internal progress snapshots | No | Live data in the app is always better than a snapshot |
| External client sees project progress | Yes | Shareable link — already in schema |
| External investor sees workspace health | Yes | Missing — needs schema change |
| External client sees team delivery | Yes | Missing — needs schema change |

---

## 4. Schema Changes Required

### 4.1 Fix shareable_links — Make It Scope-Agnostic

Replace the hardcoded `project_id NOT NULL` with a flexible multi-scope design:

```sql
-- Drop the existing table and recreate, or alter in migration
CREATE TABLE shareable_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token VARCHAR NOT NULL UNIQUE,

  -- scope references — exactly one should be non-null, enforced in application layer
  project_id   UUID REFERENCES projects(id)   ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  team_id      UUID REFERENCES teams(id)      ON DELETE CASCADE,

  -- explicitly tracks which scope this link represents
  scope_type VARCHAR NOT NULL
    CHECK (scope_type IN ('PROJECT', 'WORKSPACE', 'TEAM')),

  created_by UUID REFERENCES users(id) ON DELETE SET NULL,

  scope JSONB,           -- what's visible: tasks, milestones, docs, etc.
  password_hash VARCHAR, -- optional bcrypt protection
  expires_at TIMESTAMP,
  last_accessed_at TIMESTAMP,
  access_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);
```

**Who can create links at each scope:**

| Scope | Who Can Create |
|---|---|
| PROJECT | Project Lead, Workspace Admin, Org Admin |
| WORKSPACE | Workspace Admin, Org Admin |
| TEAM | Team Lead, Workspace Admin, Org Admin |

### 4.2 URL Structure With Slug

With the org slug in place, shareable link URLs become:

```
-- Project level
hivespace.com/share/acmecorp/project/{token}

-- Workspace level
hivespace.com/share/acmecorp/workspace/{token}

-- Team level
hivespace.com/share/acmecorp/team/{token}
```

### 4.3 What Each Public View Should Show

**Project link (existing behaviour, keep as-is):**
- Project name, description, milestone progress, task status chart, shared docs

**Workspace link (new):**
- Workspace name, list of active projects with individual progress bars, rolled-up task counts by status, overall milestone completion across projects

**Team link (new):**
- Team name, current sprint progress, completed vs in-progress task count, linked project names (no internal comments or assignee personal details)

---

## 5. Decision Summary

| Decision | Outcome |
|---|---|
| Org-level slugs | Yes — build in Phase 1, schema already has the column |
| Project/Team/Workspace slugs | No — internal navigation uses UUIDs |
| Slugs are immutable | Yes — no rename allowed, avoids redirect complexity |
| Reserved slug blocklist | Yes — cover all app route namespaces |
| Slug cached in Redis | Yes — avoid DB lookup on every request |
| Shareable links scope | Extend to PROJECT, WORKSPACE, TEAM |
| Internal upward reporting | Not needed — existing access model covers it |
| Subscriptions table | Build in Phase 6 when Stripe integration begins, not now |

---

*Hivespace Internal Architecture Notes — Slug & Sharing Review*
*Prepared for team alignment before Phase 1 and Phase 5 implementation*