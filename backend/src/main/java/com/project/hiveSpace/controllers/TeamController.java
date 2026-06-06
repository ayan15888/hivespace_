package com.project.hiveSpace.controllers;

import com.project.hiveSpace.dto.TeamRequest;
import com.project.hiveSpace.dto.TeamResponse;
import com.project.hiveSpace.services.TeamService;
import com.project.hiveSpace.models.User;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import org.springframework.security.access.prepost.PreAuthorize;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/workspaces/{workspaceId}/teams")
@RequiredArgsConstructor
public class TeamController {

    private final TeamService teamService;

    @PostMapping
    @PreAuthorize("@rbac.canCreateTeam(#workspaceId)")
    public ResponseEntity<TeamResponse> createTeam(
            @PathVariable UUID workspaceId,
            @Valid @RequestBody TeamRequest request,
            @AuthenticationPrincipal User creator) {
        request.setWorkspaceId(workspaceId);
        return ResponseEntity.ok(teamService.createTeam(request, creator));
    }

    @GetMapping
    public ResponseEntity<List<TeamResponse>> getTeamsByWorkspace(@PathVariable UUID workspaceId) {
        return ResponseEntity.ok(teamService.getTeamsByWorkspace(workspaceId));
    }

    @PutMapping("/{teamId}")
    @PreAuthorize("@rbac.canManageTeamMembers(#teamId)")
    public ResponseEntity<TeamResponse> updateTeam(
            @PathVariable UUID teamId,
            @Valid @RequestBody TeamRequest request) {
        return ResponseEntity.ok(teamService.updateTeam(teamId, request));
    }

    @DeleteMapping("/{teamId}")
    @PreAuthorize("@rbac.canManageTeamMembers(#teamId)")
    public ResponseEntity<Void> deleteTeam(@PathVariable UUID teamId) {
        teamService.deleteTeam(teamId);
        return ResponseEntity.noContent().build();
    }
}
