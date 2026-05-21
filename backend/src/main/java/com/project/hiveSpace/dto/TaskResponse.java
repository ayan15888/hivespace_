package com.project.hiveSpace.dto;

import com.project.hiveSpace.models.TaskPriority;
import com.project.hiveSpace.models.TaskStatus;
import lombok.*;
import java.util.Date;
import java.util.UUID;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class TaskResponse {
    private UUID id;
    private String title;
    private String description;
    private TaskStatus status;
    private TaskPriority priority;
    private String labels;
    private Date dueDate;
    private Integer points;
    private UUID projectId;
    private String projectName;
    private String projectColor;
    private UUID assigneeId;
    private String assigneeName;
    private String assigneeInitials;
    private Date createdAt;
    private Date updatedAt;
}
