package com.project.hiveSpace.controllers;

import com.project.hiveSpace.dto.ProjectRequest;
import com.project.hiveSpace.dto.ProjectResponse;
import com.project.hiveSpace.services.ProjectService;
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
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;

    @PostMapping("/api/workspaces/{workspaceId}/projects")
    @PreAuthorize("@rbac.canCreateProject(#workspaceId)")
    public ResponseEntity<ProjectResponse> createProject(
            @PathVariable UUID workspaceId,
            @Valid @RequestBody ProjectRequest request,
            @AuthenticationPrincipal User creator) {
        return ResponseEntity.ok(projectService.createProject(workspaceId, request, creator));
    }

    @GetMapping("/api/workspaces/{workspaceId}/projects")
    public ResponseEntity<List<ProjectResponse>> getProjectsByWorkspace(
            @PathVariable UUID workspaceId) {
        return ResponseEntity.ok(projectService.getProjectsByWorkspace(workspaceId));
    }

    @PutMapping("/api/projects/{projectId}")
    public ResponseEntity<ProjectResponse> updateProject(
            @PathVariable UUID projectId,
            @Valid @RequestBody ProjectRequest request,
            @AuthenticationPrincipal User actor) {
        return ResponseEntity.ok(projectService.updateProject(projectId, request, actor));
    }
}

