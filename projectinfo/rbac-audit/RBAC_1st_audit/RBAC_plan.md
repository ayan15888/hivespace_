
Part 1 — RbacService Redesign
Your agent is completely right. The global rank map is the core architectural problem. Here is the clean design to implement.
Step 1 — Scope-Typed Enums Replace String Comparisons
Your backend already has these enums — TenantMemberRole, WorkspaceMemberRole, ProjectMemberRole, TeamMemberRole. The problem is RbacService ignores them and uses raw strings. The fix is making the method signatures accept enums so wrong-scope comparisons are caught at compile time, not at runtime.
java// WRONG — current design, compiles silently even if wrong scope
rbacService.hasTenantRole(tenantId, "LEAD")

// RIGHT — compile error if wrong enum type passed
rbacService.hasTenantRole(tenantId, TenantMemberRole.ADMIN)
rbacService.hasProjectRole(projectId, ProjectMemberRole.LEAD)
rbacService.hasTeamRole(teamId, TeamMemberRole.LEAD)
Step 2 — Separate Rank Maps Per Scope
java// In RbacService — four separate rank methods, no shared map

private int tenantRank(TenantMemberRole role) {
    return switch (role) {
        case OWNER        -> 4;
        case ADMIN        -> 3;
        case BILLING_ADMIN -> 2;
        case MEMBER       -> 1;
    };
}

private int workspaceRank(WorkspaceMemberRole role) {
    return switch (role) {
        case ADMIN  -> 3;
        case MEMBER -> 2;
        case VIEWER -> 1;
    };
}

private int projectRank(ProjectMemberRole role) {
    return switch (role) {
        case LEAD   -> 3;
        case MEMBER -> 2;
        case VIEWER -> 1;
    };
}

private int teamRank(TeamMemberRole role) {
    return switch (role) {
        case LEAD   -> 2;
        case MEMBER -> 1;
    };
}
BILLING_ADMIN never appears in workspace, project, or team rank maps. LEAD never appears in the tenant rank map. Cross-scope comparisons become literally impossible.
Step 3 — Named Bridge Rules Replace Implicit Rank Accidents
Remove the implicit "workspace admin override sprinkled everywhere" and replace with explicit named capability methods:
java// Named bridge rules — explicit, auditable, testable

public boolean canAdminWorkspace(UUID workspaceId) {
    UUID userId = getCurrentUser().getId();
    // Bridge: tenant OWNER/ADMIN can admin any workspace in their tenant
    WorkspaceMemberRole wsRole = getWorkspaceRole(userId, workspaceId);
    if (wsRole == WorkspaceMemberRole.ADMIN) return true;
    
    UUID tenantId = workspaceRepository.findTenantId(workspaceId);
    TenantMemberRole tenantRole = getTenantRole(userId, tenantId);
    return tenantRole == TenantMemberRole.OWNER 
        || tenantRole == TenantMemberRole.ADMIN;
}

public boolean canManageProjectMembers(UUID projectId) {
    ProjectMemberRole projectRole = getProjectRole(getCurrentUser().getId(), projectId);
    if (projectRole == ProjectMemberRole.LEAD) return true;
    UUID workspaceId = projectRepository.findWorkspaceId(projectId);
    return canAdminWorkspace(workspaceId);
}

public boolean canManageTeamMembers(UUID teamId) {
    TeamMemberRole teamRole = getTeamRole(getCurrentUser().getId(), teamId);
    if (teamRole == TeamMemberRole.LEAD) return true;
    UUID workspaceId = teamRepository.findWorkspaceId(teamId);
    return canAdminWorkspace(workspaceId);
}

public boolean canCreateProject(UUID workspaceId) {
    return canAdminWorkspace(workspaceId);
}

public boolean canCreateTeam(UUID workspaceId) {
    // Members can create teams, not just admins
    UUID userId = getCurrentUser().getId();
    WorkspaceMemberRole role = getWorkspaceRole(userId, workspaceId);
    if (role != null && workspaceRank(role) >= workspaceRank(WorkspaceMemberRole.MEMBER)) 
        return true;
    UUID tenantId = workspaceRepository.findTenantId(workspaceId);
    TenantMemberRole tenantRole = getTenantRole(userId, tenantId);
    return tenantRole == TenantMemberRole.OWNER 
        || tenantRole == TenantMemberRole.ADMIN;
}

public boolean canEditTask(UUID taskId) {
    UUID projectId = taskRepository.findProjectId(taskId);
    UUID userId = getCurrentUser().getId();
    ProjectMemberRole role = getProjectRole(userId, projectId);
    return role != null && projectRank(role) >= projectRank(ProjectMemberRole.MEMBER);
}

public boolean canViewProject(UUID projectId) {
    UUID userId = getCurrentUser().getId();
    ProjectMemberRole role = getProjectRole(userId, projectId);
    if (role != null) return true;
    UUID workspaceId = projectRepository.findWorkspaceId(projectId);
    return canAdminWorkspace(workspaceId);
}

Part 2 — Project and Team Creation Ownership
Project Creation — Who Creates, Who Leads
The clean design:
Only Workspace Admin, Org Admin, and Org Owner can create projects. A regular workspace Member cannot create projects — projects are significant organizational structures, not something every member should spin up freely.
When creating a project, the creator can either become the lead themselves OR assign another workspace member as the lead during creation. Both behaviours are supported but the assigned lead must already be a workspace member.
Workspace Admin creates project
        ↓
Form has optional "Assign Project Lead" picker
showing workspace members
        ↓
If no one picked → creator becomes LEAD
If someone picked → that person becomes LEAD,
creator becomes MEMBER (they created it but delegated leadership)
        ↓
project_members row created for the lead
If creator != lead, project_members row for creator as MEMBER too
Team Creation — Who Creates, Who Leads
Teams are lighter than projects. Any workspace Member, Admin, Org Admin, or Org Owner can create a team. The same optional lead assignment logic applies.
Any workspace Member creates team
        ↓
Optional "Assign Team Lead" picker
        ↓
If no one picked → creator becomes LEAD
If someone picked → that person becomes LEAD,
creator becomes MEMBER
        ↓
team_members rows created accordingly
The Critical Validation Rule
Whether creating a project or team, the assigned lead must already be a workspace member. Your backend must validate this before creating the resource:
javaif (request.getLeadUserId() != null) {
    boolean isWorkspaceMember = workspaceMemberRepository
        .existsByWorkspaceIdAndUserId(workspaceId, request.getLeadUserId());
    if (!isWorkspaceMember) {
        throw new SecurityException(
            "Assigned lead must be a workspace member first"
        );
    }
}

Part 3 — Clean Ownership & Leadership Rules
ResourceWho Can CreateDefault LeadCan Assign Different LeadLead Must BeWorkspaceOrg Admin, Org OwnerCreatorYes, at creationOrg memberProjectWorkspace Admin, Org Admin, OwnerCreatorYes, at creationWorkspace memberTeamAny workspace Member+CreatorYes, at creationWorkspace memberTaskAny project Member+Creator as OWNERYes, during or after creationProject member
