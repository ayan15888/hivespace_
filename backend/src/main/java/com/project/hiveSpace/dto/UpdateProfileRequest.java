package com.project.hiveSpace.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class UpdateProfileRequest {
    private String fullName;
    private String jobTitle;
    private String bio;
    private String avatarUrl;
}
