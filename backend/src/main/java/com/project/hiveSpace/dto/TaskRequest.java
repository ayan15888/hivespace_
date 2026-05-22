package com.project.hiveSpace.dto;

import com.project.hiveSpace.models.TaskPriority;
import com.project.hiveSpace.models.TaskStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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

    @NotNull(message = "Status is required")
    @Builder.Default
    private TaskStatus status = TaskStatus.TODO;

    @NotNull(message = "Priority is required")
    @Builder.Default
    private TaskPriority priority = TaskPriority.MEDIUM;

    private String labels;
    private Date dueDate;
    private Integer points;
    private UUID assigneeId;
}
