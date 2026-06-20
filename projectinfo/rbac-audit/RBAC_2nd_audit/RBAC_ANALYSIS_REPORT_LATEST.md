# HiveSpace Backend RBAC / Permission System — Fresh Analysis (Latest Code + Current Schema)

Date: 2026-05-23  
Backend root: `backend/src/main/java/com/project/hiveSpace`  
Schema sources of truth:
- `CurrentSchema.md`
- `backend/backendschema.sql`

This report is a **fresh pass** over the current DB schema + latest backend authorization logic. It documents **what the backend enforces in practice**.

---

## 1) Database RBAC Model (Current Schema)

### 1.1 Scopes (FK relationships)

- **Tenant (Organization)**: `tenants`
  - Ownership marker: `tenants.owner_email`
  - Membership: `tenant_members(tenant_id, user_id, role)`
- **Workspace**: `workspaces(tenant_id, created_by)`
  - Membership: `workspace_members(workspace_id, user_id, role)`
- **Project**: `projects(workspace_id, created_by)`
  - Membership: `project_members(project_id, user_id, role)`
  - Team assignment: `project_teams(project_id, team_id, assigned_by)`
- **Team**: `teams(workspace_id, created_by)`
  - Membership: `team_members(team_id, user_id, role)`
- **Task**: `tasks(project_id, team_id?, parent_id?, created_by?, assignee_id?)`
  - Assignees: `task_assignees(task_id, user_id, role)`
  - Activity log: `task_activities(task_id, user_id?, type, old_value?, new_value?)`
- **Invitations**:
  - `invitations(tenant_id, workspace_id?, team_id?, project_id?, inviter_id, role, token, pin_hash, status, expires_at, max_uses, current_uses)`
  - `invitation_attempts(invitation_id, ip_address, attempted_at, success)`

### 1.2 Roles (DB CHECK constraints)

- Tenant roles (`tenant_members.role`): `OWNER | ADMIN | BILLING_ADMIN | MEMBER`
- Workspace roles (`workspace_members.role`): `ADMIN | MEMBER | VIEWER`
- Team roles (`team_members.role`): `LEAD | MEMBER`
- Project roles (`project_members.role`): `LEAD | MEMBER | VIEWER`
- Task assignee roles (`task_assignees.role`): `OWNER | COLLABORATOR | REVIEWER`

Important nuance:
- `invitations.role` is a free-form string in the schema shown (no CHECK constraint). Backend treats it as a **tenant role string** (parsed to `TenantMemberRole`) during acceptance.

---

## 2) Backend Authorization Architecture (Latest Implementation)

### 2.1 Authentication

- JWT auth via `JwtAuthenticationFilter` + `JwtService`.
- Principal is a `User` entity; Spring authorities remain `ROLE_USER` only (not used for app RBAC).
- Most endpoints require authentication; only `GET /api/i/*` and `/api/auth/**` and `/api/health` are public per `SecurityConfig`.

### 2.2 Where authorization is enforced

There are still no meaningful `@PreAuthorize` / route-guard annotations.

Authorization is enforced in **service-layer checks**, primarily via:
- `RbacService` (scope role checks, capability checks, and tenant-boundary validation)
- explicit “must be lead/admin/self” checks inside services

### 2.3 Central RBAC utility: `RbacService` (major refactor)

File: `backend/src/main/java/com/project/hiveSpace/security/RbacService.java`

Key features in the latest implementation:

1) **Scope-isolated role comparisons** (fixes cross-scope rank-map mixing)
- Tenant checks use `TenantMemberRole` + `tenantRank(...)`
- Workspace checks use `WorkspaceMemberRole` + `workspaceRank(...)`
- Project checks use `ProjectMemberRole` + `projectRank(...)`
- Team checks use `TeamMemberRole` + `teamRank(...)`

This removes the previous single global string rank ladder that compared unrelated scopes (e.g., `BILLING_ADMIN` vs `LEAD`).

2) **Named “capability” methods** (explicit bridge rules)
- `canAdminWorkspace(workspaceId)`:
  - true if workspace role is `ADMIN`, OR tenant role is `OWNER/ADMIN` for the workspace’s tenant.
- `canCreateProject(workspaceId)`:
  - currently equals `canAdminWorkspace(workspaceId)`.
- `canCreateTeam(workspaceId)`:
  - true if workspace role >= `MEMBER`, OR tenant role is `OWNER/ADMIN` for the workspace’s tenant.
- `canManageProjectMembers(projectId)`:
  - project `LEAD` OR workspace admin for project.workspace.
- `canManageTeamMembers(teamId)`:
  - team `LEAD` OR workspace admin for team.workspace.
- `canViewProject(projectId)`:
  - any project role OR workspace admin for project.workspace.
- `canViewTask(taskId)`:
  - `canViewProject(task.projectId)`.
- `canCreateTask(projectId)`:
  - project role >= `MEMBER` (excludes project `VIEWER`).
- `canEditTask(taskId)`:
  - project role >= `MEMBER` (excludes project `VIEWER`).
- `canAssignTeamToProject(projectId)`:
  - project `LEAD` OR workspace admin for project.workspace.

3) **Tenant boundary enforcement** via resource verification
- `verifyResourceBelongsToTenant(resourceId, ResourceType)` checks that the requested workspace/team/project/task belongs to `currentUser.tenant`.
- Many services now call this early to prevent cross-tenant scope leakage.

---

## 3) Scope Isolation & Cross-scope Role Comparisons (Verified)

### 3.1 Do cross-scope role comparisons still exist?

The previous architectural flaw (one global rank map comparing strings across scopes) is **no longer present**.

Evidence:
- `RbacService` now accepts scope-specific enums (`TenantMemberRole`, `WorkspaceMemberRole`, etc.)
- ranking is per-scope (`tenantRank`, `workspaceRank`, `projectRank`, `teamRank`)

### 3.2 Are there still cross-scope *privilege bridges*?

Yes, but they are now **explicit** (named capability methods), rather than accidental:

- Tenant `OWNER/ADMIN` ⇒ workspace admin powers (`canAdminWorkspace` and workspace-role fallback in `hasWorkspaceRole`)
- Workspace admin ⇒ project/team member management overrides (`canManage*` usage and direct checks in services)

This is a defined inheritance/override model, not a rank-map artifact.

---

## 4) Ownership & Leadership Rules (Projects / Teams)

### 4.1 Project creation & Lead assignment

File: `backend/src/main/java/com/project/hiveSpace/services/ProjectService.java`

Behavior:
- Caller must pass `rbacService.verifyResourceBelongsToTenant(workspaceId, WORKSPACE)`.
- Caller must satisfy `rbacService.canCreateProject(workspaceId)` (currently: workspace admin or tenant owner/admin fallback).

Lead assignment:
- Request supports `ProjectRequest.leadUserId`.
- If `leadUserId` is provided:
  - backend requires that user is already a workspace member: `workspaceMemberRepository.existsByWorkspaceIdAndUserId(...)`
  - backend inserts `project_members` row for leadUser as `LEAD`
  - if leadUser != creator, creator is added as `MEMBER`
- If `leadUserId` is not provided:
  - creator is assigned `ProjectMemberRole.LEAD`

Implications:
- Creators automatically get leadership only if no explicit lead is provided.
- Admins can assign a different lead at creation time (subject to that user already being a workspace member).

### 4.2 Team creation & Lead assignment

File: `backend/src/main/java/com/project/hiveSpace/services/TeamService.java`

Behavior:
- Requires `verifyResourceBelongsToTenant(workspaceId, WORKSPACE)`.
- Requires `rbacService.canCreateTeam(workspaceId)` (workspace MEMBER+ or tenant owner/admin fallback).

Lead assignment:
- Request supports `TeamRequest.leadUserId`.
- If `leadUserId` provided:
  - must already be a workspace member
  - inserted as `TeamMemberRole.LEAD`
  - creator inserted as `MEMBER` if different
- Else:
  - creator becomes `LEAD`

Association to a project:
- If `projectId` provided:
  - caller must have `ProjectMemberRole.MEMBER` in that project
  - project must be in same workspace

---

## 5) Effective Permissions (What roles can do in practice)

This section summarizes **actual enforced** permissions by role + capability checks.

### 5.1 Tenant roles

Tenant `OWNER` / `ADMIN`:
- Can create invitations.
- Can list invitations for a tenant.
- Can create workspaces (WorkspaceService requires tenant role >= ADMIN).
- Can act as workspace admin via `canAdminWorkspace` when acting within the tenant.

Tenant `BILLING_ADMIN`:
- Exists in schema and `TenantService` member-directory gating (billing admins are excluded from viewing member directory).
- Not accepted as an inviter in `InvitationService.createInvite` (latest code authorizes only OWNER/ADMIN).
- Not included in tenant→workspace admin fallback.

Tenant `MEMBER`:
- Can list workspaces by tenant (`WorkspaceService.getWorkspacesByTenant` requires tenant role >= MEMBER).
- Can view tenant member directory (billing admins excluded).

### 5.2 Workspace roles

Workspace `ADMIN`:
- Can create projects (`canCreateProject`).
- Can manage team members and project members through overrides in services.
- Can assign/unassign teams to projects (override).
- Can delete tasks (TaskService requires project lead OR workspace admin).
- Sees all projects in workspace when listing projects (ProjectService filters).

Workspace `MEMBER`:
- Can create teams (`canCreateTeam`).
- Can view workspace members (VIEWER+).
- Can view teams in workspace (VIEWER+).
- Project visibility is filtered by membership when listing projects (unless workspace admin).

Workspace `VIEWER`:
- Can view teams list and workspace member directory.
- Does not satisfy `canCreateTeam` (needs MEMBER+).
- Does not satisfy `canCreateProject` (admin only).

### 5.3 Project roles

Project `LEAD`:
- Can manage project members.
- Can assign/unassign teams to the project.
- Can create tasks / edit tasks (since project role >= MEMBER).
- Can delete tasks (explicitly allowed: project lead).

Project `MEMBER`:
- Can view projects they are a member of.
- Can create/edit tasks (project role >= MEMBER).
- Cannot manage project members (unless workspace admin override).

Project `VIEWER`:
- Can view project and tasks (via canViewProject/canViewTask).
- Cannot create or edit tasks (`canCreateTask` / `canEditTask` require >= MEMBER).

### 5.4 Team roles

Team `LEAD`:
- Can update/delete team.
- Can add/update/remove team members.

Team `MEMBER`:
- Can view team member directory (member+).
- Can remove self from team.

### 5.5 Task assignee roles

Task assignee roles exist as data roles: `OWNER`, `COLLABORATOR`, `REVIEWER`.

Enforcement:
- Task assignee endpoints now enforce that only:
  - task `OWNER`, OR
  - project `LEAD`, OR
  - workspace `ADMIN`
  can add assignees / change owner (and removal also allows self-removal).

Task assignee roles do not form a full “task RBAC” system; they’re used as a *targeted* permission rule for assignee management.

---

## 6) Endpoint Enforcement Summary (Latest)

### Tenant
- Create tenant: any authenticated user (creates tenant + tenant owner membership).
- Tenant member directory: allowed for OWNER/ADMIN/MEMBER; denied for BILLING_ADMIN.
- Update/remove tenant members: allowed for OWNER/ADMIN with OWNER-only restrictions around ADMIN and ownership transfer.

### Workspace
- Create workspace: restricted to same active tenant + tenant role >= ADMIN.
- List workspaces by tenant: restricted to tenant role >= MEMBER.
- List workspace members: restricted to workspace role >= VIEWER, and resource must belong to `currentUser.tenant`.
  - Emails only shown to workspace admins (`canAdminWorkspace`).

### Project
- Create project: restricted to workspace admins (`canCreateProject`) and tenant-bound.
  - Optional lead assignment is supported (must already be workspace member).
- List projects: requires workspace role >= VIEWER; workspace admins see all, others see only projects they belong to.

### Teams
- Create team: requires `canCreateTeam` (workspace member+ or tenant owner/admin); tenant-bound.
  - Optional lead assignment supported (must already be workspace member).
- List teams: requires workspace role >= VIEWER; tenant-bound.
- Update/delete team: requires team lead or workspace admin; tenant-bound.

### Tasks
- Create task: requires `canCreateTask` (project member+), and tenant-bound via project.
- Read task: requires `canViewTask`, tenant-bound.
- List tasks by project: requires `canViewProject`, tenant-bound.
- List “all my tasks”: tenant membership required; returns tasks only in projects the user belongs to.
- Update task / status: requires `canEditTask` (project member+), tenant-bound.
- Delete task: restricted to project lead or workspace admin, tenant-bound.

### Invitations
- Create invite: tenant owner/admin only.
  - Validates workspace/team/project belong to tenant and are mutually consistent.
  - Validates inviter has workspace role MEMBER in every workspace the invite would join.
- Accept invite: token+PIN+rate-limit enforced; structural consistency re-validated; joins tenant + optional workspace/team/project.
- View invitations list: tenant owner/admin only.
- Public token validation: `GET /api/i/*` is public per security config.

---

## 7) Fresh Findings / Issues (Latest Code)

### 7.1 Major improvements vs prior design (security-positive)
- Scope-isolated role comparisons: cross-scope rank-map flaw removed.
- Tenant-boundary enforcement added: `verifyResourceBelongsToTenant` widely applied.
- Task endpoints are now gated (reads + writes + status changes).
- Workspace and project listing are now gated and project listing is membership-filtered for non-admins.
- Lead assignment during project/team creation is now supported with workspace-membership validation.
- Invitation scope consistency checks added.

### 7.2 Remaining architectural/security concerns

1) **Single “active tenant” field (`users.tenant_id`) is now a hard authorization boundary**
   - `verifyResourceBelongsToTenant` uses `currentUser.tenant` as the tenant boundary.
   - If a user is legitimately a member of multiple tenants (possible via `tenant_members`), there is no clear “switch tenant” backend flow shown here; access will be denied unless `users.tenant_id` matches.
   - This is safe from a leakage perspective, but can cause confusing behavior and forces correctness to depend on an “active tenant context”.

2) **Invitation role semantics are still tenant-only**
   - `InviteRequest.role` comment mentions `VIEWER`, `LEAD`, etc., but the backend parses the invitation role only as `TenantMemberRole`.
   - Workspace/team/project roles granted via invitation acceptance are always `MEMBER`.
   - This is likely a frontend/backend semantic mismatch risk.

3) **Tenant BILLING_ADMIN is inconsistently integrated**
   - Exists in schema and tenant directory logic, but:
     - cannot create invites in latest code
     - does not receive tenant→workspace admin fallback
   - If billing admins are intended to exist as a real operational role, more explicit policy is needed.

4) **Some authorization is still duplicated across services**
   - Example: task delete uses explicit “project lead or workspace admin” check, while other task writes use `canEditTask`.
   - This is not inherently wrong, but it increases drift risk unless consolidated into policies.

---

## 8) Actionable Q&A (Based on latest enforcement)

- “Can Tenant Admin invite Workspace Admin?”
  - No. Invitations assign **tenant roles** only, and acceptance always grants workspace/team/project membership as `MEMBER` (not workspace ADMIN).

- “Can Team Lead edit Projects?”
  - Not by being a team lead alone. Project creation requires workspace admin; project membership management requires project lead or workspace admin.

- “Can Workspace Member access Tasks outside assigned Projects?”
  - No. Task reads require `canViewTask` which requires project membership OR workspace admin for that project’s workspace, plus tenant-bound checks.

- “Can Org Admin assign a different Project Lead during project creation?”
  - Yes. `ProjectRequest.leadUserId` is supported, as long as the designated lead is already a workspace member.

- “Can Team Leads manage users outside their workspace?”
  - No. Team operations are tenant-bound via `verifyResourceBelongsToTenant(teamId, TEAM)`, and team membership operations require workspace admin or team lead for that team.

- “What permissions are inherited vs explicitly assigned?”
  - Explicit: membership rows in `tenant_members`, `workspace_members`, `project_members`, `team_members`.
  - Inherited/bridged (explicitly defined): tenant `OWNER/ADMIN` ⇒ workspace admin via `canAdminWorkspace` and workspace-role fallback.

---

## 9) Recommended RBAC Architecture Improvements (Latest)

1) Make “active tenant context” explicit and manageable
   - Add an explicit “switch active tenant” operation (or embed tenant context in the JWT) and ensure `verifyResourceBelongsToTenant` matches the intended product model.

2) Formalize invitation semantics
   - Rename `invitations.role` to `tenant_role`, or add separate per-scope role columns with explicit enforcement.

3) Consolidate capability rules
   - Prefer a single policy layer (capability methods) rather than repeating “lead/admin/self” conditions across services.

4) Clarify `BILLING_ADMIN` in code
   - Either fully support it (invite abilities, allowed views, explicit limitations), or remove it from schema/flows to avoid a phantom role.

