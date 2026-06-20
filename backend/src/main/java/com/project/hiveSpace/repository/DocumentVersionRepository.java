package com.project.hiveSpace.repository;

import com.project.hiveSpace.models.DocumentVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface DocumentVersionRepository extends JpaRepository<DocumentVersion, UUID> {
    List<DocumentVersion> findAllByDocumentIdOrderByCreatedAtDesc(UUID documentId);
    long countByDocumentId(UUID documentId);
}
