package com.project.hiveSpace.dto;

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

    @NotBlank(message = "Project status is required")
    private String status;

    @NotNull(message = "Workspace ID is required")
    private UUID workspaceId;
}
