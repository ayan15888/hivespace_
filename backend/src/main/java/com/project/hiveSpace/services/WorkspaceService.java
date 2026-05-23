package com.project.hiveSpace.services;

import com.project.hiveSpace.dto.WorkspaceMemberResponse;
import com.project.hiveSpace.dto.WorkspaceRequest;
import com.project.hiveSpace.dto.WorkspaceResponse;
import com.project.hiveSpace.models.Tenant;
import com.project.hiveSpace.models.Workspace;
import com.project.hiveSpace.models.WorkspaceMember;
import com.project.hiveSpace.models.WorkspaceMemberRole;
import com.project.hiveSpace.models.User;
import com.project.hiveSpace.repository.TenantRepository;
import com.project.hiveSpace.repository.WorkspaceMemberRepository;
import com.project.hiveSpace.repository.WorkspaceRepository;
import com.project.hiveSpace.security.RbacService;
import com.project.hiveSpace.models.TenantMemberRole;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Date;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class WorkspaceService {

    private final WorkspaceRepository workspaceRepository;
    private final TenantRepository tenantRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final RbacService rbacService;

    private User getCurrentUser() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (principal instanceof User) {
            return (User) principal;
        }
        throw new IllegalStateException("User not authenticated");
    }

    @Transactional
    public WorkspaceResponse createWorkspace(WorkspaceRequest request) {
        User currentUser = getCurrentUser();

        if (!rbacService.hasTenantRole(request.getTenantId(), TenantMemberRole.ADMIN)) {
            throw new SecurityException("Access denied: Only organization admins and owners can create workspaces");
        }

        Tenant tenant = tenantRepository.findById(request.getTenantId())
                .orElseThrow(() -> new IllegalArgumentException("Tenant not found"));

        // Check workspace name uniqueness within this tenant
        if (workspaceRepository.existsByNameAndTenant(request.getName(), tenant)) {
            throw new IllegalArgumentException(
                    "A workspace with the name '" + request.getName() + "' already exists in this organization");
        }

        Workspace workspace = Workspace.builder()
                .name(request.getName())
                .description(request.getDescription())
                .tenant(tenant)
                .createdBy(currentUser)
                .membersCount(1) // Creator is included
                .createdAt(new Date())
                .updatedAt(new Date())
                .build();

        Workspace savedWorkspace = workspaceRepository.save(workspace);

        // Add creator as the first workspace member with ADMIN role
        WorkspaceMember creatorMember = WorkspaceMember.builder()
                .workspace(savedWorkspace)
                .user(currentUser)
                .role(WorkspaceMemberRole.ADMIN)
                .joinedAt(new Date())
                .build();
        workspaceMemberRepository.save(creatorMember);

        // Increment workspaces count on tenant
        tenant.setWorkspacesCount(tenant.getWorkspacesCount() + 1);
        tenantRepository.save(tenant);

        return mapToResponse(savedWorkspace);
    }

    public List<WorkspaceResponse> getWorkspacesByTenant(UUID tenantId) {
        if (!tenantRepository.existsById(tenantId)) {
            throw new IllegalArgumentException("Tenant not found");
        }

        return workspaceRepository.findAllByTenantId(tenantId)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    private WorkspaceResponse mapToResponse(Workspace workspace) {
        return new WorkspaceResponse(
                workspace.getId(),
                workspace.getName(),
                workspace.getDescription(),
                null,
                workspace.getTenant().getId(),
                workspace.getCreatedAt(),
                workspace.getUpdatedAt()
        );
    }

    @Transactional(readOnly = true)
    public List<WorkspaceMemberResponse> getWorkspaceMembers(UUID workspaceId) {
        if (!workspaceRepository.existsById(workspaceId)) {
            throw new IllegalArgumentException("Workspace not found");
        }

        return workspaceMemberRepository.findAllByWorkspaceId(workspaceId)
                .stream()
                .map(this::mapToWorkspaceMemberResponse)
                .collect(Collectors.toList());
    }

    private WorkspaceMemberResponse mapToWorkspaceMemberResponse(WorkspaceMember member) {
        return WorkspaceMemberResponse.builder()
                .id(member.getId())
                .workspaceId(member.getWorkspace().getId())
                .userId(member.getUser().getId())
                .username(member.getUser().getUsername())
                .email(member.getUser().getEmail())
                .fullName(member.getUser().getFullName())
                .avatarUrl(member.getUser().getAvatarUrl())
                .role(member.getRole())
                .joinedAt(member.getJoinedAt())
                .build();
    }
}
