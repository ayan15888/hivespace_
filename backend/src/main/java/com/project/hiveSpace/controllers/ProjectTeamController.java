package com.project.hiveSpace.controllers;

import com.project.hiveSpace.dto.AssignTeamRequest;
import com.project.hiveSpace.dto.ProjectResponse;
import com.project.hiveSpace.models.User;
import com.project.hiveSpace.services.ProjectService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/projects/{projectId}/teams")
@RequiredArgsConstructor
public class ProjectTeamController {

    private final ProjectService projectService;

    @PostMapping
    public ResponseEntity<ProjectResponse> assignTeam(
            @PathVariable UUID projectId,
            @Valid @RequestBody AssignTeamRequest request,
            @AuthenticationPrincipal User actor) {
        return ResponseEntity.ok(projectService.assignTeam(projectId, request.getTeamId(), actor));
    }
}
