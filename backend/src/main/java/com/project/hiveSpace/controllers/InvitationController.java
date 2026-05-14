package com.project.hiveSpace.controllers;

import com.project.hiveSpace.dto.InviteRequest;
import com.project.hiveSpace.dto.InviteResponse;
import com.project.hiveSpace.dto.JoinRequest;
import com.project.hiveSpace.services.InvitationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/i")
@RequiredArgsConstructor
public class InvitationController {

    private final InvitationService invitationService;

    @PostMapping("/generate")
    public ResponseEntity<InviteResponse> createInvite(@Valid @RequestBody InviteRequest request) {
        return ResponseEntity.ok(invitationService.createInvite(request));
    }

    @PostMapping("/join")
    public ResponseEntity<String> acceptInvite(@Valid @RequestBody JoinRequest request) {
        invitationService.acceptInvite(request);
        return ResponseEntity.ok("Successfully joined the team");
    }
}
