package com.project.hiveSpace.dto;

import java.util.UUID;

public record UserSummary(
    UUID id,
    String fullName,
    String avatarUrl,
    String avatarColor
) {}
