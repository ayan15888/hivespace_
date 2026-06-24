package com.project.hiveSpace.dto;

import com.project.hiveSpace.models.MessageType;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record MessageResponse(
    UUID id,
    String content,
    MessageType type,
    UUID channelId,
    UserSummary sender,
    UUID parentId,
    boolean isEdited,
    boolean isDeleted,
    Instant createdAt,
    Instant editedAt,
    List<ReactionSummary> reactions,
    int replyCount
) {}
