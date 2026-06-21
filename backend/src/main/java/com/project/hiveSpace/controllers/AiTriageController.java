package com.project.hiveSpace.controllers;

import com.project.hiveSpace.models.User;
import com.project.hiveSpace.services.AiTriageService;
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
public class AiTriageController {

    private final AiTriageService aiTriageService;

    @GetMapping("/projects/{projectId}/ai/triage")
    @PreAuthorize("@rbac.canViewProject(#projectId)")
    public ResponseEntity<List<AiTriageService.TriageSuggestion>> getTriageSuggestions(
            @PathVariable UUID projectId
    ) {
        return ResponseEntity.ok(aiTriageService.getTriageSuggestions(projectId));
    }

    @PostMapping("/projects/{projectId}/ai/triage/apply")
    @PreAuthorize("@rbac.canViewProject(#projectId)")
    public ResponseEntity<Void> applyTriageSuggestions(
            @PathVariable UUID projectId,
            @RequestBody List<AiTriageService.TriageSuggestion> suggestions,
            @AuthenticationPrincipal User user
    ) {
        aiTriageService.applyTriageSuggestions(projectId, suggestions, user);
        return ResponseEntity.noContent().build();
    }
}
