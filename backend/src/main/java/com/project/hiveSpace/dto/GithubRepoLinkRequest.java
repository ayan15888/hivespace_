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
public class GithubRepoLinkRequest {

    @NotNull(message = "Project ID is required")
    private UUID projectId;

    @NotBlank(message = "GitHub repository full name is required")
    private String githubRepoFullName;
}
