# RBAC Permission Matrix — Latest Backend Enforcement

Legend:
- ✅ Allowed by explicit backend checks
- ❌ Denied by explicit backend checks
- ⚠️ Allowed/denied depends on additional conditions noted (e.g., tenant-boundary, membership filtering)

This matrix is derived from current service-layer logic and `RbacService` capability methods.

---

## 1) Roles present (by scope)

| Scope | Roles (DB constraint) |
|---|---|
| Tenant | `OWNER`, `ADMIN`, `BILLING_ADMIN`, `MEMBER` |
| Workspace | `ADMIN`, `MEMBER`, `VIEWER` |
| Project | `LEAD`, `MEMBER`, `VIEWER` |
| Team | `LEAD`, `MEMBER` |
| Task assignee | `OWNER`, `COLLABORATOR`, `REVIEWER` |

---

## 2) Tenant-level actions (TenantMemberRole)

Assumptions:
- Tenant membership is determined from `tenant_members` (some legacy owner_email fallbacks exist in `TenantService` and `InvitationService`).

| Action | OWNER | ADMIN | BILLING_ADMIN | MEMBER |
|---|---:|---:|---:|---:|
| Create tenant (`POST /api/tenants`) | ✅ (any auth user) | ✅ | ✅ | ✅ |
| View tenant members directory (`GET /api/tenants/{id}/members`) | ✅ | ✅ | ❌ | ✅ |
| Update tenant member roles | ✅ (constraints) | ✅ (constraints) | ❌ | ❌ |
| Remove tenant members | ✅ (constraints) | ✅ (constraints) | ❌ | ❌ |
| Create invitation (`POST /api/i/generate`) | ✅ | ✅ | ❌ | ❌ |
| View invitation list (`GET /api/i/t/{tenantId}`) | ✅ | ✅ | ❌ | ❌ |
| Create workspace in tenant (`POST /api/workspaces`) | ✅ | ✅ | ❌ | ❌ |
| List workspaces in tenant (`GET /api/workspaces/t/{tenantId}`) | ✅ | ✅ | ✅ | ✅ |

Constraints summary:
- Workspace creation requires tenant role >= `ADMIN` **and** `currentUser.tenant_id == request.tenantId`.
- Tenant directory view is blocked for `BILLING_ADMIN` by `TenantService.canViewMemberDirectory`.

---

## 3) Workspace actions (WorkspaceMemberRole + tenant→workspace bridge)

Tenant-boundary note:
- Many workspace-scoped reads/writes call `verifyResourceBelongsToTenant(...)` and are denied if the resource’s tenant != `currentUser.tenant_id`.

| Action | Workspace ADMIN | Workspace MEMBER | Workspace VIEWER | Tenant OWNER/ADMIN fallback |
|---|---:|---:|---:|---:|
| View workspace members directory | ✅ | ✅ | ✅ | ✅ (via `hasWorkspaceRole` fallback) |
| View workspace member emails | ✅ | ❌ | ❌ | ✅ (`canAdminWorkspace`) |
| Create project in workspace | ✅ | ❌ | ❌ | ✅ (`canCreateProject` uses `canAdminWorkspace`) |
| List projects in workspace | ✅ (all projects) | ✅ (only member projects) | ✅ (only member projects) | ✅ (all projects as admin) |
| Create team in workspace | ✅ | ✅ | ❌ | ✅ (`canCreateTeam`) |
| List teams in workspace | ✅ | ✅ | ✅ | ✅ |

---

## 4) Project actions (ProjectMemberRole + workspace admin override)

Tenant-boundary note:
- Project-scoped operations generally call `verifyResourceBelongsToTenant(projectId, PROJECT)` first.

| Action | Project LEAD | Project MEMBER | Project VIEWER | Workspace ADMIN override |
|---|---:|---:|---:|---:|
| View assigned teams for project | ✅ | ✅ | ✅ | ✅ |
| Assign/unassign team to project | ✅ | ❌ | ❌ | ✅ |
| View project members | ✅ | ✅ | ✅ | ✅ |
| Add/update/remove project members | ✅ | ❌ | ❌ | ✅ |
| Create tasks in project | ✅ | ✅ | ❌ | n/a (task checks are project-role based) |
| Edit tasks in project | ✅ | ✅ | ❌ | n/a (task edits require project role >= MEMBER) |
| Delete tasks in project | ✅ | ❌ | ❌ | ✅ (Task delete explicitly allows workspace admin) |

Project listing behavior:
- Non-workspace-admin users only see projects where they have `project_members` rows, even if they are workspace members.

---

## 5) Team actions (TeamMemberRole + workspace admin override)

Tenant-boundary note:
- Team-scoped operations call `verifyResourceBelongsToTenant(teamId, TEAM)`.

| Action | Team LEAD | Team MEMBER | Workspace ADMIN override |
|---|---:|---:|---:|
| View team members | ✅ | ✅ | ✅ |
| Add/update/remove team members | ✅ | ❌ (self-removal only) | ✅ |
| Update/delete team | ✅ | ❌ | ✅ |

---

## 6) Task actions (project membership + explicit delete rule)

Tenant-boundary note:
- Task reads/writes call `verifyResourceBelongsToTenant(taskId, TASK)` or the project equivalent.

| Action | Project LEAD | Project MEMBER | Project VIEWER | Workspace ADMIN |
|---|---:|---:|---:|---:|
| View task (`GET /api/tasks/{id}`) | ✅ | ✅ | ✅ | ✅ |
| List tasks by project | ✅ | ✅ | ✅ | ✅ |
| List “my tasks” (`GET /api/tasks`) | ✅ | ✅ | ✅ | ✅ |
| Create task | ✅ | ✅ | ❌ | ⚠️ (requires being project member; admin doesn’t auto-grant project membership) |
| Edit task details/status | ✅ | ✅ | ❌ | ⚠️ (requires being project member; admin doesn’t auto-grant project membership) |
| Delete task | ✅ | ❌ | ❌ | ✅ |

Notes:
- `canEditTask` and `canCreateTask` are project-role based (>= MEMBER). Workspace admin status does not bypass edit/create unless they are also a project member.
- Task delete is special-cased: project lead OR workspace admin can delete.

---

## 7) Task assignee actions (task-owner + lead/admin bridges)

| Action | Task OWNER | Project LEAD | Workspace ADMIN | Regular project MEMBER |
|---|---:|---:|---:|---:|
| View assignees | ✅ (via canViewTask) | ✅ | ✅ | ✅ (if canViewTask) |
| Add assignee | ✅ | ✅ | ✅ | ❌ |
| Change owner | ✅ | ✅ | ✅ | ❌ |
| Remove assignee | ✅ | ✅ | ✅ | ❌ (unless removing self) |

Also enforced:
- Target assignee/new owner must be a project member (`ProjectMemberRole.VIEWER` or higher).

---

## 8) Invitation semantics (tenant role + optional scope joins)

| Action | Tenant OWNER | Tenant ADMIN | Others |
|---|---:|---:|---:|
| Create invite | ✅ | ✅ (cannot invite tenant ADMIN/OWNER) | ❌ |
| Invite can include workspace/team/project IDs | ✅ (validated for tenant consistency) | ✅ (validated) | n/a |
| Accept invite | ✅ (any authenticated user) | ✅ | ✅ |
| Role granted on acceptance | tenant role from `invitation.role` | tenant role from `invitation.role` | tenant role from `invitation.role` |
| Workspace/team/project role granted on acceptance | always `MEMBER` | always `MEMBER` | always `MEMBER` |

