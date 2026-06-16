package com.project.hiveSpace.repository;

import com.project.hiveSpace.models.Channel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import com.project.hiveSpace.models.ChannelType;

@Repository
public interface ChannelRepository extends JpaRepository<Channel, UUID> {

    Optional<Channel> findByProjectIdAndType(UUID projectId, ChannelType type);

    // All channels in a workspace that the user is a member of OR are PUBLIC channels
    @Query("""
        SELECT DISTINCT c FROM Channel c
        LEFT JOIN ChannelMember cm ON cm.id.channelId = c.id AND cm.id.userId = :userId
        WHERE c.workspace.id = :workspaceId
          AND (c.type = 'PUBLIC' OR cm.id.userId = :userId)
        ORDER BY c.createdAt ASC
    """)
    List<Channel> findByWorkspaceAndMember(@Param("workspaceId") UUID workspaceId, @Param("userId") UUID userId);

    // DM dedup: find existing DM channel between exactly two users in a workspace
    @Query(value = """
        SELECT c.id FROM channels c
        JOIN channel_members cm1 ON cm1.channel_id = c.id AND cm1.user_id = :userA
        JOIN channel_members cm2 ON cm2.channel_id = c.id AND cm2.user_id = :userB
        WHERE c.type = 'DM'
          AND c.workspace_id = :workspaceId
          AND (SELECT COUNT(*) FROM channel_members WHERE channel_id = c.id) = 2
        LIMIT 1
    """, nativeQuery = true)
    Optional<UUID> findExistingDmChannel(@Param("workspaceId") UUID workspaceId, @Param("userA") UUID userA, @Param("userB") UUID userB);
}
