package com.project.hiveSpace.controllers;

import com.project.hiveSpace.dto.DuplicateCandidate;
import com.project.hiveSpace.services.AiDuplicateDetectorService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class AiDuplicateDetectorController {

    private final AiDuplicateDetectorService aiDuplicateDetectorService;

    public record DuplicateCheckRequest(String title, String description) {}

    @PostMapping("/projects/{projectId}/tasks/detect-duplicates")
    @PreAuthorize("@rbac.canViewProject(#projectId)")
    public ResponseEntity<List<DuplicateCandidate>> detectDuplicates(
            @PathVariable UUID projectId,
            @RequestBody DuplicateCheckRequest request
    ) {
        List<DuplicateCandidate> duplicates = aiDuplicateDetectorService.detectDuplicates(
                projectId,
                request.title(),
                request.description()
        );
        return ResponseEntity.ok(duplicates);
    }
}
