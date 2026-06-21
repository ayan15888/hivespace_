package com.project.hiveSpace.repository;

import com.project.hiveSpace.dto.DuplicateCandidate;
import com.project.hiveSpace.models.TaskEmbedding;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.UUID;

@Repository
public interface TaskEmbeddingRepository extends JpaRepository<TaskEmbedding, UUID> {

    @Transactional
    void deleteByTaskId(UUID taskId);

    @Modifying
    @Transactional
    @Query(value = "INSERT INTO task_embeddings (id, task_id, project_id, embedding, created_at, updated_at) " +
            "VALUES (:id, :taskId, :projectId, cast(:embedding as vector), now(), now()) " +
            "ON CONFLICT (task_id) DO UPDATE SET embedding = cast(:embedding as vector), updated_at = now()", nativeQuery = true)
    void insertOrUpdateEmbedding(
            @Param("id") UUID id,
            @Param("taskId") UUID taskId,
            @Param("projectId") UUID projectId,
            @Param("embedding") String embeddingString
    );

    @Query(value = "SELECT t.id as id, t.title as title, t.status as status, u.full_name as assigneeName, " +
            "(te.embedding <=> cast(:queryEmbedding as vector)) as distance " +
            "FROM task_embeddings te " +
            "JOIN tasks t ON te.task_id = t.id " +
            "LEFT JOIN task_assignees ta ON ta.task_id = t.id AND ta.role = 'OWNER' " +
            "LEFT JOIN users u ON ta.user_id = u.id " +
            "WHERE te.project_id = :projectId " +
            "ORDER BY distance ASC " +
            "LIMIT :limit", nativeQuery = true)
    List<DuplicateCandidate> searchSimilarTasks(
            @Param("projectId") UUID projectId,
            @Param("queryEmbedding") String queryEmbeddingString,
            @Param("limit") int limit
    );
}
