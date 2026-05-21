package com.project.hiveSpace.controllers;

import com.project.hiveSpace.dto.TeamMemberRequest;
import com.project.hiveSpace.dto.TeamMemberResponse;
import com.project.hiveSpace.models.TeamMemberRole;
import com.project.hiveSpace.services.TeamMemberService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/teams/{teamId}/members")
@RequiredArgsConstructor
public class TeamMemberController {

    private final TeamMemberService teamMemberService;

    @GetMapping
    public ResponseEntity<List<TeamMemberResponse>> getMembersByTeam(@PathVariable UUID teamId) {
        return ResponseEntity.ok(teamMemberService.getMembersByTeam(teamId));
    }

    @PostMapping
    public ResponseEntity<TeamMemberResponse> addMemberToTeam(
            @PathVariable UUID teamId,
            @Valid @RequestBody TeamMemberRequest request) {
        return ResponseEntity.ok(teamMemberService.addMemberToTeam(teamId, request));
    }

    @PutMapping("/{userId}/role")
    public ResponseEntity<TeamMemberResponse> updateMemberRole(
            @PathVariable UUID teamId,
            @PathVariable UUID userId,
            @RequestParam TeamMemberRole role) {
        return ResponseEntity.ok(teamMemberService.updateMemberRole(teamId, userId, role));
    }

    @DeleteMapping("/{userId}")
    public ResponseEntity<Void> removeMemberFromTeam(
            @PathVariable UUID teamId,
            @PathVariable UUID userId) {
        teamMemberService.removeMemberFromTeam(teamId, userId);
        return ResponseEntity.noContent().build();
    }
}
