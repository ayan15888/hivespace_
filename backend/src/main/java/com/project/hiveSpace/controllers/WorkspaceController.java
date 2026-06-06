package com.project.hiveSpace.controllers;

import com.project.hiveSpace.dto.WorkspaceMemberResponse;
import com.project.hiveSpace.dto.WorkspaceMemberRequest;
import com.project.hiveSpace.dto.WorkspaceRequest;
import com.project.hiveSpace.dto.WorkspaceResponse;
import com.project.hiveSpace.models.WorkspaceMemberRole;
import com.project.hiveSpace.services.WorkspaceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/workspaces")
@RequiredArgsConstructor
public class WorkspaceController {

    private final WorkspaceService workspaceService;

    @PostMapping
    public ResponseEntity<WorkspaceResponse> createWorkspace(@Valid @RequestBody WorkspaceRequest request) {
        return ResponseEntity.ok(workspaceService.createWorkspace(request));
    }

    @GetMapping("/t/{tenantId}")
    public ResponseEntity<List<WorkspaceResponse>> getWorkspacesByTenant(@PathVariable UUID tenantId) {
        return ResponseEntity.ok(workspaceService.getWorkspacesByTenant(tenantId));
    }

    @GetMapping("/{workspaceId}/members")
    public ResponseEntity<List<WorkspaceMemberResponse>> getWorkspaceMembers(@PathVariable UUID workspaceId) {
        return ResponseEntity.ok(workspaceService.getWorkspaceMembers(workspaceId));
    }

    @PostMapping("/{workspaceId}/members")
    public ResponseEntity<WorkspaceMemberResponse> addWorkspaceMember(
            @PathVariable UUID workspaceId,
            @Valid @RequestBody WorkspaceMemberRequest request) {
        return ResponseEntity.ok(workspaceService.addWorkspaceMember(workspaceId, request));
    }

    @PatchMapping("/{workspaceId}/members/{userId}/role")
    public ResponseEntity<WorkspaceMemberResponse> updateWorkspaceMemberRole(
            @PathVariable UUID workspaceId,
            @PathVariable UUID userId,
            @RequestParam WorkspaceMemberRole role) {
        return ResponseEntity.ok(workspaceService.updateWorkspaceMemberRole(workspaceId, userId, role));
    }

    @DeleteMapping("/{workspaceId}/members/{userId}")
    public ResponseEntity<Void> removeWorkspaceMember(
            @PathVariable UUID workspaceId,
            @PathVariable UUID userId) {
        workspaceService.removeWorkspaceMember(workspaceId, userId);
        return ResponseEntity.noContent().build();
    }
}