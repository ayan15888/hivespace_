# Remaining Work After “9 Fixes” (Partial Items + Roles/Permissions Page)

Date: 2026-05-24  
Repo: `D:\hiveSpace`

This report focuses on:
1) the fixes that were **only partially verified** in `D:\hiveSpace\TEAM_REPORTED_FIXES_VERIFICATION.md`, and  
2) why the **Roles & Permissions** page is perceived as “not working”, plus what to fix next.

---

## 1) Fix #3 is only app-level uniqueness (DB still allows case-variants)

### What is already implemented (current)
- App-layer checks:
  - `TenantRepository.findByNameIgnoreCase(...)` / `findBySlugIgnoreCase(...)`
    - `D:\hiveSpace\backend\src\main\java\com\project\hiveSpace\repository\TenantRepository.java`
  - Slug normalization:
    - `slug = toLowerCase().trim()`
    - `D:\hiveSpace\backend\src\main\java\com\project\hiveSpace\services\TenantService.java`

### What is still missing (needs fix)
- **True DB-level case-insensitive uniqueness**, otherwise Postgres can still store both:
  - `Acme` and `acme` (for `name`), and/or
  - `StartupX` and `startupx` (for `slug`)

### Recommended fix (choose one)
1) **Postgres functional unique indexes**:
   - `unique (lower(name))`
   - `unique (lower(slug))`
2) **Use `citext`** for `name`/`slug` columns + normal unique constraints

### Why this matters
- Race-condition safety: two concurrent creates can bypass app-layer check.
- Prevents spoofing/collision (“same org but different case”).

---

## 2) Fix #9 is only implemented on backend (frontend is not sending `X-Tenant-Id`)

### What is already implemented (current)
- Backend now reads tenant context from request headers:
  - `X-Tenant-Id` / `X-Tenant-ID`
  - `D:\hiveSpace\backend\src\main\java\com\project\hiveSpace\security\RbacService.java`

### What is still missing (needs fix)
- Frontend does **not** send `X-Tenant-Id` on API calls (no usage found in `frontend/`).
- So the backend still falls back to `user.getTenant()` most of the time.

### Required frontend change
- Add `X-Tenant-Id: activeOrg.id` (or equivalent “active tenant”) to your request pipeline:
  - Best centralized place: `D:\hiveSpace\frontend\lib\api\client.ts`

### Security hardening note (important)
Right now, `verifyResourceBelongsToTenant(resourceId, type)` trusts the header value enough to scope-check resources against it.

To avoid header spoofing becoming a bypass on any endpoint that only checks tenant scope:
- Validate that the authenticated user is actually a member of the `tenantId` coming from `X-Tenant-Id`
  - (e.g., `tenantMemberRepository.findByTenantIdAndUserId(tenantId, user.id)` must exist)
- If not a member, reject with 403 (or ignore header and fall back to the server-side tenant context).

---

## 3) “Roles & Permissions page is not working” — what’s actually happening

Page:
- `D:\hiveSpace\frontend\app\(auth)\settings\roles\page.tsx`

### 3.1 The page is designed as mixed “real + simulated”
Current behavior:
- **Tenant level role changes** (OWNER/ADMIN/MEMBER/BILLING_ADMIN) call the real backend:
  - `updateOrganizationMemberRole(...)` → `PUT /api/tenants/{tenantId}/members/{userId}/role`
- **Workspace / project / team / task levels** are **simulated in UI only**:
  - Role changes are stored in React state (`membersList`) and not persisted.
  - “Toggle permission” changes update `localLevelsData` only (no backend).

How this looks to users:
- “I change permissions/roles but nothing really changes in the app” (because it’s not wired to backend RBAC for non-tenant scopes).

### 3.2 The page hides most content unless you are OWNER/ADMIN
In `page.tsx`:
- Matrices and directories are shown only when `currentUserRole` resolves to `OWNER` or `ADMIN`.
- `currentUserRole` is derived from `useMembers()` output (tenant member list).

Failure modes that make it “look broken”:
- If `activeOrg` is not set yet, `useMembers()` returns `[]` → role becomes `MEMBER` → page shows only the static overview UI.
- If member list fetch fails, same result.

### 3.3 Settings sidebar also hides the “Roles & Permissions” link
Sidebar gating:
- `D:\hiveSpace\frontend\components\layout\SettingsSidebar.tsx`
  - it shows `/settings/roles` only when `usePermission().canManageMembers` is true.
  - `usePermission()` depends on `useActiveMembership()` which fetches org members.

Net effect:
- While org-membership data is still loading or errored, the link can disappear.

---

## 4) What needs to be fixed next (for Roles & Permissions page)

### P0 (make it “work” reliably)
1) Add an explicit loading/empty/error state in `page.tsx`:
   - If `apiLoading` or `activeOrg == null`, show “Loading org context…”
   - If `error`, show a clear message (and a retry button).
2) Don’t hide `/settings/roles` link completely while roles are loading:
   - Keep link visible but disabled (or show it and render “Not authorized” on the page).

### P1 (make it actually manage permissions, not just display them)
3) Decide the product contract:
   - Is this page informational only (matrix/guide), or should it actually manage roles at all levels?
4) If it should manage roles, add backend endpoints for:
   - workspace member role updates
   - project member role updates
   - team member role updates
   - task assignee role updates (if applicable)
5) Replace the “simulated” UI paths with real API calls + invalidate queries.

### P2 (align with new tenant-context header)
6) Once `X-Tenant-Id` is used, ensure the settings pages set/maintain the correct active org and that API calls include the header consistently.

