package com.project.hiveSpace.dto;

import com.project.hiveSpace.models.TaskPriority;
import com.project.hiveSpace.models.TaskStatus;
import lombok.*;
import java.util.Date;
import java.util.List;
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
    private UUID teamId;
    private String createdByName;
    private UUID parentId;
    private UUID sprintId;
    private String sprintName;
    private String taskIdentifier;
    private Integer subtaskCount;
    private Integer completedSubtaskCount;
    private List<TaskAssigneeResponse> assignees;
    private List<TaskResponse> subtasks;
    private Date createdAt;
    private Date updatedAt;
}

