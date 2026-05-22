package com.project.hiveSpace.dto;

import com.project.hiveSpace.models.TaskAssigneeRole;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TaskAssigneeResponse {
    private UUID id;
    private UUID taskId;
    private UUID userId;
    private String fullName;
    private String username;
    private String avatarUrl;
    private TaskAssigneeRole role;
    private Date assignedAt;
}
