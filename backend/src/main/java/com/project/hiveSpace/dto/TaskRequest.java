package com.project.hiveSpace.dto;

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
    @NotBlank(message = "Status is required")
    private String status;
    @NotBlank(message = "Priority is required")
    private String priority;
    private String labels;
    private Date dueDate;
    private Integer points;
    private UUID assigneeId;
}
