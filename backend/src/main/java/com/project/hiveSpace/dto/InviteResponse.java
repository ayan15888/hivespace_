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
public class InviteResponse {
    private UUID id;
    private String code;
    private String teamName;
    private String projectName;
    private String workspaceName;
    private String recipientUsername;
    private String inviterUsername;
    private String status;
    private Date expiresAt;
    private Date createdAt;
}
