package com.project.hiveSpace.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;
import java.util.UUID;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ProjectResponse {

    private UUID id;
    private String name;
    private String description;
    private String status;
    private int teamsCount;
    private int membersCount;
    private UUID workspaceId;
    private Date createdAt;
    private Date updatedAt;
}
