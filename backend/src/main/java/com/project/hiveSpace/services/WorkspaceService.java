package com.project.hiveSpace.services;

import com.project.hiveSpace.dto.WorkspaceMemberResponse;
import com.project.hiveSpace.dto.WorkspaceMemberRequest;
import com.project.hiveSpace.dto.WorkspaceRequest;
import com.project.hiveSpace.dto.WorkspaceResponse;
import com.project.hiveSpace.models.Tenant;
import com.project.hiveSpace.models.Workspace;
import com.project.hiveSpace.models.WorkspaceMember;
import com.project.hiveSpace.models.WorkspaceMemberRole;
import com.project.hiveSpace.models.User;
import com.project.hiveSpace.repository.TenantRepository;
import com.project.hiveSpace.repository.TenantMemberRepository;
import com.project.hiveSpace.repository.WorkspaceMemberRepository;
import com.project.hiveSpace.repository.WorkspaceRepository;
import com.project.hiveSpace.repository.UserRepository;
import com.project.hiveSpace.security.RbacService;
import com.project.hiveSpace.models.TenantMemberRole;
import com.project.hiveSpace.models.ResourceType;
import com.project.hiveSpace.exceptions.ForbiddenException;
import com.project.hiveSpace.exceptions.NotFoundException;
import com.project.hiveSpace.exceptions.ConflictException;
import com.project.hiveSpace.exceptions.DomainValidationException;
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
    private final UserRepository userRepository;
    private final TenantMemberRepository tenantMemberRepository;
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

        UUID currentTenantId = currentUser.getTenant() != null ? currentUser.getTenant().getId() : null;
        if (currentTenantId == null || !currentTenantId.equals(request.getTenantId())) {
            throw new ForbiddenException("Access denied: Cannot create workspace in a different organization");
        }

        if (!rbacService.hasTenantRole(request.getTenantId(), TenantMemberRole.ADMIN)) {
            throw new ForbiddenException("Access denied: Only organization admins and owners can create workspaces");
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

        return mapToResponse(savedWorkspace);
    }

    public List<WorkspaceResponse> getWorkspacesByTenant(UUID tenantId) {
        User currentUser = getCurrentUser();
        UUID activeTenantId = currentUser.getTenant() != null ? currentUser.getTenant().getId() : null;
        if (activeTenantId == null || !activeTenantId.equals(tenantId)) {
            throw new SecurityException("Access denied: Cannot access workspaces of a different organization");
            throw new ForbiddenException("Access denied: Cannot access workspaces of a different organization");
        }

        if (!rbacService.hasTenantRole(tenantId, TenantMemberRole.MEMBER)) {
            throw new ForbiddenException("Access denied: Must be a member of the organization to list its workspaces");
        }

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
        rbacService.verifyResourceBelongsToTenant(workspaceId, ResourceType.WORKSPACE);
        if (!rbacService.hasWorkspaceRole(workspaceId, WorkspaceMemberRole.VIEWER)) {
            throw new ForbiddenException("Access denied: Must be a workspace member to view its member directory");
        }

        if (!workspaceRepository.existsById(workspaceId)) {
            throw new IllegalArgumentException("Workspace not found");
        }

        boolean includeEmail = rbacService.canAdminWorkspace(workspaceId);

        return workspaceMemberRepository.findAllByWorkspaceId(workspaceId)
                .stream()
                .map(member -> mapToWorkspaceMemberResponse(member, includeEmail))
                .collect(Collectors.toList());
    }

    private WorkspaceMemberResponse mapToWorkspaceMemberResponse(WorkspaceMember member, boolean includeEmail) {
        return WorkspaceMemberResponse.builder()
                .id(member.getId())
                .workspaceId(member.getWorkspace().getId())
                .userId(member.getUser().getId())
                .username(member.getUser().getUsername())
                .email(includeEmail ? member.getUser().getEmail() : null)
                .fullName(member.getUser().getFullName())
                .avatarUrl(member.getUser().getAvatarUrl())
                .role(member.getRole())
                .joinedAt(member.getJoinedAt())
                .build();
    }

    @Transactional
    public WorkspaceMemberResponse addWorkspaceMember(UUID workspaceId, WorkspaceMemberRequest request) {
        rbacService.verifyResourceBelongsToTenant(workspaceId, ResourceType.WORKSPACE);
        if (!rbacService.canAdminWorkspace(workspaceId)) {
            throw new ForbiddenException("Access denied: Only workspace admins can manage members");
        }

        Workspace workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new NotFoundException("Workspace not found"));

        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new NotFoundException("User not found"));

        // Verify that user belongs to the tenant
        if (!tenantMemberRepository.existsByTenantIdAndUserId(workspace.getTenant().getId(), user.getId())) {
            throw new DomainValidationException("User must be a member of the organization to join this workspace");
        }

        if (workspaceMemberRepository.existsByWorkspaceIdAndUserId(workspaceId, user.getId())) {
            throw new ConflictException("User is already a member of this workspace");
        }

        WorkspaceMemberRole role = request.getRole() != null ? request.getRole() : WorkspaceMemberRole.MEMBER;

        WorkspaceMember member = WorkspaceMember.builder()
                .workspace(workspace)
                .user(user)
                .role(role)
                .joinedAt(new Date())
                .build();

        WorkspaceMember saved = workspaceMemberRepository.save(member);

        // Increment membersCount
        workspace.setMembersCount(workspace.getMembersCount() + 1);
        workspaceRepository.save(workspace);

        return mapToWorkspaceMemberResponse(saved, true);
    }

    @Transactional
    public WorkspaceMemberResponse updateWorkspaceMemberRole(UUID workspaceId, UUID userId, WorkspaceMemberRole role) {
        rbacService.verifyResourceBelongsToTenant(workspaceId, ResourceType.WORKSPACE);
        if (!rbacService.canAdminWorkspace(workspaceId)) {
            throw new ForbiddenException("Access denied: Only workspace admins can manage roles");
        }

        WorkspaceMember member = workspaceMemberRepository.findByWorkspaceIdAndUserId(workspaceId, userId)
                .orElseThrow(() -> new NotFoundException("Workspace membership not found"));

        member.setRole(role);
        WorkspaceMember saved = workspaceMemberRepository.save(member);

        return mapToWorkspaceMemberResponse(saved, true);
    }

    @Transactional
    public void removeWorkspaceMember(UUID workspaceId, UUID userId) {
        rbacService.verifyResourceBelongsToTenant(workspaceId, ResourceType.WORKSPACE);
        if (!rbacService.canAdminWorkspace(workspaceId)) {
            throw new ForbiddenException("Access denied: Only workspace admins can remove members");
        }

        Workspace workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new NotFoundException("Workspace not found"));

        WorkspaceMember member = workspaceMemberRepository.findByWorkspaceIdAndUserId(workspaceId, userId)
                .orElseThrow(() -> new NotFoundException("Workspace membership not found"));

        // Prevent deleting the last ADMIN workspace member
        if (member.getRole() == WorkspaceMemberRole.ADMIN) {
            long adminCount = workspaceMemberRepository.findAllByWorkspaceId(workspaceId).stream()
                    .filter(m -> m.getRole() == WorkspaceMemberRole.ADMIN)
                    .count();
            if (adminCount <= 1) {
                throw new DomainValidationException("Cannot remove the last workspace administrator");
            }
        }

        workspaceMemberRepository.delete(member);

        // Decrement membersCount
        workspace.setMembersCount(Math.max(0, workspace.getMembersCount() - 1));
        workspaceRepository.save(workspace);
    }
}
