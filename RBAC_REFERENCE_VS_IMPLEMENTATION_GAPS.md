# RBAC Reference (Team Doc) vs Current Implementation — Gap Analysis

Date: 2026-05-24  
Repo: `D:\hiveSpace`

You pasted a teammate “single source of truth” RBAC document (dated 2026-05-23). This file compares that document’s key claims to the **actual code in this repo** (backend + frontend) and lists what’s missing or divergent.

---

## 1) Tenant boundary enforcement (`verifyResourceBelongsToTenant`)

Status: **Mostly aligned (and improved)**

Doc claim:
- Every service method that accepts a resource UUID must call `rbacService.verifyResourceBelongsToTenant(...)`.
- Tenant context comes from `currentUser.tenant_id`.

Current implementation:
- Backend supports `X-Tenant-Id` header as the tenant context, and **validates** the user is a member of that tenant:
  - `D:\hiveSpace\backend\src\main\java\com\project\hiveSpace\security\RbacService.java`
- Frontend now sends `X-Tenant-Id` and proxy forwards it:
  - `D:\hiveSpace\frontend\lib\api\client.ts`
  - `D:\hiveSpace\frontend\app\api\[...path]\route.ts`

Notes:
- This is actually stronger than “`currentUser.tenant_id` only”, as long as membership validation remains in place (it is).

---

## 2) “Switch tenant” endpoint in the doc is not implemented

Doc specifies:
- `POST /api/auth/switch-tenant` should update active tenant and issue a new JWT.

Current repo:
- No `switch-tenant` endpoint exists (no controller/service reference found).

Impact:
- The system depends on “active tenant” correctness for scoping; org switching UX in frontend remains risky unless a real switch endpoint exists.

---

## 3) Workspace member management endpoints described in doc are missing

Doc endpoint map includes:
- `POST /api/workspaces/{id}/members`
- `PATCH /api/workspaces/{id}/members/{uid}/role`
- `DELETE /api/workspaces/{id}/members/{uid}`

Current backend:
- Only workspace member **listing** exists:
  - `GET /api/workspaces/{workspaceId}/members`
  - `D:\hiveSpace\backend\src\main\java\com\project\hiveSpace\controllers\WorkspaceController.java`
- There is **no** controller/service implementation for adding/removing/updating workspace members in this repo snapshot.

Impact:
- Any frontend flows that assume workspace-level membership management will be blocked or forced into “invite-only” flows.

---

## 4) Tenant member removal cascade described in doc is NOT implemented

Doc edge case:
- Removing a tenant member should cascade delete their workspace/project/team memberships and clean up task assignees, ownership, etc.

Current backend:
- `TenantService.removeMember(...)` only deletes `tenant_members` row and decrements counts:
  - `D:\hiveSpace\backend\src\main\java\com\project\hiveSpace\services\TenantService.java`
- No evidence in this service method of:
  - deleting `workspace_members`, `project_members`, `team_members`
  - cleaning up `task_assignees` or reassigning OWNER

Impact:
- “Removed from org” user may still appear in workspace/project/team member lists (depending on joins/queries).
- Orphaned memberships can cause authorization confusion and data integrity issues.

---

## 5) Team creation behavior diverges (creator auto-join is now optional)

Doc flow says:
- If leadUserId is provided and different from creator, creator is added as TEAM MEMBER.

Current backend:
- Team creation now supports `addCreatorAsMember` and will **not** add creator unless requested:
  - DTO: `D:\hiveSpace\backend\src\main\java\com\project\hiveSpace\dto\TeamRequest.java`
  - Logic: `D:\hiveSpace\backend\src\main\java\com\project\hiveSpace\services\TeamService.java`

Impact:
- The teammate doc needs updating to reflect the new product behavior.

---

## 6) Project creation still auto-adds creator (matches doc)

Doc flow:
- If a different lead is selected, creator becomes PROJECT MEMBER automatically.

Current backend:
- Still true:
  - `D:\hiveSpace\backend\src\main\java\com\project\hiveSpace\services\ProjectService.java`

Note:
- This is inconsistent with new Team behavior (creator auto-join optional). Decide if you want both to behave the same.

---

## 7) BILLING_ADMIN “no product access” is not fully enforced in frontend

Doc rules:
- BILLING_ADMIN should not access dashboard, member directory, etc.
- Should be redirected to billing only.

Current code:
- Backend blocks billing admins from viewing tenant member directory:
  - `D:\hiveSpace\backend\src\main\java\com\project\hiveSpace\services\TenantService.java` (billing admin excluded)
- Frontend does not appear to have a hard redirect that prevents BILLING_ADMIN from hitting `/dashboard`.
  - (Middleware currently checks only token presence.)

Impact:
- BILLING_ADMIN experience will likely be “lots of 403s” rather than a clean “billing-only” UX.

---

## 8) Endpoint map mismatches (minor but important)

Examples:
- Doc uses `PATCH` for some role change endpoints; current backend uses `PUT` query-param style in some places:
  - Project member role update:
    - Backend: `PUT /api/projects/{projectId}/members/{userId}/role?role=...`
    - `D:\hiveSpace\backend\src\main\java\com\project\hiveSpace\controllers\ProjectMemberController.java`
  - Team member role update:
    - Backend: `PUT /api/teams/{teamId}/members/{userId}/role?role=...`
    - `D:\hiveSpace\backend\src\main\java\com\project\hiveSpace\controllers\TeamMemberController.java`

Impact:
- Doc should be updated or it will mislead engineers and automated agents.

---

## 9) Recommendation: treat the teammate doc as “target spec”, not “current truth”

To make that document the true source of truth, you’ll need to implement the missing items (notably workspace membership management + switch-tenant + tenant removal cascade) and align team/project creation semantics.

