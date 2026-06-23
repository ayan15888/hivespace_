package com.project.hiveSpace.dto;

import lombok.*;
import java.util.Date;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GithubConnectionResponse {
    private UUID id;
    private UUID tenantId;
    private String githubOrgName;
    private String connectedByUsername;
    private Date connectedAt;
}
