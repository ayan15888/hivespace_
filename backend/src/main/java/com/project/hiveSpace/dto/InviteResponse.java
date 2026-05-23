package com.project.hiveSpace.dto;

import com.project.hiveSpace.models.InvitationStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;
import java.util.UUID;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InviteResponse {
    private UUID id;
    private String token;
    private String pin; // Returned only upon successful creation so the user can copy/share it
    private UUID tenantId;
    private String tenantName;
    private String tenantSlug;
    private UUID workspaceId;
    private String workspaceName;
    private UUID teamId;
    private String teamName;
    private UUID projectId;
    private String projectName;
    private List<UUID> workspaceIds;
    private List<UUID> teamIds;
    private String inviterUsername;
    private String tenantRole;
    private int maxUses;
    private int currentUses;
    private InvitationStatus status;
    private Date expiresAt;
    private Date createdAt;
}
