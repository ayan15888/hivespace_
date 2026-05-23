# HiveSpace Backend RBAC / Permissions — Implementation Analysis (Source-of-Truth: DB schema + backend code)

Date: 2026-05-23  
Backend: `backend/src/main/java/com/project/hiveSpace` (Spring Boot)  
DB schema sources (declared “currently running schema”):
- `CurrentSchema.md`
- `backend/backendschema.sql`

This report documents RBAC “as actually enforced” by backend code (service-layer checks and repository usage), not what role names imply.

---

## 1) Scope & Data Model (DB)

### 1.1 Scope hierarchy (by foreign keys)

From `CurrentSchema.md` / `backend/backendschema.sql`:

- **Tenant (Organization)**: `tenants`
  - `tenants.owner_email` acts as a legacy/primary owner marker.
  - `tenant_members(tenant_id, user_id, role)` is the main org-membership table.
- **Workspace**: `workspaces(tenant_id, created_by)`
  - `workspace_members(workspace_id, user_id, role)` defines workspace roles.
- **Project**: `projects(workspace_id, created_by)`
  - `project_members(project_id, user_id, role)` defines project roles.
  - `project_teams(project_id, team_id, assigned_by)` links teams to projects.
- **Team**: `teams(workspace_id, created_by)`
  - `team_members(team_id, user_id, role)` defines team roles.
- **Task**: `tasks(project_id, team_id?, parent_id?, created_by?, assignee_id?)`
  - `task_assignees(task_id, user_id, role)` defines task-level assignee roles.
  - `task_activities(task_id, user_id?, type, old_value?, new_value?)` is an audit log.
- **Invitations**:
  - `invitations(tenant_id, workspace_id?, team_id?, project_id?, inviter_id, role, token, pin_hash, status, expires_at, max_uses, current_uses)`
  - `invitation_attempts(invitation_id, ip_address, attempted_at, success)` rate-limit / logging.

### 1.2 Role enums / constraints (DB-enforced)

Roles are stored as `character varying` with `CHECK` constraints on most membership tables:

- `tenant_members.role`: `OWNER | ADMIN | BILLING_ADMIN | MEMBER`
- `workspace_members.role`: `ADMIN | MEMBER | VIEWER`
- `team_members.role`: `LEAD | MEMBER`
- `project_members.role`: `LEAD | MEMBER | VIEWER`
- `task_assignees.role`: `OWNER | COLLABORATOR | REVIEWER`

Important nuance:
- `invitations.role` is **not** constrained by a DB `CHECK` in the provided schema; it defaults to `'MEMBER'`. The backend parses it as a **tenant role** only (details in §4.6).

---

## 2) Backend Authorization Architecture (What exists)

### 2.1 Authentication (JWT)

- Requests are authenticated via `JwtAuthenticationFilter` and `JwtService`.
- Authenticated principal is a `User` entity (`User implements UserDetails`).
- `User.getAuthorities()` always returns only `ROLE_USER` (global Spring roles are not used for app RBAC).

### 2.2 RBAC enforcement location

There are **no** `@PreAuthorize` / method-security annotations in controllers/services.

RBAC is enforced (when it exists) via:
- ad-hoc checks inside service methods, often throwing `SecurityException`
- a shared `RbacService` helper used by some services

### 2.3 Central helper: `RbacService`

File: `backend/src/main/java/com/project/hiveSpace/security/RbacService.java`

Capabilities:
- Reads current user from `SecurityContextHolder`.
- Queries membership repositories:
  - `tenant_members`, `workspace_members`, `project_members`, `team_members`
- Exposes:
  - `hasTenantRole(tenantId, requiredRole)`
  - `hasWorkspaceRole(workspaceId, requiredRole)` **with a tenant-level fallback** (details below)
  - `hasProjectRole(projectId, requiredRole)`
  - `hasTeamRole(teamId, requiredRole)`

#### 2.3.1 Role “hierarchy” used by RbacService

`RbacService` uses a single rank map across role strings:

`OWNER (5) > ADMIN (4) > BILLING_ADMIN (3) == LEAD (3) > MEMBER (2) > VIEWER (1)`

This ranking is used for “sufficient role” comparisons (`actualRank >= requiredRank`) when checking *tenant/workspace/project/team* roles.

#### 2.3.2 Tenant → Workspace implicit admin fallback

`hasWorkspaceRole(workspaceId, requiredRole)`:
- First checks `workspace_members` for the current user.
- If not explicitly in `workspace_members`, it loads the workspace’s tenant, and returns `true` if the user is:
  - tenant `OWNER` **or**
  - tenant `ADMIN`

Effect:
- Tenant `OWNER`/`ADMIN` are treated as having workspace “ADMIN rights” **for any workspace in the tenant**, even without `workspace_members` rows.
- Tenant `BILLING_ADMIN` does **not** get this implicit workspace admin power.

---

## 3) Implemented Scopes & Membership Structure (Backend interpretation)

Backend code treats the following as the enforceable scopes:

- **Tenant scope**: via `tenant_members` and `tenants.owner_email` checks (both are used in different places).
- **Workspace scope**: via `workspace_members`, plus tenant-owner/admin fallback via `RbacService`.
- **Team scope**: via `team_members`, sometimes overridden by workspace admin (`RbacService.isWorkspaceAdmin`).
- **Project scope**: via `project_members`, sometimes overridden by workspace admin (`RbacService.isWorkspaceAdmin`).
- **Task scope**: *no standalone task “membership” concept used for authorization*. `task_assignees` exists, but it is not used to authorize reads/updates in the current backend.

---

## 4) Effective Permissions (What each role can do “in practice”)

This section is derived from *actual code paths* in services/controllers.

### 4.1 Tenant roles (`TenantMemberRole`)

Where checked:
- `InvitationService` (invite create + invite listing)
- `TenantService` (member directory + role changes + removals)
- `RbacService` (tenant role checks, and workspace implicit admin fallback)

#### Tenant `OWNER`

Allowed (implemented):
- Create invitations for the tenant (`InvitationService.createInvite`)
  - May invite `ADMIN`, `BILLING_ADMIN`, `MEMBER`
  - Cannot invite `OWNER`
- View invitations for tenant (`InvitationService.getInvitationsByTenant`)
- View tenant member directory (`TenantService.getMembersByTenantId`)
- Update tenant member roles (`TenantService.updateMemberRole`)
  - Only OWNER can:
    - set another member to `OWNER` (ownership transfer)
    - promote someone to `ADMIN`
    - demote/modify existing `ADMIN` roles
  - Cannot change/remove the “primary owner” identified by `tenants.owner_email`
- Remove tenant members (`TenantService.removeMember`)
  - Only OWNER can remove an `ADMIN`
  - Cannot remove the “primary owner”
- Implicitly treated as workspace admin for all workspaces in tenant (via `RbacService.hasWorkspaceRole` fallback)

Not implemented / not enforced:
- Tenant-level gating for creating workspaces/projects is **not** present (see findings).

#### Tenant `ADMIN`

Allowed (implemented):
- Create invitations for tenant (`InvitationService.createInvite`)
  - Cannot invite `ADMIN` or `OWNER` (only OWNER can)
  - Can invite `BILLING_ADMIN` or `MEMBER`
- View invitations for tenant (`InvitationService.getInvitationsByTenant`)
- View tenant member directory (`TenantService.getMembersByTenantId`)
- Update roles (`TenantService.updateMemberRole`) with restrictions:
  - Cannot set `OWNER`
  - Cannot promote to `ADMIN`
  - Cannot demote/modify existing `ADMIN` roles
- Remove members (`TenantService.removeMember`) with restrictions:
  - Cannot remove `ADMIN` members (only OWNER can)
- Implicitly treated as workspace admin for all workspaces in tenant (via `RbacService.hasWorkspaceRole` fallback)

#### Tenant `BILLING_ADMIN`

Allowed (implemented):
- Create invitations for tenant (`InvitationService.createInvite`)
  - Cannot invite `ADMIN` or `OWNER`
  - Can invite `BILLING_ADMIN` or `MEMBER`

Restricted (implemented):
- Cannot view invitation list (`InvitationService.getInvitationsByTenant` checks only OWNER/ADMIN)
- Cannot view tenant member directory (`TenantService.getMembersByTenantId` denies BILLING_ADMIN)
- Does not get implicit workspace admin fallback in `RbacService`

#### Tenant `MEMBER`

Allowed (implemented):
- View tenant member directory (`TenantService.getMembersByTenantId`) (note: BILLING_ADMIN is excluded; MEMBER is allowed)

Restricted (implemented):
- Cannot create invitations
- Cannot view invitations list
- Cannot update roles or remove members

### 4.2 Workspace roles (`WorkspaceMemberRole`)

Where checked:
- `RbacService.hasWorkspaceRole/isWorkspaceAdmin`
- `TeamService` (create/list teams)
- Many team/project member management flows allow workspace admin override

#### Workspace `ADMIN`

Allowed (implemented via `RbacService.isWorkspaceAdmin` override in multiple services):
- Update/delete teams even if not team lead (`TeamService.updateTeam/deleteTeam`)
- Add/update/remove team members even if not team lead (`TeamMemberService.*`)
- Add/update/remove project members even if not project lead (`ProjectMemberService.*`)
- Assign/unassign teams to projects even if not project lead (`ProjectService.assignTeam/unassignTeam`)
- View team lists for workspace (`TeamService.getTeamsByWorkspace` requires workspace VIEWER, satisfied by ADMIN)

Not implemented / unclear:
- There is **no** backend endpoint to change workspace member roles directly (only listing exists); membership is created via workspace creation or invitation acceptance.

#### Workspace `MEMBER`

Allowed (implemented):
- Create teams in workspace (`TeamService.createTeam` requires workspace MEMBER)
- View teams in workspace (`TeamService.getTeamsByWorkspace` requires workspace VIEWER, satisfied by MEMBER)

Not enforced (important):
- Workspace membership is **not** checked for listing projects, listing workspace members, or listing workspaces (see findings).

#### Workspace `VIEWER`

Allowed (implemented):
- View teams in workspace (`TeamService.getTeamsByWorkspace` requires workspace VIEWER)

Not enforced:
- Workspace member directory listing is not gated.

### 4.3 Team roles (`TeamMemberRole`)

Where checked:
- `TeamMemberService` (team membership management)
- `TeamService` (update/delete)

#### Team `LEAD`

Allowed (implemented):
- Add/update/remove team members (`TeamMemberService.addMemberToTeam/updateMemberRole/removeMemberFromTeam`)
- Update/delete team (`TeamService.updateTeam/deleteTeam`)
- Remove self from team (allowed; cannot remove last lead)

Restricted:
- Cannot demote/remove the last team lead.

Not implemented:
- Team role does not grant any project permissions by itself.

#### Team `MEMBER`

Allowed (implemented):
- View team member list (`TeamMemberService.getMembersByTeam` requires team MEMBER or workspace admin)
- Remove self from team (`TeamMemberService.removeMemberFromTeam` allows “self”)

### 4.4 Project roles (`ProjectMemberRole`)

Where checked:
- `ProjectMemberService` (project membership management)
- `ProjectService` (project-team assignment reads/writes)
- `TaskService` (create/update/delete checks)

#### Project `LEAD`

Allowed (implemented):
- Add/update project members (`ProjectMemberService.addMemberToProject/updateMemberRole`)
- Remove members (or self); cannot remove last lead (`ProjectMemberService.removeMemberFromProject`)
- Assign/unassign teams to project (`ProjectService.assignTeam/unassignTeam`) (or workspace admin)
- View assigned teams for project (`ProjectService.getAssignedTeams` requires project VIEWER or workspace admin)
- Create tasks and update/delete tasks (because TaskService only blocks VIEWER) (see Task roles below)

#### Project `MEMBER`

Allowed (implemented):
- View project member list (`ProjectMemberService.getMembersByProject` requires project VIEWER or workspace admin)
- View assigned teams for project (requires VIEWER, satisfied by MEMBER)
- Create tasks (`TaskService.createTask` denies only VIEWER)
- Update/delete tasks (`TaskService.updateTask/deleteTask` denies only VIEWER)

#### Project `VIEWER`

Allowed (implemented):
- View project members (`ProjectMemberService.getMembersByProject`)
- View assigned teams (`ProjectService.getAssignedTeams`)

Restricted (implemented):
- Cannot create tasks (`TaskService.createTask`)
- Cannot update tasks (`TaskService.updateTask`)
- Cannot delete tasks (`TaskService.deleteTask`)

Important caveat:
- Many task *read* paths do **not** check project membership at all (see §4.5 and findings).

### 4.5 Task-related roles (`TaskAssigneeRole`)

Roles exist in DB and models:
- `OWNER`, `COLLABORATOR`, `REVIEWER` (table: `task_assignees`)

However, in the current backend:
- `TaskAssigneeRole` is used for:
  - storing assignee records
  - labeling activity entries
  - picking a default “owner” record when building a response
- `TaskAssigneeRole` is **not used to authorize** any operation.

Effective result:
- Task “roles” are currently *informational*, not a permission boundary.

### 4.6 Invitations: what “role” actually does

Implementation facts:
- `InvitationService.createInvite` accepts `InviteRequest.role` as a string, but parses it only as `TenantMemberRole` for eligibility checks.
- `InvitationService.acceptInvite` uses `invitation.role` only to assign the user’s **tenant membership role**.
- On acceptance, any workspace/team/project membership created via the invite is always assigned:
  - `WorkspaceMemberRole.MEMBER`
  - `TeamMemberRole.MEMBER`
  - `ProjectMemberRole.MEMBER`

So the invitation system currently supports “invite to tenant with tenant role”, plus optional “auto-add to workspace/team/project as MEMBER”.

It does **not** support inviting someone as:
- workspace ADMIN/VIEWER
- team LEAD
- project LEAD/VIEWER
- task assignee roles

---

## 5) Backend Authorization Flow (End-to-end)

1. **JWT auth** creates an authenticated principal `User`.
2. **Controllers** are mostly thin wrappers; they do not perform RBAC checks.
3. **Services** sometimes perform RBAC checks (inconsistent coverage).
4. **Repositories** generally fetch by ID / list by parent ID with no query-level authorization filters.

Key implication:
- If a service method forgets to check membership/role, repository calls will return cross-tenant/workspace/project data.

---

## 6) Endpoint-by-endpoint Enforcement Summary (Actual checks)

Legend:
- ✅ = explicit authorization check exists in service
- ❌ = no authorization check (beyond “must be authenticated”)
- “Workspace admin override” = `rbacService.isWorkspaceAdmin(workspaceId)` used as bypass

### 6.1 Tenant (`TenantController` → `TenantService`)

- `POST /api/tenants` (create tenant): ❌ (any authenticated user can create a tenant)
- `GET /api/tenants/me` (list my tenants): ✅ (implicitly “self” by membership rows; also owner_email fallback)
- `GET /api/tenants/count/{userId}`: ✅ `validateOwnership(userId)` (must be same user)
- `GET /api/tenants/u/{userId}`: ✅ `validateOwnership(userId)` (must be same user)
- `GET /api/tenants/{tenantId}/members`: ✅ `canViewMemberDirectory` (denies BILLING_ADMIN)
- `PUT /api/tenants/{tenantId}/members/{userId}/role`: ✅ requires tenant OWNER/ADMIN, with extra OWNER-only constraints
- `DELETE /api/tenants/{tenantId}/members/{userId}`: ✅ requires tenant OWNER/ADMIN, with extra OWNER-only constraints

### 6.2 Workspace (`WorkspaceController` → `WorkspaceService`)

- `POST /api/workspaces` (create workspace): ❌ (no tenant role check; accepts arbitrary tenantId)
- `GET /api/workspaces/t/{tenantId}` (list workspaces by tenant): ❌
- `GET /api/workspaces/{workspaceId}/members` (list workspace members): ❌

### 6.3 Projects (`ProjectController` → `ProjectService`)

- `POST /api/workspaces/{workspaceId}/projects` (create project): ❌ (no workspace role check)
  - Side-effect: creator is added as `ProjectMemberRole.LEAD` regardless of workspace membership.
- `GET /api/workspaces/{workspaceId}/projects` (list projects in workspace): ❌

### 6.4 Project members (`ProjectMemberController` → `ProjectMemberService`)

- `GET /api/projects/{projectId}/members`: ✅ requires project VIEWER or workspace admin override
- `POST /api/projects/{projectId}/members`: ✅ requires project LEAD or workspace admin override
  - Also requires target user is in `workspace_members` of the project’s workspace.
- `PUT /api/projects/{projectId}/members/{userId}/role`: ✅ requires project LEAD or workspace admin override; cannot demote last LEAD
- `DELETE /api/projects/{projectId}/members/{userId}`: ✅ self OR project LEAD OR workspace admin override; cannot remove last LEAD

### 6.5 Teams (`TeamController` → `TeamService`)

- `POST /api/workspaces/{workspaceId}/teams` (create team): ✅ requires workspace MEMBER
  - Optional `projectId` association requires caller is a project MEMBER.
- `GET /api/workspaces/{workspaceId}/teams` (list teams): ✅ requires workspace VIEWER
- `PUT /api/workspaces/{workspaceId}/teams/{teamId}`: ✅ requires team LEAD OR workspace admin override
- `DELETE /api/workspaces/{workspaceId}/teams/{teamId}`: ✅ requires team LEAD OR workspace admin override

### 6.6 Team members (`TeamMemberController` → `TeamMemberService`)

- `GET /api/teams/{teamId}/members`: ✅ requires team MEMBER OR workspace admin override
- `POST /api/teams/{teamId}/members`: ✅ requires team LEAD OR workspace admin override; target must be workspace member
- `PUT /api/teams/{teamId}/members/{userId}/role`: ✅ requires team LEAD OR workspace admin override; cannot demote last LEAD
- `DELETE /api/teams/{teamId}/members/{userId}`: ✅ self OR team LEAD OR workspace admin override; cannot remove last LEAD

### 6.7 Project ↔ Team assignment (`ProjectTeamController` → `ProjectService`)

- `POST /api/projects/{projectId}/teams` (assign team): ✅ requires project LEAD OR workspace admin override
- `GET /api/projects/{projectId}/teams` (list assigned teams): ✅ requires project VIEWER OR workspace admin override
- `DELETE /api/projects/{projectId}/teams/{teamId}` (unassign): ✅ requires project LEAD OR workspace admin override

### 6.8 Tasks (`TaskController` → `TaskService`)

- `POST /api/projects/{projectId}/tasks` (create): ✅ requires project member AND role != VIEWER
- `GET /api/projects/{projectId}/tasks` (list by project): ❌
- `GET /api/tasks/{taskId}` (get by id): ❌
- `GET /api/tasks` (get all tasks): ❌
- `PATCH /api/tasks/{taskId}/status`: ❌
- `PUT /api/tasks/{taskId}` (update): ✅ requires project member AND role != VIEWER
- `DELETE /api/tasks/{taskId}` (delete): ✅ requires project member AND role != VIEWER

### 6.9 Task assignees (`TaskAssigneeController` → `TaskAssigneeService`)

- `GET /api/tasks/{taskId}/assignees`: ❌
- `POST /api/tasks/{taskId}/assignees` (add): ❌ (no actor authorization; only validates target user is a project member)
- `PATCH /api/tasks/{taskId}/assignees/owner` (change owner): ❌ (no actor authorization; only validates new owner is project member)
- `DELETE /api/tasks/{taskId}/assignees/{userId}` (remove): ❌ (no actor authorization)

### 6.10 Invitations (`InvitationController` → `InvitationService`)

- `POST /api/i/generate`: ✅ requires tenant owner/admin/billing_admin; OWNER-only restriction for inviting ADMIN
- `GET /api/i/validate?token=...&orgSlug=...`: Public (per `SecurityConfig` allows `GET /api/i/*`)
  - Note: `/api/i/validate` *does* match `/api/i/*`
- `GET /api/i/{token}`: Public (matches `/api/i/*`)
- `GET /api/i/t/{tenantId}`: ✅ requires tenant OWNER/ADMIN (endpoint is authenticated; does not match `/api/i/*`)
- `POST /api/i/join`: ✅ requires authentication; then enforces token+pin+rate-limit in `InvitationService.acceptInvite`

---

## 7) Findings: Inconsistencies, Missing Checks, Boundary Breaks

### 7.1 Critical: Task read/update paths lack authorization

Code paths with **no** project membership enforcement:
- `TaskService.getTaskById`
- `TaskService.getTasksByProject`
- `TaskService.getAllTasks`
- `TaskService.updateTaskStatus`
- `TaskAssigneeService.*` (actor is never authorized)

Impact:
- Any authenticated user can:
  - enumerate all tasks (`GET /api/tasks`)
  - read any task by ID (`GET /api/tasks/{taskId}`)
  - list tasks in any project (`GET /api/projects/{projectId}/tasks`)
  - change status of any task (`PATCH /api/tasks/{taskId}/status`)
  - reassign owners / add collaborators / remove assignees on any task (task assignee endpoints)

This breaks:
- tenant/workspace/project boundaries
- confidentiality (cross-project visibility)
- integrity (cross-project updates)

### 7.2 Critical: Workspace & Project creation are not tenant/workspace-scoped

Missing checks:
- `WorkspaceService.createWorkspace` does not verify caller has any role in the tenant.
- `ProjectService.createProject` does not verify caller has any role in the workspace.

Impact:
- Any authenticated user who knows a `tenantId` can create a workspace in that tenant and become its first workspace `ADMIN`.
- Any authenticated user who knows a `workspaceId` can create a project in that workspace and become its first project `LEAD`.

### 7.3 Critical: Workspace listings/memberships are globally enumerable (authenticated)

Missing checks:
- `WorkspaceService.getWorkspacesByTenant` is ungated.
- `WorkspaceService.getWorkspaceMembers` is ungated.
- `ProjectService.getProjectsByWorkspace` is ungated.

Impact:
- Any authenticated user can list:
  - workspaces in any tenant (given `tenantId`)
  - members of any workspace (given `workspaceId`)
  - projects in any workspace (given `workspaceId`)

### 7.4 Task “roles” exist but are not permission boundaries

`task_assignees.role` and `TaskAssigneeRole` are never used to authorize reads/writes.

Impact:
- “OWNER/COLLABORATOR/REVIEWER” are effectively labels only; they do not prevent non-members from altering task assignment (because actor checks are missing).

### 7.5 Invitation scope consistency is not validated

`InvitationService.createInvite` loads optional `workspaceId`, `teamId`, `projectId` but does not validate:
- workspace belongs to the invitation’s tenant
- team belongs to that workspace/tenant
- project belongs to that workspace/tenant
- inviter is a member of those child scopes

Impact:
- An authorized org inviter could create invites referencing arbitrary workspace/team/project IDs (possibly from other tenants), then `acceptInvite` will attempt to enroll the user into those referenced scopes.

### 7.6 Mixed “owner” model (owner_email vs tenant_members)

The code uses both:
- `tenants.owner_email` string equality checks (legacy)
- `tenant_members.role == OWNER`

Impact:
- Inconsistent “owner” determination paths can cause surprising authorization outcomes (especially if owner_email differs from membership role state).

---

## 8) Actionable Examples (Answers based on current backend behavior)

### 8.1 “Can Tenant Admin invite Workspace Admin?”

No, not in the current implementation.

- `InvitationService.createInvite` only validates/assigns **tenant** roles (`TenantMemberRole`).
- `acceptInvite` always adds workspace membership as `WorkspaceMemberRole.MEMBER` (never ADMIN/VIEWER).

Also:
- Tenant `ADMIN` cannot invite a tenant `ADMIN` (only tenant OWNER can).

### 8.2 “Can Team Lead edit Projects?”

Not inherently.

- Team `LEAD` only grants team-scoped management (team + team members).
- Project-scoped operations require project `LEAD` or workspace admin override.

Additionally, there are currently no project update/delete endpoints; only project-team assignment and project member management exist.

### 8.3 “Can Workspace Member access Tasks outside assigned Projects?”

Yes (and even non-workspace members can), because:
- `GET /api/tasks`, `GET /api/tasks/{id}`, and `GET /api/projects/{projectId}/tasks` do not check project/workspace membership.

### 8.4 “What permissions are inherited vs explicitly assigned?”

Explicit:
- tenant/workspace/team/project memberships are explicit rows in their `*_members` tables (except tenant owner legacy via owner_email).

Inherited (only one place currently):
- `RbacService.hasWorkspaceRole` treats tenant `OWNER`/`ADMIN` as workspace admin for any workspace within that tenant (even without `workspace_members` rows).

Not inherited:
- Workspace role does not automatically grant project/team roles; instead some services explicitly allow “workspace admin override”.

---

## 9) Recommended RBAC Improvements (Practical, code-aligned)

Priority-ordered suggestions:

1. **Add missing authorization checks** to all task read/mutation and assignee flows:
   - Enforce project membership (at least VIEWER) for reads.
   - Enforce role != VIEWER for mutations.
   - For task assignee operations, enforce actor is project member and role != VIEWER (or a stricter rule).

2. **Gate workspace/project creation by parent-scope membership**:
   - Workspace creation: require tenant `OWNER` or `ADMIN` (or explicit product rules).
   - Project creation: require workspace `ADMIN`/`MEMBER` (or explicit product rules).

3. **Add query-level authorization** for list endpoints:
   - Replace “find all by workspace/tenant” with “find all where user is a member (or has tenant admin override)”.

4. **Validate invitation scope relationships** on creation:
   - Ensure optional workspace/team/project IDs belong to the same tenant as `tenantId`.
   - Ensure inviter has appropriate scope membership (e.g., workspace admin) to include workspace/team/project in invite.

5. **Clarify invitation role semantics**:
   - Either:
     - Rename `invitations.role` to `tenant_role`, or
     - Add separate columns for workspace/team/project roles, and enforce them in `acceptInvite`.

6. **Unify owner model**:
   - Make `tenant_members.role=OWNER` the canonical owner state.
   - Keep `owner_email` only as a migration/compat field, or enforce consistency.

7. **Centralize policy**:
   - Introduce explicit policy functions (e.g., `canViewProject`, `canEditTask`) and reuse across services.
   - Consider Spring method-security annotations once policies are stable, but service-level checks can also be made consistent without annotations.

---

## 10) Appendix: Key Files Reviewed

DB schema:
- `CurrentSchema.md`
- `backend/backendschema.sql`

Security:
- `backend/src/main/java/com/project/hiveSpace/security/SecurityConfig.java`
- `backend/src/main/java/com/project/hiveSpace/security/JwtAuthenticationFilter.java`
- `backend/src/main/java/com/project/hiveSpace/security/JwtService.java`
- `backend/src/main/java/com/project/hiveSpace/security/RbacService.java`

Services (authorization hotspots):
- `backend/src/main/java/com/project/hiveSpace/services/TenantService.java`
- `backend/src/main/java/com/project/hiveSpace/services/WorkspaceService.java`
- `backend/src/main/java/com/project/hiveSpace/services/InvitationService.java`
- `backend/src/main/java/com/project/hiveSpace/services/ProjectService.java`
- `backend/src/main/java/com/project/hiveSpace/services/ProjectMemberService.java`
- `backend/src/main/java/com/project/hiveSpace/services/TeamService.java`
- `backend/src/main/java/com/project/hiveSpace/services/TeamMemberService.java`
- `backend/src/main/java/com/project/hiveSpace/services/TaskService.java`
- `backend/src/main/java/com/project/hiveSpace/services/TaskAssigneeService.java`

