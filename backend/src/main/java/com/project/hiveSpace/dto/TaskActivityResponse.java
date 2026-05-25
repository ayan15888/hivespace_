package com.project.hiveSpace.dto;

import lombok.*;
import java.util.Date;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TaskActivityResponse {
    private UUID id;
    private UUID taskId;
    private UUID userId;
    private String username;
    private String fullName;
    private String avatarUrl;
    private String type;
    private String oldValue;
    private String newValue;
    private Date createdAt;
}
