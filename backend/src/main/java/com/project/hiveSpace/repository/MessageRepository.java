package com.project.hiveSpace.repository;

import com.project.hiveSpace.models.Message;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface MessageRepository extends JpaRepository<Message, UUID> {

    // Cursor pagination — 50 most recent active messages before a given message
    @Query("""
        SELECT m FROM Message m
        WHERE m.channel.id = :channelId
          AND m.parent IS NULL
          AND m.deletedAt IS NULL
          AND (:before IS NULL OR m.createdAt < (
              SELECT m2.createdAt FROM Message m2 WHERE m2.id = :before
          ))
        ORDER BY m.createdAt DESC
    """)
    List<Message> findPageByChannel(@Param("channelId") UUID channelId, @Param("before") UUID before, Pageable pageable);

    // Thread replies for a parent message
    @Query("""
        SELECT m FROM Message m
        WHERE m.parent.id = :parentId
          AND m.deletedAt IS NULL
        ORDER BY m.createdAt ASC
    """)
    List<Message> findThreadReplies(@Param("parentId") UUID parentId);

    // Reply count for a parent (used in MessageResponse)
    @Query("""
        SELECT COUNT(m) FROM Message m
        WHERE m.parent.id = :parentId
          AND m.deletedAt IS NULL
    """)
    int countReplies(@Param("parentId") UUID parentId);
}
