package com.project.hiveSpace.dto;

import com.project.hiveSpace.models.WorkspaceMemberRole;
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
public class WorkspaceMemberResponse {
    private UUID id;
    private UUID workspaceId;
    private UUID userId;
    private String username;
    private String email;
    private String fullName;
    private String avatarUrl;
    private WorkspaceMemberRole role; // ADMIN, MEMBER, VIEWER
    private Date joinedAt;
}
