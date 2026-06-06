# RBAC Permission Matrix — Re-run After Fixes (Latest)

Legend:
- ✅ Allowed by explicit backend enforcement
- ❌ Denied by explicit backend enforcement
- ⚠️ Allowed only if noted conditions are met (membership/tenant-boundary/override)

This matrix is derived from the current service-layer checks and `RbacService`.

---

## 1) Roles present (by scope)

| Scope | Roles |
|---|---|
| Tenant | `OWNER`, `ADMIN`, `BILLING_ADMIN`, `MEMBER` |
| Workspace | `ADMIN`, `MEMBER`, `VIEWER` |
| Project | `LEAD`, `MEMBER`, `VIEWER` |
| Team | `LEAD`, `MEMBER` |
| Task assignee | `OWNER`, `COLLABORATOR`, `REVIEWER` |

---

## 2) Tenant actions (TenantMemberRole)

| Action | OWNER | ADMIN | BILLING_ADMIN | MEMBER |
|---|---:|---:|---:|---:|
| Create tenant | ✅ | ✅ | ✅ | ✅ |
| View tenant member directory | ✅ | ✅ | ❌ | ✅ |
| Update tenant member roles | ✅ (constraints) | ✅ (constraints) | ❌ | ❌ |
| Remove tenant members | ✅ (constraints) | ✅ (constraints) | ❌ | ❌ |
| Create invite | ✅ | ✅ | ❌ | ❌ |
| View invite list | ✅ | ✅ | ❌ | ❌ |
| Create workspace (in active tenant) | ✅ | ✅ | ❌ | ❌ |
| List workspaces in tenant | ✅ | ✅ | ✅ | ✅ |

Notes:
- Workspace creation requires: `currentUser.tenant_id == request.tenantId` and tenant role >= `ADMIN`.

---

## 3) Workspace actions (WorkspaceMemberRole + tenant-owner/admin fallback)

Tenant-boundary:
- Most workspace/project/team/task endpoints first verify the resource belongs to `currentUser.tenant_id`.

| Action | Workspace ADMIN | Workspace MEMBER | Workspace VIEWER | Tenant OWNER/ADMIN fallback |
|---|---:|---:|---:|---:|
| View workspace member directory | ✅ | ✅ | ✅ | ✅ (`hasWorkspaceRole` fallback) |
| View workspace member emails | ✅ | ❌ | ❌ | ✅ (`canAdminWorkspace`) |
| Create project in workspace | ✅ | ❌ | ❌ | ✅ (`canCreateProject`) |
| List projects in workspace | ✅ (all) | ✅ (only member projects) | ✅ (only member projects) | ✅ (all) |
| Create team in workspace | ✅ | ✅ | ❌ | ✅ (`canCreateTeam`) |
| List teams in workspace | ✅ | ✅ | ✅ | ✅ |

---

## 4) Project actions (ProjectMemberRole + workspace admin override)

| Action | Project LEAD | Project MEMBER | Project VIEWER | Workspace ADMIN |
|---|---:|---:|---:|---:|
| View project members | ✅ | ✅ | ✅ | ✅ |
| Add/update/remove project members | ✅ | ❌ | ❌ | ✅ |
| Assign/unassign teams to project | ✅ | ❌ | ❌ | ✅ |
| View assigned teams | ✅ | ✅ | ✅ | ✅ |
| Create tasks | ✅ | ✅ | ❌ | ⚠️ (must also be project member) |
| Edit task content/status | ✅ | ✅ | ❌ | ⚠️ (must also be project member) |
| Delete tasks | ✅ | ❌ | ❌ | ✅ |

Notes:
- Edit/create tasks are gated by `canCreateTask` / `canEditTask` which require project role >= MEMBER (workspace admin alone does not bypass).

---

## 5) Team actions (TeamMemberRole + workspace admin override)

| Action | Team LEAD | Team MEMBER | Workspace ADMIN |
|---|---:|---:|---:|
| View team members | ✅ | ✅ | ✅ |
| Add/update/remove team members | ✅ | ❌ (self removal only) | ✅ |
| Update/delete team | ✅ | ❌ | ✅ |

Also enforced:
- Target user must already be workspace member.
- Cannot demote/remove last team lead.

---

## 6) Task actions

| Action | Project LEAD | Project MEMBER | Project VIEWER | Workspace ADMIN |
|---|---:|---:|---:|---:|
| View task | ✅ | ✅ | ✅ | ✅ (via canViewTask/implicit project visibility) |
| List tasks by project | ✅ | ✅ | ✅ | ✅ |
| List “my tasks” (`GET /api/tasks`) | ✅ | ✅ | ✅ | ✅ |
| Create task | ✅ | ✅ | ❌ | ⚠️ (requires being project member) |
| Edit task / update status | ✅ | ✅ | ❌ | ⚠️ (requires being project member) |
| Delete task | ✅ | ❌ | ❌ | ✅ |

---

## 7) Task assignee actions (TaskAssigneeRole + project/workspace overrides)

| Action | Task OWNER | Project LEAD | Workspace ADMIN | Regular project MEMBER |
|---|---:|---:|---:|---:|
| View assignees | ✅ | ✅ | ✅ | ✅ (if canViewTask) |
| Add assignee | ✅ | ✅ | ✅ | ❌ |
| Change owner | ✅ | ✅ | ✅ | ❌ |
| Remove assignee | ✅ | ✅ | ✅ | ❌ (unless removing self) |

Also enforced:
- Target assignee/new owner must be a project member (VIEWER+).

---

## 8) Invitations (updated multi-scope)

| Action | Tenant OWNER | Tenant ADMIN | Others |
|---|---:|---:|---:|
| Create invite | ✅ | ✅ (cannot invite tenant ADMIN/OWNER) | ❌ |
| Invite scopes | ✅ workspaceIds/teamIds/projectId, tenant-validated | ✅ same | n/a |
| Accept invite | ✅ (auth required + PIN) | ✅ | ✅ |
| Tenant role granted | from `invitations.tenant_role` | from `invitations.tenant_role` | from `invitations.tenant_role` |
| Workspace/team/project role granted | always MEMBER | always MEMBER | always MEMBER |

Additional guard:
- Inviter must have workspace role MEMBER in every workspace implied by the invite (explicit workspaces + team workspaces + project workspace).

