package com.project.hiveSpace.dto;

import java.util.UUID;

public record OpenDmRequest(
    UUID workspaceId,
    UUID targetUserId
) {}
