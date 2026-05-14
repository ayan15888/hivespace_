package com.project.hiveSpace.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WorkspaceRequest {

    @NotBlank(message = "Workspace name is required")
    private String name;

    private String description;

    @NotBlank(message = "Plan is required")
    private String plan;

    @NotNull(message = "Tenant ID is required")
    private UUID tenantId;
}
