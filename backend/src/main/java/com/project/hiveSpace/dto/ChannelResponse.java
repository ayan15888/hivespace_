package com.project.hiveSpace.dto;

import com.project.hiveSpace.models.ChannelType;
import java.util.UUID;

public record ChannelResponse(
    UUID id,
    String name,
    ChannelType type,
    UUID workspaceId,
    UUID projectId,
    UUID teamId,
    long unreadCount,
    Boolean pinned
) {}
