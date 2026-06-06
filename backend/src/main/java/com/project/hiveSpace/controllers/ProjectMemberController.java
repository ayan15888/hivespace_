package com.project.hiveSpace.controllers;

import com.project.hiveSpace.dto.ProjectMemberResponse;
import com.project.hiveSpace.models.ProjectMemberRole;
import com.project.hiveSpace.services.ProjectMemberService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/projects/{projectId}")
@RequiredArgsConstructor
public class ProjectMemberController {

    private final ProjectMemberService projectMemberService;

    @GetMapping("/members")
    public ResponseEntity<List<ProjectMemberResponse>> getMembersByProject(@PathVariable UUID projectId) {
        return ResponseEntity.ok(projectMemberService.getMembersByProject(projectId));
    }

    @PostMapping("/members")
    public ResponseEntity<ProjectMemberResponse> addMemberToProject(
            @PathVariable UUID projectId,
            @RequestParam UUID userId,
            @RequestParam(required = false, defaultValue = "MEMBER") ProjectMemberRole role) {
        return ResponseEntity.ok(projectMemberService.addMemberToProject(projectId, userId, role));
    }

    @PutMapping("/members/{userId}/role")
    public ResponseEntity<ProjectMemberResponse> updateMemberRole(
            @PathVariable UUID projectId,
            @PathVariable UUID userId,
            @RequestParam ProjectMemberRole role) {
        return ResponseEntity.ok(projectMemberService.updateMemberRole(projectId, userId, role));
    }

    @DeleteMapping("/members/{userId}")
    public ResponseEntity<Void> removeMemberFromProject(
            @PathVariable UUID projectId,
            @PathVariable UUID userId) {
        projectMemberService.removeMemberFromProject(projectId, userId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/team-members")
    public ResponseEntity<List<ProjectMemberResponse>> getTeamMembersOfProjectTeams(@PathVariable UUID projectId) {
        return ResponseEntity.ok(projectMemberService.getTeamMembersOfProjectTeams(projectId));
    }
}
