package com.project.hiveSpace.controllers;

import com.project.hiveSpace.dto.ProjectRequest;
import com.project.hiveSpace.dto.ProjectResponse;
import com.project.hiveSpace.services.ProjectService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/workspaces/{workspaceId}/projects")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;

    @PostMapping
    public ResponseEntity<ProjectResponse> createProject(
            @PathVariable UUID workspaceId,
            @Valid @RequestBody ProjectRequest request) {
        return ResponseEntity.ok(projectService.createProject(workspaceId, request));
    }

    @GetMapping
    public ResponseEntity<List<ProjectResponse>> getProjectsByWorkspace(
            @PathVariable UUID workspaceId) {
        return ResponseEntity.ok(projectService.getProjectsByWorkspace(workspaceId));
    }
}
