# Verification of Team’s “9 Fixes” Report (Previous vs Current)

Date: 2026-05-24  
Repo: `D:\hiveSpace`  
Verification method: inspected current working tree files listed in the report + searched repo for referenced headers/guards.

Legend:
- **Verified** = implemented in code as described (or functionally equivalent)
- **Partially verified** = implemented, but with gaps/mismatches vs the claim
- **Not verified** = could not find in the codebase as claimed

---

## Fix 1: `apiFetch` crashes on `204 No Content`

Status: **Verified**

- **Previous behavior**: `frontend/lib/api/client.ts` always did `return response.json()`; calling an endpoint that returns `204` (typical for DELETE) throws, causing “error toast” despite success.
- **Current behavior**: `frontend/lib/api/client.ts` now checks `if (response.status === 204) return null;` before parsing JSON.

Evidence:
- `D:\hiveSpace\frontend\lib\api\client.ts`

---

## Fix 2: Next.js route protection and auth middleware

Status: **Verified**

- **Previous behavior**: route-guard logic lived in `frontend/proxy.ts` (not executed by Next.js middleware), so protected routes were not actually guarded at the router layer.
- **Current behavior**: `frontend/middleware.ts` exists and performs cookie token checks + redirects for `/dashboard`, `/settings`, `/account`, and also redirects authenticated users away from `/signin` + `/signup`. `frontend/proxy.ts` is deleted.

Evidence:
- `D:\hiveSpace\frontend\middleware.ts`
- `D:\hiveSpace\frontend\proxy.ts` (deleted)

Notes / risk:
- This middleware trusts the presence of a `token` cookie. It does not validate expiration/signature (that is still enforced by the backend).

---

## Fix 3: Case-insensitive tenant name and slug uniqueness

Status: **Partially verified** (app-layer check added; DB is still case-sensitive by default)

- **Previous behavior**: `TenantService.createTenant()` checked `findByName(...)` and `findBySlug(...)` (case-sensitive in typical Postgres setups).
- **Current behavior**:
  - `TenantRepository` adds `findByNameIgnoreCase(...)` and `findBySlugIgnoreCase(...)`.
  - `TenantService.createTenant()` now normalizes:
    - `name = trim()`
    - `slug = toLowerCase().trim()`
  - Then checks `findByNameIgnoreCase` / `findBySlugIgnoreCase` before inserting.

Evidence:
- `D:\hiveSpace\backend\src\main\java\com\project\hiveSpace\repository\TenantRepository.java`
- `D:\hiveSpace\backend\src\main\java\com\project\hiveSpace\services\TenantService.java`

Important gap vs the team’s claim:
- The report says “database-level case-insensitive unique constraint checks”. That is **not** present here.
  - Entity-level unique constraints in `Tenant.java` are still `unique(name)` and `unique(slug)`.
  - In Postgres, that does **not** prevent `Acme` vs `acme` unless you add a functional unique index (e.g. `unique (lower(slug))`) or use `citext`.

---

## Fix 4: Enforced tenant-scoped role source of truth (frontend)

Status: **Verified**

- **Previous behavior**: role derivation could fall back to `user.role`, which is not tenant-scoped and can be wrong in multi-tenant membership scenarios.
- **Current behavior**:
  - New hook `useActiveMembership()` fetches org member list and finds the active user’s membership.
  - `usePermission()` derives `tenantRole` strictly from `activeOrgMember` and defaults to `'MEMBER'` (no `user.role` fallback).

Evidence:
- `D:\hiveSpace\frontend\hooks\useActiveMembership.ts`
- `D:\hiveSpace\frontend\hooks\usePermission.ts`

Notes / risk:
- If the members list endpoint errors or is not authorized, the hook returns no membership and the UI will default to `'MEMBER'` (could hide admin UI even for admins). This is safer than privilege escalation, but may look like “permissions not working”.

---

## Fix 5: Task assignee requires project membership

Status: **Verified** (already enforced in backend; this report item is mostly a confirmation)

- **Previous behavior**: backend rejected assigning non-project members (pre-existing behavior in current repo state).
- **Current behavior**: still enforced via:
  - `TaskAssigneeService.addAssignee(...)` checks `hasProjectRoleForUser(..., ProjectMemberRole.VIEWER)`
  - Throws `IllegalArgumentException("Assignee must be a member of this project")` which should map to a clean 4xx via the global exception handler.

Evidence:
- `D:\hiveSpace\backend\src\main\java\com\project\hiveSpace\services\TaskAssigneeService.java`
- `D:\hiveSpace\backend\src\main\java\com\project\hiveSpace\exceptions\GlobalExceptionHandler.java` (maps common exceptions)

Note:
- Whether the UI “already correctly fetches project-specific members” was not fully proven here; it depends on the specific task UI pages and hooks.

---

## Fix 6: Team creator auto-join control

Status: **Verified**

- **Previous behavior**: when `leadUserId != null` and `leadUserId != creator`, `TeamService.createTeam()` always inserted:
  - lead as `LEAD`
  - creator as `MEMBER`
- **Current behavior**:
  - New DTO flag: `TeamRequest.addCreatorAsMember`
  - Logic now:
    - creator is auto-added only if:
      - no `leadUserId`, or `leadUserId == creator`, **or**
      - `addCreatorAsMember == true`

Evidence:
- `D:\hiveSpace\backend\src\main\java\com\project\hiveSpace\dto\TeamRequest.java`
- `D:\hiveSpace\backend\src\main\java\com\project\hiveSpace\services\TeamService.java`

---

## Fix 7: Removed duplicate JWT storage (single source of truth)

Status: **Verified** (but note: still a JS-readable cookie, not HttpOnly)

- **Previous behavior**:
  - JWT was stored in both:
    - `localStorage["token"]`
    - `document.cookie = token=...`
  - `apiFetch()` used `localStorage` for `Authorization` header.
- **Current behavior**:
  - `authStore.login()` only sets the cookie (no localStorage token).
  - `apiFetch()` reads the token from `document.cookie` and sets `Authorization`.

Evidence:
- `D:\hiveSpace\frontend\store\authStore.ts`
- `D:\hiveSpace\frontend\lib\api\client.ts`

Security note:
- The cookie is still **not** `HttpOnly`, so XSS can still steal it. This is not worse than localStorage, but it’s not the “secure-cookie” model either.

---

## Fix 8: Method-level security `@PreAuthorize` guards

Status: **Verified**

- **Previous behavior**: controllers relied on “service-layer checks” + `anyRequest().authenticated()`; no method-level guards were present.
- **Current behavior**: added `@PreAuthorize("@rbac...")` to several mutating endpoints:
  - tenant member role updates/removals
  - team create/update/delete
  - project create
  - task create/edit/delete
  - task assignee add/change/remove

Evidence (examples):
- `D:\hiveSpace\backend\src\main\java\com\project\hiveSpace\controllers\TenantController.java`
- `D:\hiveSpace\backend\src\main\java\com\project\hiveSpace\controllers\TeamController.java`
- `D:\hiveSpace\backend\src\main\java\com\project\hiveSpace\controllers\ProjectController.java`
- `D:\hiveSpace\backend\src\main\java\com\project\hiveSpace\controllers\TaskController.java`
- `D:\hiveSpace\backend\src\main\java\com\project\hiveSpace\controllers\TaskAssigneeController.java`

---

## Fix 9: Hardened active tenant context check (`X-Tenant-Id`)

Status: **Partially verified** (backend supports header; frontend is not sending it)

- **Previous behavior**: `verifyResourceBelongsToTenant(resourceId, type)` relied on `user.getTenant().getId()` as the tenant context.
- **Current behavior**:
  - `RbacService` now reads `X-Tenant-Id` (and `X-Tenant-ID`) from `HttpServletRequest` in `verifyResourceBelongsToTenant(resourceId, type)`.
  - If header is missing/invalid, it falls back to `user.getTenant().getId()`.

Evidence:
- `D:\hiveSpace\backend\src\main\java\com\project\hiveSpace\security\RbacService.java`

Critical gap:
- The frontend currently does **not** set `X-Tenant-Id` on requests (no occurrences found in `frontend/`).
  - This means the system still primarily relies on the fallback `user.tenant` unless another client sets the header.

Recommendation to complete this fix:
- Add `X-Tenant-Id: activeOrg.id` (or equivalent) in the frontend request pipeline (likely inside `frontend/lib/api/client.ts`).

---

## Summary table

| Fix | Claim | Status |
|---:|---|---|
| 1 | `apiFetch` handles 204 | **Verified** |
| 2 | Middleware + route guard | **Verified** |
| 3 | Case-insensitive tenant uniqueness | **Partially verified** (app-level only) |
| 4 | Tenant-scoped role source-of-truth | **Verified** |
| 5 | Task assignee requires project membership | **Verified** (already enforced) |
| 6 | Team creator auto-join control flag | **Verified** |
| 7 | Single JWT source-of-truth | **Verified** |
| 8 | `@PreAuthorize` guards | **Verified** |
| 9 | Tenant context via `X-Tenant-Id` | **Partially verified** (backend only) |
