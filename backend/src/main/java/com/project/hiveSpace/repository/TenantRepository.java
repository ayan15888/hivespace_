package com.project.hiveSpace.repository;

import com.project.hiveSpace.models.Tenant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TenantRepository extends JpaRepository<Tenant, java.util.UUID> {

    Optional<Tenant> findByName(String name);

    Optional<Tenant> findBySlug(String slug);

    List<Tenant> findAllByOwnerEmail(String ownerEmail);

    long countByOwnerEmail(String ownerEmail);

    Optional<Tenant> findByIdAndActiveTrue(java.util.UUID id);
}
