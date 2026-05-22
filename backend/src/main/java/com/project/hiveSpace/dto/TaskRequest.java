package com.project.hiveSpace.dto;

import com.project.hiveSpace.models.TaskPriority;
import com.project.hiveSpace.models.TaskStatus;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import java.util.Date;
import java.util.UUID;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class TaskRequest {
    @NotBlank(message = "Title is required")
    private String title;
    private String description;

    private TaskStatus status;
    private TaskPriority priority;

    private String labels;
    private Date dueDate;
    private Integer points;
    private UUID assigneeId;
    private UUID teamId;
    private UUID parentId;
}
