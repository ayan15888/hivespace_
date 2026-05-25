package com.project.hiveSpace.controllers;

import com.project.hiveSpace.dto.ShareableLinkResponse;
import com.project.hiveSpace.dto.SharedProjectResponse;
import com.project.hiveSpace.models.User;
import com.project.hiveSpace.services.ShareableLinkService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class ShareableLinkController {

    private final ShareableLinkService shareableLinkService;

    @PostMapping("/api/projects/{id}/share")
    public ResponseEntity<ShareableLinkResponse> generateShareLink(
            @PathVariable UUID id,
            @AuthenticationPrincipal User actor) {
        return ResponseEntity.ok(shareableLinkService.generateShareLink(id, actor));
    }

    @GetMapping("/api/share/{token}")
    public ResponseEntity<SharedProjectResponse> getPublicProjectData(@PathVariable String token) {
        return ResponseEntity.ok(shareableLinkService.getPublicProjectData(token));
    }

    @PatchMapping("/api/share/{id}/revoke")
    public ResponseEntity<Void> revokeShareLink(
            @PathVariable UUID id,
            @AuthenticationPrincipal User actor) {
        shareableLinkService.revokeShareLink(id, actor);
        return ResponseEntity.noContent().build();
    }
}
