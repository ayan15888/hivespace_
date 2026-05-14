# HIVESPACE — Project Blueprint & Architecture Document

> **All-in-one Project Management, Team Communication & Knowledge Base**
> Jira + Slack + Notion — Combined
>
> Version 1.0 | 2025 | Confidential

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Tech Stack](#2-tech-stack)
3. [Organisation & Permission Model](#3-organisation--permission-model)
4. [Invite System](#4-invite-system)
5. [Chat System](#5-chat-system)
6. [Task Management](#6-task-management)
7. [GitHub Integration](#7-github-integration)
8. [Docs & Knowledge Base](#8-docs--knowledge-base)
9. [Stakeholder Progress Sharing](#9-stakeholder-progress-sharing)
10. [Email Integration](#10-email-integration)
11. [AI Features](#11-ai-features)
12. [Subscription Model](#12-subscription-model)
13. [File Storage Architecture](#13-file-storage-architecture)
14. [Free Resources & Cost Analysis](#14-free-resources--cost-analysis)
15. [Recommended Build Order](#15-recommended-build-order)
16. [Open Decisions & Next Steps](#16-open-decisions--next-steps)

---

## 1. Product Overview

Hivespace is an all-in-one team collaboration and project management platform designed to eliminate tool sprawl. It combines the project tracking power of Jira, the real-time communication of Slack, and the knowledge management capabilities of Notion into a single unified workspace. It also features bidirectional GitHub integration for engineering teams and AI-powered features for productivity.

### 1.1 Core Modules

- **Project & Task Management** — Kanban boards, sprint planning, backlog, milestones, GitHub-linked issues
- **Team Communication** — Channels, threads, DMs, mentions, unified notification inbox
- **Docs & Knowledge Base** — Rich-text documents, nested pages, graph-style linking, version history
- **GitHub Integration** — Bidirectional sync of issues, PRs, commits, and assignments
- **AI Features** — Task generation, smart triage, PR review, semantic search, retrospectives
- **Email Integration** — Read and send official work email (Gmail/Outlook) inside Hivespace
- **Stakeholder Sharing** — Public progress links with expiry for clients and investors

### 1.2 Data Hierarchy

The platform is structured as a clean four-level hierarchy:

| Level | Description |
|---|---|
| **Organization** | The top-level entity. Represents the company. All employees belong here first. |
| **Workspace** | A division or department within the org. An employee can belong to multiple workspaces. |
| **Project** | A specific initiative within a workspace. Has its own board, docs, and channels. |
| **Team** | A group of people who work together. Scoped to a workspace. Multi-team membership allowed. |

---

## 2. Tech Stack

### 2.1 Frontend

- **Framework:** Next.js (App Router)
- **Styling:** Tailwind CSS with ShadCN UI components
- **Rich Text Editor:** Tiptap (ProseMirror-based) for the Docs module
- **Real-time Graph View:** React Flow for the knowledge graph node-and-edge view
- **Charts & Analytics:** Recharts
- **WebSocket client:** STOMP over SockJS for real-time chat

### 2.2 Backend

- **Framework:** Spring Boot (Java)
- **REST API + WebSocket:** Spring MVC + Spring WebSocket (STOMP broker)
- **Authentication:** JWT validation against Supabase JWKS endpoint
- **Async processing:** Spring `@Async` with thread pool for webhook handling
- **Scheduled jobs:** Spring `@Scheduled` for cleanup tasks and storage enforcement
- **File uploads:** AWS SDK for Java pointed at Cloudflare R2 endpoint

### 2.3 Database & Infrastructure

| Service | Purpose |
|---|---|
| **Supabase (PostgreSQL)** | Primary database, Row-Level Security, Auth, Realtime, File metadata |
| **Supabase Auth** | User authentication, OAuth2 provider integration |
| **Supabase Realtime** | Fallback real-time updates via Postgres logical replication |
| **Upstash Redis** | Invite token TTL storage, rate limiting, plan caching, Redis Streams queue |
| **Cloudflare R2** | Primary file storage — 10GB free, zero egress fees, S3-compatible API |
| **Stripe** | Subscription billing, seat management, invoice generation |
| **Resend / Brevo** | Transactional email (invites, notifications) |
| **Gemini / Groq API** | LLM calls for AI features — free tier viable at startup scale |

---

## 3. Organisation & Permission Model

### 3.1 Role Hierarchy

Roles in Hivespace are context-scoped, not user-typed. The same person can be a Lead in one team and a Member in another. Permissions are enforced by a central `PlanGuard` and `PermissionResolver` service in Spring Boot.

| Role | Scope & Permissions |
|---|---|
| **Org Owner** | Created automatically for the org creator. Cannot be removed. Full org control. Can promote/demote Org Admins. |
| **Org Admin** | Promoted by the Owner. Same operational access as Owner — manages employee list, invites, org settings. |
| **Billing Admin** | Narrow role — can only access the Stripe billing portal. Cannot see projects, tasks, or team data. |
| **Workspace Admin** | Manages workspace settings and adds existing org members to the workspace. |
| **Team Lead** | Manages team membership, task assignments, and team-level goals within their team scope. |
| **Project Lead** | Manages project board, milestones, stakeholder links, and project access. |
| **Member** | Standard access — can be assigned tasks, participate in channels, edit docs per project permissions. |
| **Viewer** | Read-only access to assigned workspaces or projects. |

### 3.2 Invite Rules

Only Org Owners and Org Admins can bring net-new people into the system. Below that level, leads and admins only redistribute existing org members into their own scope.

- **Org Admin** invites external email → new user joins org
- **Workspace Admin** adds existing org member → joins workspace
- **Team Lead** adds existing workspace member → joins team
- **Project Lead** adds existing workspace member → joins project

Think of it like a building — **Org Admins manage who has a keycard to enter the building**. Workspace and Team leads manage **which rooms those people can access**. Completely separate concerns.

### 3.3 Multi-Workspace & Multi-Team

Employees can belong to multiple workspaces and multiple teams simultaneously — there is no restriction. A user's org-level role acts as the ceiling — workspace and team roles cannot exceed it.

Notifications across all workspaces are aggregated into a single **unified inbox** to prevent notification noise.

### 3.4 Billing Admin Role

The Billing Admin is a narrow role existing solely to manage the Hivespace subscription and payment details. A finance manager or CFO needs access to invoices and billing without having Org Admin powers to manage users, see projects, or change org settings. Billing Admin can be assigned by the Org Owner or Org Admin to any org member and can be held simultaneously with a normal Member role.

---

## 4. Invite System

### 4.1 Database Schema

```sql
-- Core invite table
invites (
  id UUID PRIMARY KEY,
  token VARCHAR UNIQUE,        -- SHA-256 hash of the raw token
  org_id UUID,
  workspace_id UUID nullable,  -- if scoped to a workspace
  team_id UUID nullable,       -- if scoped to a team
  invited_email VARCHAR,
  invited_by UUID,             -- user who sent it
  role VARCHAR,                -- admin | member | viewer
  status VARCHAR,              -- pending | accepted | expired | revoked
  expires_at TIMESTAMP,
  created_at TIMESTAMP
)

-- Membership table (created when invite is accepted)
memberships (
  id UUID PRIMARY KEY,
  user_id UUID,
  org_id UUID,
  workspace_id UUID nullable,
  team_id UUID nullable,
  role VARCHAR,
  joined_at TIMESTAMP
)
```

### 4.2 Invite Flow — Step by Step

**Step 1 — Admin sends invite**

Admin types an email inside Hivespace settings. Spring Boot generates a cryptographically random token via `SecureRandom`, stores its SHA-256 hash in the `invites` table with status `pending` and `expires_at = now + 72 hours`, then sends the raw token in the invite email URL. The token in the URL is never stored as-is — you store its SHA-256 hash. When the user arrives with the token, you hash it again and look it up. This way even if your DB leaks, tokens are useless.

**Step 2 — Invitee clicks the link**

Next.js frontend hits `/invite?token=abc123` and calls `GET /api/invites/validate?token=abc123`. Spring Boot hashes the token, queries the DB, checks it exists, status is pending, and `expires_at` is in the future. Returns org name, invited role, and invited email for the welcome screen.

**Step 3 — Account handling**

Two branches: if the email has no account, they register first — after registration Supabase Auth creates the user, the pending invite for that email is auto-accepted, and they land directly inside the org. If they already have an account, they log in and call `POST /api/invites/accept`. Backend validates, creates the `memberships` record, marks invite as `accepted`, redirects to the workspace.

**Step 4 — Edge cases handled**

- **Expired token:** Show error + "Request a new invite" button that regenerates and resends
- **Already accepted:** Show "Already a member" and redirect to the app
- **Duplicate invite:** Detect existing pending invite, resend same email — no duplicate rows
- **Email mismatch:** Block completely — invite tokens are email-bound
- **Default channel:** On membership creation, auto-add user to the org's `#general` channel

---

## 5. Chat System

### 5.1 Database Schema

```sql
channels (
  id UUID PRIMARY KEY,
  workspace_id UUID,
  name VARCHAR,
  type VARCHAR,       -- public | private | dm | thread
  created_by UUID,
  created_at TIMESTAMP
)

channel_members (
  channel_id UUID,
  user_id UUID,
  last_read_at TIMESTAMP,   -- for unread counts
  PRIMARY KEY (channel_id, user_id)
)

messages (
  id UUID PRIMARY KEY,
  channel_id UUID,
  sender_id UUID,
  content TEXT,
  type VARCHAR,            -- text | file | system | ai
  parent_id UUID nullable, -- for thread replies
  edited_at TIMESTAMP nullable,
  deleted_at TIMESTAMP nullable,
  created_at TIMESTAMP
)

message_reactions (
  message_id UUID,
  user_id UUID,
  emoji VARCHAR,
  PRIMARY KEY (message_id, user_id, emoji)
)
```

### 5.2 Real-time Architecture

Two layers work together — **WebSocket for live delivery** and **REST for reliability and history**.

**WebSocket layer (Spring Boot side)**

Spring Boot runs a STOMP WebSocket server via `spring-websocket`. When a user opens Hivespace, the Next.js frontend opens a WebSocket connection. The user subscribes to their personal queue `/user/queue/messages` and to each channel they're in at `/topic/channel.{id}`.

**Sending a message**

The frontend posts to `POST /api/messages` via REST (guarantees a delivery confirmation). The backend saves it to Supabase, then broadcasts to the channel topic via the STOMP broker. Every connected subscriber receives it in under 100ms. The frontend appends the message optimistically before the API call and reconciles after.

**Supabase Realtime fallback**

For users who can't maintain a stable WebSocket connection (mobile, bad network), Supabase Realtime listens to the `messages` table via Postgres logical replication and pushes updates. Slightly slower than WebSocket but ensures no message is missed.

### 5.3 Key Features

**Unread counts** — `last_read_at` in `channel_members` is updated when a user opens a channel. Unread count = messages after `last_read_at` by other users. Cached in Upstash Redis with a short TTL.

**Typing indicators** — never touch the database. Pure ephemeral WebSocket signaling on `/app/channel.{id}.typing`. Frontend sends a stop-typing frame after 3 seconds of no input.

**Threads** — a message with `parent_id` set. Thread replies broadcast on `/topic/thread.{parentId}` so only users with the thread open receive sub-updates, not the whole channel.

**Message pagination** — cursor-based. Last 50 messages on open. Scroll up fetches older via `GET /api/messages?channelId=x&before={oldestMessageId}&limit=50`. Faster than offset-based pagination because Postgres uses the indexed `id` to jump directly.

**Push notifications** — enqueued asynchronously via Upstash Redis so they don't slow down message delivery.

---

## 6. Task Management

### 6.1 Single & Multi-Assignee Tasks

Tasks support both individual ownership and collaborative assignment.

```sql
task_assignees (
  task_id UUID,
  user_id UUID,
  role VARCHAR,   -- owner | collaborator | reviewer
  assigned_at TIMESTAMP,
  PRIMARY KEY (task_id, user_id)
)
```

| Role on Task | Description |
|---|---|
| **Owner** | Primary accountable person. Shown prominently on board card. Required field. |
| **Collaborator** | Contributing but not the primary owner. Notified on all updates. |
| **Reviewer** | Must approve or sign off the output. Similar to a GitHub PR reviewer. |

Single-person tasks are fully supported — not every task needs a team. A task can have just an owner with no collaborators.

### 6.2 Task Features

- Kanban board with custom columns and sprint support
- Backlog management and milestone tracking
- GitHub issue linking — bidirectional sync with commits and PRs
- Custom fields, priority labels, due dates
- Task timeline showing linked commits, PR status, and comments
- Automation rules — e.g. close task when linked PR is merged
- Multi-assignee with avatar stack on board cards

---

## 7. GitHub Integration

### 7.1 Connection Setup

An Org Admin connects GitHub via OAuth App flow. Hivespace receives an access token stored encrypted in the database. Specific GitHub repositories are then linked to specific Hivespace projects.

```sql
github_connections (
  id UUID PRIMARY KEY,
  org_id UUID,
  github_org_name VARCHAR,
  access_token TEXT,           -- encrypted at rest
  token_type VARCHAR,
  scope VARCHAR,
  webhook_secret VARCHAR,      -- for validating incoming webhooks
  connected_by UUID,
  connected_at TIMESTAMP
)

github_repo_links (
  id UUID PRIMARY KEY,
  project_id UUID,             -- Hivespace project
  github_repo_full_name VARCHAR,  -- e.g. "acmecorp/backend"
  linked_by UUID,
  linked_at TIMESTAMP
)

user_github_connections (
  user_id UUID,
  github_username VARCHAR,
  github_user_id VARCHAR,
  access_token TEXT,           -- encrypted
  connected_at TIMESTAMP,
  PRIMARY KEY (user_id)
)

github_sync_log (
  id UUID PRIMARY KEY,
  action VARCHAR,              -- what Hivespace did
  github_event_id VARCHAR,     -- expected incoming webhook event id
  processed BOOLEAN,
  created_at TIMESTAMP
)
```

### 7.2 GitHub → Hivespace (Webhooks)

Spring Boot registers webhooks on linked repos. The webhook endpoint validates the HMAC-SHA256 signature using the stored `webhook_secret`, returns 200 immediately, then enqueues the payload to Upstash Redis Streams for async processing.

| GitHub Event | Hivespace Action |
|---|---|
| **Push (commit)** | Scan message for `HS-123` references, link commit to task, add timeline entry |
| **PR opened** | Create linked PR record, show PR indicator on board card |
| **PR merged** | Auto-close linked task if automation rule is configured |
| **PR review submitted** | Add timeline entry showing reviewer and approval status |
| **Issue opened** | Optionally create corresponding Hivespace task (toggle per repo) |
| **Issue closed** | Mark linked Hivespace task as Done |

### 7.3 Hivespace → GitHub (API Calls)

- **Create GitHub issue from task** — calls `POST /repos/{owner}/{repo}/issues`, stores returned issue number against the task
- **Assign GitHub issue** — when task is assigned in Hivespace, sync assignee via GitHub API (requires user GitHub account mapping)
- **Close GitHub issue** — when task marked Done, calls GitHub API to close the linked issue
- **Comment sync** — comments explicitly marked "sync to GitHub" get posted to the linked issue

### 7.4 Infinite Loop Prevention

The hardest part of bidirectional sync is avoiding infinite loops. Actions Hivespace takes on GitHub are logged in `github_sync_log` with the expected incoming webhook event ID. When that webhook arrives, the processor checks the log — if Hivespace triggered it, the event is skipped.

---

## 8. Docs & Knowledge Base

### 8.1 Editor

The editor is built on **Tiptap** (ProseMirror-based React editor) — not built from scratch. Content is stored as ProseMirror JSON in Supabase. A flattened `text_content` column is maintained alongside for Postgres full-text search.

### 8.2 Database Schema

```sql
documents (
  id UUID PRIMARY KEY,
  workspace_id UUID,
  project_id UUID nullable,   -- null means workspace-level doc
  team_id UUID nullable,
  title VARCHAR,
  created_by UUID,
  parent_id UUID nullable,    -- for nested pages like Notion
  icon VARCHAR nullable,      -- emoji or icon identifier
  is_published BOOLEAN,       -- for stakeholder sharing
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

document_content (
  document_id UUID PRIMARY KEY,
  content JSONB,              -- Tiptap/ProseMirror JSON
  text_content TEXT,          -- plain text for search indexing
  version INTEGER
)

document_versions (
  id UUID PRIMARY KEY,
  document_id UUID,
  content JSONB,
  saved_by UUID,
  created_at TIMESTAMP        -- keep last 50 versions
)

document_links (
  source_doc_id UUID,
  target_doc_id UUID,
  created_at TIMESTAMP,
  PRIMARY KEY (source_doc_id, target_doc_id)
)

document_chunks (
  id UUID PRIMARY KEY,
  document_id UUID,
  content TEXT,
  embedding VECTOR(1536),     -- OpenAI embedding dimension via pgvector
  chunk_index INTEGER,        -- position in document
  heading VARCHAR nullable    -- nearest heading above this chunk
)
```

### 8.3 Block Types Supported

- Paragraph, Heading H1/H2/H3, Bullet list, Numbered list, Checklist
- Code block with syntax highlighting, Blockquote, Divider, Image upload (Supabase Storage → R2)
- Table, Inline task embed — typing `[[task-123]]` renders a live task card showing status and assignee
- Page linking — `[[page name]]` creates a bidirectional link recorded in `document_links`

### 8.4 Knowledge Graph View

The `[[page name]]` inline link syntax creates edges in `document_links`. **React Flow** renders these as an interactive node-and-edge graph — nodes sized by connection count, heavily referenced docs become visible hub nodes. Clicking a node opens the document.

Backlinks appear at the bottom of every document — a "Referenced by" section listing every other doc linking to this one.

> This feature differentiates Hivespace from Notion, Linear, and Jira which all lack a graph view. Notion is purely hierarchical — pages inside pages. Tools like Obsidian and Roam Research have this graph view for personal notes, but no team project management tool does it properly.

### 8.5 Nested Pages

The `parent_id` field enables Notion-style nested page trees. A recursive CTE query in Postgres builds the full tree for the sidebar in one efficient query:

```sql
WITH RECURSIVE doc_tree AS (
  SELECT id, title, parent_id, 0 as depth
  FROM documents
  WHERE parent_id IS NULL AND workspace_id = ?
  UNION ALL
  SELECT d.id, d.title, d.parent_id, dt.depth + 1
  FROM documents d
  JOIN doc_tree dt ON d.parent_id = dt.id
)
SELECT * FROM doc_tree ORDER BY depth, title;
```

### 8.6 Real-time Collaboration

**V1 approach (simpler):** Last-write-wins with auto-save every 2 seconds. Good enough until multiple people are genuinely editing the same doc simultaneously.

**V2 approach (when needed):** Tiptap's collaboration extension built on Yjs gives real-time multiplayer editing via CRDT (conflict-free, no merge conflicts). A `y-websocket` Node.js sync server handles state synchronization. Yjs state is periodically flushed back to `document_content` in Supabase.

### 8.7 Version History

Auto-save triggers every 30 seconds or on significant change, inserting a row into `document_versions`. The last 50 versions are retained. Users can preview any past version and restore with one click — the backend copies that version's content back into `document_content`.

---

## 9. Stakeholder Progress Sharing

Project Leads can generate a public shareable link showing a read-only progress dashboard to clients, investors, or external stakeholders — no login required.

### 9.1 Database Schema

```sql
shareable_links (
  id UUID PRIMARY KEY,
  token VARCHAR UNIQUE,        -- random secure token
  project_id UUID,
  created_by UUID,
  scope JSONB,                 -- what's visible: tasks, milestones, docs
  password_hash VARCHAR,       -- optional bcrypt password protection
  expires_at TIMESTAMP,        -- 7 days, 30 days, custom, or never
  last_accessed_at TIMESTAMP,
  access_count INTEGER,
  is_active BOOLEAN,
  created_at TIMESTAMP
)
```

### 9.2 What the Public View Shows

- Project name and description
- Milestone progress (e.g. "Sprint 3 of 5 — 68% complete")
- Task breakdown by status shown as a visual chart
- Docs explicitly marked as "share with stakeholders" by the Project Lead
- Last updated timestamp

Internal comments, team discussions, private docs, and sensitive assignee details are **never exposed**. The endpoint is heavily rate-limited via Upstash Redis to prevent scraping.

### 9.3 Link Lifecycle

- Project Lead generates link from project settings — sets expiry and optional password
- URL format: `https://hivespace.app/share/progress/{token}`
- Spring Boot validates token on every visit — checks existence, `is_active`, and `expires_at`
- Project Lead can revoke instantly by setting `is_active = false`
- `access_count` and `last_accessed_at` visible to Project Lead — confirms whether stakeholder actually viewed it
- Password-protected links: password sent with request, compared against bcrypt hash — never stored plain

---

## 10. Email Integration

### 10.1 Three Levels of Email Support

| Type | Timeline | Description |
|---|---|---|
| **Notification emails** | V1 | Hivespace sends emails about platform events — task assigned, mentioned, invite, sprint updates. Uses Resend (3,000/month free). |
| **Shared team inbox** | V2 | Emails to `support@company.com` routed via Cloudflare Email Routing (free) to Spring Boot webhook, creating collaborative threads in Hivespace. |
| **Personal work email client** | V2 | Employee reads and sends their actual work email (`john@acmecorp.com`) inside Hivespace via Gmail API / Microsoft Graph API OAuth. |

### 10.2 Personal Work Email Client Flow

- Employee connects work email via OAuth in profile settings (Google or Microsoft)
- Spring Boot stores encrypted OAuth tokens, fetches inbox via Gmail/Graph API
- Inbox displayed in dedicated Email section in Hivespace sidebar
- Compose and reply use the same API — recipient sees email from the employee's real address
- **Email-to-task conversion** — one click turns a client email thread into a Hivespace task with context preserved
- OAuth token refresh handled silently in the background
- Rate limits managed — Gmail API allows 250 quota units per user per second

### 10.3 Shared Team Inbox Flow

- Cloudflare Email Routing receives emails sent to `support@company.com`
- Forwards as HTTP POST to Spring Boot webhook endpoint
- Backend parses email and creates a thread in Hivespace that multiple team members can see, assign, and reply to collaboratively
- Reply from Hivespace sends back through the Gmail/Resend API from the team address

> Gmail API and Microsoft Graph API have no per-call cost — only OAuth credentials from Google Cloud Console and Azure are required.

---

## 11. AI Features

### 11.1 Feature List

| AI Feature | Description |
|---|---|
| **AI Assistant** | `/ai` command in any channel or task. Summarizes threads, drafts replies, answers project questions. |
| **Task Generation** | Paste a feature spec or message — AI breaks it into structured subtasks with suggested priority and assignee. |
| **Smart Triage** | New issues auto-classified by type (bug/feature/chore), priority suggested from keywords and history, assignee recommended from past ownership patterns. |
| **PR Code Review Assistant** | When a PR opens, AI generates a change summary and flags potential issues, posted as a Hivespace comment linked to the PR. |
| **Sprint Retrospective Generator** | At sprint close, AI summarizes completed work, blockers, and velocity trends into a shareable doc. |
| **Semantic Search** | Search across tasks, docs, and messages in natural language — finds the right content even without exact keyword matches. |

### 11.2 Search Architecture

**Layer 1 — Keyword search (baseline)**

Postgres full-text search using `tsvector` on the `text_content` column. Fast, free, built into Supabase. Good for "find the deployment doc."

**Layer 2 — Reasoning-based RAG (PageIndex approach)**

Standard vector RAG chunks documents, embeds them, and finds similar chunks by cosine distance. PageIndex skips vectors entirely — it uses an LLM to read each document and generate a structured summary of what questions that document can answer, what topics it covers, and what decisions it records. At query time the LLM reasons over the index summaries to select the most relevant documents, then synthesizes a direct answer with source citations.

Advantages over standard vector RAG: handles long documents better (no chunking boundary issues), catches indirect relevance that keyword overlap misses, no pgvector infrastructure required, better answer quality for typical knowledge base sizes.

**Chunking (for vector approach if chosen)**

Documents split into ~500 token chunks stored in `document_chunks` with an embedding vector. Chunks reference their parent document and nearest heading so search results link to the exact section.

> **Note:** The exact RAG approach — PageIndex, standard pgvector embeddings, or hybrid — is to be confirmed with the team before Phase 7 implementation.

### 11.3 LLM Providers

- **Google Gemini Flash** — 1 million tokens/day free, good quality, recommended for startup phase
- **Groq** — free API access to Llama and Mixtral models, extremely fast inference
- All LLM calls handled by a dedicated service layer in Spring Boot — swap providers without touching business logic

---

## 12. Subscription Model

### 12.1 Pricing Tiers

| Plan | Price | Key Limits |
|---|---|---|
| **Free** | Free forever | 5 members, 3 projects, 1 workspace, 1GB storage, no GitHub/AI |
| **Pro** | $8–12 / user / month | Unlimited members, GitHub, stakeholder links, email, basic AI, 50GB storage |
| **Ultimate** | $18–25 / user / month | Everything + advanced AI, semantic search, SSO, custom roles, 500GB storage |
| **Enterprise** | Custom pricing | Unlimited everything, dedicated support, SLA, on-premise option |

Annual billing at **20% discount** available on all paid plans (e.g. Pro = $96/year vs $120/year monthly).

### 12.2 Stripe Integration

```sql
org_subscriptions (
  id UUID PRIMARY KEY,
  org_id UUID,
  stripe_customer_id VARCHAR,
  stripe_subscription_id VARCHAR,
  plan VARCHAR,              -- free | pro | ultimate | enterprise
  seat_count INTEGER,
  billing_cycle VARCHAR,     -- monthly | annual
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  status VARCHAR,            -- active | past_due | cancelled | trialing
  created_at TIMESTAMP
)
```

- **Per-seat billing** — Stripe subscription quantity = active member count
- **Automatic proration** when members are added or removed mid-billing cycle
- **14-day free Pro trial** — no credit card required on signup
- **Payment failure grace period** — 7 days with reminder emails before downgrading to Free
- Stripe webhooks notify Spring Boot of payment success, failure, trial endings, and renewals

### 12.3 Feature Gating

All paid feature endpoints call a `PlanGuard` service in Spring Boot before executing:

```java
planGuard.require(orgId, Feature.GITHUB_INTEGRATION);
planGuard.require(orgId, Feature.AI_TASK_GENERATION);
planGuard.require(orgId, Feature.STAKEHOLDER_LINKS);
```

The org's current plan is cached in Upstash Redis with a 5-minute TTL. On plan change, cache is invalidated immediately. The Next.js frontend proactively disables and greys out locked features with upgrade prompts rather than showing backend errors.

### 12.4 Storage Limits Per Plan

| Plan | Storage Limit |
|---|---|
| Free | 1GB per org |
| Pro | 50GB per org |
| Ultimate | 500GB per org |
| Enterprise | Custom / Unlimited |

---

## 13. File Storage Architecture

### 13.1 Why Cloudflare R2

Supabase Storage's 1GB free limit runs out fast. **Cloudflare R2** is the primary file store:

- **10GB free forever**
- **$0.015/GB/month** after 10GB
- **Zero egress fees** — AWS S3 and Google Cloud Storage charge for every download; R2 does not. For a product where users constantly view images and download documents, this is a massive cost saving.
- **S3-compatible API** — use the standard AWS SDK for Java pointed at R2's endpoint, no special SDK needed

### 13.2 Upload Flow (Presigned URLs)

Files **never pass through the Spring Boot backend**:

```
User selects file
    ↓
Next.js calls Spring Boot: GET /api/files/upload-url
    ↓
Spring Boot generates presigned R2 upload URL (signed, time-limited)
    ↓
Frontend uploads directly to R2 (bypasses backend entirely)
    ↓
R2 stores file, frontend notifies backend of completion
    ↓
Spring Boot records metadata in Supabase, updates org storage counter
```

Spring Boot R2 client setup using AWS SDK:

```java
S3Client r2Client = S3Client.builder()
  .endpointOverride(URI.create("https://{accountId}.r2.cloudflarestorage.com"))
  .credentialsProvider(StaticCredentialsProvider.create(
    AwsBasicCredentials.create(R2_ACCESS_KEY, R2_SECRET_KEY)
  ))
  .region(Region.of("auto"))
  .build();
```

### 13.3 Tracking Storage Per Org

```sql
org_storage (
  org_id UUID PRIMARY KEY,
  used_bytes BIGINT DEFAULT 0,
  updated_at TIMESTAMP
)

file_uploads (
  id UUID PRIMARY KEY,
  org_id UUID,
  workspace_id UUID,
  project_id UUID nullable,
  uploaded_by UUID,
  r2_key VARCHAR,            -- full path in R2
  original_filename VARCHAR,
  mime_type VARCHAR,
  size_bytes BIGINT,
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMP,
  created_at TIMESTAMP
)
```

Before accepting any upload, the backend checks `used_bytes + new_file_size` against the org's plan limit and rejects with a clear message if exceeded.

### 13.4 R2 Path Structure

```
hivespace-storage/
  orgs/{org_id}/
    workspaces/{workspace_id}/
      projects/{project_id}/
        tasks/{task_id}/attachments/{file_id}.pdf
        docs/{doc_id}/images/{image_id}.png
    avatars/{user_id}.jpg
    exports/{export_id}.zip
```

### 13.5 File Deletion

**Soft deletes only** — files marked `is_deleted = true` are retained in R2 for 30 days. A nightly `@Scheduled` Spring Boot job permanently deletes files past the 30-day window and decrements the org storage counter.

- Sensitive files served via short-lived **presigned download URLs** (15-minute expiry) — never publicly accessible by default
- Profile avatars served via Cloudflare CDN edge with long cache headers — zero egress, fast delivery

---

## 14. Free Resources & Cost Analysis

Hivespace can be built and run in early stages with near-zero infrastructure cost.

| Service | Free Tier | Paid When | Estimated Cost |
|---|---|---|---|
| **Vercel (Frontend)** | 100GB bandwidth, unlimited deploys | Very high traffic | $0 to start |
| **Spring Boot (Railway/Fly.io)** | Limited — may spin down | Day one for always-on reliability | ~$5–10/month |
| **Supabase** | 500MB DB, 1GB storage, 50k MAU | DB fills or MAU exceeded | $0 to start |
| **Cloudflare R2** | 10GB storage, zero egress | Storage exceeds 10GB | $0.015/GB after |
| **Upstash Redis** | 10k commands/day, 256MB | High command volume | $0 to start |
| **Resend (Email)** | 3,000 emails/month | Email-heavy notification volume | $0 to start |
| **GitHub Integration** | OAuth Apps and webhooks free | Never | $0 |
| **Cloudflare Email Routing** | Completely free | Never | $0 |
| **Gemini Flash / Groq (AI)** | 1M tokens/day (Gemini) | High AI usage volume | $0 to start |
| **Stripe (Billing)** | No monthly fee | Transaction % on revenue | Revenue-linked |

> **Key insight:** The entire Hivespace stack runs for approximately **$5–10/month** during development and early users — purely the Spring Boot hosting cost. Every other service has a viable free tier for startup scale.

### Cost at Scale Example

Cloudflare R2 with 20 active users collectively using 25GB of storage = $0.015 × 15GB overage = **$0.22/month**. At 100GB total org storage across all orgs = **$1.35/month**. The egress fees that would cost $8–15/month on S3 are zero.

---

## 15. Recommended Build Order

Ship a focused, working product at each milestone rather than building everything in parallel.

| Phase | What to Build |
|---|---|
| **Phase 1 — Foundation** | Auth (Supabase), Org/Workspace/Project/Team CRUD, Invite system, Membership & roles, Basic Kanban task board, Notification emails (Resend) |
| **Phase 2 — GitHub** | GitHub OAuth connection, Webhook ingestion (Upstash Redis Streams), Bidirectional issue sync, Commit & PR linking, User GitHub account mapping |
| **Phase 3 — Communication** | Channel CRUD, Real-time chat (STOMP WebSocket), Threads, DMs, Unread counts, Typing indicators, Unified notification inbox |
| **Phase 4 — Knowledge Base** | Tiptap editor, Nested pages, Document CRUD, Version history, Page linking + backlinks, Knowledge graph view (React Flow) |
| **Phase 5 — Stakeholder & Email** | Shareable progress links with expiry, Gmail OAuth integration, Email-to-task conversion, Shared team inbox via Cloudflare routing |
| **Phase 6 — Subscription** | Stripe integration, Plan tiers (Free/Pro/Ultimate), Feature gating (PlanGuard), Billing Admin role, Billing portal |
| **Phase 7 — AI** | Task generation, Smart triage, PR review assistant, Sprint retrospective generator, Semantic search (confirm RAG approach with team first) |

> **Recommendation:** Phases 1 and 2 deliver a working product for engineering teams immediately. Each phase after that adds a meaningful layer of value without blocking the core use case.

---

## 16. Open Decisions & Next Steps

### Pending Team Decisions

- **RAG approach for AI search** — PageIndex (reasoning-based, no vectors) vs standard pgvector embeddings vs hybrid. Team to align before Phase 7.
- **Real-time collaboration in Docs** — last-write-wins auto-save (simpler, build first) vs Yjs CRDT multiplayer (complex, add later when genuinely needed).
- **Spring Boot hosting provider** — Railway ($5/month), Fly.io (free tier then pay-as-you-go), or Render ($7/month always-on).
- **Email client priority** — confirm whether Gmail/Outlook personal inbox integration is a V2 requirement or optional based on user demand.
- **Mobile app** — PWA via Next.js (free, good enough for most users) or native iOS/Android (significant extra investment).

### Architecture Decisions Already Confirmed

- Cloudflare R2 over Supabase Storage for primary file storage ✓
- Upstash Redis Streams over BullMQ or RabbitMQ for async processing ✓
- Tiptap over building a custom rich-text editor ✓
- React Flow for the knowledge graph view ✓
- Per-seat Stripe billing model ✓
- Multi-workspace and multi-team membership allowed simultaneously ✓
- Invite system: only Org Admins invite externally, others redistribute internally ✓
- Org Owner and Org Admin at the same operational level, Owner cannot be removed ✓
- Soft deletes for files with 30-day recovery window ✓
- Presigned upload URLs — files never pass through the Spring Boot backend ✓
- Cursor-based pagination for chat message history ✓
- SHA-256 hashed invite tokens — raw token never stored in DB ✓

---

*End of Document — Hivespace Project Blueprint v1.0*