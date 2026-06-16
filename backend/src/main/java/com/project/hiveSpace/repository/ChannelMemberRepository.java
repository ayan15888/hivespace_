package com.project.hiveSpace.repository;

import com.project.hiveSpace.models.ChannelMember;
import com.project.hiveSpace.models.ChannelMemberId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ChannelMemberRepository extends JpaRepository<ChannelMember, ChannelMemberId> {

    List<ChannelMember> findByIdChannelId(UUID channelId);

    Optional<ChannelMember> findByIdChannelIdAndIdUserId(UUID channelId, UUID userId);

    // Unread count for a user in a channel
    @Query("""
        SELECT COUNT(m) FROM Message m
        WHERE m.channel.id = :channelId
          AND m.deletedAt IS NULL
          AND (m.sender IS NULL OR m.sender.id != :userId)
          AND m.createdAt > :lastReadAt
    """)
    long countUnread(@Param("channelId") UUID channelId, @Param("userId") UUID userId, @Param("lastReadAt") Instant lastReadAt);

    @Modifying
    @Query("UPDATE ChannelMember cm SET cm.lastReadAt = :timestamp WHERE cm.id.channelId = :channelId AND cm.id.userId = :userId")
    void updateLastReadAt(@Param("channelId") UUID channelId, @Param("userId") UUID userId, @Param("timestamp") Instant timestamp);
    
    boolean existsByIdChannelIdAndIdUserId(UUID channelId, UUID userId);
    
    @Modifying
    void deleteByIdChannelIdAndIdUserId(UUID channelId, UUID userId);
}
