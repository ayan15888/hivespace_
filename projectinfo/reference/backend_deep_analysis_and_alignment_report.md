# Hivespace Backend Deep Analysis & Alignment Report

Generated: 2026-05-24  
Scope: `D:\project\hiveSpace_final\backend` compared against:
- `projectinfo/reference/Hivespace task and lead flow reference.md` (updated 2026-05-23)
- `projectinfo/reference/Hivespace roles and permissions reference.md` (updated 2026-05-23)
- `CurrentSchema.md` (declared: “currently running schema of Supabase”)

This report clearly distinguishes:
- **Current implementation** (what the code does today)
- **Expected behavior/architecture** (from the reference documents)
- **Required changes** (what must be changed to align)

---

## 0. Executive Summary (High Signal)

**Overall assessment:** The backend implements a basic Spring Boot + JPA CRUD stack for tenants/workspaces/projects/teams/tasks, with a custom `RbacService` used via `@PreAuthorize` and service-level checks. However, it is **not aligned** with the reference architecture in several fundamental ways:

1. **Tenant boundary + active-tenant model is inconsistent**: many permission checks accept arbitrary `tenantId` rather than enforcing the *active* tenant boundary (`users.tenant_id`) as the single security boundary.
2. **Project membership semantics are incorrect**: the RBAC layer treats “member of a team assigned to a project” as equivalent to “project member”, which directly conflicts with reference rules for task creation/assignment.
3. **Task/lead workflows do not match reference**: missing status transition rules, subtask depth validation, task identifier generation (`projects.task_sequence`), activity log type semantics, and correct assignee constraints.
4. **Live DB schema mismatch is severe**: multiple entity fields exist in code but do not exist in `CurrentSchema.md` (e.g., `tasks.assignee_id`, `projects.members_count`, `teams.members_count`, `workspaces.members_count`, `tenants.members_count`, `tenants.workspaces_count`). With `spring.jpa.hibernate.ddl-auto=validate`, this would typically fail on startup unless the live DB differs from `CurrentSchema.md`.
5. **API surface is incomplete vs reference**: missing workspace member management APIs, invite revoke/delete, auth refresh/switch-tenant, project share endpoints, and “my tasks” semantics.

**Alignment estimate:** ~45–55% aligned at a high level (entities/endpoints exist), ~20–30% aligned on the **strict rules/invariants** defined in the reference documents.

**Main blockers:** (a) tenant-boundary enforcement model, (b) project membership semantics, (c) schema mismatch & migration strategy.

---

## 1. System Architecture Overview

### 1.1 Backend structure and modules

Backend is a Spring Boot application with conventional layering:

- App entrypoint: `backend/src/main/java/com/project/hiveSpace/HiveSpaceApplication.java`
- Controllers (HTTP): `backend/src/main/java/com/project/hiveSpace/controllers/*`
- Services (business logic): `backend/src/main/java/com/project/hiveSpace/services/*`
- Persistence:
  - JPA Entities: `backend/src/main/java/com/project/hiveSpace/models/*`
  - Spring Data repositories: `backend/src/main/java/com/project/hiveSpace/repository/*`
- Security:
  - JWT filter: `backend/src/main/java/com/project/hiveSpace/security/JwtAuthenticationFilter.java`
  - JWT utility: `backend/src/main/java/com/project/hiveSpace/security/JwtService.java`
  - Security config: `backend/src/main/java/com/project/hiveSpace/security/SecurityConfig.java`
  - RBAC service: `backend/src/main/java/com/project/hiveSpace/security/RbacService.java`
- Global error mapping: `backend/src/main/java/com/project/hiveSpace/exceptions/GlobalExceptionHandler.java`

There is **no explicit “repository/service/controller contract” abstraction** beyond typical Spring Data repositories and “fat services”.

### 1.2 Request flow

1. HTTP request enters Spring MVC controller.
2. `SecurityFilterChain` authenticates (JWT if present) via `JwtAuthenticationFilter`.
3. Some controller methods have `@PreAuthorize(...)` that calls into `RbacService` methods.
4. Service methods often repeat checks and call `rbacService.verifyResourceBelongsToTenant(...)`.
5. Repository methods persist entities via JPA.
6. Exceptions bubble to `GlobalExceptionHandler` for status mapping.

### 1.3 Service/repository patterns

Current pattern is:
- Controllers are thin (mostly forward to service)
- Services contain both:
  - permission checks (sometimes duplicated with `@PreAuthorize`)
  - entity loading & validation
  - writes (JPA `save`, `delete`)
- Repositories are simple Spring Data interfaces (no explicit query layer / no QueryDSL).

### 1.4 Middleware flow (filters/interceptors)

Active middleware components:
- JWT auth filter (`JwtAuthenticationFilter`) — sets `SecurityContextHolder` principal to a `User` entity loaded by email.
- No explicit request-scoped tenant context middleware.
- No rate limiting / IP-based middleware (invite pin attempts are stored, but the IP is hard-coded).

### 1.5 Authentication and authorization flow

**Authentication**
- JWT subject is `userDetails.getUsername()`, which is `User.getUsername()` overridden to return `email`.
- JWT contains no tenant id claims, no roles, no scopes.
- Token validity is “subject matches, not expired”.

Key files:
- `backend/src/main/java/com/project/hiveSpace/security/JwtService.java`
- `backend/src/main/java/com/project/hiveSpace/security/JwtAuthenticationFilter.java`
- `backend/src/main/java/com/project/hiveSpace/services/AuthService.java`
- `backend/src/main/java/com/project/hiveSpace/controllers/AuthController.java`

**Authorization**
- Authorization is implemented via:
  - `@PreAuthorize("@rbac.<capability>(...)")` on some controller methods
  - Additional checks inside service methods
- Primary authorization logic is in `backend/src/main/java/com/project/hiveSpace/security/RbacService.java`.

### 1.6 Database interaction patterns

Persistence is via Spring Data JPA.
- Entity IDs use UUID generation in JPA, intended to match `gen_random_uuid()` on DB.
- Writes are usually done inside `@Transactional` service methods.
- Counts are maintained in code (`membersCount`, `teamsCount`, `workspacesCount`) rather than derived from DB — but the **current schema file does not include these columns**.

### 1.7 Event/notification flow (if present)

No event bus, queue, or domain event layer exists.
- “Activity” is implemented only for tasks: `task_activities` with minimal types (`CREATED`, `UPDATED`, `OWNER_CHANGED`, `ASSIGNED_*`, `UNASSIGNED`).
- Email invites appear to exist (Resend): `backend/src/main/java/com/project/hiveSpace/services/ResendEmailService.java` (not deeply audited here, but referenced by `InvitationService`).

---

## 2. Current vs Expected Architecture Comparison

This section lists mismatches with:
- current implementation
- expected behavior from reference docs
- gap
- complexity estimate

### 2.1 Tenant boundary enforcement model (critical)

**Current implementation**
- `RbacService.verifyResourceBelongsToTenant(resourceId, type)`:
  - Reads tenant id from `X-Tenant-Id` header if present; otherwise uses `user.getTenant().getId()`.
  - If header is present, it only checks that the user is a tenant member of the header tenant id (not that it equals the active tenant).
  - Many other RBAC checks *do not* call `verifyResourceBelongsToTenant`, e.g. `hasTenantRole(tenantId, role)` directly checks `tenant_members`.
- Multiple endpoints accept arbitrary `tenantId` in path (`/api/workspaces/t/{tenantId}`, `/api/i/t/{tenantId}`, `/api/tenants/{tenantId}/members`) and authorize based on membership in that tenant id, regardless of active tenant.

Key files:
- `backend/src/main/java/com/project/hiveSpace/security/RbacService.java`
- `backend/src/main/java/com/project/hiveSpace/services/WorkspaceService.java`
- `backend/src/main/java/com/project/hiveSpace/services/TenantService.java`
- `backend/src/main/java/com/project/hiveSpace/services/InvitationService.java`

**Expected (reference)**
- Tenant is the **security boundary**.
- Active tenant is stored in `users.tenant_id`.
- *Every* service method accepting a resource UUID must call `verifyResourceBelongsToTenant(resourceId, ResourceType)`.
- Cross-tenant access for a user who belongs to multiple tenants must require:
  - `POST /api/auth/switch-tenant` (updates `users.tenant_id` and issues a new JWT)
  - and then requests operate within that active tenant boundary.

**Gap**
- Current model allows cross-tenant access without switching active tenant (by providing another tenantId path/header the user is a member of).
- `X-Tenant-Id` header becomes a second “tenant selector” instead of being derived from active tenant.

**Required changes**
- Remove “tenant selection by header” as an authority source (or restrict it to equal `user.tenant_id`).
- Implement `/api/auth/switch-tenant` as described in the reference.
- Ensure `hasTenantRole(tenantId, ...)` and other tenant checks reject tenantId != `currentUser.tenant_id` (except for the tenant-switch discovery endpoint(s) that are explicitly allowed).
- Audit all service methods for missing `verifyResourceBelongsToTenant` calls.

**Complexity:** High (touches RBAC model, auth tokens, many endpoints, and likely frontend integration).

---

### 2.2 Project membership semantics via assigned teams (critical)

**Current implementation**
- `RbacService.hasProjectRole(projectId, requiredRole)`:
  - If no explicit `project_members` row exists, it checks if the user is a member of **any team assigned to that project** (`project_teams` + `team_members`).
  - If yes, it treats them as satisfying `ProjectMemberRole.MEMBER` checks.
- `ProjectMemberService.getMembersByProject`:
  - Returns explicit project members, then adds **virtual** “members” for members of assigned teams (not persisted in `project_members`).

Key files:
- `backend/src/main/java/com/project/hiveSpace/security/RbacService.java`
- `backend/src/main/java/com/project/hiveSpace/services/ProjectMemberService.java`

**Expected (reference)**
- A user must be a **workspace member** before being added to a project.
- A user must be a **project member** (explicit `project_members` row) to:
  - create/edit tasks
  - be assigned to tasks
  - participate in project actions
- Team membership is **workspace-scoped** and does not automatically equal project membership.

**Gap**
- Users can effectively “gain project member abilities” by being on an assigned team, without an explicit `project_members` row.
- This breaks reference rules for task creation/assignment: “Assignee must be a project member. Add them to the project first.”

**Required changes**
- Remove the team-membership fallback from `RbacService.hasProjectRole(...)` and `hasProjectRoleForUser(...)`.
- Remove the “virtual project members” behavior in `ProjectMemberService.getMembersByProject` (or clearly separate “team members in assigned teams” from “project members” in API response shape).
- Update task creation/assignment flows to require explicit `project_members` membership.
- If the product truly wants “team assigned to project implies membership”, update the reference docs first — the current reference explicitly disallows this.

**Complexity:** High (core RBAC semantics + API expectations + possibly frontend behavior).

---

### 2.3 Missing/partial endpoint authorization enforcement

**Current implementation**
- Some controllers rely on service-level checks but have no `@PreAuthorize`, e.g.:
  - `ProjectMemberController` (add/update/remove members)
  - `TeamMemberController` (add/update/remove members)
  - `ProjectTeamController` (assign/unassign team)
  - `WorkspaceController` (create workspace)
  - `InvitationController` (create invite)
- Service-level checks exist in many cases, but consistency varies.

**Expected (reference)**
- Reference includes an “API endpoint authorization map” with required roles.
- Enforcement should be systematic and hard to bypass.

**Gap**
- Higher risk of missed checks when new code is added.
- Authorization logic is spread across controllers/services without a consistent convention.

**Required changes**
- Pick a consistent enforcement strategy:
  - either enforce at controller with `@PreAuthorize` for all endpoints, or
  - enforce at service for all public methods (and keep controllers thin).
- Add missing guards based on the reference endpoint map.

**Complexity:** Medium (mostly mechanical, but requires careful audit).

---

### 2.4 “My tasks” endpoint semantics mismatch

**Current implementation**
- `GET /api/tasks` calls `TaskService.getAllTasks()` which:
  - finds all projects the user is a member of (`project_members`)
  - returns all tasks for those projects, newest updated first
  - does **not** filter to “tasks where the user is an assignee”

Key files:
- `backend/src/main/java/com/project/hiveSpace/controllers/TaskController.java`
- `backend/src/main/java/com/project/hiveSpace/services/TaskService.java`

**Expected (reference)**
- `/api/tasks` should return **“my tasks”**: tasks where `currentUser` is an assignee (via `task_assignees`), across projects where they are a project member.

**Gap**
- Current endpoint leaks tasks in projects where user is a member but not assigned, which contradicts the reference.

**Required changes**
- Implement “my tasks” query semantics based on `task_assignees`.
- Ensure tenant boundary and project membership are validated as per reference.

**Complexity:** Low–Medium (query + permission/tenancy correctness).

---

### 2.5 Project lead assignment invariants (partially aligned)

**Current implementation**
- Project creation supports `leadUserId` and validates the lead is a workspace member.
- If `leadUserId` is null: creator becomes LEAD (creates one `project_members` record).
- If lead differs: creates two records (lead = LEAD, creator = MEMBER).
- Preventing “last lead” removal/demotion exists in `ProjectMemberService`, but:
  - errors are thrown as `SecurityException` → mapped to **403**.
  - reference requires **400** with specific message patterns.

Key files:
- `backend/src/main/java/com/project/hiveSpace/services/ProjectService.java`
- `backend/src/main/java/com/project/hiveSpace/services/ProjectMemberService.java`
- `backend/src/main/java/com/project/hiveSpace/exceptions/GlobalExceptionHandler.java`

**Expected (reference)**
- Project must have at least one LEAD at all times (invariant).
- “Last lead demotion/removal” must be **400** with exact message.

**Gap**
- Status code/message mismatch for invariant failures.
- Missing more formal transactional invariants (see schema section: missing constraints/indices).

**Required changes**
- Introduce a dedicated “domain validation” exception mapped to 400 (not 403).
- Align error messages with the reference.
- Consider DB-level constraints or transactional locking if needed.

**Complexity:** Medium.

---

### 2.6 Team lead assignment invariants (partially aligned)

**Current implementation**
- Team creation supports `leadUserId` and validates lead is workspace member.
- `TeamMemberService` prevents removing/demoting the last lead, but throws `SecurityException` → 403.

Key files:
- `backend/src/main/java/com/project/hiveSpace/services/TeamService.java`
- `backend/src/main/java/com/project/hiveSpace/services/TeamMemberService.java`

**Expected (reference)**
- Team must have at least one LEAD.
- Last lead removal/demotion is a 400 with strict message.

**Gap**
- Status code/message mismatch.

**Complexity:** Medium (same fix pattern as projects).

---

### 2.7 Task creation flow mismatches (critical)

**Current implementation**
- Allows `parentId` with no depth validation (subtasks of subtasks are possible).
- Allows `teamId` without validating that team is assigned to project (or same workspace).
- Assignee checks use `rbacService.hasProjectRoleForUser(..., VIEWER)` which (today) can treat team-membership as project membership.
- Task identifier:
  - computed at read-time using `countByProjectAndCreatedAtLessThanEqual(...)`
  - not based on `projects.task_sequence`
  - race-prone (concurrent inserts can produce duplicates or reordering)
- Status transitions:
  - `updateTaskStatus` accepts any value and sets it directly, with no transition rules, and no activity logging.

Key files:
- `backend/src/main/java/com/project/hiveSpace/services/TaskService.java`
- `backend/src/main/java/com/project/hiveSpace/repository/TaskRepository.java`

**Expected (reference)**
- Subtask max depth is 1; “sub-subtask attempt” must be rejected with 400 message.
- `teamId` assignment must ensure the team is assigned to the project (`project_teams`).
- Assignees must be explicit project members.
- Task identifiers must be generated using an atomic per-project sequence (`projects.task_sequence`).
- Status transitions must follow the reference transition rules and return a 400 for invalid transitions.

**Gap**
- Multiple core invariants missing.

**Required changes**
- Enforce subtask depth: if parent task has a `parent_id`, reject.
- Enforce team assignment: if `teamId` provided, ensure `(projectId, teamId)` exists in `project_teams`.
- Require explicit `project_members` membership for assignee selection.
- Implement atomic task sequence increment in a transaction:
  - `UPDATE projects SET task_sequence = task_sequence + 1 WHERE id = :projectId RETURNING task_sequence`
  - store sequence on task or compute identifier from returned sequence
- Implement status transition validation and proper activity log types.

**Complexity:** High.

---

### 2.8 Task assignment flow mismatches (critical)

**Current implementation**
- `TaskAssigneeService.addAssignee`:
  - accepts any `TaskAssigneeRole` from request, including `OWNER`
  - uses activity type `ASSIGNED_{ROLE}` (not the reference list)
  - does not prevent conflicting roles / enforce exact contract semantics
- `TaskAssigneeService.removeAssignee`:
  - forbids removing OWNER, but message differs from reference
  - activity uses `UNASSIGNED` (reference expects `ASSIGNEE_REMOVED` and specific variants)

Key files:
- `backend/src/main/java/com/project/hiveSpace/services/TaskAssigneeService.java`
- `backend/src/main/java/com/project/hiveSpace/dto/AddAssigneeRequest.java`

**Expected (reference)**
- Add assignee endpoint should add only COLLABORATOR/REVIEWER (owner changes use dedicated endpoint).
- Must reject duplicate assignee with 400 message.
- Must require assignee is explicit project member.
- Must produce activity log types from the reference list (e.g., `COLLABORATOR_ADDED`, `REVIEWER_ADDED`, `OWNER_CHANGED`, `ASSIGNEE_REMOVED`).
- Permission enforcement must match: “Only the task owner, project lead, or workspace admin can manage assignees.”

**Gap**
- Incorrect contract on role input + activity types + membership semantics.

**Required changes**
- Restrict `AddAssigneeRequest.role` to {COLLABORATOR, REVIEWER} at validation level.
- Align activity types & payloads.
- Align error messages and status codes.

**Complexity:** Medium–High.

---

### 2.9 Missing systems mentioned in the reference

From the role/permission reference:
- `/api/auth/refresh` — missing
- `/api/auth/switch-tenant` — missing
- Workspace member management endpoints — missing (add member, role update, remove)
- Invitation revoke/delete endpoint — missing
- Project share (public shareable links) endpoints — missing; schema includes `shareable_links`
- Project update endpoint — missing (`PUT /api/projects/{id}`)
- Team detail endpoints (`GET /api/teams/{id}`, `GET /api/teams/{id}/members` exists, but `GET /api/teams/{id}` does not)
- Task detail endpoints exist, but status transition contract and activity logging do not match reference

**Complexity:** Medium–High depending on which are prioritized first.

---

## 3. RBAC & Permission Analysis

### 3.1 Current role hierarchy (as implemented)

Tenant roles: `TenantMemberRole` with rank:
- OWNER (4) > ADMIN (3) > BILLING_ADMIN (2) > MEMBER (1)

Workspace roles: `WorkspaceMemberRole`:
- ADMIN (3) > MEMBER (2) > VIEWER (1)
Plus: tenant OWNER/ADMIN treated as implicit workspace admin.

Project roles: `ProjectMemberRole`:
- LEAD (3) > MEMBER (2) > VIEWER (1)
Plus: “team member of an assigned team” can satisfy MEMBER checks (currently).

Team roles: `TeamMemberRole`:
- LEAD (2) > MEMBER (1)

Task roles: `TaskAssigneeRole`:
- OWNER, COLLABORATOR, REVIEWER

Key file: `backend/src/main/java/com/project/hiveSpace/security/RbacService.java`

### 3.2 Permission inheritance (current vs expected)

**Current**
- Tenant OWNER/ADMIN implicitly can admin all workspaces in that tenant.
- Workspace ADMIN effectively overrides many project/team checks by `canAdminWorkspace(workspaceId)`.

**Expected**
- Similar inheritance exists in reference (“walk up the hierarchy for override rules”), but it must be applied consistently and within the active tenant boundary.

**Gap**
- Inheritance is applied, but the tenant boundary is not consistently enforced and project membership semantics are incorrect (team membership fallback).

### 3.3 Tenant/workspace/project/team boundaries

**Current**
- Boundary checks exist as `verifyResourceBelongsToTenant(resourceId, ResourceType)`, but are not uniformly applied and can be influenced by `X-Tenant-Id`.

**Expected**
- Must always use `users.tenant_id` (active tenant) as the boundary, and switching tenants is an explicit server-side operation.

### 3.4 Middleware authorization logic

**Current**
- Authorization is primarily in method-level `@PreAuthorize` expressions and service checks, not in middleware.

**Expected**
- This is acceptable, but must be complete and consistent.

### 3.5 Missing or inconsistent permission enforcement

Examples (non-exhaustive):
- Workspace creation endpoint lacks `@PreAuthorize`, but service checks tenant role; still missing “active tenant boundary”.
- Project/team member controllers have no `@PreAuthorize`; rely on service checks.
- “My tasks” returns tasks beyond assignee scope.

### 3.6 Security concerns / privilege escalation risks

1. **Cross-tenant access risk**: user can access resources in a tenant they belong to without switching active tenant (contradicts reference).
2. **Project membership bypass**: team members of an assigned team can act as project members.
3. **Schema mismatch risk**: if DB does not match code, validation failures or silent behavior differences can create security holes (e.g., missing columns/constraints).
4. **Invite security IP tracking is non-functional**: attempts use hard-coded `127.0.0.1`, making rate limiting unreliable.

### 3.7 Frontend/backend RBAC consistency concerns

Reference docs clearly specify frontend gating rules. Current backend:
- does not expose a “permissions list” or “effective role” endpoint
- does not provide consistent error codes/messages expected by frontend

**Required changes to match reference**
- Implement strict tenant boundary + switch-tenant endpoint.
- Remove project-role-by-team fallback.
- Create a canonical permission evaluation layer (e.g., “effective permissions for resource id”) to share with frontend gating.
- Align HTTP status codes and messages with the reference error table.

Areas likely requiring redesign:
- `RbacService` responsibilities (tenant resolution + permission evaluation + resource chain verification are intertwined).

---

## 4. Task & Workflow Analysis

### 4.1 Task lifecycle flow (current)

Creation (`POST /api/projects/{projectId}/tasks`):
- Requires `@rbac.canCreateTask(projectId)` → currently “project MEMBER+” but includes team fallback.
- Creates a `Task` row (can set parent/team/assignee with minimal validation).
- Creates one `task_assignees` OWNER record.
- Creates a `task_activities` row of type `CREATED`.

Updates:
- `PATCH /api/tasks/{id}/status` sets status directly with no transition rules, no activity logging.
- `PUT /api/tasks/{id}` updates multiple fields; writes `task_activities` with type `UPDATED`.

Assignment:
- `POST /api/tasks/{id}/assignees` adds assignee with role provided by client.
- `PATCH /api/tasks/{id}/assignees/owner` changes owner by deleting old OWNER assignment and inserting new.
- `DELETE /api/tasks/{id}/assignees/{uid}` removes non-owner assignees.

### 4.2 Lead/project/team relationships (current)

- Projects/teams store “lead” only via membership tables (`project_members.role=LEAD`, `team_members.role=LEAD`).
- No separate lead pointer column exists (matches reference).
- Team-to-project association is via `project_teams`.

### 4.3 Assignment flow vs reference

Key gaps:
- Assignee membership validation must require explicit project membership, not team fallback.
- Team assignment to task must validate `(project, team)` relation via `project_teams`.
- Role inputs and activity types must match strict contract.

### 4.4 Task activity tracking (current vs reference)

**Current**
- Uses types: `CREATED`, `UPDATED`, `OWNER_CHANGED`, `ASSIGNED_{ROLE}`, `UNASSIGNED`.

**Expected**
- Must use a defined enum-like list: `STATUS_CHANGED`, `COLLABORATOR_ADDED`, `REVIEWER_ADDED`, `ASSIGNEE_REMOVED`, etc.

**Required changes**
- Standardize `task_activities.type` values and emit them consistently across all updates.

### 4.5 Invite and onboarding flow (current)

**Current**
- Tenant creation creates a `tenant_members` OWNER row and sets `users.tenant_id`.
- Invitations can attach multiple workspaces/teams and optionally a project.
- Acceptance:
  - validates token status/expiry/usage
  - tracks PIN attempts but with a fixed IP
  - joins tenant (tenant_members)
  - sets active tenant only if user currently has none
  - joins all invited workspaces and teams (and joins their workspaces)
  - optionally joins project (creates `project_members` and ensures workspace membership)

**Expected**
- Reference includes stricter rules for:
  - invite revocation, expired/exhausted handling
  - status codes/messages
  - switching active tenant for multi-tenant users

### 4.6 Approval/review workflows

No explicit “review approvals” exist; “IN_REVIEW” is just a task status.
Reference implies stronger workflow semantics via status transitions + reviewer role; these are not enforced.

### 4.7 Edge cases and workflow gaps

Non-exhaustive:
- Subtask-of-subtask is allowed.
- Task status transitions are not validated.
- Task “team assignment” can point to any team id, even cross-workspace unless DB-level tenant chain happens to match (it is not verified in code).
- `AddAssigneeRequest` can set OWNER (should be disallowed).

---

## 5. Database & Entity Relationship Analysis

### 5.1 Entity relationships (as code expects)

Entities and relations:
- `Tenant` ← `Workspace(tenant_id)` ← `Project(workspace_id)` ← `Task(project_id)`
- `Workspace` ← `Team(workspace_id)`
- Membership tables:
  - `tenant_members(tenant_id, user_id, role)`
  - `workspace_members(workspace_id, user_id, role)`
  - `project_members(project_id, user_id, role)`
  - `team_members(team_id, user_id, role)`
  - `task_assignees(task_id, user_id, role)`
- Junction:
  - `project_teams(project_id, team_id)`
- Activity log:
  - `task_activities(task_id, user_id, type, old_value, new_value)`
- Invites:
  - `invitations` with many-to-many `invitation_workspaces`, `invitation_teams`
- Share:
  - `shareable_links` exists in schema but has no backend code.

### 5.2 Ownership boundaries and multi-tenant isolation strategy

**Expected**
- Tenant boundary enforced via active tenant (`users.tenant_id`), with verified tenant chain for each resource.

**Current**
- Partial enforcement via `verifyResourceBelongsToTenant`, but can be bypassed by selecting tenant id in path/header.

### 5.3 Schema mismatches (code vs `CurrentSchema.md`) — critical

The following fields are present in JPA entities/services but **do not exist** in `CurrentSchema.md`:

- `tasks.assignee_id` is referenced by `Task.assignee` mapping (`@JoinColumn(name="assignee_id")`), but `CREATE TABLE public.tasks` has no `assignee_id`.
- Count fields:
  - `tenants.members_count`, `tenants.workspaces_count` are used by `TenantService` and `Tenant` entity, but `tenants` table in schema has no such columns.
  - `workspaces.members_count` is used by `WorkspaceService` and `Workspace` entity, but schema has no such column.
  - `teams.members_count` is used by `TeamService` and `Team` entity, but schema has no such column.
  - `projects.members_count` and `projects.teams_count` are used by `ProjectService` and `Project` entity, but schema has no such columns.

Additionally:
- `TaskStatus.BACKLOG` exists in code enum but is not allowed by DB CHECK constraint in schema.
- `Tenant` entity has no mapping for `tenants.owner_id` (schema includes it).

**Why this matters**
- With `spring.jpa.hibernate.ddl-auto=validate`, these mismatches typically prevent startup.
- If the live DB actually differs from `CurrentSchema.md`, then the schema document is not a reliable “source of truth” for alignment planning.

**Required changes**
- Decide which artifact is authoritative:
  1) If Supabase schema is authoritative: update code entities and logic to match it (remove/migrate fields).
  2) If reference architecture requires the missing columns: create DB migrations to add them and update `CurrentSchema.md`.
- Either way, alignment work cannot be safely executed until this discrepancy is resolved.

**Complexity:** High (schema + entities + API responses + migration planning).

### 5.4 Missing indexes/constraints (expected for invariants)

The reference implies invariants that are best supported with:
- unique constraints:
  - already present for membership uniqueness (good)
- additional constraints/indexes likely needed:
  - `project_members(project_id)`, `team_members(team_id)`, `task_assignees(task_id)` indexes for listing
  - `task_activities(task_id, created_at)` for timeline
  - enforce “at least one LEAD per project/team” via transactional logic (DB-level constraint is difficult, but can be approximated with triggers or careful transactions).

Migration complexity/risk:
- Medium–High (adding columns + backfills + ensuring counts remain consistent).

---

## 6. API & Service Layer Review

### 6.1 Controller responsibilities

Controllers are mostly thin, but:
- Authorization is inconsistently placed (some in controller via `@PreAuthorize`, some only in services).
- Some request shapes do not match reference contracts (e.g., `ProjectRequest` requires `workspaceId` even though workspace is in the path).

### 6.2 Service layer quality

Strengths:
- Services often call `verifyResourceBelongsToTenant` before accessing resources.
- Many write operations are transactional.

Issues:
- RBAC checks are duplicated between `@PreAuthorize` and service.
- Domain rules are encoded as ad-hoc checks rather than a clear “workflow engine / domain policy”.
- “Counts” are updated manually and likely to drift even if schema supported them.
- Inconsistent exception types → inconsistent HTTP status codes vs reference.

### 6.3 Duplicated business logic

Examples:
- Permission checks duplicated in controller annotations and service methods (e.g., task create/edit/delete).

### 6.4 Validation consistency

Issues:
- Many DTOs lack validation constraints (e.g., `TeamRequest`).
- “Strict messages” from reference aren’t enforced.

### 6.5 Error handling patterns

`GlobalExceptionHandler` maps:
- `IllegalArgumentException` → 400
- `SecurityException` → 403
- `IllegalStateException` → 401

Reference requires:
- 400 for domain rule violations (e.g., “last lead” invariant)
- 403 for permission issues
- 409 for conflicts like “already project member”
- 404 for not found

Required changes:
- Introduce typed exceptions: `NotFoundException`, `ConflictException`, `DomainValidationException`, `ForbiddenException`.
- Map them to strict status codes/messages.

### 6.6 Transaction safety concerns

High-risk areas:
- Task identifier generation is non-atomic and computed by counting rows; not safe under concurrency.
- Count fields (membersCount, etc.) can drift without strict transactional updates and/or DB triggers.

### 6.7 Scalability concerns

Examples:
- `ProjectService.getProjectsByWorkspace` loads all projects then filters in memory for non-admins; should be pushed down to DB query.
- “Virtual membership” computation in `ProjectMemberService.getMembersByProject` can become expensive for large teams/projects.

---

## 7. Security Review

### 7.1 Authorization weaknesses

1. **Active tenant boundary not enforced** (cross-tenant access possible).
2. **Project membership bypass via assigned team** (privilege escalation within workspace/project).
3. **`AddAssigneeRequest` allows OWNER** (can potentially bypass intended owner-transfer workflow unless blocked elsewhere).

### 7.2 Missing validation checks

- Subtask depth rule missing.
- Team assignment to task missing relation validation.
- Task status transition validation missing.

### 7.3 Direct object reference risks (IDOR)

Tenant chain verification exists for some operations, but not all endpoints enforce it systematically.
Missing: consistent “resource chain verify” for all resource-based reads/writes.

### 7.4 Tenant isolation risks

Use of `X-Tenant-Id` header + path tenantId endpoints makes tenant isolation policy ambiguous.

### 7.5 Invite abuse risks

- IP stored as constant makes rate limiting ineffective.
- No explicit rate limiting middleware.

### 7.6 Security changes required to support the reference RBAC model

- Implement switch-tenant + enforce active tenant boundary everywhere.
- Ensure all resource access calls verify tenant chain and reject mismatched active tenant.
- Remove team→project implicit membership behavior.
- Harden invite attempt tracking with real client IP extraction + consider additional rate limiting.

---

## 8. Scalability & Maintainability Review

### 8.1 High technical debt areas

- `RbacService` mixes:
  - tenant resolution (header/user)
  - permission evaluation
  - resource-chain verification
- Manual count fields (even if schema had them) create ongoing drift risk.
- Domain rules are spread across services without a shared policy layer.

### 8.2 Recommended abstractions

- Introduce a **TenantContext** (derived from active tenant) used everywhere.
- Introduce a **Policy/Permission engine**:
  - `PermissionEvaluator` or a set of `Policy` classes per scope (Tenant/Workspace/Project/Team/Task).
- Introduce a **TaskWorkflow** module:
  - status transition validator
  - assignee rules
  - subtask rules
  - sequence generation

### 8.3 Bottleneck risks

- In-memory filtering for projects/tasks will not scale.
- “Virtual membership” and repeated repository calls in RBAC can become N+1 patterns.

### 8.4 Migration/refactor difficulty

- Safe to refactor incrementally:
  - typed exceptions + error mapping
  - task status transition validation
  - task assignment request validation (role restriction)
- Breaking changes likely required:
  - tenant boundary model
  - project membership semantics
  - schema alignment (counts/assignee_id/task_sequence handling)

---

## 9. Code Quality Review

### 9.1 Inconsistent naming / contracts

- `ProjectRequest` includes `workspaceId` but controller path also includes `workspaceId` (contract mismatch with reference).
- Some methods use `System.out.println` debugging (`TaskController.getAllTasks`).

### 9.2 Large/unmaintainable files

- `InvitationService` is doing many responsibilities (security, email, membership enrollment, validation).

### 9.3 Duplicated logic

- Permission checks repeated at controller and service layers.

### 9.4 Missing utilities/helpers

- No shared “resource chain” resolver utilities (tenant/workspace/project chain).
- No shared “error code/message catalog” to enforce reference message invariants.

### 9.5 Suggested refactors (after alignment work)

- Split `InvitationService` into:
  - `InvitationCommandService` (create/revoke)
  - `InvitationValidationService` (validate token)
  - `InvitationEnrollmentService` (accept/join)
- Split RBAC:
  - `TenantBoundaryService` (active tenant enforcement + chain verification)
  - `PermissionService` (role/permission evaluation)

---

## 10. Migration & Alignment Plan (Phased)

This plan is ordered to reduce risk and unblock dependent changes.

### Phase 0 — Resolve schema truth (blocking)

1. Confirm whether `CurrentSchema.md` truly matches live DB (Supabase).
2. Decide source of truth:
   - If Supabase schema is correct: update JPA entities and code to match.
   - If reference requires missing columns: create migrations to add them and update the schema doc.

**Risk:** High (cannot safely align RBAC/workflows without knowing schema reality).

### Phase 1 — Error model + strict contracts (low–medium risk)

1. Introduce typed exceptions and map to required HTTP statuses (400/403/404/409).
2. Align error messages for lead/task workflows to match reference patterns.
3. Remove debug logging statements.

### Phase 2 — Tenant boundary enforcement + switch-tenant (high risk, core)

1. Implement `POST /api/auth/switch-tenant` exactly as reference.
2. Remove tenant selection via `X-Tenant-Id` (or restrict to equal `users.tenant_id`).
3. Ensure all tenant-scoped endpoints enforce active tenant boundary.

### Phase 3 — Fix project membership semantics (high risk, core)

1. Remove team-membership fallback in `RbacService.hasProjectRole*`.
2. Remove “virtual project members” behavior (or return it as a separate field/list).
3. Update task creation/assignment rules to require explicit `project_members`.

### Phase 4 — Task workflow alignment (medium–high)

1. Subtask depth enforcement (max depth 1).
2. Team-to-project validation for task team assignment.
3. Task status transition validator + activity logs (`STATUS_CHANGED` etc.).
4. Task identifier generation using atomic `projects.task_sequence`.

### Phase 5 — Missing APIs from reference (medium)

1. Workspace member management endpoints.
2. Invitation revoke/delete.
3. Shareable links endpoints (`shareable_links` table) + public access endpoint.
4. Auth refresh if needed.

### Testing strategy (recommended)

- Add service-level tests for:
  - tenant boundary checks
  - role enforcement per endpoint map
  - last-lead invariants
  - task status transitions and assignee rules
- Add integration tests (Testcontainers) for:
  - concurrent task creation sequence correctness
  - invite acceptance locking and usage limits

---

## 11. Final Findings & Recommendations

### 11.1 Backend health assessment

The codebase is a workable MVP-level backend but currently:
- has RBAC semantics that conflict with the reference documents
- has major DB schema mismatches relative to `CurrentSchema.md`
- lacks several critical APIs and strict workflow rules required by the reference architecture

### 11.2 Alignment percentage (estimated)

- Entity coverage / endpoints present: ~60%
- Correct RBAC behavior per reference: ~25–35%
- Task/lead workflow compliance: ~30–40%
- Tenant boundary compliance: ~20–30%

Overall: **~45–55% aligned** structurally, but **not aligned** on strict invariants.

### 11.3 Effort estimate to achieve full alignment

Assuming one experienced backend engineer:
- Phase 0: 1–3 days (depending on schema truth and migration approach)
- Phase 1: 1–2 days
- Phase 2: 3–7 days (plus frontend coordination)
- Phase 3: 3–6 days
- Phase 4: 4–10 days (depends on data migrations + API changes)
- Phase 5: 4–10 days

Total: ~3–6 weeks with careful testing and staged rollout.

### 11.4 Critical blockers

- Schema mismatch vs `CurrentSchema.md`
- Tenant boundary design (active tenant vs request-selected tenant)
- Project membership semantics

### 11.5 High-priority improvements

1. Make tenant boundary enforcement match reference (switch-tenant + active tenant only).
2. Fix project membership rules (no implicit membership via teams).
3. Implement task sequence + workflow validator.
4. Align errors/status codes/messages for frontend contracts.

### 11.6 Production readiness concerns

- Current authorization boundary is ambiguous and can lead to cross-tenant data exposure.
- Task sequencing and workflow rules are not safe under concurrency.
- Invite rate limiting is not effective due to hard-coded IP tracking.

---

## Appendix A — Key Code Entry Points (Quick Links)

- RBAC: `backend/src/main/java/com/project/hiveSpace/security/RbacService.java`
- Auth: `backend/src/main/java/com/project/hiveSpace/controllers/AuthController.java`, `backend/src/main/java/com/project/hiveSpace/services/AuthService.java`
- Tenants: `backend/src/main/java/com/project/hiveSpace/controllers/TenantController.java`, `backend/src/main/java/com/project/hiveSpace/services/TenantService.java`
- Workspaces: `backend/src/main/java/com/project/hiveSpace/controllers/WorkspaceController.java`, `backend/src/main/java/com/project/hiveSpace/services/WorkspaceService.java`
- Projects: `backend/src/main/java/com/project/hiveSpace/controllers/ProjectController.java`, `backend/src/main/java/com/project/hiveSpace/services/ProjectService.java`
- Project members: `backend/src/main/java/com/project/hiveSpace/controllers/ProjectMemberController.java`, `backend/src/main/java/com/project/hiveSpace/services/ProjectMemberService.java`
- Teams: `backend/src/main/java/com/project/hiveSpace/controllers/TeamController.java`, `backend/src/main/java/com/project/hiveSpace/services/TeamService.java`
- Team members: `backend/src/main/java/com/project/hiveSpace/controllers/TeamMemberController.java`, `backend/src/main/java/com/project/hiveSpace/services/TeamMemberService.java`
- Tasks: `backend/src/main/java/com/project/hiveSpace/controllers/TaskController.java`, `backend/src/main/java/com/project/hiveSpace/services/TaskService.java`
- Task assignees: `backend/src/main/java/com/project/hiveSpace/controllers/TaskAssigneeController.java`, `backend/src/main/java/com/project/hiveSpace/services/TaskAssigneeService.java`
- Invitations: `backend/src/main/java/com/project/hiveSpace/controllers/InvitationController.java`, `backend/src/main/java/com/project/hiveSpace/services/InvitationService.java`

