package com.project.hiveSpace.dto;

import com.project.hiveSpace.models.ProjectMemberRole;
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
public class ProjectMemberResponse {
    private UUID id;
    private UUID projectId;
    private UUID userId;
    private String username;
    private String email;
    private String fullName;
    private String avatarUrl;
    private ProjectMemberRole role; // LEAD, MEMBER, VIEWER
    private Date joinedAt;
}
