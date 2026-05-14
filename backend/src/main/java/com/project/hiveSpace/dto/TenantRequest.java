package com.project.hiveSpace.dto;

import com.project.hiveSpace.models.Plan;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TenantRequest {

    @NotBlank(message = "Organization name is required")
    private String name;

    @NotBlank(message = "Slug is required")
    private String slug;

    private Plan plan = Plan.FREE;

    private String description;
}
