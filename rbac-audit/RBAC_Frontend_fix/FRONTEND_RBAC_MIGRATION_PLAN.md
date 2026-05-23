# Frontend RBAC Migration Plan (Fresh pass after backend RBAC changes)

Date: 2026-05-23  
Frontend root: `frontend/`

This document identifies required frontend updates to fully support the latest backend RBAC + invitation system as implemented in the current repo state. No frontend code changes are implemented here; this is analysis + a migration plan.

---

## 0) Backend RBAC changes that impact frontend (must be reflected in UI)

### 0.1 Invitations: tenant role + multi-scope grants
- `invitations.role` was renamed to `invitations.tenant_role` (tenant role grant only).
- New join-scope junction tables exist:
  - `invitation_workspaces(invitation_id, workspace_id)`
  - `invitation_teams(invitation_id, team_id)`
- Backend invite DTOs now accept/return:
  - request: `tenantRole` (not `role`)
  - request: `workspaceIds?: string[]`, `teamIds?: string[]` (plus legacy `workspaceId/teamId` for compatibility)
  - response: `tenantRole`, `workspaceIds[]`, `teamIds[]` (and legacy `workspaceId/teamId`)
- `pin` is creation-time sensitive: backend typically returns the plain PIN only when an invite is created (list/history views should not assume the PIN is present).

### 0.2 Authorization is enforced server-side (expect 403s)
- Many endpoints now hard-fail with `403` when the actor lacks membership/capability.
- Many endpoints enforce a tenant boundary (resource must belong to the user’s tenant context on the backend).

### 0.3 Creator / lead rules
- Project/team creation supports `leadUserId` (optional).
- Backend validates lead assignment (e.g., lead must already be a member of the workspace).

### 0.4 Scope isolation (architectural constraint)
- Roles from different scopes must not be compared using one global rank map (tenant/workspace/project/team/task are separate).
- Cross-scope “override” behavior must be expressed explicitly as an authorization rule (e.g., tenant OWNER bypass) rather than as implicit numeric rank.

---

## 1) Required frontend changes (complete list)

### 1.1 Update invite types + API contract (breaking)

Current frontend uses the old invite shape:
- `InviteRequest.role` / `InviteResponse.role`
- no support for `workspaceIds[]` / `teamIds[]`

Required changes:
- Rename role fields everywhere: `role` → `tenantRole`.
- Add multi-scope fields:
  - request: `workspaceIds?: string[]`, `teamIds?: string[]`
  - response: `workspaceIds: string[]`, `teamIds: string[]`
- Treat `pin` as “returned on create”, not guaranteed on list/history.

Primary files:
- `frontend/types/invite.ts`
- `frontend/lib/api/invites.ts`

### 1.2 Refactor invite creation UI logic to match new multi-scope model

Current behavior (`useInviteModal`):
- builds many separate invite payloads (1 per workspace/team/email)
- uses `role`, not `tenantRole`

Required changes:
- Send one invite per email (or one shareable invite) with:
  - `tenantRole`
  - `workspaceIds` and/or `teamIds`
- Update the invite modal copy to not imply “workspace-only” when team/workspace lists are selected.

Primary file:
- `frontend/hooks/useInviteModal.ts`

Secondary files (must be updated to avoid misleading users):
- `frontend/components/common/InviteModal.tsx`
- `frontend/components/common/invite-modal/*` (selection sections)

### 1.3 Update invite acceptance + onboarding flows to display real scopes

Current behavior:
- Invite accept screens show `inviteDetails.role`, implying a single role grant only.

Required changes:
- Replace `inviteDetails.role` → `inviteDetails.tenantRole`.
- Display workspace/team scope grants (counts and/or names):
  - “You’ll be added to X workspaces and Y teams”
- Ensure UI doesn’t break if `pin` is not present on non-create invite responses.

Primary files:
- `frontend/app/(public)/invite/[orgSlug]/[token]/page.tsx`
- `frontend/app/(auth)/onboarding/page.tsx`

### 1.4 Remove mock role logic and gate UI actions with real permissions

High-risk current issues:
- `WorkspaceSidebar` has `const isProjectLead = true; // Use mock role for now`
- Project/team/task management UI is largely always-on and relies on backend 403s.

Required changes:
- Replace mock values with derived, scope-aware permissions.
- Hide or disable UI actions where backend will deny:
  - Create workspace/project/team
  - Manage members / change roles
  - Assign/unassign teams to projects
  - Add/remove team members; promote/demote leads
  - Delete tasks / bulk delete

Primary files:
- `frontend/components/layout/WorkspaceSidebar.tsx`
- `frontend/components/layout/SettingsSidebar.tsx`
- `frontend/components/features/teams/ManageTeamSheet.tsx`
- `frontend/app/(auth)/dashboard/projects/[projectSlug]/page.tsx`
- `frontend/app/(auth)/dashboard/tasks/page.tsx`
- `frontend/components/features/tasks/CreateTaskModal.tsx`

### 1.5 Implement missing scoped role models on frontend (types + helpers)

Current problems:
- `frontend/types/roles.ts` lacks `PROJECT_ROLES`, forcing project roles to be treated as untyped `string`.
- There is no workspace/project/team/task permission utility layer; `frontend/hooks/usePermission.ts` is empty.

Required changes:
- Add `PROJECT_ROLES` + `ProjectRole` union.
- Add normalization helpers per scope (tenant/workspace/project/team/task assignee).
- Implement or remove `frontend/hooks/usePermission.ts`; replace with scoped hooks/utilities.

Primary files:
- `frontend/types/roles.ts`
- `frontend/hooks/usePermission.ts` (currently 0 bytes)
- `frontend/lib/permissions/*` (new modules recommended; see section 3)

### 1.6 Support lead assignment during create project/team (backend capability exists)

Current problems:
- Frontend `ProjectRequest` and `TeamRequest` lack `leadUserId`.
- Create modals have no UI to choose lead (and no membership validation UI).

Required changes:
- Add `leadUserId?: string` to:
  - `frontend/lib/api/projects.ts` `ProjectRequest`
  - `frontend/lib/api/teams.ts` `TeamRequest`
- Update create modals to:
  - allow selecting a lead from workspace members
  - warn/block selecting non-members (backend will reject anyway)

Primary files:
- `frontend/lib/api/projects.ts`
- `frontend/lib/api/teams.ts`
- `frontend/components/features/projects/CreateProjectModal.tsx`
- `frontend/components/features/teams/CreateTeamModal.tsx`

### 1.7 Fix “active org/tenant” semantics (backend tenant boundary vs UI org switch)

Current risk:
- UI switches `activeOrg` via Zustand (`NavRail`), but backend tenant-boundary checks rely on backend tenant context.
- This can cause consistent 403s after switching orgs, even if the user is a member.

Required changes depend on backend support:
- If backend supports switching active tenant context: call it when switching org.
- If it doesn’t: treat org switching as “selection only” and block/disallow cross-tenant navigation until supported (or add a tenant context header that backend accepts and validates).

Primary files:
- `frontend/components/layout/NavRail.tsx`
- `frontend/store/orgStore.ts`
- `frontend/store/workspaceStore.ts`

### 1.8 Route protection and “403-first” UX

Current state:
- No `frontend/middleware.ts`.
- Auth guarding is inconsistent; many pages assume access and fail via 403 after rendering.

Required changes:
- Add a consistent auth gate (middleware or layout guard):
  - unauthenticated → `/signin`
  - authenticated but no org/tenant membership → `/onboarding`
- Standardize forbidden UX:
  - show a clear “no permission” state (not just toasts / empty panels)
  - prefer disabling/hiding controls the user can’t use.

---

## 2) Files/components/hooks that need modification (high confidence)

### Invitations (DTO + UI)
- `frontend/types/invite.ts`
- `frontend/lib/api/invites.ts`
- `frontend/hooks/useInviteModal.ts`
- `frontend/app/(auth)/settings/members/page.tsx`
- `frontend/app/(public)/invite/[orgSlug]/[token]/page.tsx`
- `frontend/app/(auth)/onboarding/page.tsx`
- `frontend/components/common/InviteModal.tsx`
- `frontend/components/common/invite-modal/InviteLinkSection.tsx`

### Navigation / route gating
- `frontend/components/layout/NavRail.tsx` (org switch semantics)
- `frontend/components/layout/WorkspaceSidebar.tsx` (mock RBAC + always-on create actions)
- `frontend/components/layout/SettingsSidebar.tsx` (billing/danger sections should be role-gated)
- `frontend/middleware.ts` (recommended to add) OR `frontend/app/(auth)/layout.tsx` gate

### Teams / projects / tasks (controls must match backend capabilities)
- `frontend/components/features/teams/ManageTeamSheet.tsx`
- `frontend/app/(auth)/dashboard/projects/[projectSlug]/page.tsx`
- `frontend/components/features/tasks/CreateTaskModal.tsx`
- `frontend/app/(auth)/dashboard/tasks/page.tsx` (global fetch + destructive actions)

### Types / permission primitives
- `frontend/types/roles.ts` (add `PROJECT_ROLES`)
- `frontend/hooks/usePermission.ts` (currently empty; implement scoped permission approach)
- `frontend/lib/permissions/tenant.ts` (keep but align with backend role semantics)

### API typings likely to need alignment
- `frontend/lib/api/workspaces.ts`: `WorkspaceMemberResponse.email` should be `string | null` (backend can redact email for non-admin viewers)
- `frontend/lib/api/projects.ts`: `ProjectRequest.leadUserId?: string`
- `frontend/lib/api/teams.ts`: `TeamRequest.leadUserId?: string`

---

## 3) Recommended frontend permission architecture (scalable, scope-safe)

### 3.1 Capability-based API (mirrors backend and avoids cross-scope rank bugs)

Create `frontend/lib/permissions/` modules by scope:
- `tenant.ts` (already exists)
- `workspace.ts`
- `project.ts`
- `team.ts`
- `task.ts`

Pattern:
- capability functions take explicit inputs (tenantRole + scopeRole + ownership flags), no global rank:
  - `canInviteToOrg(tenantRole)`
  - `canCreateProject({ tenantRole, workspaceRole })`
  - `canManageProjectTeams({ tenantRole, workspaceRole, projectRole })`
  - `canCreateTask({ tenantRole, workspaceRole, projectRole })`
  - `canDeleteTask({ tenantRole, workspaceRole, projectRole, isTaskOwner })`

If tenant OWNER should override: encode it explicitly in the capability function.

### 3.2 Membership context hooks (TanStack Query cached)

Frontend needs the current user’s role per scope to drive UI.

Recommended hooks:
- `useTenantMembership(tenantId)`
- `useWorkspaceMembership(workspaceId)`
- `useProjectMembership(projectId)`
- `useTeamMembership(teamId)`

Implementation note:
- Prefer an eventual backend endpoint like `/api/me/memberships` or `/api/me/capabilities` to avoid N+1 membership fetches. Until then, derive from existing membership endpoints, cached by ID.

### 3.3 Standard guard components

Add reusable components:
- `<RequireAuth />` (route-level)
- `<RequirePermission can reason />` (UI-level)
- `<ForbiddenState />` and `<EmptyState />`

### 3.4 Consistent 403 handling

Current `apiFetch` throws generic errors. Recommended:
- Detect 401/403 and return structured error shape (or wrap errors) so UI can render permission states, not just toast.

---

## 4) Security + UX risks caused by outdated RBAC logic

1) Broken or incorrect invites:
- Frontend sends `{ role }` while backend expects `{ tenantRole, workspaceIds, teamIds }`.
- Users are shown a role label that no longer matches what the backend grants.

2) Scope confusion:
- UI currently communicates “workspace invite” but backend can attach multiple workspaces/teams to a single invite.

3) Persistent 403 spam:
- Many controls are visible to everyone; backend denies -> confusing UX, hard to distinguish “missing check” vs “expected denial”.

4) Org switching mismatch:
- UI allows selecting an org, but backend tenant boundary may not switch; user experiences forbidden errors in random places.

5) Over-broad task fetch assumptions:
- `useTaskStore.fetchTasks()` without a projectId calls `getAllTasks()`.
- If backend forbids it: noisy failures.
- If backend allows it tenant-wide: implicit “tenant-wide task directory” risk (least-privilege).

---

## 5) Recommended migration order (lowest risk → highest impact)

1) Update invite DTO/types + all invite UI usage (`tenantRole`, `workspaceIds`, `teamIds`).
2) Add `ProjectRole` typing + scoped permission primitives (no global rank map).
3) Implement membership context hooks + caching.
4) Apply permission guards to nav/sidebar/settings and high-friction actions (create/delete/invite/manage).
5) Fix org switching semantics to match backend tenant context (or disable until supported).
6) Replace global task listing usage with a safe “my tasks” strategy (API-backed).

