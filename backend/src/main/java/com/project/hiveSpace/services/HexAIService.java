package com.project.hiveSpace.services;

import com.project.hiveSpace.dto.FusedCandidate;
import com.project.hiveSpace.models.*;
import com.project.hiveSpace.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

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
        return "⚙️ **Bulk Task Generation Action Triggered:** I can create tasks in bulk from specification briefs. Use the **AI Import** button next to 'Add Task' on the Kanban Board to paste your brief and bulk-create backlog items.";
    }

    public String handleTriage(String message, Workspace workspace, User user) {
        return "📋 **Triage Backlog Action Triggered:** I have scanned your backlog. You can run Auto-Triage directly via the **Smart Triage** button in the header of your Kanban Board project page to see and apply detailed priority suggestions.";
    }

    public String handleRetro(String message, Workspace workspace, User user) {
        return "📊 **Sprint Retrospective Action Triggered:** I can generate retrospective documents. Click the retro generate button under your project Documents view to select sprint boundaries and automatically compile retrospective documentation.";
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
