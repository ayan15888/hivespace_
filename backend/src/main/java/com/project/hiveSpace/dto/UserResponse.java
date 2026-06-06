package com.project.hiveSpace.dto;

import com.project.hiveSpace.models.Role;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class UserResponse {

    private java.util.UUID id;
    private String email;
    private String username;
    private Role role;
    private String token; // The JWT token
    private boolean hasTenants;
    private String avatarUrl;
    private String fullName;
    private String jobTitle;
    private String bio;
    private String avatarColor;
}
