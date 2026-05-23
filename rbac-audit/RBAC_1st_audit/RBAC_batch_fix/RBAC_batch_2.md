Batch 2 — Project and Team Creation Ownership

Fix project and team creation ownership logic:

1. ProjectService.createProject:
   - Add canCreateProject(workspaceId) check at the top
   - Accept optional leadUserId in CreateProjectRequest
   - If leadUserId provided:
     * Validate leadUserId is a workspace member
     * Create project_members row for leadUserId with role LEAD
     * Create project_members row for creator with role MEMBER
       (only if creator != leadUserId)
   - If leadUserId not provided:
     * Create project_members row for creator with role LEAD
   - Both inserts must be in the same @Transactional block

2. TeamService.createTeam:
   - Add canCreateTeam(workspaceId) check at the top
   - Accept optional leadUserId in CreateTeamRequest
   - If leadUserId provided:
     * Validate leadUserId is a workspace member
     * Create team_members row for leadUserId with role LEAD
     * Create team_members row for creator with role MEMBER
       (only if creator != leadUserId)
   - If leadUserId not provided:
     * Create team_members row for creator with role LEAD
   - Both inserts must be in the same @Transactional block

3. WorkspaceService.createWorkspace:
   - Add hasTenantRole(tenantId, TenantMemberRole.ADMIN) check
   - Only OWNER and ADMIN can create workspaces
   - Creator is automatically added as workspace ADMIN in
     workspace_members in the same transaction