package com.project.hiveSpace.controllers;

import com.project.hiveSpace.models.User;
import com.project.hiveSpace.services.AiRetroService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class AiRetroController {

    private final AiRetroService aiRetroService;

    @PostMapping("/projects/{projectId}/ai/retro")
    @PreAuthorize("@rbac.canViewProject(#projectId)")
    public ResponseEntity<Map<String, String>> generateSprintRetro(
            @PathVariable UUID projectId,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal User user
    ) {
        String startDateStr = body.get("startDate");
        String endDateStr = body.get("endDate");
        String sprintIdStr = body.get("sprintId");

        UUID docId;
        if (sprintIdStr != null && !sprintIdStr.isBlank()) {
            UUID sprintId = UUID.fromString(sprintIdStr);
            docId = aiRetroService.generateSprintRetrospective(projectId, sprintId, user);
        } else {
            if (startDateStr == null || endDateStr == null) {
                return ResponseEntity.badRequest().body(Map.of("message", "startDate and endDate are required if sprintId is not provided."));
            }
            Instant startDate = Instant.parse(startDateStr);
            Instant endDate = Instant.parse(endDateStr);
            docId = aiRetroService.generateSprintRetrospective(projectId, startDate, endDate, user);
        }
        
        return ResponseEntity.ok(Map.of("documentId", docId.toString()));
    }
}
