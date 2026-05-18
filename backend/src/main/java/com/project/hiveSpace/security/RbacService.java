package com.project.hiveSpace.security;

import com.project.hiveSpace.models.User;
import com.project.hiveSpace.repository.ProjectMemberRepository;
import com.project.hiveSpace.repository.TeamMemberRepository;
import com.project.hiveSpace.repository.TenantMemberRepository;
import com.project.hiveSpace.repository.WorkspaceMemberRepository;
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

    private User getCurrentUser() {
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
                .map(member -> hasSufficientRole(member.getRole(), requiredRole))
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

        return workspaceMemberRepository.findByWorkspaceIdAndUserId(workspaceId, user.getId())
                .map(member -> hasSufficientRole(member.getRole(), requiredRole))
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
                .map(member -> hasSufficientRole(member.getRole(), requiredRole))
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
                .map(member -> hasSufficientRole(member.getRole(), requiredRole))
                .orElse(false);
    }

    // Utility mapping logic to check role hierarchy if needed. 
    // E.g., OWNER > ADMIN > MEMBER > VIEWER
    private boolean hasSufficientRole(String actualRole, String requiredRole) {
        if (actualRole == null || requiredRole == null) return false;
        
        // Exact match
        if (actualRole.equalsIgnoreCase(requiredRole)) return true;
        
        // Hierarchy rules
        switch (actualRole.toUpperCase()) {
            case "OWNER":
                return true; // Owner can do anything
            case "ADMIN":
                return requiredRole.equalsIgnoreCase("MEMBER") || requiredRole.equalsIgnoreCase("VIEWER");
            case "LEAD":
                return requiredRole.equalsIgnoreCase("MEMBER") || requiredRole.equalsIgnoreCase("VIEWER");
            case "MEMBER":
                return requiredRole.equalsIgnoreCase("VIEWER");
            default:
                return false;
        }
    }
}
