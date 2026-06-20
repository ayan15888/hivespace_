package com.project.hiveSpace.repository;

import com.project.hiveSpace.models.Document;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface DocumentRepository extends JpaRepository<Document, UUID> {
    List<Document> findAllByProjectIdOrderByUpdatedAtDesc(UUID projectId);
    List<Document> findAllByProjectIdAndParentIdIsNullOrderByUpdatedAtDesc(UUID projectId);
    List<Document> findAllByParentId(UUID parentId);
    List<Document> findAllByProjectIdAndIsPublishedTrue(UUID projectId);
    long countByProjectId(UUID projectId);
    boolean existsByProjectIdAndTitle(UUID projectId, String title);
}
