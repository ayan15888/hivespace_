package com.project.hiveSpace.dto;

import com.project.hiveSpace.models.ProjectStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ProjectRequest {

    @NotBlank(message = "Project name is required")
    private String name;

    private String description;

    @NotNull(message = "Project status is required")
    @Builder.Default
    private ProjectStatus status = ProjectStatus.ACTIVE;

    @NotNull(message = "Workspace ID is required")
    private UUID workspaceId;

    private String color;

    private java.util.Date startDate;
    private java.util.Date endDate;
}
