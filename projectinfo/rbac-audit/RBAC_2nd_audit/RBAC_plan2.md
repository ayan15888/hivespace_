Excellent progress. Your RBAC is now significantly better than where you started. Let me give you a clear picture of what is fixed, what still needs attention, and what to do next.

What Is Now Fixed — Confirmed
Looking at the latest permission matrix, the critical exploits from the earlier report are closed:

Cross-scope rank map comparisons eliminated — scope-isolated enums in place
Task endpoints now enforce tenant boundary and project membership
Workspace/project listing endpoints now require membership
Workspace creation requires tenant ADMIN or OWNER
Team and project member management requires lead or workspace admin
Last lead invariant enforced for both teams and projects
Invitation scope validation — workspace/team/project must belong to same tenant
BILLING_ADMIN blocked from generating invites

This is a substantial improvement. Your product is no longer trivially exploitable by any authenticated user.

Three Remaining Issues To Fix
Issue 1 — Active Tenant Context Is Fragile
This is the most architecturally important remaining problem. Your verifyResourceBelongsToTenant uses currentUser.tenant_id from the users table as the security boundary. But a user can belong to multiple tenants via tenant_members. If their users.tenant_id points to Tenant A but they are also a member of Tenant B via tenant_members, they cannot access Tenant B resources even though they are legitimately a member.
The fix is making tenant context explicit in the JWT. When a user logs in, include their active tenant in the JWT claims:
json{
  "sub": "user-uuid",
  "tenantId": "active-tenant-uuid",
  "tenantRole": "MEMBER",
  "exp": 1234567890
}
Add a "switch tenant" endpoint that issues a new JWT with a different tenantId claim after verifying the user is actually a member of that tenant:
POST /api/auth/switch-tenant
Body: { tenantId: "target-tenant-uuid" }
      ↓
Backend verifies tenant_members row exists for this user + tenantId
      ↓
Issues new JWT with tenantId claim updated
      ↓
Frontend stores new token, reloads workspace context
Then verifyResourceBelongsToTenant reads from the JWT claim instead of users.tenant_id. This makes the boundary explicit and correct rather than relying on a single column that only stores one tenant.

Issue 2 — Invitation Role Field Is Misleading
The invitation.role field is parsed only as TenantMemberRole but the field name and comments suggest it could be workspace or project roles. This will confuse your frontend developers and cause bugs.
Two things to fix:
In the database:
sql-- The role column on invitations represents tenant-level role only
-- Rename it to make this explicit
ALTER TABLE invitations 
RENAME COLUMN role TO tenant_role;
In the invitation acceptance flow, workspace/team/project memberships are always created as MEMBER. This is actually correct behaviour — the invite grants org access and basic membership everywhere. But document this explicitly in your InvitationService with a comment so future developers do not try to change it without understanding the implications.

Issue 3 — Policy Duplication Drift Risk
The report correctly identified that some actions use capability methods (canEditTask) while others use ad-hoc inline checks (project lead OR workspace admin). This will drift over time and create inconsistencies.
Give your agent this cleanup task:
Audit every service method in TaskService, ProjectService, 
TeamService, WorkspaceService, and TaskAssigneeService.

For every authorization check that is NOT calling a named 
capability method from RbacService, either:

1. Add a new named capability method to RbacService for that action
2. Replace the inline check with the capability method call

Target capability methods to add if not already present:
- canDeleteTask(UUID taskId)
- canChangeTaskOwner(UUID taskId)
- canDeleteProject(UUID projectId)
- canDeleteTeam(UUID teamId)
- canDeleteWorkspace(UUID workspaceId)
- canViewTeamMembers(UUID teamId)
- canCreateInvitation(UUID tenantId)

The goal is that every service method has exactly one line 
of authorization logic that calls a single named capability 
method. No inline role comparisons anywhere in services.

One Design Note on Workspace Admin and Task Creation
The permission matrix reveals an important design decision you have made — Workspace Admins cannot create or edit tasks unless they are also project members. This is actually the right call. A workspace admin is an administrative role, not a project participant. If they need to create tasks they should add themselves to the project first. This keeps the task assignment pool clean — only real project participants appear in task assignee pickers.
Make sure your frontend reflects this correctly. If a Workspace Admin opens a project board without being a project member, they should see the board in read-only mode with a prompt saying "You are viewing this project as a workspace admin. Join this project to create and edit tasks."

What To Build Next
Your RBAC foundation is now solid enough to build features on top of. Based on the phase plan your next priorities are:
Immediate — complete the invite flow end to end. The schema has invitation_workspaces and invitation_teams tables. The backend invitation acceptance needs to create membership rows from these junction tables in a single transaction. Verify this is working correctly with the new schema.
Then — build the task board properly. Task creation, status changes via drag and drop on the Kanban board, task detail view with the activity log. This is the core product value and you now have the security foundation to build it correctly.
Then — the shareable project progress link. Schema is ready, endpoints are designed, frontend route is planned. This is a high-value feature to show to potential users.
Tell me which one you are starting and we go from there.


CREATE TABLE invitation_workspaces (
  invitation_id UUID NOT NULL REFERENCES invitations(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  PRIMARY KEY (invitation_id, workspace_id)
);

CREATE TABLE invitation_workspaces (
  invitation_id UUID NOT NULL REFERENCES invitations(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  PRIMARY KEY (invitation_id, workspace_id)
);