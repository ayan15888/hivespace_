# Frontend Alignment Review vs References

Date: 2026-05-24  
Repo: `D:\hiveSpace`

References compared:
- Schema: `D:\hiveSpace\CurrentSchema.md`
- RBAC spec: `D:\hiveSpace\projectinfo\reference\Hivespace_roles_&_permissions_reference.md`
- Task/lead spec: `D:\hiveSpace\projectinfo\reference\Hivespace_task_&_lead_flow_reference.md`

This answers: **Is the frontend aligned with these references?**  
Short answer: **partially aligned** — core flows exist, but there are several concrete mismatches/gaps.

---

## 1) Tenant uniqueness / schema alignment (tenants)

Schema (`CurrentSchema.md`) includes:
- `tenants.slug` has `CHECK (slug = lower(slug))`
- `name` and `slug` are `UNIQUE`
- `owner_id uuid` FK exists (optional, nullable)

Frontend alignment:
- ✅ Frontend generally treats tenant “slug” as lowercase-friendly (invite URLs are lowercase in examples).
- ⚠️ Frontend does not enforce `slug` lowercase itself at input time (org create UI logic not validated here), but backend normalizes slug to lowercase (current backend code).

Net: **Aligned enough** (backend is the primary enforcement point).

---

## 2) Tenant boundary enforcement (active tenant context)

RBAC spec requires strict tenant boundary; task/lead spec expects tenant chain verification before operations.

Frontend alignment:
- ✅ `X-Tenant-Id` is now attached on API calls:
  - `D:\hiveSpace\frontend\lib\api\client.ts`
- ✅ Next API proxy forwards it:
  - `D:\hiveSpace\frontend\app\api\[...path]\route.ts`

Net: **Aligned** with a multi-tenant “active tenant context” model.

---

## 3) Org switching flow (RBAC spec)

RBAC spec includes an explicit flow:
- `POST /api/auth/switch-tenant` to switch active tenant, issue new JWT, then frontend updates state.

Frontend alignment:
- ❌ Not aligned to the spec (no implemented switch-tenant flow).
  - UI currently indicates “Switching organizations coming soon”:
    - `D:\hiveSpace\frontend\components\layout\NavRail.tsx`
  - Frontend does load orgs and sets an active org, but does not actually switch via backend.

Impact:
- Spec says “do not client-side switch without backend endpoint”; frontend currently avoids switching (disabled) — so it’s safe, but **not feature-complete**.

---

## 4) BILLING_ADMIN UX restrictions (RBAC spec)

RBAC spec says BILLING_ADMIN must:
- only see Billing
- dashboard inaccessible (redirect)
- no sidebar navigation

Frontend alignment:
- ✅ Settings sidebar billing visibility is gated:
  - `D:\hiveSpace\frontend\components\layout\SettingsSidebar.tsx` uses `canAccessBilling`
- ❌ No hard redirect that blocks BILLING_ADMIN from `/dashboard` routes.
  - `D:\hiveSpace\frontend\middleware.ts` checks only token presence.
  - `D:\hiveSpace\frontend\hooks\useAuth.ts` checks auth state, not billing-only role.

Net: **Not aligned** for BILLING_ADMIN experience (likely a “403-heavy” UX).

---

## 5) Workspace membership management (RBAC spec vs reality)

RBAC spec describes:
- workspace member add/remove/role change flows
- “member picker shows TENANT members not in workspace”

Schema supports:
- `workspace_members` membership table (yes)

Frontend alignment:
- ✅ Frontend can list workspace members:
  - `D:\hiveSpace\frontend\lib\api\workspaces.ts` → `getWorkspaceMembers`
  - `D:\hiveSpace\frontend\app\(auth)\settings\members\page.tsx`
- ✅ Frontend now gates “Invite to Workspace” by `canAdminWorkspace`:
  - `D:\hiveSpace\frontend\app\(auth)\settings\members\page.tsx`
- ❌ Frontend does not implement “Add existing tenant member to workspace” flow using workspace membership endpoints.
  - The UI uses an invite modal, which is a different flow than the spec’s workspace member add flow.

Reason (root cause):
- Backend in this repo snapshot does not expose workspace member mutation endpoints (spec expects them).

Net: **Not aligned** to the RBAC spec’s workspace member management flow.

---

## 6) Project lead assignment flow (task/lead spec)

Spec requirements:
- CreateProjectModal should:
  - fetch workspace members as lead candidates
  - validate date ordering (end after start)
  - show inline error on “lead not workspace member”

Frontend implementation:
- ✅ Fetches workspace members:
  - `D:\hiveSpace\frontend\components\features\projects\CreateProjectModal.tsx` calls `getWorkspaceMembers(activeWorkspace.id)`
- ⚠️ No “end date after start date” validation in the UI.
- ❌ No inline error mapping for backend’s 400 “Assigned lead must be a workspace member first”.
  - Errors are shown via a generic toast only.

Net: **Partially aligned** (data sourcing matches, UX/error handling does not).

---

## 7) Team lead assignment flow (task/lead spec) vs current backend behavior

Spec states:
- If `leadUserId` differs from creator, creator becomes TEAM MEMBER automatically (dual row).

Frontend implementation:
- Sends `leadUserId` and `projectId` as expected:
  - `D:\hiveSpace\frontend\components\features\teams\CreateTeamModal.tsx`
  - `D:\hiveSpace\frontend\lib\api\teams.ts`

Mismatch with current backend:
- Backend now introduced `addCreatorAsMember` flag for teams.
- Frontend does **not** send `addCreatorAsMember`.

Impact:
- According to current backend logic, creator may **not** be added to the team when choosing another lead (unless default backend behavior still adds them, or the flag defaults true — in this repo it does not).
- This directly conflicts with the spec document’s “dual row always created”.

Net: **Not aligned** (team creation semantics changed; frontend/spec not updated together).

---

## 8) Task creation flow (task/lead spec)

Spec requirements:
- Quick create should use optimistic UI (ghost card) and rollback on failure.
- Owner assignment rules:
  - if assignee selected, verify assignee is project member
  - creator should not be auto-added as collaborator when assigning owner to someone else
- Show task identifier `HS-{sequence}`

Frontend implementation:
- ✅ Optimistic quick create exists:
  - `D:\hiveSpace\frontend\app\(auth)\dashboard\projects\[projectSlug]\board\page.tsx` creates a `temp-...` optimistic task and replaces it on success.
- ✅ Modal create loads project members and allows optional owner selection:
  - `D:\hiveSpace\frontend\components\features\tasks\CreateTaskModal.tsx`
- ✅ Task identifier display is present in multiple UIs:
  - `D:\hiveSpace\frontend\app\(auth)\dashboard\projects\[projectSlug]\board\page.tsx` uses `task.taskIdentifier || task.id.slice(0, 8)`
  - `D:\hiveSpace\frontend\app\(auth)\dashboard\tasks\page.tsx` shows `task.taskIdentifier || task.id.slice(0, 8)`

Gaps:
- ⚠️ UI role gating for create-task is implemented in the modal, but other entry points may still allow opening the modal and only fail after the API call (depends on page).
- ⚠️ Error handling is mostly toast-based; spec expects more contextual inline errors in some cases.

Net: **Mostly aligned** (core mechanics match).

---

## 9) Invite validation / acceptance flow

Spec:
- `GET /api/i/validate?token=...&orgSlug=...` before PIN submit
- invite link stores pending token in sessionStorage if user is logged out

Frontend implementation:
- ✅ SessionStorage bridge exists:
  - `D:\hiveSpace\frontend\app\(public)\invite\[orgSlug]\[token]\page.tsx`
  - `D:\hiveSpace\frontend\app\(auth)\onboarding\page.tsx`
- ⚠️ Invite page uses `GET /api/i/{token}` (`getInviteDetails`) rather than always using `/validate`.
  - There is a `validateInvite(...)` helper in `D:\hiveSpace\frontend\lib\api\invites.ts`, but it is not used in the invite page.

Impact:
- Functionally similar (backend `/api/i/{token}` returns details), but does not strictly follow the “validate endpoint” flow in the reference doc.

Net: **Partially aligned**.

---

## 10) Summary: alignment scorecard

**Aligned / mostly aligned**
- Tenant header propagation + proxy forwarding
- Task quick create optimistic behavior
- Task identifier display (if backend returns it)
- Core project/team/task creation wiring exists

**Partially aligned**
- Project lead UX validations and inline errors
- Invite validation endpoint usage (details endpoint used instead)
- Task create gating consistency across all entry points

**Not aligned**
- Team creation creator-membership semantics (missing `addCreatorAsMember`)
- BILLING_ADMIN “billing-only” dashboard redirect/lockdown
- Workspace member management flow as described in RBAC spec (depends on missing backend endpoints)
- Org switching flow (`/api/auth/switch-tenant`) not implemented

---

## 11) Recommended next steps (high leverage)

1) Decide the authoritative behavior for “creator auto-join” in team creation:
   - If spec is correct → remove/ignore `addCreatorAsMember` or default it to true and update frontend.
   - If backend change is correct → update the spec doc and update `CreateTeamModal` to send `addCreatorAsMember`.
2) Implement BILLING_ADMIN route gating + redirects per spec.
3) If workspace member management is required, implement backend endpoints and update frontend to match the member-management flow (not only invite flow).
4) Implement `/api/auth/switch-tenant` if org switching is in scope.

