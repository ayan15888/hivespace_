package com.project.hiveSpace.services;

import com.project.hiveSpace.dto.ChannelMemberResponse;
import com.project.hiveSpace.models.Message;
import com.project.hiveSpace.repository.MessageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SlashCommandService {

    private final NvidiaAIService nvidiaAIService;
    private final MessageRepository messageRepository;
    private final ChannelService channelService;

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
        // Fetch last 20 messages
        List<Message> dbMessages = messageRepository.findPageByChannel(
                channelId,
                Instant.now(),
                PageRequest.of(0, 20)
        );

        List<Message> messages = new ArrayList<>(dbMessages);
        Collections.reverse(messages);
        String context = formatContext(messages);

        String systemPrompt = "You are an AI assistant. Answer the user's question using ONLY the provided conversation context. " +
                "If the conversation doesn't contain the answer to the question, you must reply exactly with: 'I don't have enough context to answer that'. " +
                "Do not try to make up or extrapolate information. Here is the conversation context:\n\n" + context;

        return nvidiaAIService.chatCompletion(systemPrompt, question, defaultChatModel);
    }

    private String handleDraftReply(UUID channelId, UUID requestingUserId, String person) {
        // Resolve <person> in channel members
        List<ChannelMemberResponse> members = channelService.getChannelMembers(channelId, requestingUserId);
        ChannelMemberResponse targetMember = members.stream()
                .filter(m -> {
                    String fullName = m.getFullName() != null ? m.getFullName() : "";
                    String username = m.getUsername() != null ? m.getUsername() : "";
                    return fullName.toLowerCase().contains(person.toLowerCase())
                            || username.toLowerCase().contains(person.toLowerCase());
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
        return "I can help you with these three commands:\n" +
                "1. `/ai summarize` - Summarizes the last 50 messages in this channel.\n" +
                "2. `/ai ask <question>` - Answers your question using the last 20 messages as context.\n" +
                "3. `/ai draft a reply to <person>` - Drafts a reply to a user based on the last 15 messages.";
    }
}
