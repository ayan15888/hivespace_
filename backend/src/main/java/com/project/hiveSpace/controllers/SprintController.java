package com.project.hiveSpace.controllers;

import com.project.hiveSpace.dto.SprintRequest;
import com.project.hiveSpace.dto.SprintResponse;
import com.project.hiveSpace.models.User;
import com.project.hiveSpace.services.SprintService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class SprintController {

    private final SprintService sprintService;

    @PostMapping("/projects/{projectId}/sprints")
    @PreAuthorize("@rbac.canViewProject(#projectId)")
    public ResponseEntity<SprintResponse> createSprint(
            @PathVariable UUID projectId,
            @RequestBody SprintRequest request,
            @AuthenticationPrincipal User creator
    ) {
        return ResponseEntity.ok(sprintService.createSprint(projectId, request, creator));
    }

    @GetMapping("/projects/{projectId}/sprints")
    @PreAuthorize("@rbac.canViewProject(#projectId)")
    public ResponseEntity<List<SprintResponse>> getSprintsForProject(
            @PathVariable UUID projectId
    ) {
        return ResponseEntity.ok(sprintService.getSprintsForProject(projectId));
    }

    @PatchMapping("/sprints/{sprintId}/start")
    @PreAuthorize("@rbac.canEditSprint(#sprintId)")
    public ResponseEntity<SprintResponse> startSprint(
            @PathVariable UUID sprintId
    ) {
        return ResponseEntity.ok(sprintService.startSprint(sprintId));
    }

    @PatchMapping("/sprints/{sprintId}/complete")
    @PreAuthorize("@rbac.canEditSprint(#sprintId)")
    public ResponseEntity<SprintResponse> completeSprint(
            @PathVariable UUID sprintId,
            @RequestParam(required = false) UUID targetSprintId
    ) {
        return ResponseEntity.ok(sprintService.completeSprint(sprintId, targetSprintId));
    }


    @PatchMapping("/tasks/{taskId}/sprint")
    public ResponseEntity<Void> associateTaskWithSprint(
            @PathVariable UUID taskId,
            @RequestParam(required = false) UUID sprintId
    ) {
        sprintService.associateTaskWithSprint(taskId, sprintId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/sprints/{sprintId}/burndown")
    public ResponseEntity<List<SprintService.BurndownPoint>> getBurndownData(
            @PathVariable UUID sprintId
    ) {
        return ResponseEntity.ok(sprintService.getBurndownData(sprintId));
    }
}
