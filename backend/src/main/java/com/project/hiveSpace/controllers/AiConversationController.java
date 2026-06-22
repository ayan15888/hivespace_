package com.project.hiveSpace.controllers;

import com.project.hiveSpace.dto.FusedCandidate;
import com.project.hiveSpace.dto.RAGResponse;
import com.project.hiveSpace.models.*;
import com.project.hiveSpace.repository.*;
import com.project.hiveSpace.services.HexAIService;
import com.project.hiveSpace.services.HybridSearchService;
import com.project.hiveSpace.services.RAGAnswerService;
import com.project.hiveSpace.services.RerankerService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/ai/conversations")
@RequiredArgsConstructor
public class AiConversationController {

    private final AiConversationRepository aiConversationRepository;
    private final AiMessageRepository aiMessageRepository;
    private final WorkspaceRepository workspaceRepository;
    private final ProjectRepository projectRepository;
    private final HybridSearchService hybridSearchService;
    private final RerankerService rerankerService;
    private final RAGAnswerService ragAnswerService;
    private final HexAIService hexAIService;

    public record StartConversationRequest(UUID workspaceId, String content) {}
    public record SendMessageRequest(String content) {}

    public record ConversationResponse(
            UUID id,
            String title,
            Instant createdAt,
            Instant updatedAt
    ) {}

    public record MessageResponse(
            UUID id,
            String role,
            String content,
            Instant createdAt
    ) {}

    @GetMapping
    public ResponseEntity<List<ConversationResponse>> listConversations(
            @RequestParam UUID workspaceId,
            @AuthenticationPrincipal User user
    ) {
        List<AiConversation> conversations = aiConversationRepository
                .findByWorkspaceIdAndUserIdOrderByUpdatedAtDesc(workspaceId, user.getId());

        List<ConversationResponse> response = conversations.stream()
                .map(c -> new ConversationResponse(c.getId(), c.getTitle(), c.getCreatedAt(), c.getUpdatedAt()))
                .collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}/messages")
    public ResponseEntity<List<MessageResponse>> getMessages(
            @PathVariable UUID id,
            @AuthenticationPrincipal User user
    ) {
        AiConversation conversation = aiConversationRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Conversation not found"));

        if (!conversation.getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        List<AiMessage> messages = aiMessageRepository.findByConversationIdOrderByCreatedAtAsc(id);
        List<MessageResponse> response = messages.stream()
                .map(m -> new MessageResponse(m.getId(), m.getRole(), m.getContent(), m.getCreatedAt()))
                .collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    @PostMapping
    public ResponseEntity<?> startConversation(
            @RequestBody StartConversationRequest request,
            @AuthenticationPrincipal User user
    ) {
        Workspace workspace = workspaceRepository.findById(request.workspaceId())
                .orElseThrow(() -> new NoSuchElementException("Workspace not found"));

        // Create Title: first 6 words of user message
        String title = generateTitle(request.content());

        AiConversation conversation = AiConversation.builder()
                .workspace(workspace)
                .user(user)
                .title(title)
                .build();

        AiConversation savedConversation = aiConversationRepository.save(conversation);

        // Save User Message
        AiMessage userMessage = AiMessage.builder()
                .conversation(savedConversation)
                .role("user")
                .content(request.content())
                .build();
        aiMessageRepository.save(userMessage);

        // Generate AI Answer via HexAIService routing
        String answer = hexAIService.route(request.content(), List.of(userMessage), workspace, user);

        // Save Assistant Message
        AiMessage assistantMessage = AiMessage.builder()
                .conversation(savedConversation)
                .role("assistant")
                .content(answer)
                .build();
        aiMessageRepository.save(assistantMessage);

        return ResponseEntity.ok(Map.of(
                "conversationId", savedConversation.getId(),
                "title", savedConversation.getTitle(),
                "assistantResponse", answer
        ));
    }

    @PostMapping("/{id}/messages")
    public ResponseEntity<?> sendMessage(
            @PathVariable UUID id,
            @RequestBody SendMessageRequest request,
            @AuthenticationPrincipal User user
    ) {
        AiConversation conversation = aiConversationRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Conversation not found"));

        if (!conversation.getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        // Save User Message
        AiMessage userMessage = AiMessage.builder()
                .conversation(conversation)
                .role("user")
                .content(request.content())
                .build();
        aiMessageRepository.save(userMessage);

        // Get past chat history to pass to RAG context
        List<AiMessage> history = aiMessageRepository.findByConversationIdOrderByCreatedAtAsc(id);

        // Generate AI Answer via HexAIService routing
        String answer = hexAIService.route(request.content(), history, conversation.getWorkspace(), user);

        // Save Assistant Message
        AiMessage assistantMessage = AiMessage.builder()
                .conversation(conversation)
                .role("assistant")
                .content(answer)
                .build();
        aiMessageRepository.save(assistantMessage);

        // Update Conversation Timestamp
        conversation.setUpdatedAt(Instant.now());
        aiConversationRepository.save(conversation);

        return ResponseEntity.ok(Map.of(
                "assistantResponse", answer
        ));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteConversation(
            @PathVariable UUID id,
            @AuthenticationPrincipal User user
    ) {
        AiConversation conversation = aiConversationRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Conversation not found"));

        if (!conversation.getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        aiConversationRepository.delete(conversation);
        return ResponseEntity.noContent().build();
    }

    private String generateTitle(String content) {
        if (content == null || content.isBlank()) {
            return "New Chat";
        }
        String[] words = content.trim().split("\\s+");
        if (words.length <= 6) {
            return content.trim();
        }
        return Arrays.stream(words).limit(6).collect(Collectors.joining(" ")) + "...";
    }
}
