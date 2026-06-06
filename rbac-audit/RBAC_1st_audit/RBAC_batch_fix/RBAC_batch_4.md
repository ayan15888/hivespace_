Batch 4 — Workspace and Project Listing Security

Fix ungated read endpoints:

1. WorkspaceService:
   - getWorkspacesByTenant(tenantId):
     Add hasTenantRole(tenantId, TenantMemberRole.MEMBER) check
   - getWorkspaceMembers(workspaceId):
     Add hasWorkspaceRole(workspaceId, WorkspaceMemberRole.VIEWER) check
   - getWorkspaceById(workspaceId):
     Add hasWorkspaceRole(workspaceId, WorkspaceMemberRole.VIEWER) check

2. ProjectService:
   - getProjectsByWorkspace(workspaceId):
     Add hasWorkspaceRole(workspaceId, WorkspaceMemberRole.VIEWER) check
     Filter results to only projects the user is a member of
     (workspace ADMIN sees all, regular members see only their projects)
   - getProjectById(projectId):
     Add canViewProject(projectId) check

3. TeamService:
   - getTeamsByWorkspace(workspaceId):
     Already has VIEWER check from previous batch — verify it uses
     new enum-typed method from Batch 1

4. Response filtering:
   - Member list responses should not include password hashes
     (verify this is already excluded in response DTOs)
   - Member list responses should only include email if the caller
     is a workspace ADMIN or above