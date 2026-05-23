# RBAC Findings & Recommendations — Re-run After Fixes (Latest)

Date: 2026-05-23

This document highlights what changed, what risks remain, and recommended next refactors based on the current schema and backend enforcement.

---

## 1) Confirmed fixes / improvements

### 1.1 Cross-scope role comparisons
- `RbacService` now compares roles **only within the correct scope** (tenant/workspace/project/team) using scope enums + per-scope rank maps.
- No single global rank ladder exists, so tenant roles cannot be accidentally compared to project/team roles.

### 1.2 Scope boundary enforcement (tenant isolation)
- Many endpoints now call `rbacService.verifyResourceBelongsToTenant(...)` before operating on workspace/team/project/task IDs.
- This significantly reduces cross-tenant leakage via “guessable UUID” attacks.

### 1.3 Task read/write authorization
- Task endpoints enforce `canViewTask/canViewProject` for reads and `canEditTask/canCreateTask` for mutations.
- Task assignee endpoints now enforce actor authorization (task owner / project lead / workspace admin).

### 1.4 Invitation model tightened and clarified
- Schema + code now use `tenant_role` explicitly (instead of a generic `role` string).
- Invitations now support multiple workspaces/teams via junction tables:
  - `invitation_workspaces`, `invitation_teams`
- `createInvite` now validates:
  - referenced workspaces/teams/projects belong to the tenant
  - inviter has workspace access (see note in §2.2)
- `acceptInvite` re-validates structural consistency at acceptance time.

---

## 2) Remaining issues / risk areas (current)

### 2.1 Active tenant context is still the hard boundary

`verifyResourceBelongsToTenant(resourceId, type)` uses `currentUser.tenant_id` to decide whether a resource is “in bounds”.

Impact:
- Security-positive (prevents cross-tenant leakage).
- Product/consistency risk: if a user belongs to multiple tenants via `tenant_members`, they may be blocked from accessing a tenant they belong to unless `users.tenant_id` is switched to that tenant.

Recommendation:
- Add an explicit “switch active tenant” mechanism (or encode tenant context in the JWT) and ensure all authorization checks reference that explicit context.

### 2.2 Invitation workspace authorization message vs actual rule

`InvitationService.createInvite` checks inviter permission for each target workspace using:
- `rbacService.hasWorkspaceRole(workspaceId, WorkspaceMemberRole.MEMBER)`

Because `hasWorkspaceRole` has a tenant OWNER/ADMIN fallback, tenant admins can pass this check for **any** workspace in the tenant even without explicit `workspace_members` rows.

This may be intended (org admins can invite into any workspace), but two notes:
- The error message says “role that exceeds your own workspace role”, but the code does not compare requested vs actual—invites always grant workspace/team/project membership as `MEMBER`.
- If the desired policy is “must be explicit workspace member”, use an explicit membership check instead of the fallback-enabled method.

Recommendation:
- Decide policy explicitly:
  - If org admins should invite into any workspace: rename message + document behavior.
  - If not: change check to explicit membership (`workspace_members` existence) rather than `hasWorkspaceRole` fallback.

### 2.3 Data integrity: `invitations.tenant_role` is still free-form in DB

Schema shown does not enforce a CHECK constraint on `invitations.tenant_role`.

Impact:
- Mostly data integrity / UI mismatch risk.
- Backend acceptance parses invalid values to `MEMBER`, so it’s not an obvious auth bypass.

Recommendation:
- Add a DB CHECK constraint for `tenant_role` matching tenant role enum values.

### 2.4 Policy duplication / drift risk remains

Some actions are governed by named capabilities (`canEditTask`), others are service-local checks (e.g., task delete uses “project LEAD OR workspace admin” directly).

Recommendation:
- Centralize action policies in `RbacService` (or a dedicated policy layer) with methods like:
  - `canDeleteTask(taskId)`
  - `canAddTaskAssignee(taskId)`
  - `canInviteToScopes(tenantId, workspaceIds, teamIds, projectId, tenantRoleToGrant)`

---

## 3) Suggested “safer RBAC” patterns (next step)

1) Replace “rank checks” at call sites with capability methods everywhere
   - Fewer implicit assumptions; more explicit bridges.

2) Query-level authorization for lists
   - Prefer repository methods that encode visibility rules (“projects visible to user in workspace”) to prevent accidental over-broad queries if a future service forgets filtering.

3) Explicit tenant context
   - Make tenant context a first-class input into authorization (header/JWT claim) instead of relying on `users.tenant_id` implicitly.

---

## 4) Quick re-answers (post-fixes)

- “Can Tenant Admin invite Workspace Admin?”
  - No (invites only grant tenant role; workspace/team/project memberships are always `MEMBER` on acceptance).

- “Can Workspace Member access Tasks outside assigned Projects?”
  - No (task reads require `canViewTask` and tenant-boundary validation).

- “Can Org Admin assign a different Project Lead during project creation?”
  - Yes (lead can be specified; must already be workspace member).

