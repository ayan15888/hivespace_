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
public class GithubSaveConnectionRequest {

    @NotNull(message = "Tenant ID is required")
    private UUID tenantId;

    @NotBlank(message = "GitHub org/account name is required")
    private String githubOrgName;

    @NotBlank(message = "Token reference is required")
    private String tokenRef;
}
