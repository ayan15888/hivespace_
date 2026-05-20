package com.project.hiveSpace.dto;

import com.project.hiveSpace.models.TeamMemberRole;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TeamMemberRequest {
    private UUID userId;
    private TeamMemberRole role; // LEAD, MEMBER
}
