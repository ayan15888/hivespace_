package com.project.hiveSpace.controllers;

import com.project.hiveSpace.services.AiTaskGeneratorService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class AiTaskGeneratorController {

    private final AiTaskGeneratorService aiTaskGeneratorService;

    @PostMapping("/projects/{projectId}/ai/generate-tasks")
    @PreAuthorize("@rbac.canViewProject(#projectId)")
    public ResponseEntity<List<AiTaskGeneratorService.GeneratedTaskSuggestion>> generateTasksFromBrief(
            @PathVariable UUID projectId,
            @RequestBody Map<String, String> body
    ) {
        String brief = body.get("brief");
        if (brief == null || brief.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        List<AiTaskGeneratorService.GeneratedTaskSuggestion> suggestions = 
                aiTaskGeneratorService.generateTasksFromBrief(projectId, brief);
        return ResponseEntity.ok(suggestions);
    }
}
