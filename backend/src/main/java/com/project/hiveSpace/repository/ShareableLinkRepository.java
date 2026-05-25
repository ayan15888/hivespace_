package com.project.hiveSpace.repository;

import com.project.hiveSpace.models.ShareableLink;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ShareableLinkRepository extends JpaRepository<ShareableLink, UUID> {
    Optional<ShareableLink> findByToken(String token);
    Optional<ShareableLink> findByProjectIdAndIsActiveTrue(UUID projectId);
}
