package com.project.hiveSpace.dto;

import com.project.hiveSpace.models.NotificationType;
import java.util.Date;
import java.util.UUID;

public record NotificationResponse(
    UUID id,
    UUID userId,
    UserSummary actor,
    NotificationType type,
    String content,
    UUID messageId,
    UUID channelId,
    Boolean isRead,
    Date createdAt
) {}
