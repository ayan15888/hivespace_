package com.project.hiveSpace.services;

import com.project.hiveSpace.dto.FusedCandidate;
import com.project.hiveSpace.models.*;
import com.project.hiveSpace.repository.DocumentContentRepository;
import com.project.hiveSpace.repository.ProjectRepository;
import com.project.hiveSpace.repository.SprintRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;

@Service
@RequiredArgsConstructor
public class HexAIService {

    public enum Intent {
        CONVERSATIONAL,
        RAG_QUERY,
        ACTION_GENERATE_TASKS,
        ACTION_TRIAGE,
        ACTION_RETRO
    }

    private final NvidiaAIService nvidiaAIService;
    private final HybridSearchService hybridSearchService;
    private final RerankerService rerankerService;
    private final ProjectRepository projectRepository;
    private final AiTriageService aiTriageService;
    private final AiRetroService aiRetroService;
    private final SprintRepository sprintRepository;
    private final DocumentContentRepository documentContentRepository;

    @Value("${nvidia.model.default}")
    private String defaultChatModel; // meta/llama-3.3-70b-instruct

    @Value("${nvidia.model.agentic}")
    private String agenticModel; // nvidia/nemotron-3-ultra-550b-a55b

    public String route(String message, List<AiMessage> history, Workspace workspace, User user) {
        Intent intent = classifyIntent(message, history);

        return switch (intent) {
            case CONVERSATIONAL -> 
                handleConversational(message, history, user);
            case ACTION_GENERATE_TASKS -> 
                handleGenerateTasks(message, workspace, user);
            case ACTION_TRIAGE -> 
                handleTriage(message, workspace, user);
            case ACTION_RETRO -> 
                handleRetro(message, workspace, user);
            default -> 
                handleRAGQuery(message, history, workspace, user);
        };
    }

    public Intent classifyIntent(String message, List<AiMessage> history) {
        String lower = message.toLowerCase();

        // Conversational - no workspace data needed
        if (isSmallTalk(lower)) {
            return Intent.CONVERSATIONAL;
        }

        // Action intents - needs to execute something
        if (lower.contains("generate tasks") || lower.contains("create tasks")) {
            return Intent.ACTION_GENERATE_TASKS;
        }
        if (lower.contains("triage") || lower.contains("prioritize backlog")) {
            return Intent.ACTION_TRIAGE;
        }
        if (lower.contains("retro") || lower.contains("retrospective")) {
            return Intent.ACTION_RETRO;
        }

        // Default - search workspace and answer
        return Intent.RAG_QUERY;
    }

    private boolean isSmallTalk(String msg) {
        return msg.matches("^(hi|hello|hey|greetings|howdy|yo|who are you|what is your name|good morning|good afternoon|good evening)(\\s.*|\\?|\\!|$)") ||
               msg.contains("how are you") || msg.contains("tell me a joke") ||
               msg.equals("thanks") || msg.equals("thank you") || msg.contains("help me");
    }

    public String handleConversational(String message, List<AiMessage> history, User user) {
        String systemPrompt = "You are a friendly, helpful workspace assistant named Hex AI. " +
                "You assist developers and project managers on HiveSpace. Keep your tone professional yet warm. " +
                "Respond with clear, conversational, and direct answers. User's name is " + user.getFullName() + ".";

        StringBuilder conversationContext = new StringBuilder();
        for (AiMessage msg : history) {
            String role = msg.getRole().equals("user") ? user.getFullName() : "Hex AI";
            conversationContext.append(role).append(": ").append(msg.getContent()).append("\n");
        }
        conversationContext.append(user.getFullName()).append(": ").append(message).append("\n");

        return nvidiaAIService.chatCompletion(systemPrompt, conversationContext.toString(), defaultChatModel);
    }

    public String handleRAGQuery(String message, List<AiMessage> history, Workspace workspace, User user) {
        try {
            // Find all projects in workspace
            List<Project> projects = projectRepository.findAllByWorkspace(workspace);

            // Fetch Search Candidates from all projects
            List<FusedCandidate> allCandidates = new ArrayList<>();
            for (Project project : projects) {
                List<FusedCandidate> projectCandidates = hybridSearchService.performHybridSearch(project.getId(), message, 20);
                allCandidates.addAll(projectCandidates);
            }

            // Sort & limit search results from all projects
            allCandidates.sort((a, b) -> Double.compare(b.getRrfScore(), a.getRrfScore()));
            if (allCandidates.size() > 50) {
                allCandidates = allCandidates.subList(0, 50);
            }

            // Rerank top candidates
            List<FusedCandidate> topKCandidates = rerankerService.rerankCandidates(message, allCandidates, 10);

            // Build Context
            StringBuilder docContextBuilder = new StringBuilder();
            docContextBuilder.append("=== DOCUMENT CONTEXT ===\n");
            if (topKCandidates.isEmpty()) {
                docContextBuilder.append("No document context available.\n");
            } else {
                for (FusedCandidate chunk : topKCandidates) {
                    docContextBuilder.append(String.format("[Source: %s, ID: %s, chunk %d]\n%s\n\n",
                            chunk.getDocumentTitle(),
                            chunk.getDocumentId(),
                            chunk.getChunkIndex(),
                            chunk.getContent()
                    ));
                }
            }

            StringBuilder chatContextBuilder = new StringBuilder();
            chatContextBuilder.append("=== CONVERSATION CONTEXT ===\n");
            for (AiMessage msg : history) {
                String role = msg.getRole().equals("user") ? user.getFullName() : "Hex AI";
                chatContextBuilder.append(role).append(": ").append(msg.getContent()).append("\n");
            }

            String userPrompt = String.format("%s\n%s\nQuestion: %s",
                    docContextBuilder.toString(),
                    chatContextBuilder.toString(),
                    message
            );

            // System prompt built for conversation, not channel commands
            String systemPrompt = "You are Hex AI, the intelligent assistant for this HiveSpace workspace. " +
                    "You have access to tasks, documents, channels, and team activity across all projects. Answer naturally and conversationally. " +
                    "Use the provided context to give accurate, specific answers. If context is sparse, answer from general knowledge and say so. Never refuse to engage. " +
                    "Cite relevant tasks or documents inline when helpful using [Title](url) format.";

            String answer = nvidiaAIService.chatCompletion(systemPrompt, userPrompt, agenticModel);

            // Append citations
            String citationSection = formatCitations(topKCandidates);
            return answer + citationSection;

        } catch (Exception e) {
            e.printStackTrace();
            return "Failed to process RAG answer: " + e.getMessage();
        }
    }

    public String handleGenerateTasks(String message, Workspace workspace, User user) {
        return "I can generate tasks for you, but I need to know which project to add them to. Could you please tell me which project this is for?";
    }

    public String handleTriage(String message, Workspace workspace, User user) {
        try {
            List<Project> projects = projectRepository.findAllByWorkspace(workspace);
            if (projects.isEmpty()) {
                return "I couldn't find any projects in this workspace to triage.";
            }

            StringBuilder summary = new StringBuilder();
            summary.append("🔍 **Smart Triage Analysis Across All Projects**\n\n");

            boolean foundAny = false;
            for (Project project : projects) {
                List<AiTriageService.TriageSuggestion> suggestions = aiTriageService.getTriageSuggestions(project.getId());
                if (suggestions != null && !suggestions.isEmpty()) {
                    foundAny = true;
                    summary.append(String.format("### 📁 Project: %s\n", project.getName()));
                    for (AiTriageService.TriageSuggestion suggestion : suggestions) {
                        summary.append(String.format("- **Task:** %s (%s)\n", suggestion.getTitle(), suggestion.getTaskIdentifier()));
                        
                        if (!suggestion.getCurrentPriority().equalsIgnoreCase(suggestion.getSuggestedPriority())) {
                            summary.append(String.format("  - *Priority:* %s ➔ **%s**\n", suggestion.getCurrentPriority(), suggestion.getSuggestedPriority()));
                        }
                        if (!suggestion.getCurrentStatus().equalsIgnoreCase(suggestion.getSuggestedStatus())) {
                            summary.append(String.format("  - *Status:* %s ➔ **%s**\n", suggestion.getCurrentStatus(), suggestion.getSuggestedStatus()));
                        }
                        summary.append(String.format("  - *Reason:* %s\n\n", suggestion.getReason()));
                    }
                }
            }

            if (!foundAny) {
                return "I ran the Smart Triage analysis across all projects in your workspace but found no tasks that currently require adjustments.";
            }

            return summary.toString();

        } catch (Exception e) {
            e.printStackTrace();
            return "Failed to complete smart triage: " + e.getMessage();
        }
    }

    public String handleRetro(String message, Workspace workspace, User user) {
        try {
            List<Project> projects = projectRepository.findAllByWorkspace(workspace);
            if (projects.isEmpty()) {
                return "I couldn't find any projects in this workspace to generate a sprint retrospective for.";
            }

            Project project = projects.get(0);
            List<Sprint> sprints = sprintRepository.findAllByProjectIdOrderByCreatedAtDesc(project.getId());

            UUID docId;
            if (!sprints.isEmpty()) {
                Sprint latestSprint = sprints.get(0);
                docId = aiRetroService.generateSprintRetrospective(project.getId(), latestSprint.getId(), user);
            } else {
                // Fallback: 14-day retrospective
                Instant startDate = Instant.now().minus(java.time.Duration.ofDays(14));
                Instant endDate = Instant.now();
                docId = aiRetroService.generateSprintRetrospective(project.getId(), startDate, endDate, user);
            }

            DocumentContent content = documentContentRepository.findById(docId).orElse(null);
            String textContent = content != null ? content.getTextContent() : "Sprint retrospective document generated successfully.";

            return textContent + "\n\n📄 **Saved Document Link:** [View Retrospective Document](/dashboard/docs/" + docId + ")";

        } catch (Exception e) {
            e.printStackTrace();
            return "Failed to compile sprint retrospective: " + e.getMessage();
        }
    }

    private String formatCitations(List<FusedCandidate> citations) {
        if (citations == null || citations.isEmpty()) {
            return "";
        }
        StringBuilder sb = new StringBuilder();
        sb.append("\n\n**Sources:**\n");
        Set<UUID> seenDocIds = new HashSet<>();
        for (FusedCandidate citation : citations) {
            if (citation.getDocumentId() != null && seenDocIds.add(citation.getDocumentId())) {
                sb.append(String.format("- [%s](/dashboard/docs/%s)\n",
                        citation.getDocumentTitle(),
                        citation.getDocumentId()
                ));
            }
        }
        return sb.toString();
    }
}
