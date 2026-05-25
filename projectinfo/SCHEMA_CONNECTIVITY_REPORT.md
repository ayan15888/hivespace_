# Schema Connectivity Report (CurrentSchema.md ↔ Backend ↔ Frontend)

Date: 2026-05-25  
Repo: `D:\hiveSpace`  
Schema reference: `D:\hiveSpace\CurrentSchema.md`  
Wiring reference: `D:\hiveSpace\FRONTEND_BACKEND_WIRING_REPORT.md`

This report maps **each table** in `CurrentSchema.md` to:
- backend controllers/services that operate on it, and
- whether the frontend has API wrappers + UI paths that exercise it.

Legend:
- ✅ **Connected (end-to-end)**: schema ⇄ backend endpoints ⇄ frontend wrappers/UI
- ⚠️ **Backend-connected only**: schema ⇄ backend, but not exposed/used from frontend
- ❌ **Not connected**: table exists but no clear backend usage in this repo snapshot

---

## 1) End-to-end connected tables (schema ⇄ backend ⇄ frontend)

### ✅ `tenants`
- Backend: `D:\hiveSpace\backend\src\main\java\com\project\hiveSpace\controllers\TenantController.java`
- Frontend: `D:\hiveSpace\frontend\lib\api\orgs.ts` + org store/hooks/pages

### ✅ `tenant_members`
- Backend: tenant membership listing + role updates + removal via `TenantController` / `TenantService`
- Frontend: members/roles pages consume `GET /api/tenants/{id}/members` and use role strings

### ✅ `users`
- Backend: auth/register/login/me/profile; membership mapping; invite acceptance writes tenant/workspace/team memberships for a user
- Frontend: session initialization + user profile; many UIs render user identity

### ✅ `workspaces`
- Backend: `D:\hiveSpace\backend\src\main\java\com\project\hiveSpace\controllers\WorkspaceController.java`
- Frontend: `D:\hiveSpace\frontend\lib\api\workspaces.ts` + workspace store/hooks/pages

### ✅ `workspace_members`
- Backend: list/add/remove/update-role are implemented in `WorkspaceController` + `WorkspaceService`
- Frontend: wrappers exist in `frontend/lib/api/workspaces.ts`; UI currently focuses on listing + invite gating (direct add/remove UI not clearly implemented)

### ✅ `projects`
- Backend: create/list/update via `ProjectController` (+ also `ProjectDetailsController` duplicates update route)
- Frontend: `D:\hiveSpace\frontend\lib\api\projects.ts` + CreateProjectModal + project pages

### ✅ `project_members`
- Backend: membership CRUD via `ProjectMemberController` / `ProjectMemberService`
- Frontend: wrappers exist in `frontend/lib/api/projects.ts`; used for task owner picker and project member awareness

### ✅ `teams`
- Backend: workspace-scoped CRUD via `TeamController`, and `GET /api/teams/{id}` via `TeamDetailsController`
- Frontend: wrappers exist for workspace-scoped CRUD in `frontend/lib/api/teams.ts` (team-details endpoint not wrapped/used)

### ✅ `team_members`
- Backend: membership CRUD via `TeamMemberController` / `TeamMemberService`
- Frontend: wrappers exist in `frontend/lib/api/teams.ts`

### ✅ `project_teams`
- Backend: assign/unassign/list teams on project via `ProjectTeamController` / `ProjectService`
- Frontend: wrappers exist in `frontend/lib/api/projects.ts`

### ✅ `tasks`
- Backend: create/list/update/status/delete via `TaskController` / `TaskService`
- Frontend: wrappers exist in `frontend/lib/api/tasks.ts` and used heavily on board/dashboard pages

### ✅ `task_activities`
- Backend: logged automatically on CRUD/status/assignee mutations in `TaskService`/`TaskAssigneeService` and exposed via `GET /api/tasks/{taskId}/activities` in `TaskController`.
- Frontend: wrapper `getTaskActivities` in `frontend/lib/api/tasks.ts` and rendered as a timeline feed in `TaskActivityFeed.tsx` on the project board page's task detail sheet.

### ✅ `task_assignees`
- Backend: assignee CRUD via `TaskAssigneeController` / `TaskAssigneeService` (and task creation adds OWNER)
- Frontend: wrappers exist in `frontend/lib/api/tasks.ts`

### ✅ `invitations`
- Backend: `InvitationController` / `InvitationService`
- Frontend: `frontend/lib/api/invites.ts` + invite acceptance + onboarding join flow

### ✅ `invitation_workspaces` / `invitation_teams`
- Backend: created/consumed by invitation flows in `InvitationService` (scope grants)
- Frontend: indirectly connected via invites (frontend doesn’t manage these tables directly; it calls invite endpoints)

---

## 2) Backend-connected only (schema ⇄ backend, but no frontend surface)

### ⚠️ `invitation_attempts`
Purpose (schema): track PIN attempts (rate limiting / audit).

Backend:
- Likely written/read in `InvitationService.acceptInvite(...)` (not exposed via controller).

Frontend:
- No endpoints to query attempts (as expected).

Status: **Backend-only (by design)**.

---

## 3) Not wired / missing from frontend (backend exists, frontend doesn’t use)

### ⚠️ `shareable_links`
Backend:
- Endpoints exist in `D:\hiveSpace\backend\src\main\java\com\project\hiveSpace\controllers\ShareableLinkController.java`:
  - `POST /api/projects/{id}/share`
  - `GET /api/share/{token}`
  - `PATCH /api/share/{id}/revoke`

Frontend:
- No `frontend/lib/api/*` wrapper and no UI usage found.

Status: **Backend exists but frontend not wired**.

---

## 4) Connectivity gaps and risks to address

1) **Project update endpoint duplication**
   - Backend exposes both:
     - `ProjectController.PUT /api/projects/{projectId}`
     - `ProjectDetailsController.PUT /api/projects/{id}`
   - Frontend currently has no `updateProject()` wrapper; when you add project editing UI, choose one endpoint and delete/merge the other.

2) **Workspace member mutation UX**
   - The schema + backend support direct workspace member add/remove/role change.
   - Frontend wrappers exist, but the main UI seems invite-centered; implement direct “add existing org member to workspace” to fully realize the schema.

3) **Task activities are stored but invisible**
   - The schema logs task activities, but there is no API or UI surface. This is a common “data exists but product feature missing” gap.

4) **Org switching is only partially implemented end-to-end**
   - Schema supports multi-tenant membership (`tenant_members`) + `users.tenant_id` active tenant pointer.
   - Backend has `POST /api/auth/switch-tenant`.
   - Frontend does not call it; org switching UI remains disabled. Add the wrapper + flow to connect this fully.

