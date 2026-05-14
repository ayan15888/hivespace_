package com.project.hiveSpace.dto;

import com.project.hiveSpace.models.Plan;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TenantResponse {
    private java.util.UUID id;
    private String name;
    private String slug;
    private String ownerEmail;
    private Plan plan;
    private boolean active;
    private int membersCount;
    private int workspacesCount;
}
