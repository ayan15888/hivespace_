package com.project.hiveSpace.repository;

import com.project.hiveSpace.models.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, java.util.UUID> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    Optional<User> findByUsername(String username);

    java.util.List<User> findByTenantId(java.util.UUID tenantId);

    java.util.List<User> findByTenantIdAndActiveTrue(java.util.UUID tenantId);

    Optional<User> findByGithubId(Long githubId);
}
