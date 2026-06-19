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

import com.project.hiveSpace.services.NvidiaAIService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import reactor.core.publisher.Flux;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.transaction.annotation.Transactional;

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
    private final NvidiaAIService nvidiaAIService;

    @Value("${nvidia.model.default}")
    private String defaultChatModel;

    @Value("${nvidia.model.fast:meta/llama-3.1-8b-instruct}")
    private String fastChatModel;

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

            String cleanedInput = request.input().trim().toLowerCase();
            if (cleanedInput.startsWith("/ai ")) {
                cleanedInput = cleanedInput.substring(4).trim();
            }
            boolean isDraft = cleanedInput.startsWith("draft ");

            if (isDraft) {
                return ResponseEntity.ok(Map.of(
                        "isDraft", true,
                        "draftContent", aiReply
                ));
            }

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
                    .body(Map.of("message", "AI is temporarily unavailable, please try again in a moment. Details: " + e.getMessage()));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Internal error: " + e.getClass().getName() + " - " + e.getMessage()));
        }
    }

    @Transactional(readOnly = true)
    @GetMapping(value = "/channels/{channelId}/summarize-unread", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<String> summarizeUnread(
            @PathVariable UUID channelId,
            @RequestParam(name = "count", defaultValue = "0") int count,
            @AuthenticationPrincipal User user
    ) {
        // Validate requesting user is a member of the channel
        boolean isMember = channelMemberRepository.existsByIdChannelIdAndIdUserId(channelId, user.getId());
        if (!isMember) {
            return Flux.error(new ForbiddenException("Access denied: Must be a member of this channel to use AI commands."));
        }

        if (count <= 0) {
            return Flux.just("No unread messages to summarize.");
        }

        // Fetch unread messages
        List<Message> dbMessages = messageRepository.findPageByChannel(
                channelId,
                Instant.now(),
                org.springframework.data.domain.PageRequest.of(0, Math.min(count, 50))
        );

        if (dbMessages.isEmpty()) {
            return Flux.just("There are no messages in this channel to summarize.");
        }

        // Reverse to chronological order
        List<Message> messages = new java.util.ArrayList<>(dbMessages);
        java.util.Collections.reverse(messages);

        String context = messages.stream()
                .map(msg -> {
                    String senderName = msg.getSender() != null ? msg.getSender().getFullName() : "AI Assistant";
                    return senderName + ": " + msg.getContent();
                })
                .collect(java.util.stream.Collectors.joining("\n"));

        String systemPrompt = "You are an AI assistant helping a user catch up on their unread chat messages. " +
                "Summarize the following unread message log in a very concise, structured, bulleted format. " +
                "Focus on what the user missed and any critical action items. Limit the summary to 2-3 sentences/bullets.";

        return nvidiaAIService.streamChatCompletion(systemPrompt, context, defaultChatModel)
                .map(token -> {
                    try {
                        return new com.fasterxml.jackson.databind.ObjectMapper()
                                .writeValueAsString(java.util.Map.of("text", token));
                    } catch (Exception e) {
                        return "{\"text\":\"" + token.replace("\"", "\\\"") + "\"}";
                    }
                });
    }

    @Transactional(readOnly = true)
    @GetMapping("/channels/{channelId}/suggested-replies")
    public ResponseEntity<List<String>> getSuggestedReplies(
            @PathVariable UUID channelId,
            @AuthenticationPrincipal User user
    ) {
        // Validate requesting user is a member of the channel
        boolean isMember = channelMemberRepository.existsByIdChannelIdAndIdUserId(channelId, user.getId());
        if (!isMember) {
            throw new ForbiddenException("Access denied: Must be a member of this channel to get suggested replies.");
        }

        // Fetch last 5 messages
        List<Message> dbMessages = messageRepository.findPageByChannel(
                channelId,
                Instant.now(),
                org.springframework.data.domain.PageRequest.of(0, 5)
        );

        if (dbMessages.isEmpty()) {
            return ResponseEntity.ok(List.of("Hello!", "Hey there!", "Hi!"));
        }

        // Reverse to chronological order
        List<Message> messages = new java.util.ArrayList<>(dbMessages);
        java.util.Collections.reverse(messages);

        String context = messages.stream()
                .map(msg -> {
                    String senderName = msg.getSender() != null ? msg.getSender().getFullName() : "AI Assistant";
                    return senderName + ": " + msg.getContent();
                })
                .collect(java.util.stream.Collectors.joining("\n"));

        String systemPrompt = "You are an AI assistant helping a user write quick replies in a chat application. " +
                "Based on the last few messages in the conversation, generate exactly 2 or 3 short, context-appropriate, natural suggestions for replies that the user can click to send. " +
                "The suggestions should be brief (1-5 words each) and reflect a casual, natural workplace chat tone. " +
                "Respond ONLY with a JSON array of strings, e.g. [\"Sure!\", \"Will do.\", \"Let's do it.\"]. " +
                "Do not include markdown code block formatting (like ```json). Respond with the raw JSON array string only.";

        try {
            String rawResponse = nvidiaAIService.chatCompletion(systemPrompt, context, fastChatModel).trim();
            // Clean markdown block wrapping if present
            if (rawResponse.startsWith("```")) {
                int firstLineEnd = rawResponse.indexOf('\n');
                if (firstLineEnd != -1) {
                    rawResponse = rawResponse.substring(firstLineEnd).trim();
                }
                if (rawResponse.endsWith("```")) {
                    rawResponse = rawResponse.substring(0, rawResponse.length() - 3).trim();
                }
            }
            // Parse
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            List<String> suggestions = mapper.readValue(rawResponse, new com.fasterxml.jackson.core.type.TypeReference<List<String>>() {});
            if (suggestions != null && !suggestions.isEmpty()) {
                return ResponseEntity.ok(suggestions);
            }
        } catch (Exception e) {
            System.err.println("Failed to parse suggested replies: " + e.getMessage());
        }

        return ResponseEntity.ok(List.of("Got it, thanks!", "I'll take a look.", "Sure thing!"));
    }
}
