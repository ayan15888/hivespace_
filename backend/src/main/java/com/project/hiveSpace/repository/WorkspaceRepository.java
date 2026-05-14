package com.project.hiveSpace.repository;

import com.project.hiveSpace.models.Tenant;
import com.project.hiveSpace.models.Workspace;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface WorkspaceRepository extends JpaRepository<Workspace, UUID> {

    Optional<Workspace> findByNameAndTenant(String name, Tenant tenant);

    List<Workspace> findAllByTenant(Tenant tenant);

    List<Workspace> findAllByTenantId(UUID tenantId);

    boolean existsByNameAndTenant(String name, Tenant tenant);
}
