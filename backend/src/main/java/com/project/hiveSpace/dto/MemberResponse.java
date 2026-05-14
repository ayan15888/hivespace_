package com.project.hiveSpace.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.UUID;

@Getter
@AllArgsConstructor
public class MemberResponse {
    private UUID id;
    private String email;
    private String username;
    private String fullName;
    private String avatarUrl;
    private String jobTitle;
    private String role;    // system role: USER, ADMIN, MANAGER
}
