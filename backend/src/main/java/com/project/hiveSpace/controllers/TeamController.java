package com.project.hiveSpace.controllers;

import com.project.hiveSpace.dto.TeamRequest;
import com.project.hiveSpace.dto.TeamResponse;
import com.project.hiveSpace.services.TeamService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/p/{projectId}/teams")
@RequiredArgsConstructor
public class TeamController {

    private final TeamService teamService;

    @PostMapping
    public ResponseEntity<TeamResponse> createTeam(
            @PathVariable UUID projectId,
            @Valid @RequestBody TeamRequest request) {
        request.setProjectId(projectId);
        return ResponseEntity.ok(teamService.createTeam(request));
    }

    @GetMapping
    public ResponseEntity<List<TeamResponse>> getTeamsByProject(@PathVariable UUID projectId) {
        return ResponseEntity.ok(teamService.getTeamsByProject(projectId));
    }
}
