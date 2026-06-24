package com.project.hiveSpace.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GithubConnectionRequest {

    @NotBlank(message = "OAuth code is required")
    private String code;

    private String githubOrgName;

    @NotNull(message = "Tenant ID is required")
    private UUID tenantId;
}
