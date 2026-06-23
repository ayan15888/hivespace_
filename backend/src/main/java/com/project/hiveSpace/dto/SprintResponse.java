package com.project.hiveSpace.dto;

import com.project.hiveSpace.models.SprintStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.Date;
import java.util.UUID;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class SprintResponse {
    private UUID id;
    private String name;
    private String goal;
    private SprintStatus status;
    private UUID projectId;
    private Date startDate;
    private Date endDate;
    private UUID createdById;
    private String createdByName;
    private Date createdAt;
    private Date updatedAt;
}
