package com.project.hiveSpace.services;

import com.project.hiveSpace.dto.FusedCandidate;
import com.project.hiveSpace.dto.RAGResponse;
import com.project.hiveSpace.models.Message;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class RAGAnswerService {

    private final NvidiaAIService nvidiaAIService;
    private final ValidationService validationService;

    @Value("${nvidia.model.default}")
    private String defaultChatModel;

    public RAGAnswerService(NvidiaAIService nvidiaAIService, ValidationService validationService) {
        this.nvidiaAIService = nvidiaAIService;
        this.validationService = validationService;
    }

    /**
     * Builds prompt context and requests an answer from the Nvidia LLM model.
     */
    public RAGResponse generateAnswer(String question, List<FusedCandidate> chunks, List<Message> channelMessages) {
        return generateAnswer(question, chunks, channelMessages, defaultChatModel);
    }

    /**
     * Builds prompt context and requests an answer from the specified Nvidia LLM model.
     */
    public RAGResponse generateAnswer(String question, List<FusedCandidate> chunks, List<Message> channelMessages, String modelName) {
        // 1. Format document context (Stage 4)
        StringBuilder docContextBuilder = new StringBuilder();
        docContextBuilder.append("=== DOCUMENT CONTEXT ===\n");
        if (chunks == null || chunks.isEmpty()) {
            docContextBuilder.append("No document context available.\n");
        } else {
            for (FusedCandidate chunk : chunks) {
                docContextBuilder.append(String.format("[Source: %s, ID: %s, chunk %d]\n%s\n\n",
                        chunk.getDocumentTitle(),
                        chunk.getDocumentId(),
                        chunk.getChunkIndex(),
                        chunk.getContent()
                ));
            }
        }

        // 2. Format channel message context (Stage 4)
        StringBuilder chatContextBuilder = new StringBuilder();
        chatContextBuilder.append("=== CONVERSATION CONTEXT (Chat Transcripts & Developer Discussions) ===\n");
        if (channelMessages == null || channelMessages.isEmpty()) {
            chatContextBuilder.append("No conversation context available.\n");
        } else {
            String chatContextStr = channelMessages.stream()
                    .map(msg -> {
                        String senderName = msg.getSender() != null ? msg.getSender().getFullName() : "AI Assistant";
                        return senderName + ": " + msg.getContent();
                    })
                    .collect(Collectors.joining("\n"));
            chatContextBuilder.append(chatContextStr).append("\n");
        }

        // 3. Assemble User Prompt
        String userPrompt = String.format("%s\n%s\nQuestion: %s",
                docContextBuilder.toString(),
                chatContextBuilder.toString(),
                question
        );

        // 4. Define System Prompt (Stage 5)
        String systemPrompt = "You are an AI assistant. Answer the user's question using ONLY the provided Document Context and Conversation Context.\n\n" +
                "Guidelines:\n" +
                "1. Answer using ONLY the provided contexts. If the contexts do not contain the answer, reply exactly with: 'I don't have enough context to answer that.'\n" +
                "2. You MUST check both the 'Document Context' and the 'Conversation Context (Chat Transcripts & Developer Discussions)'. Synthesize and reconcile the formal specifications, rules, or procedures from the documents with any related real-world incidents, discussions, proposed overrides, or final decisions found in the conversation. Ensure your answer incorporates both aspects (e.g. state the rule/procedure, and then explain any related chats). Specifically, if the user asks a hypothetical question about a system failure or outage (e.g. \"What happens if Redis goes down?\"), check the conversation to see if that specific failure or outage has actually occurred in the past, and if so, report the details of that past incident (such as latency spikes, stuck workers, how it was resolved, or future monitoring plans like Prometheus/Grafana).\n" +
                "3. For every rule, constraint, or process you explain, you MUST check the Document Context to identify which technical services (e.g. Invoice Service), database components, or backend code layers (e.g. the API layer) are responsible for implementing or enforcing it, and explicitly state these enforcement layers in your answer.\n" +
                "4. Do not extrapolate, assume, or guess beyond the provided contexts.\n" +
                "5. Cite the source document title when referencing information from the Document Context (e.g. \"[Source: <title>]\").\n" +
                "6. Do NOT append or list a 'Sources' or reference section at the end of your answer. Citations must only be placed inline using \"[Source: <title>]\" style. The system will handle appending the document list automatically.";

        // 5. Call LLM with primary model, falling back to defaultChatModel if it fails
        String answer;
        try {
            answer = nvidiaAIService.chatCompletion(systemPrompt, userPrompt, modelName);
        } catch (Exception e) {
            System.err.println("Primary model " + modelName + " failed. Falling back to default: " + defaultChatModel + ". Error: " + e.getMessage());
            try {
                answer = nvidiaAIService.chatCompletion(systemPrompt, userPrompt, defaultChatModel);
            } catch (Exception ex) {
                answer = "Failed to process RAG answer on fallback: " + ex.getMessage();
            }
        }

        // 6. Content Guardrails & Validation (Stage 6)
        boolean isSafe = validationService.isSafe(answer);
        if (!isSafe) {
            System.err.println("WARNING: Generated AI answer flagged as UNSAFE: " + answer);
            answer = "I'm sorry, but I cannot provide that information as it may violate safety guidelines.";
        }

        return new RAGResponse(answer, chunks);
    }
}
