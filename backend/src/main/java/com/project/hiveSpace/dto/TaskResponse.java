package com.project.hiveSpace.dto;

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
    private String status;
    private String priority;
    private String labels;
    private Date dueDate;
    private Integer points;
    private UUID projectId;
    private UUID assigneeId;
    private String assigneeName;
    private String assigneeInitials;
}
