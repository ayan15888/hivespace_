package com.project.hiveSpace.dto;

import com.project.hiveSpace.models.ProjectStatus;
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
    private ProjectStatus status;
    private int teamsCount;
    private int membersCount;
    private UUID workspaceId;
    private Date createdAt;
    private Date updatedAt;
    private String color;
    private Date startDate;
    private Date endDate;
}
