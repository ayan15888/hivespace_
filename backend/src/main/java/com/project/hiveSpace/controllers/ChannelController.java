package com.project.hiveSpace.controllers;

import com.project.hiveSpace.dto.ChannelResponse;
import com.project.hiveSpace.dto.CreateChannelRequest;
import com.project.hiveSpace.dto.OpenDmRequest;
import com.project.hiveSpace.models.User;
import com.project.hiveSpace.services.ChannelService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ChannelController {

    private final ChannelService channelService;

    @PostMapping("/channels")
    public ResponseEntity<ChannelResponse> createChannel(
            @RequestBody CreateChannelRequest req,
            @AuthenticationPrincipal User user
    ) {
        ChannelResponse response = channelService.createChannel(req, user.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/workspaces/{workspaceId}/channels")
    public ResponseEntity<List<ChannelResponse>> getChannels(
            @PathVariable UUID workspaceId,
            @AuthenticationPrincipal User user
    ) {
        List<ChannelResponse> response = channelService.getChannelsForUser(workspaceId, user.getId());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/channels/dm")
    public ResponseEntity<ChannelResponse> openDm(
            @RequestBody OpenDmRequest req,
            @AuthenticationPrincipal User user
    ) {
        ChannelResponse response = channelService.openDm(req, user.getId());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/channels/{channelId}/read")
    public ResponseEntity<Void> markRead(
            @PathVariable UUID channelId,
            @AuthenticationPrincipal User user
    ) {
        channelService.markRead(channelId, user.getId());
        return ResponseEntity.ok().build();
    }

    @GetMapping("/channels/{channelId}/members")
    public ResponseEntity<List<com.project.hiveSpace.dto.ChannelMemberResponse>> getChannelMembers(
            @PathVariable UUID channelId,
            @AuthenticationPrincipal User user
    ) {
        List<com.project.hiveSpace.dto.ChannelMemberResponse> members = channelService.getChannelMembers(channelId, user.getId());
        return ResponseEntity.ok(members);
    }

    @PostMapping("/projects/{projectId}/ensure-channel")
    public ResponseEntity<ChannelResponse> ensureProjectChannel(
            @PathVariable UUID projectId,
            @AuthenticationPrincipal User user
    ) {
        ChannelResponse response = channelService.ensureProjectChannel(projectId, user.getId());
        return ResponseEntity.ok(response);
    }
}
