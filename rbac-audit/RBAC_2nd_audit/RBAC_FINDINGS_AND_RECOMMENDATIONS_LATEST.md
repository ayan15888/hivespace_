# RBAC Findings, Security Concerns, and Refactor Recommendations (Latest)

Date: 2026-05-23  
Scope: backend enforcement + current DB schema (`CurrentSchema.md`, `backend/backendschema.sql`)

---

## 1) Confirmed Fix: Cross-scope rank-map comparisons removed

### What changed
`RbacService` no longer uses a single global string rank ladder. It now:
- uses scope-specific enums for role checks
- compares roles only within their own scope (`tenantRank`, `workspaceRank`, `projectRank`, `teamRank`)

### Why this matters
This prevents accidental comparisons like:
- treating tenant `BILLING_ADMIN` as comparable to project/team `LEAD`
- passing the wrong role string to the wrong scope check and silently granting access

Residual bridge rules still exist, but they’re now explicit (e.g., tenant owner/admin ⇒ workspace admin via `canAdminWorkspace`).

---

## 2) Confirmed Fix: Major missing authorization checks closed

### Tasks
Previously risky endpoints now enforce:
- tenant-boundary (`verifyResourceBelongsToTenant`)
- membership/capability checks (`canViewTask`, `canEditTask`, `canViewProject`)

### Workspaces/projects enumeration
Workspace and project listing/member directory endpoints now enforce:
- tenant membership
- workspace membership (VIEWER+) where appropriate
- tenant-boundary checks before returning data

---

## 3) Current highest-risk remaining issues (latest)

### 3.1 “Active tenant” (`users.tenant_id`) is an implicit hard security boundary

`verifyResourceBelongsToTenant(resourceId, type)` uses `currentUser.tenant_id` to decide the organization boundary.

Security impact:
- Positive: prevents cross-tenant leakage even if the user knows IDs.
Product/consistency impact:
- If users can belong to multiple tenants via `tenant_members`, they may be incorrectly denied access unless `users.tenant_id` matches that tenant.
- The backend shown does not expose a “switch active tenant context” endpoint; membership may exist but be unusable.

Recommendation:
- Make tenant context explicit:
  - include tenant context in JWT claims, or
  - provide a server-side “set active tenant” endpoint that updates `users.tenant_id` with appropriate checks,
  - and ensure `verifyResourceBelongsToTenant` matches that explicit context.

### 3.2 Invitation `role` field is still tenant-only, but request semantics are misleading

- `InviteRequest.role` comment suggests roles like `VIEWER`, `LEAD`, etc.
- Backend parses `invitation.role` only as `TenantMemberRole`.
- Workspace/team/project memberships granted by invite acceptance are always `MEMBER`.

Security impact:
- Mostly mismatch/expectation risk (frontend could think it invited a workspace admin).
Recommendation:
- Rename column/field to `tenantRole`, or introduce per-scope role fields and enforce them.

### 3.3 Tenant `BILLING_ADMIN` exists in schema but is weakly integrated

Observed behaviors:
- Blocked from tenant member directory.
- Not allowed to create invites (latest invite authorizer allows only OWNER/ADMIN).
- Not granted workspace-admin fallback.

Recommendation:
- Either:
  - explicitly define billing-admin allowed actions and implement them, or
  - remove/avoid the role to prevent “phantom role” confusion and inconsistent UX.

### 3.4 Policy duplication / drift risk

Some actions use capability methods, others use ad-hoc checks (e.g., task delete uses explicit “project lead OR workspace admin”).

Recommendation:
- Centralize all decisions into a single policy layer (capability methods), and have services call only those policies.
- Use named policies per action (`canDeleteTask`, `canChangeTaskOwner`, etc.) to keep consistency.

---

## 4) Scope isolation recommendations (architectural patterns)

### Recommended pattern: “Policy-first RBAC”

Instead of checking “role rank >= X” in many places, define:
- `canCreateWorkspace(user, tenantId)`
- `canCreateProject(user, workspaceId)`
- `canListProjects(user, workspaceId)`
- `canEditTask(user, taskId)`
- `canDeleteTask(user, taskId)`
- `canInviteToScopes(user, tenantId, workspaceId?, teamId?, projectId?, tenantRoleToGrant)`

Benefits:
- Fewer implicit assumptions about rank
- Explicit cross-scope bridges
- Easier to unit test and audit

### Recommended pattern: “Query-level authorization”

Prefer repository methods that encode authorization filtering:
- “projects visible to user in workspace”
- “tasks visible to user”

This reduces risk that a future service method forgets to filter.

---

## 5) Concrete example answers (latest)

- Can Tenant Admin invite Workspace Admin?
  - No (invites only assign tenant role; workspace role on join is always MEMBER).

- Can Workspace Member access Tasks outside assigned Projects?
  - No (task reads require `canViewTask` and tenant-boundary checks).

- Can Org Admin assign a different Project Lead during project creation?
  - Yes, via `ProjectRequest.leadUserId`, but the chosen lead must already be a workspace member.

- Can Team Leads manage users outside their workspace?
  - No (team/member operations verify tenant boundary and require team lead or workspace admin for that team’s workspace).

