# Frontend Issues Analysis (HiveSpace / Next.js)

Date: 2026-05-24  
Repo: `D:\hiveSpace`  
Frontend root: `D:\hiveSpace\frontend`

This is an issue-focused review of the current frontend implementation: auth/session, API client, middleware/routing, RBAC UX, state/query patterns, and correctness gaps that commonly show up as “roles/permissions not working” or random UI errors.

---

## 1) Auth/session handling issues

### 1.1 JWT stored in a JS-readable cookie (security + reliability implications)
Current behavior:
- Login stores JWT into `document.cookie`:
  - `D:\hiveSpace\frontend\store\authStore.ts`
- API requests read cookie and send `Authorization: Bearer ...`:
  - `D:\hiveSpace\frontend\lib\api\client.ts`
- Middleware checks cookie existence to guard routes:
  - `D:\hiveSpace\frontend\middleware.ts`

Issues:
- Cookie is not `HttpOnly`; any XSS can read it (same class of risk as localStorage).
- Cookie is set without `Secure` / explicit `Domain`, so production behavior depends on deployment details.
- “Presence of token cookie” ≠ “valid session” (expired/invalid token still passes middleware redirect logic).

Recommended fix direction:
- Either:
  - keep header-based JWT and store it in memory (or localStorage) and accept the XSS tradeoff, OR
  - move to a true cookie-session model (HttpOnly + Secure) and stop constructing `Authorization` in JS.

---

## 2) API client issues (`apiFetch`)

### 2.1 204 handling fixed (good), but return typing is now inconsistent across callers
Current:
- `apiFetch` returns `null` for `204`:
  - `D:\hiveSpace\frontend\lib\api\client.ts`

Issue:
- Many API wrappers are typed as `Promise<void>` for deletes, but actually resolve `null`.
  - It “works” but TypeScript typing is now lying, and some code may still expect JSON.

Recommended fix:
- Make `apiFetch` generic and/or provide:
  - `apiFetchJson<T>()` and `apiFetchVoid()` helpers
  - so void endpoints never attempt JSON parsing and call sites are consistent.

### 2.2 Missing active-tenant header (backend supports it, frontend doesn’t use it)
Backend reads `X-Tenant-Id`, but frontend never sets it.
- No `X-Tenant-Id` usage found in `frontend/`.

Impact:
- Tenant scoping still relies on backend fallback (`user.tenant`) for most requests.

Fix:
- Add `X-Tenant-Id: activeOrg.id` in `D:\hiveSpace\frontend\lib\api\client.ts` by reading `useOrgStore.getState()` (Zustand supports direct store access outside React).

---

## 3) Middleware / routing issues

### 3.1 Middleware enforces “cookie exists” but not “token valid”
`D:\hiveSpace\frontend\middleware.ts` only checks `request.cookies.get('token')`.

Impact:
- Users with expired tokens still get routed to protected pages, then see API 401 errors.

Fix:
- Keep middleware simple (OK), but improve UX:
  - on 401 from `/api/auth/me`, auto-logout + redirect to `/signin`
  - show a clear “Session expired” screen.

---

## 4) RBAC UX and “roles/permissions not working” causes

### 4.1 Many components show privileged UI controls without gating
Example:
- Workspace members page always shows Invite button:
  - `D:\hiveSpace\frontend\app\(auth)\settings\members\page.tsx`

Impact:
- Non-admin users can click actions and get backend 403/400 → looks broken.

Fix:
- Wire UI gating to `usePermission()` (or a stricter per-scope permission hook).
- If action is blocked, hide it or disable it with a tooltip explaining why.

### 4.2 Roles & Permissions page is partly simulated (not fully “functional”)
`D:\hiveSpace\frontend\app\(auth)\settings\roles\page.tsx`:
- Tenant-level role updates call backend.
- Workspace/project/team/task role sections appear to be informational + simulated role changes in state.

Impact:
- Users expect changes to persist across app; they won’t (except tenant level).

Fix:
- Decide product intent:
  - informational matrix only, OR
  - full management UI (requires backend endpoints for workspace/project/team role updates).

### 4.3 Org and workspace context “loading gaps” can cause wrong gating
Stores default to `activeOrg: null` / `activeWorkspace: null`:
- `D:\hiveSpace\frontend\store\orgStore.ts`
- `D:\hiveSpace\frontend\store\workspaceStore.ts`

If a page renders before the stores are hydrated/populated:
- role derivation becomes “MEMBER” by default
- pages/links can disappear (sidebar gating) and it looks broken

Fix:
- Add consistent “context loader” at layout level:
  - ensure `useOrgs()` and `useWorkspaces()` run early (e.g., dashboard layout)
  - render a loading shell until `activeOrg` (and optionally `activeWorkspace`) are set.

---

## 5) Duplicated/overlapping member pages (confusing navigation)

Found two separate settings member pages:
- Workspace members: `D:\hiveSpace\frontend\app\(auth)\settings\members\page.tsx`
- Org-wide members view: `D:\hiveSpace\frontend\app\(auth)\settings\global-members\page.tsx`
- Another org members page also exists: `D:\hiveSpace\frontend\app\(auth)\settings\members\page.tsx` in older iterations of this repo (verify current routing usage).

Impact:
- Team may be testing different pages and thinking “members page broken”.

Fix:
- Consolidate into a clear IA:
  - `/settings/members` (org-level)
  - `/settings/workspace-members` (workspace-level)
  - Or a single page with tabs.

---

## 6) State management / persistence issues

### 6.1 Persisted stores can become stale across org changes
Zustand stores persist:
- `hivespace-orgs`
- `hivespace-workspaces`

Org switching is disabled in UI (“coming soon”), but the stores still persist old selections.

Impact:
- If org list changes or user loses access, stale `activeOrg` / `activeWorkspace` can cause 403s and “permissions not working”.

Fix:
- On org list refresh:
  - validate `activeOrg` still exists in returned list
  - if not, reset to first available org.
- On org change:
  - clear workspaces and activeWorkspace, then refetch.

---

## 7) Quick, high-value fixes (recommended order)

### P0 (unblocks most UX complaints)
1) Centralize context bootstrapping (activeOrg + activeWorkspace) in a layout.
2) Add permission gating / disable states to high-risk actions (invites, role changes, deletes).

### P1 (align frontend with backend hardening)
3) Add `X-Tenant-Id` header on all API calls (and ensure backend validates membership for the header tenant).
4) Split `apiFetch` into `json` vs `void` helpers for consistent typing.

### P2 (security/robustness)
5) Decide on cookie-auth vs header-auth model and implement properly (HttpOnly cookies if cookie-auth).

