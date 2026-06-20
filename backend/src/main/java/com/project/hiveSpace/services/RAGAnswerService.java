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

    @Value("${nvidia.model.default}")
    private String defaultChatModel;

    public RAGAnswerService(NvidiaAIService nvidiaAIService) {
        this.nvidiaAIService = nvidiaAIService;
    }

    /**
     * Builds prompt context and requests an answer from the Nvidia LLM model.
     */
    public RAGResponse generateAnswer(String question, List<FusedCandidate> chunks, List<Message> channelMessages) {
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
        chatContextBuilder.append("=== CONVERSATION CONTEXT ===\n");
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
                "2. Do not extrapolate, assume, or guess.\n" +
                "3. Cite the source document title when referencing information from the Document Context (e.g. \"[Source: <title>]\").";

        // 5. Call LLM
        String answer = nvidiaAIService.chatCompletion(systemPrompt, userPrompt, defaultChatModel);

        return new RAGResponse(answer, chunks);
    }
}
