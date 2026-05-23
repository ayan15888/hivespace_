package com.project.hiveSpace.security;

import com.project.hiveSpace.models.*;
import com.project.hiveSpace.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service("rbac")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RbacService {

    private final TenantMemberRepository tenantMemberRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final WorkspaceRepository workspaceRepository;
    private final ProjectRepository projectRepository;
    private final TeamRepository teamRepository;
    private final TaskRepository taskRepository;
    private final TaskAssigneeRepository taskAssigneeRepository;
    // private final TenantRepository tenantRepository;

    public User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof User) {
            return (User) auth.getPrincipal();
        }
        return null;
    }

    // --- TENANT (ORGANIZATION) LEVEL ---
    public boolean hasTenantRole(UUID tenantId, TenantMemberRole requiredRole) {
        User user = getCurrentUser();
        if (user == null || tenantId == null || requiredRole == null) return false;
        
        return tenantMemberRepository.findByTenantIdAndUserId(tenantId, user.getId())
                .map(member -> tenantRank(member.getRole()) >= tenantRank(requiredRole))
                .orElse(false);
    }
    
    public boolean isTenantOwner(UUID tenantId) {
        return hasTenantRole(tenantId, TenantMemberRole.OWNER);
    }

    public boolean isTenantAdmin(UUID tenantId) {
        return hasTenantRole(tenantId, TenantMemberRole.ADMIN);
    }

    // --- WORKSPACE LEVEL ---
    public boolean hasWorkspaceRole(UUID workspaceId, WorkspaceMemberRole requiredRole) {
        User user = getCurrentUser();
        if (user == null || workspaceId == null || requiredRole == null) return false;

        boolean hasExplicitRole = workspaceMemberRepository.findByWorkspaceIdAndUserId(workspaceId, user.getId())
                .map(member -> workspaceRank(member.getRole()) >= workspaceRank(requiredRole))
                .orElse(false);

        if (hasExplicitRole) return true;

        // Fallback: Tenant owners and admins automatically have admin rights to workspaces within their organization
        TenantMemberRole tenantRole = workspaceRepository.findById(workspaceId)
                .map(workspace -> {
                    UUID tenantId = workspace.getTenant().getId();
                    return getTenantRole(user.getId(), tenantId);
                })
                .orElse(null);

        return tenantRole == TenantMemberRole.OWNER || tenantRole == TenantMemberRole.ADMIN;
    }
    
    public boolean isWorkspaceAdmin(UUID workspaceId) {
        return canAdminWorkspace(workspaceId);
    }

    // --- PROJECT LEVEL ---
    public boolean hasProjectRole(UUID projectId, ProjectMemberRole requiredRole) {
        User user = getCurrentUser();
        if (user == null || projectId == null || requiredRole == null) return false;

        return projectMemberRepository.findByProjectIdAndUserId(projectId, user.getId())
                .map(member -> projectRank(member.getRole()) >= projectRank(requiredRole))
                .orElse(false);
    }
    
    public boolean hasProjectRoleForUser(UUID userId, UUID projectId, ProjectMemberRole requiredRole) {
        if (userId == null || projectId == null || requiredRole == null) return false;

        return projectMemberRepository.findByProjectIdAndUserId(projectId, userId)
                .map(member -> projectRank(member.getRole()) >= projectRank(requiredRole))
                .orElse(false);
    }
    
    public boolean isProjectLead(UUID projectId) {
        return hasProjectRole(projectId, ProjectMemberRole.LEAD);
    }

    // --- TEAM LEVEL ---
    public boolean hasTeamRole(UUID teamId, TeamMemberRole requiredRole) {
        User user = getCurrentUser();
        if (user == null || teamId == null || requiredRole == null) return false;

        return teamMemberRepository.findByTeamIdAndUserId(teamId, user.getId())
                .map(member -> teamRank(member.getRole()) >= teamRank(requiredRole))
                .orElse(false);
    }

    // --- NAMED CAPABILITY METHODS (BRIDGE RULES) ---
    public boolean canAdminWorkspace(UUID workspaceId) {
        User user = getCurrentUser();
        if (user == null || workspaceId == null) return false;
        WorkspaceMemberRole wsRole = getWorkspaceRole(user.getId(), workspaceId);
        if (wsRole == WorkspaceMemberRole.ADMIN) return true;

        return workspaceRepository.findById(workspaceId)
                .map(workspace -> {
                    UUID tenantId = workspace.getTenant().getId();
                    TenantMemberRole tenantRole = getTenantRole(user.getId(), tenantId);
                    return tenantRole == TenantMemberRole.OWNER 
                        || tenantRole == TenantMemberRole.ADMIN;
                })
                .orElse(false);
    }

    public boolean canManageProjectMembers(UUID projectId) {
        User user = getCurrentUser();
        if (user == null || projectId == null) return false;
        ProjectMemberRole projectRole = getProjectRole(user.getId(), projectId);
        if (projectRole == ProjectMemberRole.LEAD) return true;
        return projectRepository.findById(projectId)
                .map(project -> canAdminWorkspace(project.getWorkspace().getId()))
                .orElse(false);
    }

    public boolean canManageTeamMembers(UUID teamId) {
        User user = getCurrentUser();
        if (user == null || teamId == null) return false;
        TeamMemberRole teamRole = getTeamRole(user.getId(), teamId);
        if (teamRole == TeamMemberRole.LEAD) return true;
        return teamRepository.findById(teamId)
                .map(team -> canAdminWorkspace(team.getWorkspace().getId()))
                .orElse(false);
    }

    public boolean canCreateProject(UUID workspaceId) {
        return canAdminWorkspace(workspaceId);
    }

    public boolean canCreateTeam(UUID workspaceId) {
        User user = getCurrentUser();
        if (user == null || workspaceId == null) return false;
        WorkspaceMemberRole role = getWorkspaceRole(user.getId(), workspaceId);
        if (role != null && workspaceRank(role) >= workspaceRank(WorkspaceMemberRole.MEMBER)) return true;
        return workspaceRepository.findById(workspaceId)
                .map(workspace -> {
                    UUID tenantId = workspace.getTenant().getId();
                    TenantMemberRole tenantRole = getTenantRole(user.getId(), tenantId);
                    return tenantRole == TenantMemberRole.OWNER 
                        || tenantRole == TenantMemberRole.ADMIN;
                })
                .orElse(false);
    }

    public boolean canEditTask(UUID taskId) {
        User user = getCurrentUser();
        if (user == null || taskId == null) return false;
        return taskRepository.findById(taskId)
                .map(task -> {
                    UUID projectId = task.getProject().getId();
                    ProjectMemberRole role = getProjectRole(user.getId(), projectId);
                    return role != null && projectRank(role) >= projectRank(ProjectMemberRole.MEMBER);
                })
                .orElse(false);
    }

    public boolean canViewProject(UUID projectId) {
        User user = getCurrentUser();
        if (user == null || projectId == null) return false;
        ProjectMemberRole role = getProjectRole(user.getId(), projectId);
        if (role != null) return true;
        return projectRepository.findById(projectId)
                .map(project -> canAdminWorkspace(project.getWorkspace().getId()))
                .orElse(false);
    }

    public boolean canViewTask(UUID taskId) {
        User user = getCurrentUser();
        if (user == null || taskId == null) return false;
        return taskRepository.findById(taskId)
                .map(task -> canViewProject(task.getProject().getId()))
                .orElse(false);
    }

    public boolean canCreateTask(UUID projectId) {
        User user = getCurrentUser();
        if (user == null || projectId == null) return false;
        ProjectMemberRole role = getProjectRole(user.getId(), projectId);
        return role != null && projectRank(role) >= projectRank(ProjectMemberRole.MEMBER);
    }

    public boolean canAssignTeamToProject(UUID projectId) {
        User user = getCurrentUser();
        if (user == null || projectId == null) return false;
        ProjectMemberRole role = getProjectRole(user.getId(), projectId);
        if (role == ProjectMemberRole.LEAD) return true;
        return projectRepository.findById(projectId)
                .map(project -> canAdminWorkspace(project.getWorkspace().getId()))
                .orElse(false);
    }

    public boolean canDeleteTask(UUID taskId) {
        User user = getCurrentUser();
        if (user == null || taskId == null) return false;
        return taskRepository.findById(taskId)
                .map(task -> {
                    UUID projectId = task.getProject().getId();
                    if (hasProjectRole(projectId, ProjectMemberRole.LEAD)) return true;
                    return canAdminWorkspace(task.getProject().getWorkspace().getId());
                })
                .orElse(false);
    }

    public boolean canAddTaskAssignee(UUID taskId) {
        User user = getCurrentUser();
        if (user == null || taskId == null) return false;
        return taskRepository.findById(taskId)
                .map(task -> {
                    UUID projectId = task.getProject().getId();
                    boolean isTaskOwner = taskAssigneeRepository
                            .findByTaskIdAndUserId(taskId, user.getId())
                            .map(a -> a.getRole() == TaskAssigneeRole.OWNER)
                            .orElse(false);
                    if (isTaskOwner) return true;
                    if (hasProjectRole(projectId, ProjectMemberRole.LEAD)) return true;
                    return canAdminWorkspace(task.getProject().getWorkspace().getId());
                })
                .orElse(false);
    }

    public boolean canRemoveTaskAssignee(UUID taskId, UUID targetUserId) {
        User user = getCurrentUser();
        if (user == null || taskId == null || targetUserId == null) return false;
        if (user.getId().equals(targetUserId)) return true;
        return canAddTaskAssignee(taskId);
    }

    public boolean canManageInvite(UUID tenantId) {
        User user = getCurrentUser();
        if (user == null || tenantId == null) return false;
        TenantMemberRole role = getTenantRole(user.getId(), tenantId);
        // Explicit check — BILLING_ADMIN is intentionally excluded
        return role == TenantMemberRole.OWNER || role == TenantMemberRole.ADMIN;
    }

    // --- PRIVATE ROLE RETRIEVAL HELPERS ---
    private TenantMemberRole getTenantRole(UUID userId, UUID tenantId) {
        if (userId == null || tenantId == null) return null;
        return tenantMemberRepository.findByTenantIdAndUserId(tenantId, userId)
                .map(TenantMember::getRole)
                .orElse(null);
    }

    private WorkspaceMemberRole getWorkspaceRole(UUID userId, UUID workspaceId) {
        if (userId == null || workspaceId == null) return null;
        return workspaceMemberRepository.findByWorkspaceIdAndUserId(workspaceId, userId)
                .map(WorkspaceMember::getRole)
                .orElse(null);
    }

    private ProjectMemberRole getProjectRole(UUID userId, UUID projectId) {
        if (userId == null || projectId == null) return null;
        return projectMemberRepository.findByProjectIdAndUserId(projectId, userId)
                .map(ProjectMember::getRole)
                .orElse(null);
    }

    private TeamMemberRole getTeamRole(UUID userId, UUID teamId) {
        if (userId == null || teamId == null) return null;
        return teamMemberRepository.findByTeamIdAndUserId(teamId, userId)
                .map(TeamMember::getRole)
                .orElse(null);
    }

    // --- SCOPE RANK MAPS ---
    private int tenantRank(TenantMemberRole role) {
        if (role == null) return 0;
        return switch (role) {
            case OWNER -> 4;
            case ADMIN -> 3;
            case BILLING_ADMIN -> 2;
            case MEMBER -> 1;
        };
    }

    private int workspaceRank(WorkspaceMemberRole role) {
        if (role == null) return 0;
        return switch (role) {
            case ADMIN -> 3;
            case MEMBER -> 2;
            case VIEWER -> 1;
        };
    }

    private int projectRank(ProjectMemberRole role) {
        if (role == null) return 0;
        return switch (role) {
            case LEAD -> 3;
            case MEMBER -> 2;
            case VIEWER -> 1;
        };
    }

    private int teamRank(TeamMemberRole role) {
        if (role == null) return 0;
        return switch (role) {
            case LEAD -> 2;
            case MEMBER -> 1;
        };
    }

    // --- SCOPE GUARD RESOURCE VERIFICATION ---
    public void verifyResourceBelongsToTenant(UUID resourceId, ResourceType type, UUID tenantId) {
        if (resourceId == null || type == null || tenantId == null) {
            throw new IllegalArgumentException("Resource ID, type, and tenant ID must not be null");
        }

        boolean belongs = false;
        switch (type) {
            case WORKSPACE -> {
                belongs = workspaceRepository.findById(resourceId)
                        .map(workspace -> workspace.getTenant() != null && workspace.getTenant().getId().equals(tenantId))
                        .orElse(false);
            }
            case TEAM -> {
                belongs = teamRepository.findById(resourceId)
                        .map(team -> team.getWorkspace() != null && team.getWorkspace().getTenant() != null && team.getWorkspace().getTenant().getId().equals(tenantId))
                        .orElse(false);
            }
            case PROJECT -> {
                belongs = projectRepository.findById(resourceId)
                        .map(project -> project.getWorkspace() != null && project.getWorkspace().getTenant() != null && project.getWorkspace().getTenant().getId().equals(tenantId))
                        .orElse(false);
            }
            case TASK -> {
                belongs = taskRepository.findById(resourceId)
                        .map(task -> task.getProject() != null && task.getProject().getWorkspace() != null && task.getProject().getWorkspace().getTenant() != null && task.getProject().getWorkspace().getTenant().getId().equals(tenantId))
                        .orElse(false);
            }
        }

        if (!belongs) {
            throw new SecurityException("Resource does not belong to the caller's organization");
        }
    }

    public void verifyResourceBelongsToTenant(UUID resourceId, ResourceType type) {
        User user = getCurrentUser();
        if (user == null || user.getTenant() == null) {
            throw new SecurityException("User is not authenticated or not associated with a tenant");
        }
        verifyResourceBelongsToTenant(resourceId, type, user.getTenant().getId());
    }
}
