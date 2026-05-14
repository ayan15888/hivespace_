package com.project.hiveSpace.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class GitHubUserResponse {
    private Long id;
    private String login;
    private String email;
    @JsonProperty("avatar_url")
    private String avatarUrl;
    private String name;
}
