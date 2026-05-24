package com.project.hiveSpace.controllers;

import com.project.hiveSpace.dto.InviteRequest;
import com.project.hiveSpace.dto.InviteResponse;
import com.project.hiveSpace.dto.JoinRequest;
import com.project.hiveSpace.services.InvitationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/i")
@RequiredArgsConstructor
public class InvitationController {

    private final InvitationService invitationService;

    @PostMapping("/generate")
    public ResponseEntity<InviteResponse> createInvite(@Valid @RequestBody InviteRequest request) {
        return ResponseEntity.ok(invitationService.createInvite(request));
    }

    @GetMapping("/validate")
    public ResponseEntity<InviteResponse> validateInvite(
            @RequestParam String token,
            @RequestParam(required = false) String orgSlug) {
        InviteResponse details = invitationService.getInvite(token);
        if (orgSlug != null && !orgSlug.isBlank() && !details.getTenantSlug().equalsIgnoreCase(orgSlug)) {
            throw new IllegalArgumentException("The invitation token does not match the organization slug");
        }
        return ResponseEntity.ok(details);
    }

    @GetMapping("/{token}")
    public ResponseEntity<InviteResponse> getInvite(@PathVariable String token) {
        return ResponseEntity.ok(invitationService.getInvite(token));
    }

    @GetMapping("/t/{tenantId}")
    public ResponseEntity<java.util.List<InviteResponse>> getInvitationsByTenant(@PathVariable java.util.UUID tenantId) {
        return ResponseEntity.ok(invitationService.getInvitationsByTenant(tenantId));
    }

    @PostMapping("/join")
    public ResponseEntity<Map<String, String>> acceptInvite(
            @Valid @RequestBody JoinRequest request,
            jakarta.servlet.http.HttpServletRequest servletRequest) {
        invitationService.acceptInvite(request, servletRequest);
        return ResponseEntity.ok(Map.of("message", "Successfully joined the team"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> revokeInvite(@PathVariable java.util.UUID id) {
        invitationService.revokeInvite(id);
        return ResponseEntity.noContent().build();
    }
}
