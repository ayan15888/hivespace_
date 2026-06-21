package com.project.hiveSpace.services;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.project.hiveSpace.dto.FusedCandidate;
import com.project.hiveSpace.exceptions.NotFoundException;
import com.project.hiveSpace.models.Channel;
import com.project.hiveSpace.models.ChannelType;
import com.project.hiveSpace.models.Message;
import com.project.hiveSpace.models.Project;
import com.project.hiveSpace.repository.ChannelRepository;
import com.project.hiveSpace.repository.MessageRepository;
import com.project.hiveSpace.repository.ProjectRepository;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AiTaskGeneratorService {

    private final ProjectRepository projectRepository;
    private final ChannelRepository channelRepository;
    private final MessageRepository messageRepository;
    private final HybridSearchService hybridSearchService;
    private final RerankerService rerankerService;
    private final NvidiaAIService nvidiaAIService;

    @Value("${nvidia.model.default}")
    private String defaultChatModel;

    @Data
    public static class GeneratedTaskSuggestion {
        private String title;
        private String description;
        private String priority;
        private Integer points;
    }

    @Transactional(readOnly = true)
    public List<GeneratedTaskSuggestion> generateTasksFromBrief(UUID projectId, String brief) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new NotFoundException("Project not found"));

        if (brief == null || brief.trim().isEmpty()) {
            return Collections.emptyList();
        }

        // 1. Fetch relevant documents using RAG (hybrid search and reranker) based on the brief
        List<FusedCandidate> docs = Collections.emptyList();
        try {
            // Use the first 200 characters of the brief as search query if it's long
            String queryText = brief.length() > 200 ? brief.substring(0, 200) : brief;
            List<FusedCandidate> candidates = hybridSearchService.performHybridSearch(projectId, queryText, 30);
            docs = rerankerService.rerankCandidates(queryText, candidates, 5);
        } catch (Exception e) {
            System.err.println("RAG search failed for brief task generation: " + e.getMessage());
        }

        // 2. Fetch recent public channel chat messages (last 30 messages) for project context
        List<Message> messages = Collections.emptyList();
        try {
            Optional<Channel> projectChannelOpt = channelRepository.findByProjectIdAndType(projectId, ChannelType.PUBLIC);
            if (projectChannelOpt.isPresent()) {
                messages = messageRepository.findPageByChannel(
                        projectChannelOpt.get().getId(),
                        Instant.now(),
                        org.springframework.data.domain.PageRequest.of(0, 30)
                );
            }
        } catch (Exception e) {
            System.err.println("Chat context fetch failed for brief task generation: " + e.getMessage());
        }

        // 3. Format contexts
        StringBuilder contextBuilder = new StringBuilder();
        if (docs != null && !docs.isEmpty()) {
            contextBuilder.append("\n=== RELATED PROJECT DOCUMENTS (RAG) ===\n");
            for (FusedCandidate doc : docs) {
                contextBuilder.append(String.format("[%s]\n%s\n\n", doc.getDocumentTitle(), doc.getContent()));
            }
        }
        if (messages != null && !messages.isEmpty()) {
            contextBuilder.append("\n=== RECENT CHAT DISCUSSIONS ===\n");
            // Reverse list to be chronological
            List<Message> chronoMessages = new ArrayList<>(messages);
            Collections.reverse(chronoMessages);
            for (Message msg : chronoMessages) {
                String sender = msg.getSender() != null ? msg.getSender().getFullName() : "AI Assistant";
                contextBuilder.append(sender).append(": ").append(msg.getContent()).append("\n");
            }
        }

        String systemPrompt = "You are an AI sprint planning assistant for hiveSpace. Your job is to analyze a raw product brief, specifications, or meeting notes, and decompose them into a structured list of discrete, actionable, individual tasks.\n" +
                "You have been provided with Related Project Documents (RAG) and Recent Chat Discussions to provide alignment context on project architecture, code conventions, or developer discussions.\n\n" +
                "GUIDELINES:\n" +
                "1. Each task must have a clear, concise title.\n" +
                "2. The description must list specific technical requirements or checklists for that task derived from the brief, documents, or discussions.\n" +
                "3. Set task priority as one of: URGENT, HIGH, MEDIUM, LOW.\n" +
                "4. Estimate story points (complexity points) between 1 and 8 (default: 1).\n" +
                "5. Do NOT include Markdown block fences (e.g. ```json). Your response must be ONLY a valid raw JSON array containing task objects.\n\n" +
                "JSON FORMAT SPECIFICATION:\n" +
                "[\n" +
                "  {\n" +
                "    \"title\": \"Short, clear title\",\n" +
                "    \"description\": \"Actionable checklist or requirements description\",\n" +
                "    \"priority\": \"HIGH/MEDIUM/LOW/URGENT\",\n" +
                "    \"points\": 3\n" +
                "  }\n" +
                "]";

        String userPrompt = "BRIEF:\n" + brief + "\n" + contextBuilder.toString();

        try {
            String response = nvidiaAIService.chatCompletion(systemPrompt, userPrompt, defaultChatModel, 3000, 0.2);
            response = response.trim();
            
            // Clean markdown code blocks if AI wrapped them
            if (response.startsWith("```")) {
                int firstNewline = response.indexOf('\n');
                if (firstNewline != -1) {
                    response = response.substring(firstNewline).trim();
                }
                if (response.endsWith("```")) {
                    response = response.substring(0, response.length() - 3).trim();
                }
            }

            ObjectMapper mapper = new ObjectMapper();
            return mapper.readValue(response, new TypeReference<List<GeneratedTaskSuggestion>>() {});

        } catch (Exception e) {
            e.printStackTrace();
            return Collections.emptyList();
        }
    }
}
