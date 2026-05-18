package com.project.hiveSpace.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TeamMemberResponse {
    private UUID id;
    private UUID teamId;
    private UUID userId;
    private String username;
    private String email;
    private String fullName;
    private String avatarUrl;
    private String role;
    private Date joinedAt;
}
