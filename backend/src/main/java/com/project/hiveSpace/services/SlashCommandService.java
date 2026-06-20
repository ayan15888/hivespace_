package com.project.hiveSpace.services;

import com.project.hiveSpace.dto.ChannelMemberResponse;
import com.project.hiveSpace.dto.FusedCandidate;
import com.project.hiveSpace.dto.RAGResponse;
import com.project.hiveSpace.models.Message;
import com.project.hiveSpace.models.Channel;
import com.project.hiveSpace.repository.MessageRepository;
import com.project.hiveSpace.repository.ChannelRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SlashCommandService {

    private final NvidiaAIService nvidiaAIService;
    private final MessageRepository messageRepository;
    private final ChannelService channelService;
    private final ChannelRepository channelRepository;
    private final HybridSearchService hybridSearchService;
    private final RerankerService rerankerService;
    private final RAGAnswerService ragAnswerService;

    @Value("${nvidia.model.default}")
    private String defaultChatModel;

    public String handleAiCommand(UUID channelId, UUID requestingUserId, String userInput) {
        if (userInput == null || userInput.trim().isEmpty()) {
            return getHelpMessage();
        }

        String input = userInput.trim();
        if (input.toLowerCase().startsWith("/ai ")) {
            input = input.substring(4).trim();
        }

        if (input.equalsIgnoreCase("summarize") || input.equalsIgnoreCase("summarize this channel")) {
            return handleSummarize(channelId);
        } else if (input.toLowerCase().startsWith("summarize from ")) {
            return handleSummarizeBetween(channelId, input);
        } else if (input.toLowerCase().startsWith("ask ")) {
            String question = input.substring(4).trim();
            return handleAsk(channelId, question);
        } else if (input.toLowerCase().startsWith("draft a reply to ")) {
            String person = input.substring(17).trim();
            return handleDraftReply(channelId, requestingUserId, person);
        }

        return getHelpMessage();
    }

    private String handleSummarize(UUID channelId) {
        // Fetch last 50 messages
        List<Message> dbMessages = messageRepository.findPageByChannel(
                channelId,
                Instant.now(),
                PageRequest.of(0, 50)
        );

        if (dbMessages.isEmpty()) {
            return "There are no messages in this channel to summarize.";
        }

        // Create a mutable copy to reverse
        List<Message> messages = new ArrayList<>(dbMessages);
        Collections.reverse(messages);

        String context = formatContext(messages);

        String systemPrompt = "You are an AI assistant helping a team summarize their chat channel history. " +
                "Read the following message history and write a concise, clear summary highlighting the key topics discussed, decisions made, and action items. " +
                "Keep the summary structured and easy to read.";

        return nvidiaAIService.chatCompletion(systemPrompt, context, defaultChatModel);
    }

    private String handleAsk(UUID channelId, String question) {
        // Fetch last 50 messages to expand chat history context
        List<Message> dbMessages = messageRepository.findPageByChannel(
                channelId,
                Instant.now(),
                PageRequest.of(0, 50)
        );

        List<Message> messages = new ArrayList<>(dbMessages);
        Collections.reverse(messages);

        // Fetch channel to see if it is linked to a project
        Channel channel = channelRepository.findById(channelId).orElse(null);
        if (channel != null && channel.getProject() != null) {
            try {
                UUID projectId = channel.getProject().getId();
                // 1. Hybrid Search (Stage 2)
                List<FusedCandidate> candidates = hybridSearchService.performHybridSearch(projectId, question, 50);

                // 2. Reranker (Stage 3) - Increase top-K from 5 to 10 to include both official docs and informal notes/logs
                List<FusedCandidate> topKCandidates = rerankerService.rerankCandidates(question, candidates, 10);

                // 3. Context Builder (Stage 4) & LLM Answer Generation (Stage 5) & Safety Validation (Stage 6)
                RAGResponse ragResponse = ragAnswerService.generateAnswer(question, topKCandidates, messages);

                // 4. Response Assembly with Citations (Stage 7)
                String citationSection = formatCitations(ragResponse.citations());
                return ragResponse.answer() + citationSection;
            } catch (Exception e) {
                System.err.println("RAG pipeline failed, falling back to chat-history-only context: " + e.getMessage());
            }
        }

        // Fallback: standard chat-history-only context
        String context = formatContext(messages);
        String systemPrompt = "You are an AI assistant. Answer the user's question using ONLY the provided conversation context. " +
                "If the conversation doesn't contain the answer to the question, you must reply exactly with: 'I don't have enough context to answer that'. " +
                "Do not try to make up or extrapolate information. Here is the conversation context:\n\n" + context;

        return nvidiaAIService.chatCompletion(systemPrompt, question, defaultChatModel);
    }

    private String formatCitations(List<FusedCandidate> citations) {
        if (citations == null || citations.isEmpty()) {
            return "";
        }
        StringBuilder sb = new StringBuilder();
        sb.append("\n\n**Sources:**\n");
        for (FusedCandidate citation : citations) {
            sb.append(String.format("- [%s](/dashboard/docs/%s) (Chunk #%d)\n",
                    citation.getDocumentTitle(),
                    citation.getDocumentId(),
                    citation.getChunkIndex() + 1
            ));
        }
        return sb.toString();
    }

    private String handleDraftReply(UUID channelId, UUID requestingUserId, String person) {
        String cleanPerson = person.trim();
        if (cleanPerson.startsWith("@")) {
            cleanPerson = cleanPerson.substring(1).trim();
        }
        final String searchName = cleanPerson.toLowerCase();

        // Resolve <person> in channel members
        List<ChannelMemberResponse> members = channelService.getChannelMembers(channelId, requestingUserId);
        ChannelMemberResponse targetMember = members.stream()
                .filter(m -> {
                    String fullName = m.getFullName() != null ? m.getFullName() : "";
                    String username = m.getUsername() != null ? m.getUsername() : "";
                    return fullName.toLowerCase().contains(searchName)
                            || username.toLowerCase().contains(searchName);
                })
                .findFirst()
                .orElse(null);

        if (targetMember == null) {
            return "No matching person named '" + person + "' was found in this channel.";
        }

        // Fetch last 15 messages
        List<Message> dbMessages = messageRepository.findPageByChannel(
                channelId,
                Instant.now(),
                PageRequest.of(0, 15)
        );

        List<Message> messages = new ArrayList<>(dbMessages);
        Collections.reverse(messages);
        String context = formatContext(messages);

        String systemPrompt = "You are an AI assistant. Draft a short, appropriate reply to continue the conversation, " +
                "responding to " + targetMember.getFullName() + " (username: " + targetMember.getUsername() + "). " +
                "The drafted reply must continue the conversation context naturally and match the tone of the existing messages. " +
                "Keep the reply concise (1-3 sentences) and conversational.";

        return nvidiaAIService.chatCompletion(systemPrompt, context, defaultChatModel);
    }

    private String formatContext(List<Message> messages) {
        return messages.stream()
                .map(msg -> {
                    String senderName = msg.getSender() != null ? msg.getSender().getFullName() : "AI Assistant";
                    return senderName + ": " + msg.getContent();
                })
                .collect(Collectors.joining("\n"));
    }

    private String getHelpMessage() {
        return "I can help you with these commands:\n" +
                "1. `/ai summarize` - Summarizes the last 50 messages in this channel.\n" +
                "2. `/ai summarize from <date1> to <date2>` - Summarizes messages in the given date range (format: YYYY-MM-DD).\n" +
                "3. `/ai ask <question>` - Answers your question using the last 20 messages as context.\n" +
                "4. `/ai draft a reply to <person>` - Drafts a reply to a user based on the last 15 messages.";
    }

    private String handleSummarizeBetween(UUID channelId, String input) {
        java.util.regex.Pattern pattern = java.util.regex.Pattern.compile(
                "(?i)^summarize\\s+from\\s+(\\S+)\\s+to\\s+(\\S+)"
        );
        java.util.regex.Matcher matcher = pattern.matcher(input);
        if (!matcher.matches()) {
            return "Invalid format. Use: `/ai summarize from YYYY-MM-DD to YYYY-MM-DD`";
        }

        String startDateStr = matcher.group(1);
        String endDateStr = matcher.group(2);

        Instant startInstant = parseDate(startDateStr, false);
        Instant endInstant = parseDate(endDateStr, true);

        if (startInstant == null || endInstant == null) {
            return "Could not parse dates. Please use YYYY-MM-DD format (e.g. 2026-06-18).";
        }

        if (startInstant.isAfter(endInstant)) {
            return "The start date must be before or equal to the end date.";
        }

        List<Message> messages = messageRepository.findMessagesBetween(channelId, startInstant, endInstant);

        if (messages.isEmpty()) {
            return "There are no messages in this channel between " + startDateStr + " and " + endDateStr + ".";
        }

        String context = formatContext(messages);

        String systemPrompt = "You are an AI assistant helping a team summarize their chat channel history for a specific time period. " +
                "Read the following message history between " + startDateStr + " and " + endDateStr + " and write a concise, clear summary highlighting the key topics discussed, decisions made, and action items. " +
                "Keep the summary structured and easy to read.";

        return nvidiaAIService.chatCompletion(systemPrompt, context, defaultChatModel);
    }

    private static final List<java.time.format.DateTimeFormatter> DATE_FORMATTERS = List.of(
            java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd"),
            java.time.format.DateTimeFormatter.ofPattern("yyyy/MM/dd"),
            java.time.format.DateTimeFormatter.ofPattern("dd-MM-yyyy"),
            java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy"),
            java.time.format.DateTimeFormatter.ofPattern("MM-dd-yyyy"),
            java.time.format.DateTimeFormatter.ofPattern("MM/dd/yyyy")
    );

    private Instant parseDate(String dateStr, boolean isEnd) {
        for (java.time.format.DateTimeFormatter formatter : DATE_FORMATTERS) {
            try {
                java.time.LocalDate localDate = java.time.LocalDate.parse(dateStr, formatter);
                if (isEnd) {
                    return localDate.atTime(23, 59, 59).atZone(java.time.ZoneId.systemDefault()).toInstant();
                } else {
                    return localDate.atStartOfDay(java.time.ZoneId.systemDefault()).toInstant();
                }
            } catch (java.time.format.DateTimeParseException e) {
                // ignore and try next formatter
            }
        }
        return null;
    }
}
