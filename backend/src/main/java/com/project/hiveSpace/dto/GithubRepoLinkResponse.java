package com.project.hiveSpace.dto;

import lombok.*;
import java.util.Date;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GithubRepoLinkResponse {
    private UUID id;
    private UUID projectId;
    private String githubRepoFullName;
    private String linkedByUsername;
    private Date linkedAt;
}
