package com.project.hiveSpace.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChannelMemberResponse {
    private UUID userId;
    private String username;
    private String fullName;
    private String avatarUrl;
    private String avatarColor;
    private Instant joinedAt;
}
