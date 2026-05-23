Batch 1 — RbacService Redesign (Foundation)
This is the most important batch. Everything else builds on it.

Refactor RbacService.java:

1. Replace the single global roleRank(String) method with four
   scope-isolated rank methods:
   - tenantRank(TenantMemberRole)
   - workspaceRank(WorkspaceMemberRole)
   - projectRank(ProjectMemberRole)
   - teamRank(TeamMemberRole)

2. Replace string-based has*Role methods with enum-typed versions:
   - hasTenantRole(UUID tenantId, TenantMemberRole required)
   - hasWorkspaceRole(UUID workspaceId, WorkspaceMemberRole required)
   - hasProjectRole(UUID projectId, ProjectMemberRole required)
   - hasTeamRole(UUID teamId, TeamMemberRole required)

3. Add these named capability methods (explicit bridge rules):
   - canAdminWorkspace(UUID workspaceId)
   - canManageProjectMembers(UUID projectId)
   - canManageTeamMembers(UUID teamId)
   - canCreateProject(UUID workspaceId)
   - canCreateTeam(UUID workspaceId)
   - canEditTask(UUID taskId)
   - canViewProject(UUID projectId)
   - canViewTask(UUID taskId)
   - canCreateTask(UUID projectId)
   - canAssignTeamToProject(UUID projectId)

4. Remove BILLING_ADMIN from any rank map that is not tenant-scoped.
   BILLING_ADMIN must never appear in workspace, project, or team checks.

5. Keep getCurrentUser() public — it was made public in the previous
   batch and other services depend on it.

6. Update all existing callers of old string-based methods to use
   the new enum-typed methods. Treat any compilation error as a
   signal of a potential cross-scope comparison bug — fix the
   call site, do not cast or suppress.

Do not change any controller or service business logic in this batch.
Only refactor RbacService and fix compilation errors at call sites.