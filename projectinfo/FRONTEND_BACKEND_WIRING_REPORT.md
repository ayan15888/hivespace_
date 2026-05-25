# Frontend ↔ Backend Wiring Report (HiveSpace)

Date: 2026-05-25  
Repo: `D:\hiveSpace`  
Frontend: `D:\hiveSpace\frontend` (Next.js)  
Backend: `D:\hiveSpace\backend` (Spring Boot)

This report answers: **how much of the frontend is actually wired to the backend**, what is fully working, what is partially wired (API exists but UX/gating incomplete), and what is not wired (dead endpoints / empty API modules / mismatched paths).

How this was checked:
- Enumerated frontend API wrappers under `frontend/lib/api/*`.
- Enumerated backend controllers under `backend/src/main/java/.../controllers/*`.
- Compared URL paths + HTTP methods + payload shape where visible.
- Spot-checked real UI usage for high-traffic flows (auth, org/workspace, project/team, tasks, invites).

---

## 1) Executive summary

### What is properly wired (core product loop)
- ✅ Auth: register/login/me/profile + GitHub login (API + usage)
- ✅ Tenant (org): create tenant, list my tenants, list members, update/remove member (API + usage)
- ✅ Workspaces: create, list by tenant, list members, add/remove/update member role (API exists; UI coverage partial)
- ✅ Projects: create + list by workspace; project membership add/remove/update; assign/unassign team; tasks CRUD + task assignees (API + usage)
- ✅ Teams: create/list/update/delete; team membership add/remove/update; get members (API + usage)
- ✅ Invites: generate, validate/get details, join, list invites by tenant, revoke (API + usage)

### What is partially wired
- ⚠️ Org switching (`POST /api/auth/switch-tenant`) exists in backend, but frontend does **not** call it (org switching UI is still disabled / “coming soon”).
- ⚠️ Roles & Permissions UI: tenant role changes persist, but most other tiers are presented as “model/simulated” in the UI (intentional now, but not full backend wiring).
- ⚠️ Workspace member management UX: backend endpoints exist and frontend wrappers exist, but the primary UI still leans on invites; “add existing tenant member to workspace” flow is not clearly implemented end-to-end.

### What is not wired / dead code
- ❌ `frontend/lib/api/github.ts`, `channels.ts`, `messages.ts`, `documents.ts`, `uploads.ts` are **empty files** (0 bytes).
- ❌ `frontend/lib/api/orgs.ts` has `joinOrganization()` pointing to `/api/invitations/accept/...` which does **not** exist in backend (legacy/unused).
- ❌ Shareable links: backend controller exists (`/api/projects/{id}/share`, `/api/share/{token}`) but frontend has **no API wrapper and no UI** that calls it.
- ❌ Team details endpoint: backend `GET /api/teams/{id}` exists but frontend has no wrapper/usage (frontend mainly uses workspace team list + members).

---

## 2) Wiring map by backend controller

Legend:
- **API wrapper** = there is a corresponding function in `frontend/lib/api/*`
- **UI usage** = there is at least one page/component that calls it (directly or via hooks)

### 2.1 Auth (`AuthController`)
Backend:
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/github`
- `GET /api/auth/me`
- `PUT /api/auth/profile`
- `POST /api/auth/switch-tenant`

Frontend:
- ✅ wrapper + usage for register/login/me/profile/github:
  - `D:\hiveSpace\frontend\lib\api\auth.ts`
  - used in:
    - `D:\hiveSpace\frontend\app\(public)\signin\page.tsx`
    - `D:\hiveSpace\frontend\app\(public)\signup\page.tsx`
    - `D:\hiveSpace\frontend\hooks\useAuth.ts`
- ⚠️ switch-tenant:
  - backend exists (`AuthController.switchTenant`)
  - frontend has **no wrapper and no usage**; org switching remains disabled in UI.

Status: **Mostly wired; org switching not wired**

---

### 2.2 Tenants (orgs) (`TenantController`)
Backend:
- `POST /api/tenants`
- `GET /api/tenants/me`
- `GET /api/tenants/{tenantId}/members`
- `PUT /api/tenants/{tenantId}/members/{userId}/role`
- `DELETE /api/tenants/{tenantId}/members/{userId}`

Frontend:
- ✅ wrappers:
  - `D:\hiveSpace\frontend\lib\api\orgs.ts`
- ✅ used in:
  - org store + hooks: `D:\hiveSpace\frontend\store\orgStore.ts`, `D:\hiveSpace\frontend\hooks\useOrgs.ts`
  - members/roles pages:
    - `D:\hiveSpace\frontend\app\(auth)\settings\members\page.tsx`
    - `D:\hiveSpace\frontend\app\(auth)\settings\roles\page.tsx`

Status: **Wired**

Note (legacy mismatch):
- `joinOrganization()` in `orgs.ts` calls `/api/invitations/accept/{inviteCode}` which is not implemented in backend.
  - Use invites flow (`/api/i/join`) instead. This is likely dead/legacy code.

---

### 2.3 Workspaces (`WorkspaceController`)
Backend:
- `POST /api/workspaces`
- `GET /api/workspaces/t/{tenantId}`
- `GET /api/workspaces/{workspaceId}/members`
- `POST /api/workspaces/{workspaceId}/members`
- `PATCH /api/workspaces/{workspaceId}/members/{userId}/role`
- `DELETE /api/workspaces/{workspaceId}/members/{userId}`

Frontend:
- ✅ wrappers exist for all of the above:
  - `D:\hiveSpace\frontend\lib\api\workspaces.ts`
- ✅ members listing UI exists and is permission-gated for “invite” action:
  - `D:\hiveSpace\frontend\app\(auth)\settings\members\page.tsx`
- ⚠️ add/remove/update workspace members:
  - wrappers exist, but UI flow for “add existing tenant member directly” is not clearly present; current UX centers around invite flow.

Status: **API wired; UX coverage partial**

---

### 2.4 Projects (`ProjectController`, `ProjectMemberController`, `ProjectTeamController`)
Backend:
- Projects:
  - `POST /api/workspaces/{workspaceId}/projects`
  - `GET /api/workspaces/{workspaceId}/projects`
  - `PUT /api/projects/{projectId}`
- Project members:
  - `GET /api/projects/{projectId}/members`
  - `POST /api/projects/{projectId}/members?userId=...&role=...`
  - `PUT /api/projects/{projectId}/members/{userId}/role?role=...`
  - `DELETE /api/projects/{projectId}/members/{userId}`
- Project-team assignment:
  - `POST /api/projects/{projectId}/teams` (body `{teamId}`)
  - `GET /api/projects/{projectId}/teams`
  - `DELETE /api/projects/{projectId}/teams/{teamId}`

Frontend:
- ✅ wrappers exist:
  - `D:\hiveSpace\frontend\lib\api\projects.ts`
- ✅ create project UI uses backend:
  - `D:\hiveSpace\frontend\components\features\projects\CreateProjectModal.tsx`
- ✅ task board pages fetch project members for task owner picker:
  - `D:\hiveSpace\frontend\components\features\tasks\CreateTaskModal.tsx`
  - `D:\hiveSpace\frontend\app\(auth)\dashboard\projects\[projectSlug]\board\page.tsx`

Status: **Wired**

Note:
- Backend also includes `ProjectDetailsController` with `PUT /api/projects/{id}` (duplicate route with `ProjectController` update). Frontend is not calling project update at all in current wrappers (no updateProject() wrapper). If you implement project editing UI, ensure you use only one update endpoint.

---

### 2.5 Teams (`TeamController`, `TeamMemberController`, `TeamDetailsController`)
Backend:
- Workspace teams:
  - `POST /api/workspaces/{workspaceId}/teams`
  - `GET /api/workspaces/{workspaceId}/teams`
  - `PUT /api/workspaces/{workspaceId}/teams/{teamId}`
  - `DELETE /api/workspaces/{workspaceId}/teams/{teamId}`
- Team members:
  - `GET /api/teams/{teamId}/members`
  - `POST /api/teams/{teamId}/members`
  - `PUT /api/teams/{teamId}/members/{userId}/role?role=...`
  - `DELETE /api/teams/{teamId}/members/{userId}`
- Team details:
  - `GET /api/teams/{id}`

Frontend:
- ✅ wrappers exist for workspace team CRUD + membership:
  - `D:\hiveSpace\frontend\lib\api\teams.ts`
- ✅ team creation UI uses backend:
  - `D:\hiveSpace\frontend\components\features\teams\CreateTeamModal.tsx`
- ❌ no wrapper for `GET /api/teams/{id}` (team details endpoint)

Status: **Mostly wired; team-details endpoint unused**

---

### 2.6 Tasks (`TaskController`, `TaskAssigneeController`)
Backend:
- Tasks:
  - `POST /api/projects/{projectId}/tasks`
  - `GET /api/projects/{projectId}/tasks`
  - `GET /api/tasks/{taskId}`
  - `GET /api/tasks`
  - `GET /api/tasks/{taskId}/activities` (live activity feed endpoint)
  - `PATCH /api/tasks/{taskId}/status`
  - `PUT /api/tasks/{taskId}`
  - `DELETE /api/tasks/{taskId}`
- Task assignees:
  - `GET /api/tasks/{taskId}/assignees`
  - `POST /api/tasks/{taskId}/assignees`
  - `PATCH /api/tasks/{taskId}/assignees/owner`
  - `DELETE /api/tasks/{taskId}/assignees/{userId}`

Frontend:
- ✅ wrappers exist for all (including `getTaskActivities`):
  - `D:\hiveSpace\frontend\lib\api\tasks.ts`
- ✅ used heavily by dashboard pages:
  - `D:\hiveSpace\frontend\components\features\tasks\CreateTaskModal.tsx`
  - `D:\hiveSpace\frontend\app\(auth)\dashboard\projects\[projectSlug]\board\page.tsx` (optimistic quick create, status updates, and live task activity log timeline rendering using `TaskActivityFeed`)

Status: **Wired**

Note:
- `GET /api/tasks` backend returns tasks by project memberships (not “tenant-wide”). Frontend should treat it as “My tasks across my projects” (current usage varies by page).

---

### 2.7 Invitations (`InvitationController`)
Backend:
- `POST /api/i/generate`
- `GET /api/i/validate`
- `GET /api/i/{token}`
- `GET /api/i/t/{tenantId}`
- `POST /api/i/join`
- `DELETE /api/i/{id}`

Frontend:
- ✅ wrappers exist for all:
  - `D:\hiveSpace\frontend\lib\api\invites.ts`
- ✅ used in:
  - invite acceptance page: `D:\hiveSpace\frontend\app\(public)\invite\[orgSlug]\[token]\page.tsx`
  - onboarding join flow: `D:\hiveSpace\frontend\app\(auth)\onboarding\page.tsx`
  - members settings invite generation: `D:\hiveSpace\frontend\app\(auth)\settings\members\page.tsx`

Status: **Wired**

---

### 2.8 Shareable links (`ShareableLinkController`)
Backend:
- `POST /api/projects/{id}/share`
- `GET /api/share/{token}`
- `PATCH /api/share/{id}/revoke`

Frontend:
- ❌ no wrapper in `frontend/lib/api/*`
- ❌ no UI usage found

Status: **Not wired**

---

### 2.9 Health (`HealthController`)
Backend:
- `GET /api/health`

Frontend:
- ❌ no wrapper/usage found

Status: **Not wired (optional)**

---

## 3) Wiring map by frontend `lib/api/*` modules

### 3.1 Fully wired modules
- `frontend/lib/api/auth.ts` ✅
- `frontend/lib/api/client.ts` ✅ (proxy + auth + tenant header)
- `frontend/lib/api/invites.ts` ✅
- `frontend/lib/api/orgs.ts` ✅ (except `joinOrganization`, which is legacy)
- `frontend/lib/api/projects.ts` ✅ (except no wrapper for project update-by-id usage in UI)
- `frontend/lib/api/tasks.ts` ✅
- `frontend/lib/api/teams.ts` ✅
- `frontend/lib/api/workspaces.ts` ✅

### 3.2 Empty / placeholder modules (not wired)
These files exist but contain no code (0 bytes), so the corresponding features are not actually integrated:
- `frontend/lib/api/github.ts` ❌
- `frontend/lib/api/channels.ts` ❌
- `frontend/lib/api/messages.ts` ❌
- `frontend/lib/api/documents.ts` ❌
- `frontend/lib/api/uploads.ts` ❌

---

## 4) Top wiring risks (what will break in real use)

1) **Duplicate/legacy endpoints in frontend**
   - `joinOrganization()` points to a non-existent backend route.
2) **Backend has feature endpoints without frontend**
   - Shareable links and team details endpoints exist, but frontend doesn’t call them.
3) **Org switching is not truly implemented**
   - Backend `/api/auth/switch-tenant` exists; frontend doesn’t use it, so multi-tenant UX is incomplete.
4) **Some pages are UI-first / simulated**
   - Roles & Permissions page includes intentional “Model” behavior for non-tenant tiers.

---

## 5) Practical completion checklist (recommended next steps)

1) Remove or fix legacy `joinOrganization()` in `frontend/lib/api/orgs.ts` (use invites flow).
2) Add a frontend wrapper for `/api/auth/switch-tenant` and enable org switching UI only when it works end-to-end.
3) Add `frontend/lib/api/share.ts` (or similar) for shareable links, then build minimal UI to generate/revoke and public page to read `/api/share/{token}`.
4) Delete empty `frontend/lib/api/*` modules or implement the backend for them (avoid misleading “wired” impression).

