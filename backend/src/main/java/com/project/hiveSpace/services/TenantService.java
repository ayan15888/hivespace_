package com.project.hiveSpace.services;

import com.project.hiveSpace.dto.TenantRequest;
import com.project.hiveSpace.dto.TenantResponse;
import com.project.hiveSpace.models.Tenant;
import com.project.hiveSpace.models.User;
import com.project.hiveSpace.repository.TenantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import com.project.hiveSpace.dto.MemberResponse;

@Service
@RequiredArgsConstructor
public class TenantService {

    private final TenantRepository tenantRepository;
    private final com.project.hiveSpace.repository.UserRepository userRepository;
    private final com.project.hiveSpace.repository.TenantMemberRepository tenantMemberRepository;

    @Transactional
    public TenantResponse createTenant(TenantRequest request) {
        User currentUser = getCurrentUser();

        if (tenantRepository.findByName(request.getName()).isPresent()) {
            throw new IllegalArgumentException("Organization name already exists");
        }
        if (tenantRepository.findBySlug(request.getSlug()).isPresent()) {
            throw new IllegalArgumentException("Slug already exists");
        }

        Tenant tenant = Tenant.builder()
                .name(request.getName())
                .slug(request.getSlug())
                .ownerEmail(currentUser.getEmail())
                .plan(request.getPlan())
                .description(request.getDescription())
                .active(true)
                .membersCount(1)
                .workspacesCount(0)
                .build();

        Tenant savedTenant = tenantRepository.save(tenant);

        // Create TenantMember representing owner role for this user
        com.project.hiveSpace.models.TenantMember ownerMember = com.project.hiveSpace.models.TenantMember.builder()
                .tenant(savedTenant)
                .user(currentUser)
                .role(com.project.hiveSpace.models.TenantMemberRole.OWNER)
                .joinedAt(new java.util.Date())
                .build();
        tenantMemberRepository.save(ownerMember);

        // Associate user with their newly created active tenant
        currentUser.setTenant(savedTenant);
        userRepository.save(currentUser);

        return mapToResponse(savedTenant);
    }

    private User getCurrentUser() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (principal instanceof User) {
            return (User) principal;
        }
        throw new IllegalStateException("User not authenticated");
    }

    private TenantResponse mapToResponse(Tenant tenant) {
        return new TenantResponse(
                tenant.getId(),
                tenant.getName(),
                tenant.getSlug(),
                tenant.getOwnerEmail(),
                tenant.getPlan(),
                tenant.isActive(),
                tenant.getMembersCount(),
                tenant.getWorkspacesCount()
        );
    }

    public List<TenantResponse> getTenantsForCurrentUser() {
        User currentUser = getCurrentUser();
        return tenantRepository.findAllByOwnerEmail(currentUser.getEmail()).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public long getTenantCountByOwnerId(UUID userId) {
        validateOwnership(userId);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        return tenantRepository.countByOwnerEmail(user.getEmail());
    }

    public List<TenantResponse> getTenantsByOwnerId(UUID userId) {
        validateOwnership(userId);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        return tenantRepository.findAllByOwnerEmail(user.getEmail()).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    private void validateOwnership(UUID userId) {
        User currentUser = getCurrentUser();
        if (!currentUser.getId().equals(userId)) {
            throw new IllegalArgumentException("You are not authorized to view these organizations");
        }
    }

    public List<MemberResponse> getMembersByTenantId(UUID tenantId) {
        User currentUser = getCurrentUser();

        // Validate tenant exists
        if (!tenantRepository.existsById(tenantId)) {
            throw new IllegalArgumentException("Tenant not found");
        }

        // Validate requester belongs to tenant
        if (tenantMemberRepository.findByTenantIdAndUserId(tenantId, currentUser.getId()).isEmpty()) {
            throw new IllegalArgumentException("You are not authorized to view members of this organization");
        }

        return userRepository.findByTenantId(tenantId).stream()
                .map(user -> new MemberResponse(
                        user.getId(),
                        user.getEmail(),
                        user.getUsername(),
                        user.getFullName() != null ? user.getFullName() : user.getUsername(),
                        user.getAvatarUrl(),
                        user.getJobTitle() != null ? user.getJobTitle() : "Member",
                        "MEMBER"
                ))
                .collect(Collectors.toList());
    }
}
