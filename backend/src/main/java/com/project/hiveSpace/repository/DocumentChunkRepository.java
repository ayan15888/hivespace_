package com.project.hiveSpace.repository;

import com.project.hiveSpace.dto.SearchCandidate;
import com.project.hiveSpace.models.DocumentChunk;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
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

    @Query(value = "SELECT c.id as id, c.document_id as documentId, c.project_id as projectId, " +
            "c.chunk_index as chunkIndex, c.content as content, d.title as documentTitle " +
            "FROM document_chunks c " +
            "JOIN documents d ON c.document_id = d.id " +
            "WHERE c.project_id = :projectId " +
            "ORDER BY c.embedding <=> cast(:queryEmbedding as vector) " +
            "LIMIT :limit", nativeQuery = true)
    List<SearchCandidate> searchVector(
            @Param("projectId") UUID projectId,
            @Param("queryEmbedding") String queryEmbeddingString,
            @Param("limit") int limit
    );

    @Query(value = "SELECT c.id as id, c.document_id as documentId, c.project_id as projectId, " +
            "c.chunk_index as chunkIndex, c.content as content, d.title as documentTitle " +
            "FROM document_chunks c " +
            "JOIN documents d ON c.document_id = d.id " +
            "WHERE c.project_id = :projectId AND c.content_tsv @@ plainto_tsquery('english', :query) " +
            "ORDER BY ts_rank(c.content_tsv, plainto_tsquery('english', :query)) DESC " +
            "LIMIT :limit", nativeQuery = true)
    List<SearchCandidate> searchKeyword(
            @Param("projectId") UUID projectId,
            @Param("query") String query,
            @Param("limit") int limit
    );
}

