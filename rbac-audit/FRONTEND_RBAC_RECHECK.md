# Frontend RBAC Recheck (after your fixes)

Date: 2026-05-23  
Frontend root: `frontend/`  
Scope: verify whether the frontend changes you made fully address the prior RBAC migration findings, and identify remaining gaps/mismatches. (Analysis-only.)

---

## 1) Confirmed fixes (working improvements)

### 1.1 Invite API contract updated (tenantRole + multi-scope)
- `D:\project\hiveSpace_final\frontend\types\invite.ts`
  - Added `tenantRole`, `workspaceIds`, `teamIds`, `ProjectRole` typing.
  - Marked `pin` optional on response (creation-only).
- `D:\project\hiveSpace_final\frontend\lib\api\invites.ts`
  - Sends `tenantRole` (falls back to legacy `role` for compatibility).
  - Normalizes responses to keep `role` populated for legacy UI callers.
- `D:\project\hiveSpace_final\frontend\hooks\useInviteModal.ts`
  - Now generates **one invite per email** and uses `tenantRole` + `workspaceIds[]` + `teamIds[]`.

Status: core “old `role` field” breakage is addressed.

### 1.2 Mock sidebar role logic removed + UI gating added
- `D:\project\hiveSpace_final\frontend\components\layout\WorkspaceSidebar.tsx`
  - Removed `isProjectLead = true` mock and replaced with `usePermission()` gating (e.g., `canCreateProject`).
- `D:\project\hiveSpace_final\frontend\components\layout\SettingsSidebar.tsx`
  - Role-gates Billing group and hides Members/Roles links when `canManageMembers` is false.

### 1.3 Scope-isolated rank helpers added (no cross-scope rank map)
- `D:\project\hiveSpace_final\frontend\types\roles.ts`
  - Added `PROJECT_ROLES` and scope-specific rank helpers: `tenantRank`, `workspaceRank`, `projectRank`, `teamRank`.

### 1.4 Lead assignment support added in create flows
- `D:\project\hiveSpace_final\frontend\lib\api\projects.ts` / `D:\project\hiveSpace_final\frontend\lib\api\teams.ts`
  - Added `leadUserId?: string` in requests.
- `D:\project\hiveSpace_final\frontend\components\features\projects\CreateProjectModal.tsx`
- `D:\project\hiveSpace_final\frontend\components\features\teams\CreateTeamModal.tsx`
  - Added lead field support in payload.

### 1.5 Safer org switching behavior (prevents tenant-context mismatch)
- `D:\project\hiveSpace_final\frontend\components\layout\NavRail.tsx`
  - Org switching is now disabled (“coming soon”), avoiding misleading cross-tenant UI state.

### 1.6 Route auth guard added
- `D:\project\hiveSpace_final\frontend\middleware.ts`
  - Redirects unauthenticated users away from `/dashboard`, `/settings`, `/account`.

---

## 2) Remaining gaps / likely still broken (needs follow-up)

### 2.1 `usePermission()` currently derives tenant/workspace role incorrectly
- `D:\project\hiveSpace_final\frontend\hooks\usePermission.ts`
  - Uses `user.role` as `TenantRole` (`(user?.role as TenantRole)`).
  - Problem: `user.role` is typed as `UserRole = "USER" | "OWNER" | "ADMIN" | "MEMBER"` (`D:\project\hiveSpace_final\frontend\types\auth.ts`), which:
    - is not tenant-scoped (user can belong to multiple tenants)
    - cannot represent `BILLING_ADMIN`
  - Result: Billing admins likely never get `canAccessBilling = true`, and tenant role gating can be wrong when multiple orgs exist.

Also:
- `workspaceRole` exists in store but is never set:
  - `D:\project\hiveSpace_final\frontend\store\workspaceStore.ts` defines `workspaceRole` + `setWorkspaceRole`.
  - No frontend file calls `setWorkspaceRole(...)` (no usage found).
  - Result: workspace-level permissions (create project/team, admin workspace, etc.) will be wrong for most non-tenant-admin users.

Impact examples:
- A user who is **workspace ADMIN** but tenant MEMBER will likely see:
  - `canCreateProject === false`
  - `canAdminWorkspace === false`
  - team/project management controls hidden/disabled even though backend would allow.

### 2.2 Task listing still uses unscoped `getAllTasks()`
- `D:\project\hiveSpace_final\frontend\store\taskStore.ts`
  - `fetchTasks()` without `projectId` calls `getAllTasks()`.
- `D:\project\hiveSpace_final\frontend\app\(auth)\dashboard\tasks\page.tsx`
  - Calls `fetchTasks()` with no projectId on mount.

If backend RBAC is stricter now, this will produce 403s or inconsistent visibility; if backend accidentally allows it tenant-wide, it becomes an implicit “tenant-wide tasks directory”.

### 2.3 Project/task UI still lacks permission-aware UX for create/edit/delete
- `D:\project\hiveSpace_final\frontend\components\features\tasks\CreateTaskModal.tsx`
  - No gating based on project role (`LEAD`/`MEMBER`/`VIEWER`).
  - Users will be able to open/submit and then hit backend 403s.

### 2.4 Invite acceptance UI still doesn’t reflect multi-scope grants
- `D:\project\hiveSpace_final\frontend\app\(public)\invite\[orgSlug]\[token]\page.tsx`
- `D:\project\hiveSpace_final\frontend\app\(auth)\onboarding\page.tsx`
  - Now show `tenantRole || role` (good), but do not explain multi-scope invites:
    - `workspaceIds[]` / `teamIds[]` counts and/or names are not shown.
  - If a single invite includes multiple workspaces/teams, users won’t understand the granted access from the UI.

---

## 3) Recommended next steps (minimal, high-value)

1) Fix role derivation source-of-truth:
   - Tenant role should come from org membership (e.g., `useMembers()` for active org), not `user.role`.
   - Workspace role should come from `getWorkspaceMembers(activeWorkspace.id)` and be cached (TanStack Query), then written into `workspaceStore.workspaceRole` (or returned directly by a `useWorkspaceMembership()` hook).

2) Stop using `getAllTasks()` for “My Tasks”:
   - Replace with a backend-supported “my tasks” endpoint (ideal), or require explicit project scoping in the UI.

3) Add project-role based gating for task create/edit/delete:
   - At minimum, disable “Create Task” and show a reason when projectRole is `VIEWER`.

4) Update invite acceptance copy to reflect multi-scope invites:
   - Display counts of `workspaceIds` / `teamIds` and/or names if resolvable.

