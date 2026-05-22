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

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import com.project.hiveSpace.models.TenantMember;
import com.project.hiveSpace.models.TenantMemberRole;
import com.project.hiveSpace.dto.MemberResponse;

import java.util.Date;
import java.util.Optional;

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

    @Transactional(readOnly = true)
    public List<TenantResponse> getTenantsForCurrentUser() {
        User currentUser = getCurrentUser();
        Set<UUID> seen = new HashSet<>();
        List<TenantResponse> result = new ArrayList<>();

        for (TenantMember membership : tenantMemberRepository.findAllByUserId(currentUser.getId())) {
            Tenant tenant = membership.getTenant();
            if (seen.add(tenant.getId())) {
                result.add(mapToResponse(tenant));
            }
        }

        // Backward compatibility for orgs created before tenant_members existed
        for (Tenant tenant : tenantRepository.findAllByOwnerEmail(currentUser.getEmail())) {
            if (seen.add(tenant.getId())) {
                result.add(mapToResponse(tenant));
            }
        }

        return result;
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

    @Transactional(readOnly = true)
    public List<MemberResponse> getMembersByTenantId(UUID tenantId) {
        User currentUser = getCurrentUser();

        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Tenant not found"));

        ensureOwnerMembership(tenant);

        if (!canViewMemberDirectory(tenant, currentUser)) {
            throw new IllegalArgumentException("You are not authorized to view members of this organization");
        }

        return tenantMemberRepository.findAllByTenantId(tenantId).stream()
                .map(membership -> {
                    User user = membership.getUser();
                    return new MemberResponse(
                            user.getId(),
                            user.getEmail(),
                            user.getUsername(),
                            user.getFullName() != null ? user.getFullName() : user.getUsername(),
                            user.getAvatarUrl(),
                            user.getJobTitle() != null ? user.getJobTitle() : "Member",
                            membership.getRole().name()
                    );
                })
                .collect(Collectors.toList());
    }

    /**
     * Org owner, admins, and members may view the full member directory.
     * Billing admins are scoped to billing only (see product blueprint).
     */
    private boolean canViewMemberDirectory(Tenant tenant, User user) {
        if (tenant.getOwnerEmail() != null
                && tenant.getOwnerEmail().equalsIgnoreCase(user.getEmail())) {
            return true;
        }
        return tenantMemberRepository.findByTenantIdAndUserId(tenant.getId(), user.getId())
                .map(m -> m.getRole() != TenantMemberRole.BILLING_ADMIN)
                .orElse(false);
    }

    /** Backfill owner row for orgs created before tenant_members was enforced. */
    private void ensureOwnerMembership(Tenant tenant) {
        if (tenant.getOwnerEmail() == null || tenant.getOwnerEmail().isBlank()) {
            return;
        }
        Optional<User> ownerUser = userRepository.findByEmail(tenant.getOwnerEmail());
        if (ownerUser.isEmpty()) {
            return;
        }
        User owner = ownerUser.get();
        if (!tenantMemberRepository.existsByTenantAndUser(tenant, owner)) {
            tenantMemberRepository.save(TenantMember.builder()
                    .tenant(tenant)
                    .user(owner)
                    .role(TenantMemberRole.OWNER)
                    .joinedAt(new Date())
                    .build());
        }
    }

    @Transactional
    public MemberResponse updateMemberRole(UUID tenantId, UUID userId, String roleStr) {
        User currentUser = getCurrentUser();
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Tenant not found"));

        TenantMember currentMember = tenantMemberRepository.findByTenantIdAndUserId(tenantId, currentUser.getId())
                .orElseThrow(() -> new IllegalArgumentException("You are not a member of this organization"));

        if (currentMember.getRole() != TenantMemberRole.OWNER && currentMember.getRole() != TenantMemberRole.ADMIN) {
            throw new IllegalArgumentException("You are not authorized to update roles in this organization");
        }

        TenantMember memberToUpdate = tenantMemberRepository.findByTenantIdAndUserId(tenantId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Member not found in this organization"));

        TenantMemberRole newRole = TenantMemberRole.valueOf(roleStr.toUpperCase());
        
        if (memberToUpdate.getUser().getEmail().equalsIgnoreCase(tenant.getOwnerEmail())) {
            throw new IllegalArgumentException("Cannot change role of the primary organization owner");
        }

        if (newRole == TenantMemberRole.OWNER && currentMember.getRole() != TenantMemberRole.OWNER) {
            throw new IllegalArgumentException("Only the owner can transfer ownership");
        }

        if (newRole == TenantMemberRole.ADMIN && currentMember.getRole() != TenantMemberRole.OWNER) {
            throw new IllegalArgumentException("Only the owner can promote members to administrator");
        }

        if (memberToUpdate.getRole() == TenantMemberRole.ADMIN && currentMember.getRole() != TenantMemberRole.OWNER) {
            throw new IllegalArgumentException("Only the owner can demote or modify administrator roles");
        }

        memberToUpdate.setRole(newRole);
        TenantMember savedMember = tenantMemberRepository.save(memberToUpdate);
        
        User u = savedMember.getUser();
        return new MemberResponse(
                u.getId(),
                u.getEmail(),
                u.getUsername(),
                u.getFullName() != null ? u.getFullName() : u.getUsername(),
                u.getAvatarUrl(),
                u.getJobTitle() != null ? u.getJobTitle() : "Member",
                savedMember.getRole().name()
        );
    }

    @Transactional
    public void removeMember(UUID tenantId, UUID userId) {
        User currentUser = getCurrentUser();
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Tenant not found"));

        TenantMember currentMember = tenantMemberRepository.findByTenantIdAndUserId(tenantId, currentUser.getId())
                .orElseThrow(() -> new IllegalArgumentException("You are not a member of this organization"));

        if (currentMember.getRole() != TenantMemberRole.OWNER && currentMember.getRole() != TenantMemberRole.ADMIN) {
            throw new IllegalArgumentException("You are not authorized to remove members from this organization");
        }

        TenantMember memberToRemove = tenantMemberRepository.findByTenantIdAndUserId(tenantId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Member not found in this organization"));

        if (memberToRemove.getUser().getEmail().equalsIgnoreCase(tenant.getOwnerEmail())) {
            throw new IllegalArgumentException("Cannot remove the primary organization owner");
        }

        if (memberToRemove.getRole() == TenantMemberRole.ADMIN && currentMember.getRole() != TenantMemberRole.OWNER) {
            throw new IllegalArgumentException("Only the owner can remove administrators");
        }

        tenantMemberRepository.delete(memberToRemove);
        
        tenant.setMembersCount(Math.max(1, tenant.getMembersCount() - 1));
        tenantRepository.save(tenant);
    }
}
