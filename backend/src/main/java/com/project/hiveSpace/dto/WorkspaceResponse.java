package com.project.hiveSpace.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WorkspaceResponse {

    private UUID id;
    private String name;
    private String description;
    private String plan;
    private UUID tenantId;
    private Date createdAt;
    private Date updatedAt;
}
