package com.project.hiveSpace.dto;

import com.project.hiveSpace.models.WorkspaceMemberRole;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WorkspaceMemberRequest {
    private UUID userId;
    private WorkspaceMemberRole role; // ADMIN, MEMBER, VIEWER
}
