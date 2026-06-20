package com.project.hiveSpace.controllers;

import com.project.hiveSpace.dto.EditMessageRequest;
import com.project.hiveSpace.dto.MessageResponse;
import com.project.hiveSpace.dto.SendMessageRequest;
import com.project.hiveSpace.models.User;
import com.project.hiveSpace.services.MessageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/channels/{channelId}/messages")
@RequiredArgsConstructor
public class MessageController {

    private final MessageService messageService;

    @GetMapping
    public ResponseEntity<List<MessageResponse>> getMessages(
            @PathVariable UUID channelId,
            @RequestParam(required = false) UUID before,   // cursor — null means latest
            @AuthenticationPrincipal User user
    ) {
        List<MessageResponse> response = messageService.getMessages(channelId, before, user.getId());
        return ResponseEntity.ok(response);
    }

    @PostMapping
    public ResponseEntity<MessageResponse> sendMessage(
            @PathVariable UUID channelId,
            @RequestBody SendMessageRequest req,
            @AuthenticationPrincipal User user
    ) {
        MessageResponse response = messageService.sendMessage(channelId, req, user.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PatchMapping("/{messageId}")
    public ResponseEntity<MessageResponse> editMessage(
            @PathVariable UUID channelId,
            @PathVariable UUID messageId,
            @RequestBody EditMessageRequest req,
            @AuthenticationPrincipal User user
    ) {
        MessageResponse response = messageService.editMessage(messageId, req, user.getId());
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{messageId}")
    public ResponseEntity<Void> deleteMessage(
            @PathVariable UUID channelId,
            @PathVariable UUID messageId,
            @AuthenticationPrincipal User user
    ) {
        messageService.deleteMessage(messageId, user.getId());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{messageId}/thread")
    public ResponseEntity<List<MessageResponse>> getThread(
            @PathVariable UUID channelId,
            @PathVariable UUID messageId,
            @AuthenticationPrincipal User user
    ) {
        List<MessageResponse> response = messageService.getThreadReplies(messageId, user.getId());
        return ResponseEntity.ok(response);
    }
}
