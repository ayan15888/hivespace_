package com.project.hiveSpace.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShareableLinkResponse {
    private UUID id;
    private String token;
    private String url;
    private UUID projectId;
    private String scopeType;
    private boolean isActive;
    private Date expiresAt;
    private Date createdAt;
}
