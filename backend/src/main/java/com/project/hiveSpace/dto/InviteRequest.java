package com.project.hiveSpace.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class InviteRequest {
    private UUID tenantId;
    private UUID workspaceId;
    private UUID teamId;
    private String role; // e.g. MEMBER, ADMIN, VIEWER, LEAD
    private Integer maxUses;
    private String pin; // Optional custom PIN; auto-generated if null
    private String email; // Optional email to send invite directly to the invitee
    private UUID projectId;
}
