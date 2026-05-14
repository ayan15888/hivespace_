package com.project.hiveSpace.dto;

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
public class TeamResponse {
    private UUID id;
    private String name;
    private String description;
    private int membersCount;
    private UUID projectId;
    private Date createdAt;
    private Date updatedAt;
}
