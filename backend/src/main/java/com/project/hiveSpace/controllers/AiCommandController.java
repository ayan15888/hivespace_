package com.project.hiveSpace.controllers;

import com.project.hiveSpace.dto.AiCommandRequest;
import com.project.hiveSpace.dto.MessageResponse;
import com.project.hiveSpace.exceptions.AiServiceException;
import com.project.hiveSpace.exceptions.ForbiddenException;
import com.project.hiveSpace.exceptions.NotFoundException;
import com.project.hiveSpace.models.Channel;
import com.project.hiveSpace.models.Message;
import com.project.hiveSpace.models.MessageType;
import com.project.hiveSpace.models.User;
import com.project.hiveSpace.repository.ChannelMemberRepository;
import com.project.hiveSpace.repository.ChannelRepository;
import com.project.hiveSpace.repository.MessageRepository;
import com.project.hiveSpace.services.MessageService;
import com.project.hiveSpace.services.MessagingBroadcastService;
import com.project.hiveSpace.services.SlashCommandService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class AiCommandController {

    private final SlashCommandService slashCommandService;
    private final MessageService messageService;
    private final MessageRepository messageRepository;
    private final ChannelRepository channelRepository;
    private final ChannelMemberRepository channelMemberRepository;
    private final MessagingBroadcastService broadcastService;

    @PostMapping("/channels/{channelId}/ai-command")
    public ResponseEntity<?> handleAiCommand(
            @PathVariable UUID channelId,
            @RequestBody AiCommandRequest request,
            @AuthenticationPrincipal User user
    ) {
        // Validate requesting user is a member of the channel
        boolean isMember = channelMemberRepository.existsByIdChannelIdAndIdUserId(channelId, user.getId());
        if (!isMember) {
            throw new ForbiddenException("Access denied: Must be a member of this channel to use AI commands.");
        }

        Channel channel = channelRepository.findById(channelId)
                .orElseThrow(() -> new NotFoundException("Channel not found"));

        try {
            // Call SlashCommandService
            String aiReply = slashCommandService.handleAiCommand(channelId, user.getId(), request.input());

            // Save the AI's response as a new row in the messages table
            Message message = Message.builder()
                    .content(aiReply)
                    .type(MessageType.AI)
                    .channel(channel)
                    .sender(null) // AI system sender
                    .parent(null)
                    .createdAt(Instant.now())
                    .build();

            Message savedMessage = messageRepository.save(message);

            // Broadcast message
            MessageResponse response = messageService.toResponse(savedMessage, user.getId());
            broadcastService.broadcastMessage(channelId, response);

            // TODO: Add per-user rate limiting via Upstash Redis here in the future

            return ResponseEntity.ok(response);

        } catch (AiServiceException e) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("message", "AI is temporarily unavailable, please try again in a moment."));
        }
    }
}
