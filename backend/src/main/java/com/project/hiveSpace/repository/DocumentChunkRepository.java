package com.project.hiveSpace.repository;

import com.project.hiveSpace.models.DocumentChunk;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import java.util.UUID;

@Repository
public interface DocumentChunkRepository extends JpaRepository<DocumentChunk, UUID> {

    @Transactional
    void deleteAllByDocumentId(UUID documentId);

    @Modifying
    @Transactional
    @Query(value = "INSERT INTO document_chunks (id, document_id, project_id, chunk_index, content, embedding, created_at, updated_at) " +
            "VALUES (:id, :documentId, :projectId, :chunkIndex, :content, cast(:embedding as vector), now(), now())", nativeQuery = true)
    void insertChunkWithEmbedding(
            @Param("id") UUID id,
            @Param("documentId") UUID documentId,
            @Param("projectId") UUID projectId,
            @Param("chunkIndex") Integer chunkIndex,
            @Param("content") String content,
            @Param("embedding") String embeddingString
    );
}
