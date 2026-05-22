package com.project.hiveSpace.security;

import com.project.hiveSpace.models.User;
import com.project.hiveSpace.repository.ProjectMemberRepository;
import com.project.hiveSpace.repository.TeamMemberRepository;
import com.project.hiveSpace.repository.TenantMemberRepository;
import com.project.hiveSpace.repository.WorkspaceMemberRepository;
import com.project.hiveSpace.repository.WorkspaceRepository;
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

    public User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof User) {
            return (User) auth.getPrincipal();
        }
        return null;
    }

    // --- TENANT (ORGANIZATION) LEVEL ---
    public boolean hasTenantRole(UUID tenantId, String requiredRole) {
        User user = getCurrentUser();
        if (user == null || tenantId == null) return false;
        
        return tenantMemberRepository.findByTenantIdAndUserId(tenantId, user.getId())
                .map(member -> hasSufficientRole(member.getRole().name(), requiredRole))
                .orElse(false);
    }
    
    public boolean isTenantOwner(UUID tenantId) {
        return hasTenantRole(tenantId, "OWNER");
    }

    public boolean isTenantAdmin(UUID tenantId) {
        return hasTenantRole(tenantId, "ADMIN");
    }

    // --- WORKSPACE LEVEL ---
    public boolean hasWorkspaceRole(UUID workspaceId, String requiredRole) {
        User user = getCurrentUser();
        if (user == null || workspaceId == null) return false;

        boolean hasExplicitRole = workspaceMemberRepository.findByWorkspaceIdAndUserId(workspaceId, user.getId())
                .map(member -> hasSufficientRole(member.getRole().name(), requiredRole))
                .orElse(false);

        if (hasExplicitRole) return true;

        // Fallback: Tenant owners and admins automatically have admin rights to workspaces within their organization
        return workspaceRepository.findById(workspaceId)
                .map(workspace -> {
                    UUID tenantId = workspace.getTenant().getId();
                    return isTenantOwner(tenantId) || isTenantAdmin(tenantId);
                })
                .orElse(false);
    }
    
    public boolean isWorkspaceAdmin(UUID workspaceId) {
        return hasWorkspaceRole(workspaceId, "ADMIN");
    }

    // --- PROJECT LEVEL ---
    public boolean hasProjectRole(UUID projectId, String requiredRole) {
        User user = getCurrentUser();
        if (user == null || projectId == null) return false;

        return projectMemberRepository.findByProjectIdAndUserId(projectId, user.getId())
                .map(member -> hasSufficientRole(member.getRole().name(), requiredRole))
                .orElse(false);
    }
    
    public boolean isProjectLead(UUID projectId) {
        return hasProjectRole(projectId, "LEAD");
    }

    // --- TEAM LEVEL ---
    public boolean hasTeamRole(UUID teamId, String requiredRole) {
        User user = getCurrentUser();
        if (user == null || teamId == null) return false;

        return teamMemberRepository.findByTeamIdAndUserId(teamId, user.getId())
                .map(member -> hasSufficientRole(member.getRole().name(), requiredRole))
                .orElse(false);
    }

    // Role hierarchy: OWNER > ADMIN > BILLING_ADMIN > LEAD > MEMBER > VIEWER
    private boolean hasSufficientRole(String actualRole, String requiredRole) {
        if (actualRole == null || requiredRole == null) return false;
        return roleRank(actualRole) >= roleRank(requiredRole);
    }

    private int roleRank(String role) {
        return switch (role.toUpperCase()) {
            case "OWNER" -> 5;
            case "ADMIN" -> 4;
            case "BILLING_ADMIN" -> 3;
            case "LEAD" -> 3;
            case "MEMBER" -> 2;
            case "VIEWER" -> 1;
            default -> 0;
        };
    }
}
