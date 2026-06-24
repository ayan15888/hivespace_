package com.project.hiveSpace.dto;

import lombok.*;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GithubInitConnectionResponse {

    private String tokenRef;
    private String personalLogin;
    private String personalAvatarUrl;
    private List<GithubOrgInfo> orgs;

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GithubOrgInfo {
        private String login;
        private String avatarUrl;
        private String description;
    }
}
