# RBAC Permission Matrix (Derived from backend implementation)

This matrix reflects **effective permissions implemented in backend code**, not intended product semantics.

Legend:

- ✅ = allowed by an explicit backend check (or explicitly not blocked)
- ❌ = blocked by an explicit backend check
- ⚠️ = allowed due to a missing authorization check (authenticated users can do it)
- ⓘ = informational / not enforced as a permission boundary

---

## A) Roles in the system (by scope)

| Scope           | Source table             | Role values                                 |
| --------------- | ------------------------ | ------------------------------------------- |
| Tenant          | `tenant_members.role`    | `OWNER`, `ADMIN`, `BILLING_ADMIN`, `MEMBER` |
| Workspace       | `workspace_members.role` | `ADMIN`, `MEMBER`, `VIEWER`                 |
| Team            | `team_members.role`      | `LEAD`, `MEMBER`                            |
| Project         | `project_members.role`   | `LEAD`, `MEMBER`, `VIEWER`                  |
| Task (assignee) | `task_assignees.role`    | `OWNER`, `COLLABORATOR`, `REVIEWER`         |

Notes:

- `models/Role` exists (`USER`, `OWNER`, `ADMIN`, `MEMBER`) but is not used for authorization; Spring authorities are always `ROLE_USER`.
- `RbacService` compares role strings using a rank map: `OWNER > ADMIN > (BILLING_ADMIN == LEAD) > MEMBER > VIEWER`.

---

## B) Tenant permissions (TenantMemberRole) — Implemented

| Action                                                        |                 OWNER |                 ADMIN | BILLING_ADMIN | MEMBER |
| ------------------------------------------------------------- | --------------------: | --------------------: | ------------: | -----: |
| Create tenant (`POST /api/tenants`)                           |                    ⚠️ |                    ⚠️ |            ⚠️ |     ⚠️ |
| List my tenants (`GET /api/tenants/me`)                       |                    ✅ |                    ✅ |            ✅ |     ✅ |
| View tenant members (`GET /api/tenants/{id}/members`)         |                    ✅ |                    ✅ |            ❌ |     ✅ |
| Create invitation (`POST /api/i/generate`)                    |                    ✅ |                    ✅ |            ✅ |     ❌ |
| View invitation list (`GET /api/i/t/{tenantId}`)              |                    ✅ |                    ✅ |            ❌ |     ❌ |
| Update member role (`PUT /api/tenants/{id}/members/{u}/role`) | ✅ (with constraints) | ✅ (with constraints) |            ❌ |     ❌ |
| Remove member (`DELETE /api/tenants/{id}/members/{u}`)        | ✅ (with constraints) | ✅ (with constraints) |            ❌ |     ❌ |

Key constraints enforced:

- Only OWNER can invite tenant `ADMIN`.
- Invite cannot assign tenant `OWNER`.
- Only OWNER can set tenant `OWNER` or `ADMIN`, and only OWNER can modify existing `ADMIN` roles.
- BILLING_ADMIN is explicitly excluded from viewing member directory and invitation list.

---

## C) Workspace permissions (WorkspaceMemberRole) — Implemented & Missing

| Action                                                         | Workspace ADMIN |          Workspace MEMBER |          Workspace VIEWER | Notes                                             |
| -------------------------------------------------------------- | --------------: | ------------------------: | ------------------------: | ------------------------------------------------- |
| Create workspace (`POST /api/workspaces`)                      |              ⚠️ |                        ⚠️ |                        ⚠️ | No tenant-role check at all                       |
| List workspaces by tenant (`GET /api/workspaces/t/{tenantId}`) |              ⚠️ |                        ⚠️ |                        ⚠️ | No membership check                               |
| List workspace members (`GET /api/workspaces/{id}/members`)    |              ⚠️ |                        ⚠️ |                        ⚠️ | No membership check                               |
| Create team in workspace                                       |              ✅ |                        ✅ |                        ❌ | Requires `hasWorkspaceRole(workspaceId,"MEMBER")` |
| List teams in workspace                                        |              ✅ |                        ✅ |                        ✅ | Requires `hasWorkspaceRole(workspaceId,"VIEWER")` |
| Manage team members                                            |              ✅ |    (depends on team role) |    (depends on team role) | Workspace ADMIN can override (`isWorkspaceAdmin`) |
| Manage project members                                         |              ✅ | (depends on project role) | (depends on project role) | Workspace ADMIN can override (`isWorkspaceAdmin`) |
| Assign/unassign team to project                                |              ✅ | (depends on project role) | (depends on project role) | Workspace ADMIN can override (`isWorkspaceAdmin`) |

Inheritance implemented:

- Tenant `OWNER`/`ADMIN` are treated as workspace admins for any workspace in their tenant (fallback in `RbacService.hasWorkspaceRole`).

---

## D) Team permissions (TeamMemberRole) — Implemented

| Action                  |      Team LEAD |    Team MEMBER | Workspace ADMIN override |
| ----------------------- | -------------: | -------------: | -----------------------: |
| View team members       |             ✅ |             ✅ |                       ✅ |
| Add team member         |             ✅ |             ❌ |                       ✅ |
| Update team member role |             ✅ |             ❌ |                       ✅ |
| Remove team member      | ✅ (plus self) | ✅ (self only) |                       ✅ |
| Update team             |             ✅ |             ❌ |                       ✅ |
| Delete team             |             ✅ |             ❌ |                       ✅ |

Extra constraint:

- Cannot demote/remove the last team lead.

---

## E) Project permissions (ProjectMemberRole) — Implemented & Missing

| Action                                                           |   Project LEAD | Project MEMBER | Project VIEWER | Workspace ADMIN override |
| ---------------------------------------------------------------- | -------------: | -------------: | -------------: | -----------------------: |
| List projects in workspace (`GET /api/workspaces/{id}/projects`) |             ⚠️ |             ⚠️ |             ⚠️ |                      n/a |
| Create project (`POST /api/workspaces/{id}/projects`)            |             ⚠️ |             ⚠️ |             ⚠️ |                      n/a |
| View project members                                             |             ✅ |             ✅ |             ✅ |                       ✅ |
| Add project member                                               |             ✅ |             ❌ |             ❌ |                       ✅ |
| Update project member role                                       |             ✅ |             ❌ |             ❌ |                       ✅ |
| Remove project member                                            | ✅ (plus self) |      ✅ (self) |      ✅ (self) |                       ✅ |
| Assign/unassign team to project                                  |             ✅ |             ❌ |             ❌ |                       ✅ |
| View project’s assigned teams                                    |             ✅ |             ✅ |             ✅ |                       ✅ |

Extra constraint:

- Cannot demote/remove the last project lead.

---

## F) Task permissions — Implemented & Missing

### F1) Task operations (`TaskService`)

| Action                                                        | Project LEAD | Project MEMBER | Project VIEWER | Non-member (authenticated) |
| ------------------------------------------------------------- | -----------: | -------------: | -------------: | -------------------------: |
| Create task in project                                        |           ✅ |             ✅ |             ❌ |                         ❌ |
| Update task (`PUT /api/tasks/{id}`)                           |           ✅ |             ✅ |             ❌ |                         ❌ |
| Delete task (`DELETE /api/tasks/{id}`)                        |           ✅ |             ✅ |             ❌ |                         ❌ |
| List tasks by project (`GET /api/projects/{projectId}/tasks`) |           ⚠️ |             ⚠️ |             ⚠️ |                         ⚠️ |
| Get task by id (`GET /api/tasks/{taskId}`)                    |           ⚠️ |             ⚠️ |             ⚠️ |                         ⚠️ |
| Get all tasks (`GET /api/tasks`)                              |           ⚠️ |             ⚠️ |             ⚠️ |                         ⚠️ |
| Update task status (`PATCH /api/tasks/{taskId}/status`)       |           ⚠️ |             ⚠️ |             ⚠️ |                         ⚠️ |

Meaning of ⚠️ here:

- The service methods do not check membership/role, so **any authenticated user** can call them successfully.

### F2) Task assignees (`TaskAssigneeService`)

| Action          | Any project member | Project VIEWER | Non-member (authenticated) |
| --------------- | -----------------: | -------------: | -------------------------: |
| List assignees  |                 ⚠️ |             ⚠️ |                         ⚠️ |
| Add assignee    |                 ⚠️ |             ⚠️ |                         ⚠️ |
| Change owner    |                 ⚠️ |             ⚠️ |                         ⚠️ |
| Remove assignee |                 ⚠️ |             ⚠️ |                         ⚠️ |

Notes:

- Actor authorization is not checked at all.
- Only the _target user_ is validated as “must be a member of this project”.

### F3) Task assignee roles (`TaskAssigneeRole`)

| Role           | Used for authorization? | What it currently affects                                                |
| -------------- | ----------------------- | ------------------------------------------------------------------------ |
| `OWNER`        | ❌                      | Stored in `task_assignees`; used to compute response “assignee” fallback |
| `COLLABORATOR` | ❌                      | Stored; activity labels                                                  |
| `REVIEWER`     | ❌                      | Stored; activity labels                                                  |

---

## G) Invitations — Implemented semantics

| Action                                                     |       Tenant OWNER |                   Tenant ADMIN |           Tenant BILLING_ADMIN |      Tenant MEMBER |
| ---------------------------------------------------------- | -----------------: | -----------------------------: | -----------------------------: | -----------------: |
| Create invite                                              |                 ✅ | ✅ (cannot invite ADMIN/OWNER) | ✅ (cannot invite ADMIN/OWNER) |                 ❌ |
| View invite list                                           |                 ✅ |                             ✅ |                             ❌ |                 ❌ |
| Validate token (`GET /api/i/{token}` or `/api/i/validate`) |             Public |                         Public |                         Public |             Public |
| Accept invite (`POST /api/i/join`)                         | ✅ (auth required) |             ✅ (auth required) |             ✅ (auth required) | ✅ (auth required) |

Invite role effects on acceptance:

- `invitation.role` is parsed as `TenantMemberRole` and assigned to the user at the **tenant** level.
- Workspace/team/project memberships created by the invite are always `MEMBER` (no per-scope role assignment).
