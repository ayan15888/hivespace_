package com.project.hiveSpace.dto;

import com.project.hiveSpace.models.ChannelType;
import java.util.UUID;

public record CreateChannelRequest(
    String name,
    ChannelType type,       // PUBLIC, PRIVATE, DM, THREAD
    UUID workspaceId,
    UUID projectId,         // nullable
    UUID teamId             // nullable
) {}
