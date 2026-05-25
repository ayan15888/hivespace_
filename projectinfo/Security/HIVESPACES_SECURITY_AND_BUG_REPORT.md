# HiveSpace Project Analysis (Scope/RBAC, Auth/Cookies, Frontend Bugs)

Date: 2026-05-24  
Repo root: `D:\hiveSpace`  
Scope: backend (`backend/`) + frontend (`frontend/`) + reported team issues.

---

## 0) Executive summary (what is most urgent)

### P0 — Security / authorization correctness
1) **Backend “resource scope” depends on `user.tenant` (single active tenant) while the data model supports multi-tenant membership.**
   - `backend/src/main/java/com/project/hiveSpace/security/RbacService.java` uses `getCurrentUser().getTenant().getId()` inside `verifyResourceBelongsToTenant(...)`.
   - Risk: if org switching is introduced (or `user.tenant` becomes stale), scope checks can become incorrect.

2) **Server-side authorization is not consistently expressed at the controller layer (no `@PreAuthorize`), and relies on per-service checks.**
   - Many services do the right checks today, but it’s easy to introduce regressions when new endpoints are added.
   - `backend/src/main/java/com/project/hiveSpace/security/SecurityConfig.java` enables method security, but the repo has no `@PreAuthorize` usage.

### P0 — Frontend correctness affecting “roles/permissions not working” perception
3) **Frontend `apiFetch()` always calls `response.json()` even when the backend returns `204 No Content`.**
   - This causes thrown errors on successful deletes, which typically surfaces as “toast error” even though the operation succeeded.
   - Example: `frontend/lib/api/client.ts` + endpoints like:
     - `backend/src/main/java/com/project/hiveSpace/controllers/TenantController.java` → `DELETE /api/tenants/{tenantId}/members/{userId}` returns 204
     - `backend/src/main/java/com/project/hiveSpace/controllers/TeamMemberController.java` → 204
     - `backend/src/main/java/com/project/hiveSpace/controllers/TaskAssigneeController.java` → 204

4) **Next.js route auth guard is currently not active because it’s implemented in `frontend/proxy.ts` (not in `middleware.ts`).**
   - Next.js only executes middleware from `middleware.ts` (or `src/middleware.ts`).
   - Result: “protected routes” are not actually protected at the routing layer in the current frontend build.

---

## 1) Architecture notes (as implemented)

### Backend
- Spring Boot 3.2.x, Java 17 (`backend/build.gradle`)
- JWT auth with Spring Security stateless filter
  - `backend/src/main/java/com/project/hiveSpace/security/JwtAuthenticationFilter.java`
  - `backend/src/main/java/com/project/hiveSpace/security/JwtService.java`
  - `backend/src/main/java/com/project/hiveSpace/security/SecurityConfig.java`
- RBAC helper exists in backend:
  - `backend/src/main/java/com/project/hiveSpace/security/RbacService.java`
  - Used directly in some services (example: `WorkspaceService`, `TeamMemberService`, `ProjectMemberService`, `TaskAssigneeService`)

### Frontend
- Next.js 16 app router (`frontend/package.json`)
- API proxy pattern:
  - `frontend/app/api/[...path]/route.ts` proxies `/api/*` to Spring, forwarding `Authorization`
- Auth token storage:
  - `frontend/store/authStore.ts` stores JWT in `localStorage` and also sets a JS-readable cookie `token=...`

---

## 2) Authorization + scope enforcement (backend)

### 2.1 “Scope issue” (tenant isolation) depends on `user.tenant`
`RbacService.verifyResourceBelongsToTenant(resourceId, type)` resolves scope using:
- `user.getTenant().getId()` (single “active” tenant on the `User` object)

Relevant code:
- `backend/src/main/java/com/project/hiveSpace/security/RbacService.java`
  - `verifyResourceBelongsToTenant(UUID resourceId, ResourceType type)`
  - `verifyResourceBelongsToTenant(UUID resourceId, ResourceType type, UUID tenantId)`

Why this matters:
- Your schema + logic already supports **membership rows** (`tenant_members`), which implies a user can belong to multiple tenants.
- If/when you enable org switching, any bug that leaves `user.tenant` stale can cause:
  - false positives (blocking legitimate access), or
  - false negatives (allowing cross-tenant access).

Recommended direction:
- Treat the “active tenant context” as an explicit input for requests (header/claim/path) and validate it, or
- Derive tenant scope from the resource itself + membership rows (and do not rely on a mutable `user.tenant` pointer).

### 2.2 Method-security is enabled but not used
`SecurityConfig` enables:
- `@EnableMethodSecurity(prePostEnabled = true)`

But the codebase contains **no `@PreAuthorize`** guards, so enforcement is “by convention” in services.

Recommendation:
- Standardize one approach:
  1) Use `@PreAuthorize("@rbac...")` in controllers for coarse gating, and still keep invariants in services, or
  2) Make every service method retrieve the actor and enforce consistently (and add tests around it).

### 2.3 Current RBAC implementation status (important discrepancy)
There is a repo file `SECURITY_SCOPE_FINDINGS.md` that states team/project membership endpoints have *no* authorization checks.

However, current code in this workspace shows authorization checks **are present** for team/project membership and also protect “last lead” invariants:
- `backend/src/main/java/com/project/hiveSpace/services/TeamMemberService.java`
- `backend/src/main/java/com/project/hiveSpace/services/ProjectMemberService.java`

Action:
- Re-validate the running backend revision vs the report file; that report looks stale relative to the code currently on disk.

---

## 3) Auth + cookies issues (frontend)

### 3.1 Token duplication: `localStorage` + JS cookie
`frontend/store/authStore.ts`:
- `localStorage.setItem("token", token);`
- `document.cookie = token=...; SameSite=Lax`

Issues:
- The cookie is **not HttpOnly**, so any XSS can steal it (same as localStorage).
- The cookie is used for route-guard logic (see `frontend/proxy.ts`), but API requests actually use `localStorage` for the `Authorization` header (`frontend/lib/api/client.ts`).
- This “two sources of truth” increases hard-to-debug auth bugs (cookie present but localStorage missing, etc.).

Recommendation:
- Pick one source of truth:
  - If using header-based JWT: rely on `localStorage` (or in-memory) and remove the cookie usage, **or**
  - If using cookie-based auth: switch backend to accept HttpOnly Secure cookies and avoid storing JWT in JS storage.

### 3.2 Route guard is likely not running
Auth guard logic exists in:
- `frontend/proxy.ts`

But Next.js middleware must be located at:
- `frontend/middleware.ts` (or `frontend/src/middleware.ts`)

Impact:
- Protected pages may be directly reachable; auth becomes “best effort” only at API call time.

Recommendation:
- Move/rename `frontend/proxy.ts` to `frontend/middleware.ts` (and adjust exports to Next’s middleware signature), or delete it if you don’t want route-level auth.

---

## 4) Reported functional bugs (root-caused to code)

### 4.1 “Owner creates team for a different lead → owner also becomes member”
Backend behavior is explicit:
- `backend/src/main/java/com/project/hiveSpace/services/TeamService.java` (`createTeam`)
  - If `leadUserId != null` and it’s not the creator, the creator is inserted as `TeamMemberRole.MEMBER`.

Why you see it:
- It’s implemented as default membership semantics.

Options to resolve (product decision):
- Option A (current): creator always becomes member unless they self-assign lead.
- Option B: creator becomes member only if UI checked “Add me to this team”.
- Option C: creator becomes `LEAD` by default, and “leadUserId” implies lead transfer (creator leaves team unless explicitly retained).

### 4.2 “Tenant is not unique”
Backend uniqueness checks exist but are case/collation dependent:
- `backend/src/main/java/com/project/hiveSpace/models/Tenant.java` uses unique constraints on `name` and `slug`.
- `backend/src/main/java/com/project/hiveSpace/services/TenantService.java` checks `findByName` / `findBySlug`.

Likely failure mode seen in practice:
- **Case differences** (`Acme` vs `acme`) are allowed in Postgres unique indexes by default.

Recommendation:
- Normalize at write time (lowercase slug; possibly case-fold name).
- Enforce with a functional unique index (e.g. `unique (lower(slug))`) in DB if using Postgres.

### 4.3 “Role and permission not working”
There are two distinct causes:

1) **Backend enforcement**: many endpoints do enforce via `RbacService`, but there’s no uniform controller-layer policy, so behavior can be inconsistent across endpoints as the code evolves.

2) **Frontend UX + logic mismatches**:
   - UI gating uses derived roles and can disagree with backend.
   - `frontend/hooks/usePermission.ts` derives `tenantRole` from `useMembers()` response, falling back to `user.role`.
     - `user.role` comes from backend `User.role` (`backend/src/main/java/com/project/hiveSpace/dto/UserResponse.java`) and is not tenant-scoped.
   - When the member list endpoints fail (or are restricted), `tenantRole` derivation can silently fall back to a wrong value, hiding UI actions incorrectly.

Recommendation:
- Make “active org membership role” a first-class query + cache, and make UI gating depend on that (not on `user.role`).

### 4.4 “Assign members to task not working”
Backend requires assignee to be a project member:
- `backend/src/main/java/com/project/hiveSpace/services/TaskAssigneeService.java`:
  - `Assignee must be a member of this project`

Most common root causes:
- The “member” exists in org/workspace but not in **project_members**.
- UI doesn’t clearly indicate this precondition and the error message may surface as a generic toast.

Recommendation:
- In UI, only show assignable users who satisfy project membership (or offer “Add to project and assign” flow).

### 4.5 “Toast problem when removing team member by lead shows toast error”
This is a concrete, reproducible frontend bug:
- Backend delete endpoints return `204 No Content` (correct REST semantics).
- `frontend/lib/api/client.ts` unconditionally does `return response.json();`
  - For 204, `response.json()` throws.
  - This becomes an error toast even though deletion succeeded.

Impacted calls include:
- `frontend/lib/api/orgs.ts` `removeOrganizationMember`
- `frontend/lib/api/teams.ts` delete member/team (and similar)
- `frontend/lib/api/tasks.ts` `removeTaskAssignee`

Recommendation:
- Fix `apiFetch` to handle 204 (return `null`) and allow callers to type accordingly.

---

## 5) Product/UX request from team (implementation notes)

### 5.1 Dedicated member management page near org settings
Requested:
- a dedicated “Members” page near org settings that:
  - supports owner/admin/team lead actions
  - supports “kick out from workspace” (remove workspace membership)

Current state:
- Tenant members page exists:
  - `frontend/app/(auth)/settings/members/page.tsx`
- Workspace member management is present at API level:
  - `backend/src/main/java/com/project/hiveSpace/controllers/WorkspaceController.java` (list)
  - but “kick out” (remove workspace member) UI + endpoint coverage should be checked/added as needed.

Recommendation:
- Define clear hierarchy of removals:
  - Remove from tenant (org) vs remove from workspace vs remove from team vs remove from project.
- Make UI show scope explicitly to avoid accidental removals.

---

## 6) Suggested next steps (prioritized)

### P0 (today)
1) Fix `apiFetch` 204 handling (stops false error toasts; reduces “permissions not working” confusion).
2) Activate Next middleware properly (rename/move `frontend/proxy.ts` → `frontend/middleware.ts` or remove).

### P1 (this week)
3) Normalize tenant slug/name uniqueness (case-folding + DB index strategy).
4) Make role source-of-truth explicit in frontend:
   - active org membership role
   - active workspace membership role

### P2 (hardening)
5) Adopt a consistent authorization strategy:
   - controller-level `@PreAuthorize` + service invariants + tests
6) Re-run/refresh the repo’s `SECURITY_SCOPE_FINDINGS.md` so it matches current code reality.

