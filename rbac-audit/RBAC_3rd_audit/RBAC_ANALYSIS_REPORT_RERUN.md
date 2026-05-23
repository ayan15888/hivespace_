# HiveSpace Backend RBAC / Permission System — Fresh Re-run After Fixes

Date: 2026-05-23  
Backend root: `backend/src/main/java/com/project/hiveSpace`  
Schema sources of truth:
- `CurrentSchema.md`
- `backend/backendschema.sql`

This is a **fresh RBAC audit re-run** based on the latest schema and backend implementation (post-fixes). It documents **actual enforced behavior**.

---

## 1) Current Schema: Scopes, Memberships, Roles

### 1.1 Scope hierarchy (FK relationships)

- **Tenant (Organization)**: `tenants`
  - primary ownership marker: `tenants.owner_email`
  - memberships: `tenant_members(tenant_id, user_id, role)`
- **Workspace**: `workspaces(tenant_id, created_by)`
  - memberships: `workspace_members(workspace_id, user_id, role)`
- **Project**: `projects(workspace_id, created_by)`
  - memberships: `project_members(project_id, user_id, role)`
  - assignment of teams: `project_teams(project_id, team_id, assigned_by)`
- **Team**: `teams(workspace_id, created_by)`
  - memberships: `team_members(team_id, user_id, role)`
- **Task**: `tasks(project_id, team_id?, parent_id?, created_by?, assignee_id?)`
  - assignees: `task_assignees(task_id, user_id, role)`
  - activity log: `task_activities(task_id, user_id?, type, old_value?, new_value?)`

### 1.2 Roles in schema (CHECK constraints)

- Tenant roles: `OWNER | ADMIN | BILLING_ADMIN | MEMBER`
- Workspace roles: `ADMIN | MEMBER | VIEWER`
- Project roles: `LEAD | MEMBER | VIEWER`
- Team roles: `LEAD | MEMBER`
- Task-assignee roles: `OWNER | COLLABORATOR | REVIEWER`

### 1.3 Invitation model (updated)

Schema now includes:
- `invitations.tenant_role` (renamed from generic `role`)
- junction tables:
  - `invitation_workspaces(invitation_id, workspace_id)`
  - `invitation_teams(invitation_id, team_id)`

Backend model matches this via `Invitation.workspaces` and `Invitation.teams` (many-to-many).

Invite acceptance semantics:
- tenant role granted from `invitations.tenant_role` (parsed to `TenantMemberRole`)
- workspace/team/project memberships granted as `MEMBER` (workspace/team/project roles are not grantable via invite)

---

## 2) Authentication & Authorization Architecture

### 2.1 Authentication

- JWT via `JwtAuthenticationFilter` + `JwtService`.
- Public endpoints (per `SecurityConfig`):
  - `/api/auth/**`
  - `GET /api/i/*`
  - `/api/health`

Everything else requires authentication.

### 2.2 Authorization enforcement style

Authorization is enforced in service logic, using:
- `RbacService` (role checks, capabilities, tenant-boundary verification)
- service-local checks (e.g., “project lead OR workspace admin”)

No meaningful method-security annotations are used for RBAC decisions.

---

## 3) `RbacService`: Scope Isolation and Bridge Rules (verified)

File: `backend/src/main/java/com/project/hiveSpace/security/RbacService.java`

### 3.1 Scope-isolated comparisons (no cross-scope rank map)

Role comparisons are now scoped by enum type:
- `hasTenantRole(tenantId, TenantMemberRole required)` uses `tenantRank`
- `hasWorkspaceRole(workspaceId, WorkspaceMemberRole required)` uses `workspaceRank`
- `hasProjectRole(projectId, ProjectMemberRole required)` uses `projectRank`
- `hasTeamRole(teamId, TeamMemberRole required)` uses `teamRank`

This prevents accidental ranking of unrelated scope roles (e.g., tenant `BILLING_ADMIN` vs project/team `LEAD`).

### 3.2 Explicit cross-scope inheritance (“bridge rules”)

Cross-scope power is only granted through explicit rules, primarily:
- tenant `OWNER/ADMIN` ⇒ workspace admin powers for any workspace in that tenant:
  - implemented via `hasWorkspaceRole` fallback and `canAdminWorkspace`

---

## 4) Enforcement Trace (What is checked where)

### 4.1 Tenant / org flows

`TenantService`:
- `createTenant`: any authenticated user can create a tenant; creator becomes tenant `OWNER` and `users.tenant_id` is set to that tenant.
- member directory: allowed for tenant owner/admin/member; denied for billing admins.
- role updates / removals: allowed for tenant owner/admin with owner-only constraints around admins/ownership transfer.

### 4.2 Workspaces

`WorkspaceService`:
- `createWorkspace`: requires:
  - `currentUser.tenant_id == request.tenantId`
  - tenant role >= `ADMIN` (OWNER satisfies this due to rank)
  - creates `workspace_members` row for creator as `ADMIN`
- `getWorkspacesByTenant`: requires tenant role >= `MEMBER`
- `getWorkspaceMembers`: requires:
  - tenant-boundary verification (`verifyResourceBelongsToTenant(workspaceId, WORKSPACE)`)
  - workspace role >= `VIEWER`
  - emails are included only if `canAdminWorkspace(workspaceId)`

### 4.3 Projects

`ProjectService`:
- `createProject`: requires:
  - tenant-boundary verification (workspace belongs to active tenant)
  - `canCreateProject(workspaceId)` (currently: workspace admin)
  - lead assignment rules:
    - if `ProjectRequest.leadUserId` provided: lead must already be a workspace member
    - else creator becomes `ProjectMemberRole.LEAD`
- `getProjectsByWorkspace`:
  - tenant-boundary verification
  - requires workspace role >= `VIEWER`
  - workspace admins see all projects; others see only projects they are members of
- `assignTeam` / `unassignTeam`:
  - tenant-boundary verification for both project + team
  - requires project LEAD OR workspace admin
  - enforces same-workspace for team/project

### 4.4 Teams

`TeamService`:
- `createTeam`:
  - tenant-boundary verification
  - requires `canCreateTeam(workspaceId)` (workspace MEMBER+ or tenant owner/admin fallback)
  - lead assignment rules:
    - if `TeamRequest.leadUserId` provided: lead must already be a workspace member
    - else creator becomes team `LEAD`
  - optional association to project requires caller is project `MEMBER` and same-workspace
- `getTeamsByWorkspace`: requires tenant-boundary + workspace role >= `VIEWER`
- `updateTeam` / `deleteTeam`: requires team LEAD OR workspace admin

`TeamMemberService`:
- requires tenant-boundary for team
- view members: team MEMBER or workspace admin
- manage members: team LEAD or workspace admin
- target user must already be workspace member
- cannot demote/remove last team lead

### 4.5 Project members

`ProjectMemberService`:
- requires tenant-boundary for project
- view members: project VIEWER or workspace admin
- manage members: project LEAD or workspace admin
- target user must already be workspace member
- cannot demote/remove last project lead

### 4.6 Tasks + task assignees

`TaskService`:
- create task: tenant-boundary + `canCreateTask(projectId)` (project MEMBER+)
- read task: tenant-boundary + `canViewTask(taskId)`
- list tasks by project: tenant-boundary + `canViewProject(projectId)`
- list “all tasks”: requires tenant role >= MEMBER, then returns tasks only for projects the user is a member of
- update status / update task: tenant-boundary + `canEditTask(taskId)` (project MEMBER+)
- delete task: tenant-boundary + (project LEAD OR workspace admin)

`TaskAssigneeService`:
- list assignees: tenant-boundary + `canViewTask`
- add assignee / change owner:
  - tenant-boundary
  - caller must be task OWNER OR project LEAD OR workspace admin
  - target must be project member (VIEWER+)
- remove assignee:
  - tenant-boundary
  - caller must be self OR task OWNER OR project LEAD OR workspace admin
  - cannot remove OWNER via standard remove

### 4.7 Invitations (updated multi-scope)

`InvitationService.createInvite`:
- inviter must be tenant OWNER/ADMIN (billing admins are not allowed)
- validates `tenant_role` is a valid tenant role and prevents inviting OWNER; tenant admins cannot invite tenant admins
- supports:
  - single `workspaceId` + list `workspaceIds`
  - single `teamId` + list `teamIds`
  - optional `projectId`
- validates every workspace/team/project belongs to the tenant
- validates inviter has workspace role `MEMBER` in **every workspace that the invite would cause the invitee to join**
- stores selected workspaces/teams in junction tables

`InvitationService.acceptInvite`:
- validates status/expiry/max uses
- PIN rate-limits via `invitation_attempts`
- re-validates that all junction-table workspaces/teams (and project workspace) still belong to the tenant
- joins:
  - tenant membership (tenant role from `tenant_role`)
  - every workspace in `invitation_workspaces` as workspace `MEMBER`
  - every team in `invitation_teams` as team `MEMBER` (also ensures workspace join)
  - optional project as project `MEMBER` (also ensures workspace join)

---

## 5) Fresh answers to example questions (post-fixes)

- Can Tenant Admin invite Workspace Admin?
  - No. Invites grant tenant role only; workspace/team/project memberships are always created with `MEMBER` role.

- Can Team Lead edit Projects?
  - Not by team lead alone. Project operations require project lead or workspace admin (or explicit endpoint checks).

- Can Workspace Member access Tasks outside assigned Projects?
  - No. Task reads require `canViewTask`, which requires project membership or workspace admin (plus tenant-boundary verification).

- Can Org Admin assign a different Project Lead during project creation?
  - Yes, via `ProjectRequest.leadUserId`, but the chosen lead must already be a workspace member.

- Can Team Leads manage users outside their workspace?
  - No. Team membership management is scoped to the team and is tenant-bound; target users must be members of the team’s workspace.

---

## 6) Notable remaining risks / architectural notes (current)

1) **Active tenant context is still a hard boundary**:
   - `verifyResourceBelongsToTenant` uses `users.tenant_id` (“current tenant”) as the tenant boundary.
   - If users can belong to multiple tenants via `tenant_members`, the app needs an explicit way to switch `users.tenant_id` safely; otherwise “legitimate membership but denied access” can occur.

2) **Invitation tenant-role column still lacks a DB CHECK constraint**:
   - Backend parses/normalizes; DB will accept arbitrary strings in `invitations.tenant_role`.
   - This is more a data-integrity risk than an auth-bypass (backend defaults invalid values to MEMBER on acceptance).

3) **Some policies remain duplicated** (e.g., delete task is special-cased):
   - Consolidating policies into named capability methods can reduce drift.

