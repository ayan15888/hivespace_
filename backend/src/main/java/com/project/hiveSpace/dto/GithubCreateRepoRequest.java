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
public class GithubCreateRepoRequest {

    @NotNull(message = "Project ID is required")
    private UUID projectId;

    @NotBlank(message = "GitHub organization/owner name is required")
    private String githubOrgName;

    @NotBlank(message = "Repository name is required")
    private String repoName;

    private boolean isPrivate;
}
