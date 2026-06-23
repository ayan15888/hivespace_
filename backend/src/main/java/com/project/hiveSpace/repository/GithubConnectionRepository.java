package com.project.hiveSpace.repository;

import com.project.hiveSpace.models.GithubConnection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface GithubConnectionRepository extends JpaRepository<GithubConnection, UUID> {
    List<GithubConnection> findByTenantId(UUID tenantId);
    Optional<GithubConnection> findByTenantIdAndGithubOrgName(UUID tenantId, String githubOrgName);
    Optional<GithubConnection> findByTenantIdAndId(UUID tenantId, UUID id);
    boolean existsByTenantIdAndGithubOrgName(UUID tenantId, String githubOrgName);
}
