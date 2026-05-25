# Re-analysis After Frontend Fix Plan (Current Status + Remaining Gaps)

Date: 2026-05-24  
Repo: `D:\hiveSpace`

This is a fresh pass after the recent frontend work (tenant header propagation, session-expired UX, RBAC UX improvements, API client hardening).

---

## 1) What is now fixed (verified in code)

### 1.1 Tenant context propagation end-to-end
- Client sets header on API calls:
  - `D:\hiveSpace\frontend\lib\api\client.ts` appends `X-Tenant-Id` (resolves from org store or persisted store).
- Next API proxy forwards it to Spring:
  - `D:\hiveSpace\frontend\app\api\[...path]\route.ts` forwards `X-Tenant-Id`.

### 1.2 Backend safely validates `X-Tenant-Id`
- Backend now checks:
  - if `X-Tenant-Id` is present, the authenticated user must actually be a member of that tenant
- File:
  - `D:\hiveSpace\backend\src\main\java\com\project\hiveSpace\security\RbacService.java`

### 1.3 Session-expired UX improved
- Protected-route client guard redirects unauthenticated users:
  - `D:\hiveSpace\frontend\hooks\useAuth.ts`
- Sign-in page shows toast for `?session_expired=true` and cleans URL:
  - `D:\hiveSpace\frontend\app\(public)\signin\page.tsx`

### 1.4 RBAC UX improvements delivered
- Workspace “Invite to Workspace” is gated behind admin capability and shows tooltip otherwise:
  - `D:\hiveSpace\frontend\app\(auth)\settings\members\page.tsx`
- Roles & Permissions page now clearly distinguishes persistence:
  - `Live` for tenant, `Model` for others:
    - `D:\hiveSpace\frontend\components\features\settings\roles\LevelTabs.tsx`
  - Informational alert for non-tenant tiers:
    - `D:\hiveSpace\frontend\components\features\settings\roles\LevelOverview.tsx`
  - Matrix badge indicates enforced vs simulated:
    - `D:\hiveSpace\frontend\components\features\settings\roles\CapabilityMatrix.tsx`

---

## 2) What is still NOT fully fixed (remaining issues)

### 2.1 Tenant uniqueness is still not DB-enforced case-insensitively (backend/DB)
Current backend:
- App-layer checks: `findByNameIgnoreCase`, `findBySlugIgnoreCase` + slug lowercasing.

What’s still missing:
- DB-level case-insensitive unique indexes (`lower(name)`, `lower(slug)`) or `citext`.

Impact:
- Case variants can still exist in Postgres, and app-layer checks can be bypassed in race conditions.

---

## 3) Frontend correctness / maintainability gaps

### 3.1 `apiFetch` resolves active tenant with `require(...)` + localStorage fallback
File:
- `D:\hiveSpace\frontend\lib\api\client.ts`

Current behavior:
- Tries `require("@/store/orgStore")` to access `useOrgStore.getState()`
- Falls back to parsing persisted Zustand state from `localStorage["hivespace-orgs"]`

Why this is a problem:
- `require(...)` inside an ESM Next.js app is brittle and can behave differently across bundlers/build modes.
- localStorage fallback can be stale (e.g., access revoked, org deleted, or user belongs to multiple tenants).

Recommended fix:
- Prefer a stable import path (no dynamic require) + store getter:
  - `import { useOrgStore } from "@/store/orgStore";`
  - `const activeTenantId = useOrgStore.getState().activeOrg?.id;`
- Keep localStorage fallback only if you have a clear “hydration gap” case.

### 3.2 Middleware still only checks token presence (not validity)
File:
- `D:\hiveSpace\frontend\middleware.ts`

Status:
- This is acceptable as a lightweight guard, but it still allows expired tokens to enter protected routes.

Mitigation already present:
- `useAuth` + `fetchUser` logic now handles invalid sessions and redirects.

---

## 4) Product/UX gaps that still cause “roles/permissions not working”

### 4.1 Roles page is still “tenant-live, others-simulated”
File:
- `D:\hiveSpace\frontend\app\(auth)\settings\roles\page.tsx`

Status:
- The new “Live vs Model” labeling makes this *clearer*, but it’s still not a fully functional RBAC manager for workspace/project/team/task.

Next steps if you want it truly functional:
- Add backend endpoints for workspace/project/team role mutations.
- Replace simulated UI role changes with API calls + query invalidation.

### 4.2 Multiple “member directory” pages can confuse testing
Examples:
- Workspace members: `D:\hiveSpace\frontend\app\(auth)\settings\members\page.tsx`
- Org “global” members: `D:\hiveSpace\frontend\app\(auth)\settings\global-members\page.tsx`

Risk:
- Team members may report issues on one page while others validate a different page.

Recommendation:
- Consolidate navigation (single source of truth) or add a clear tabbed UI.

---

## 5) Suggested next actions (short list)

1) Replace `require(...)` inside `apiFetch` with a stable store getter import.
2) Implement DB-level case-insensitive uniqueness for tenant slug/name (Postgres indexes or `citext`).
3) Decide if `/settings/roles` is informational or functional; if functional, implement missing backend endpoints for non-tenant role tiers.

