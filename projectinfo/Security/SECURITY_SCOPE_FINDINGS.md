# HiveSpace – Scope/RBAC Findings (May 23, 2026)

## Executive summary

There is a **broken authorization / scope enforcement** around **team** (and also **project**) membership management in the backend.

As implemented, **any authenticated user** can:

- Remove **any** user from a team (including the **team lead**).
- Promote/demote any team member by calling the role update endpoint.
- List team members (PII exposure) for any team id they can obtain/guess.
- Update/delete teams in arbitrary workspaces (no workspace membership/role checks).

This is not primarily a database issue; it is a **missing server-side authorization check** at the controller/service layer.

## What you reported (confirmed)

> “a team member can delete the team lead etc”

Confirmed: `DELETE /api/teams/{teamId}/members/{userId}` is protected only by “authenticated”, **not** by “is team lead/admin”, and it does not prevent removing the last lead.

## Key backend code paths

### Team member removal (lead can be removed by anyone)

- Controller: `backend/src/main/java/com/project/hiveSpace/controllers/TeamMemberController.java`
  - `@DeleteMapping("/{userId}")` → `teamMemberService.removeMemberFromTeam(teamId, userId)`
- Service: `backend/src/main/java/com/project/hiveSpace/services/TeamMemberService.java`
  - `removeMemberFromTeam(UUID teamId, UUID userId)`
  - **No reference to current authenticated user**
  - **No check** that caller is:
    - a member of this team, or
    - a workspace admin, or
    - a team lead
  - **No rule** preventing “remove the last LEAD”

### Team member role update (anyone can promote themselves)

- Controller: `backend/src/main/java/com/project/hiveSpace/controllers/TeamMemberController.java`
  - `@PutMapping("/{userId}/role")` → `teamMemberService.updateMemberRole(teamId, userId, role)`
- Service: `backend/src/main/java/com/project/hiveSpace/services/TeamMemberService.java`
  - `updateMemberRole(UUID teamId, UUID userId, TeamMemberRole role)`
  - **No authorization checks**

### Team CRUD (update/delete without workspace role checks)

- Controller: `backend/src/main/java/com/project/hiveSpace/controllers/TeamController.java`
  - `@PutMapping("/{teamId}")` → `teamService.updateTeam(teamId, request)`
  - `@DeleteMapping("/{teamId}")` → `teamService.deleteTeam(teamId)`
- Service: `backend/src/main/java/com/project/hiveSpace/services/TeamService.java`
  - `updateTeam(...)` / `deleteTeam(...)`
  - **No authorization checks** (no validation that caller belongs to the workspace, is admin, or is the team lead)

## Broader pattern (project membership too)

Project membership endpoints show the same missing scope checks:

- Controller: `backend/src/main/java/com/project/hiveSpace/controllers/ProjectMemberController.java`
- Service: `backend/src/main/java/com/project/hiveSpace/services/ProjectMemberService.java`

`addMemberToProject`, `updateMemberRole`, and `removeMemberFromProject` do not validate that the **caller** has sufficient privileges (lead/admin), and do not even validate that the caller is a project/workspace member before returning member lists.

## Why this happens (root cause)

1. Spring Security is configured to require authentication for `/api/**` (good), but **resource-level authorization is not implemented**.
   - `backend/src/main/java/com/project/hiveSpace/security/SecurityConfig.java` uses `.anyRequest().authenticated()`
2. Method security is enabled (`@EnableMethodSecurity(prePostEnabled = true)`), but there are **no** `@PreAuthorize` / `@PostAuthorize` annotations used in controllers/services (search in `backend/src/main/java` returns none).
3. An RBAC helper exists but is effectively unused:
   - `backend/src/main/java/com/project/hiveSpace/security/RbacService.java` defines `hasTeamRole(...)`, `hasProjectRole(...)`, etc.
   - No controller/service references it, and no `@PreAuthorize("@rbac...")` expressions exist.
4. Team/project membership services do not accept the current user (caller) as an input, and do not retrieve it internally, so they cannot enforce “only lead/admin can mutate membership”.

## DB/schema notes (CurrentSchema.md + HIveSpaceSchema.sql)

Schema relevant to this issue:

- `team_members(team_id, user_id, role in ('LEAD','MEMBER'))`
- `teams(workspace_id, created_by, members_count, ...)`
- `workspace_members(workspace_id, user_id, role in ('ADMIN','MEMBER','VIEWER'))`

Important: The schema does **not** enforce “at least one lead per team”:

- There is no constraint/trigger preventing deletion of the last `team_members` row with `role='LEAD'`.
- Therefore, even with correct API authorization, you should still enforce the “must always have a lead” invariant at the application level (or add a DB-level safeguard later).

## Security impact

### Privilege escalation / sabotage

- Any authenticated user can remove a lead, then assign themselves lead, then manage membership freely.
- Team continuity breaks (team can end up with zero leads).

### Cross-tenant / cross-workspace data leakage (scope issue)

Because membership and listing endpoints do not validate that the caller belongs to the workspace/team/project:

- If an attacker can obtain a `workspaceId` or `teamId` (UUID), they can list teams/members and delete/update them.
- UUIDs reduce guessing probability, but IDs can leak through logs, browser history, client-side state, screenshots, or any other endpoint that returns them without proper scoping.

### PII exposure

Team member listing responses include `email`, `fullName`, `avatarUrl`, etc. (`TeamMemberResponse` mapping in `TeamMemberService`), which becomes visible to unauthorized authenticated users.

## Minimum reproduction (backend API)

Prereqs:

- User A is any authenticated user (does not need to be in the team/workspace based on current backend logic).
- Team exists with a LEAD user L who is a member.
- Attacker knows `teamId` and `leadUserId` (both can be obtained via existing list endpoints if the attacker can learn/guess workspace/team ids).

Steps:

1. Call `GET /api/teams/{teamId}/members` and identify the LEAD’s `userId`.
2. Call `DELETE /api/teams/{teamId}/members/{leadUserId}` with User A’s JWT.
3. Observe 204 and the LEAD is removed (or subsequent `GET` shows they’re gone).

## Recommendations (no code in this report)

### Authorization rules to implement

Suggested baseline rules (adjust to your product):

- `GET /api/teams/{teamId}/members`:
  - allow only **team members** OR **workspace admins** (of the team’s workspace)
- `POST /api/teams/{teamId}/members`:
  - allow only **team LEAD** OR **workspace ADMIN**
- `PUT /api/teams/{teamId}/members/{userId}/role`:
  - allow only **team LEAD** OR **workspace ADMIN**
  - prevent demoting/removing the **last LEAD**
- `DELETE /api/teams/{teamId}/members/{userId}`:
  - allow only **team LEAD** OR **workspace ADMIN**
  - allow self-leave for `MEMBER` (optional), but still protect “last LEAD” invariant
- Team update/delete:
  - allow only **workspace ADMIN** or **team LEAD** (depending on your intended ownership model)

### Implementation approach

Pick one consistent enforcement strategy:

1. Add `@PreAuthorize` to controller methods using `@rbac.hasTeamRole(...)` / `@rbac.hasWorkspaceRole(...)`, **or**
2. Enforce in services by retrieving the current user and validating membership/role before mutations, **or**
3. Use both (coarse guard via `@PreAuthorize`, fine-grained invariants in service).

Regardless of approach:

- Always verify the caller’s **scope** (tenant/workspace/project/team) before returning data.
- Add invariant checks for “team must have ≥ 1 LEAD” (and similarly “project must have ≥ 1 LEAD” if applicable).

## Files most relevant to fix later

- `backend/src/main/java/com/project/hiveSpace/controllers/TeamMemberController.java`
- `backend/src/main/java/com/project/hiveSpace/services/TeamMemberService.java`
- `backend/src/main/java/com/project/hiveSpace/controllers/TeamController.java`
- `backend/src/main/java/com/project/hiveSpace/services/TeamService.java`
- `backend/src/main/java/com/project/hiveSpace/controllers/ProjectMemberController.java`
- `backend/src/main/java/com/project/hiveSpace/services/ProjectMemberService.java`
- `backend/src/main/java/com/project/hiveSpace/security/RbacService.java`
- `backend/src/main/java/com/project/hiveSpace/security/SecurityConfig.java`

