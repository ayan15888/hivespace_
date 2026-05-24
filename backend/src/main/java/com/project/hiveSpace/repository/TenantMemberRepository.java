package com.project.hiveSpace.repository;

import com.project.hiveSpace.models.Tenant;
import com.project.hiveSpace.models.TenantMember;
import com.project.hiveSpace.models.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TenantMemberRepository extends JpaRepository<TenantMember, UUID> {
    List<TenantMember> findAllByTenantId(UUID tenantId);
    List<TenantMember> findAllByUserId(UUID userId);
    Optional<TenantMember> findByTenantIdAndUserId(UUID tenantId, UUID userId);
    boolean existsByTenantAndUser(Tenant tenant, User user);
    boolean existsByUserId(UUID userId);
    long countByTenantId(UUID tenantId);
}
