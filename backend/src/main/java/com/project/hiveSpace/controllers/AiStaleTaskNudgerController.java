package com.project.hiveSpace.controllers;

import com.project.hiveSpace.models.User;
import com.project.hiveSpace.services.AiStaleTaskNudgerService;
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
public class AiStaleTaskNudgerController {

    private final AiStaleTaskNudgerService aiStaleTaskNudgerService;

    @GetMapping("/projects/{projectId}/ai/stale-tasks")
    @PreAuthorize("@rbac.canViewProject(#projectId)")
    public ResponseEntity<List<AiStaleTaskNudgerService.StaleTaskInfo>> getStaleTasks(
            @PathVariable UUID projectId
    ) {
        return ResponseEntity.ok(aiStaleTaskNudgerService.getStaleTasks(projectId));
    }

    @PostMapping("/tasks/{taskId}/ai/nudge")
    @PreAuthorize("@rbac.canEditTask(#taskId)")
    public ResponseEntity<Void> nudgeTask(
            @PathVariable UUID taskId,
            @AuthenticationPrincipal User user
    ) {
        aiStaleTaskNudgerService.nudgeTask(taskId, user);
        return ResponseEntity.noContent().build();
    }
}
