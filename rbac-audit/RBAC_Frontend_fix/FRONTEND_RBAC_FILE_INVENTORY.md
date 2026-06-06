# Frontend RBAC Inventory (what is outdated / what must change)

Date: 2026-05-23  
Frontend root: `frontend/`

This is an evidence-driven inventory of frontend RBAC touchpoints that are currently incompatible with the updated backend RBAC + invitation model, plus the concrete updates required. (Analysis-only; no implementation.)

---

## A) Invitations (breaking API contract changes)

### DTO/types
- `frontend/types/invite.ts`
  - Problem: Uses `role` (old) instead of `tenantRole`.
  - Missing: `workspaceIds[]`, `teamIds[]` (and any multi-scope metadata).
  - Risk: Type system encourages incorrect payloads + incorrect rendering.
  - Required change: Redefine `InviteRequest`/`InviteResponse` to match backend fields; treat `pin` as optional except on create.

- `frontend/lib/api/invites.ts`
  - Problem: Sends/reads invite `role` field; expects old response shape.
  - Required change: Update payload to `tenantRole` + lists; update response typing usage.

### Invite creation UI
- `frontend/hooks/useInviteModal.ts`
  - Problem: Builds many invite payloads (1 per team/workspace/email) with `{ role }`.
  - Required change: Send one invite per email (or one shareable invite) using `{ tenantRole, workspaceIds, teamIds }`.
  - UX note: The modal copy implies “join org then gain access to this workspace”, but backend supports multiple workspaces/teams per invite.

- `frontend/components/common/InviteModal.tsx`
  - Problem: Copy implies single-workspace access; does not reflect multi-scope invites.
  - Required change: Update text to match multi-scope behavior and clarify tenant-role vs membership grants.

- `frontend/components/common/invite-modal/InviteLinkSection.tsx`
  - Problem: Always displays a PIN box; shareable PIN logic assumes PIN always exists.
  - Required change: PIN display should tolerate “not available” on list/history, and should clearly communicate PIN is only shown on creation.

- `frontend/components/common/invite-modal/WorkspaceSelectionSection.tsx` / `TeamSelectionSection.tsx`
  - Problem: Selection UI is fine structurally, but payload semantics are outdated (fed into old `{ workspaceId/teamId }` invites).
  - Required change: Feed selection into `workspaceIds[]` / `teamIds[]`.

### Invite history / settings
- `frontend/app/(auth)/settings/members/page.tsx`
  - Problems:
    - Creates invite via `generateInvite({ role: popoverRole })`.
    - Displays `roleLabel(normalizeTenantRole(link.role))`.
    - Assumes `pin` will exist on invite list/history.
  - Required change:
    - Swap to `tenantRole`.
    - Display included scopes (`workspaceIds`/`teamIds`) and avoid showing PIN unless present.

### Invite acceptance / onboarding
- `frontend/app/(public)/invite/[orgSlug]/[token]/page.tsx`
  - Problem: Renders invite details using `InviteResponse` with `role`, not `tenantRole`, and does not show scope grants.
  - Required change: Render tenant role + workspace/team scope grants; update typing and copy.

- `frontend/app/(auth)/onboarding/page.tsx`
  - Problem: Validation banner says “joining as {inviteDetails.role}”.
  - Required change: Use `tenantRole`; show scope grants; ensure slug/token validation still works.

---

## B) Route protection + navigation visibility (RBAC not enforced in UI)

- `frontend/components/layout/WorkspaceSidebar.tsx`
  - Problem: Hardcoded mock `isProjectLead = true`.
  - Problem: Create actions (workspace/project/team) are always visible/enabled.
  - Required change: Replace with real, scope-aware permission checks and show disabled/hidden states.

- `frontend/components/layout/SettingsSidebar.tsx`
  - Problem: Always displays Billing + Danger sections (and all settings links) regardless of tenant role.
  - Required change: Role-gate billing/danger sections (and any admin-only settings) using tenant role capabilities.

- `frontend/components/layout/NavRail.tsx` + `frontend/store/orgStore.ts`
  - Problem: “Switch org” is purely client-side and may not match backend tenant context used for authorization.
  - Required change: Align org switching with backend tenant context (or disable/guard switching until backend supports it).

- `frontend/app/(auth)/*` layouts/pages
  - Problem: No consistent route guard (no `middleware.ts`); pages assume auth/permissions.
  - Required change: Add route guard + consistent forbidden states.

---

## C) Projects / teams / tasks: action gating missing (relies on backend 403)

- `frontend/app/(auth)/dashboard/projects/[projectSlug]/page.tsx`
  - Problem: Allows team assignment/unassignment UI without checking whether actor can do it.
  - Required change: Gate “project settings” actions by capability (likely project lead/workspace admin/tenant owner/admin).

- `frontend/components/features/teams/ManageTeamSheet.tsx`
  - Problem: Always allows add/remove members, update member roles, delete team, update team metadata.
  - Required change: Gate by team lead/workspace admin/tenant override rules; provide disabled/hidden states.

- `frontend/components/features/tasks/CreateTaskModal.tsx`
  - Problem: Always allows create; backend may deny for project VIEWER.
  - Required change: Disable submit or hide trigger when actor can’t create tasks in selected project; show reason.

- `frontend/app/(auth)/dashboard/tasks/page.tsx` and `frontend/store/taskStore.ts`
  - Problem: `fetchTasks()` without a projectId calls `getAllTasks()` (tenant-wide/global). This is likely incompatible with stricter backend RBAC.
  - Required change: Replace with a backend-supported “my tasks” query (or require explicit project selection / scoped listing).

---

## D) Missing frontend role models (typing + normalization)

- `frontend/types/roles.ts`
  - Problem: Missing `PROJECT_ROLES` / `ProjectRole` even though `ProjectMemberResponse.role` exists (`LEAD`, `MEMBER`, `VIEWER`).
  - Risk: Stringly-typed role checks drift from backend; increases chance of accidental cross-scope comparisons.
  - Required change: Add `PROJECT_ROLES` + `ProjectRole`, and normalization helpers per scope.

- `frontend/hooks/usePermission.ts`
  - Problem: File is 0 bytes (placeholder).
  - Required change: Either implement a scoped permission layer (recommended) or remove to avoid false confidence.

- `frontend/lib/api/workspaces.ts`
  - Problem: `WorkspaceMemberResponse.email: string` but backend can redact `email` (nullable) for certain viewers.
  - Required change: Make it `string | null` and update UI callers accordingly.

---

## E) Lead assignment support (backend supports it, frontend doesn’t)

- `frontend/lib/api/projects.ts`
  - Problem: `ProjectRequest` missing `leadUserId`.
  - Required change: Add `leadUserId?: string`; update create UI to choose lead.

- `frontend/lib/api/teams.ts`
  - Problem: `TeamRequest` missing `leadUserId`.
  - Required change: Add `leadUserId?: string`; update create UI to choose lead.

- `frontend/components/features/projects/CreateProjectModal.tsx`
- `frontend/components/features/teams/CreateTeamModal.tsx`
  - Problem: No lead selection UI.
  - Required change: Add lead picker sourced from workspace members; validate selection.

---

## F) Recommended “done when” checklist (frontend RBAC support)

Invites:
- [ ] All invite code uses `tenantRole`, not `role`.
- [ ] Invite creation supports `workspaceIds[]`/`teamIds[]`.
- [ ] Invite list/history tolerates missing `pin`.
- [ ] Invite accept and onboarding display tenant role + scope grants.

Permissions:
- [ ] No mock role flags remain (e.g., `isProjectLead = true`).
- [ ] All create/manage/delete UI actions are gated by capability checks with clear UX.
- [ ] No cross-scope global rank map exists on frontend.

Tenant context:
- [ ] Org switching either changes backend tenant context or is disabled/guarded to prevent confusing 403s.

Tasks:
- [ ] “My Tasks” does not depend on `getAllTasks()` unless backend explicitly authorizes it.

