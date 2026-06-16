package com.project.hiveSpace.services;

import com.project.hiveSpace.exceptions.ForbiddenException;
import com.project.hiveSpace.exceptions.NotFoundException;
import com.project.hiveSpace.models.Message;
import com.project.hiveSpace.models.MessageReaction;
import com.project.hiveSpace.models.MessageReactionId;
import com.project.hiveSpace.models.User;
import com.project.hiveSpace.repository.ChannelMemberRepository;
import com.project.hiveSpace.repository.MessageReactionRepository;
import com.project.hiveSpace.repository.MessageRepository;
import com.project.hiveSpace.repository.UserRepository;
import com.project.hiveSpace.dto.MessageResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class ReactionService {

    private final MessageRepository messageRepository;
    private final MessageReactionRepository messageReactionRepository;
    private final ChannelMemberRepository channelMemberRepository;
    private final UserRepository userRepository;
    private final MessagingBroadcastService broadcastService;
    private final MessageService messageService;

    // POST /api/messages/{messageId}/reactions
    public void addReaction(UUID messageId, String emoji, UUID currentUserId) {
        // 1. Load message; throw 404 if not found
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new NotFoundException("Message not found"));

        // Verify membership in channel
        channelMemberRepository.findByIdChannelIdAndIdUserId(message.getChannel().getId(), currentUserId)
                .orElseThrow(() -> new ForbiddenException("Access denied: Must be a member of the channel to react to messages"));

        User user = userRepository.findById(currentUserId)
                .orElseThrow(() -> new NotFoundException("User not found"));

        // 2. Build MessageReactionId(messageId, currentUserId, emoji)
        MessageReactionId reactionId = MessageReactionId.builder()
                .messageId(messageId)
                .userId(currentUserId)
                .emoji(emoji)
                .build();

        // 3. If already exists (findById), do nothing (idempotent)
        if (messageReactionRepository.existsById(reactionId)) {
            return;
        }

        // 4. Else save new MessageReaction
        MessageReaction reaction = MessageReaction.builder()
                .id(reactionId)
                .message(message)
                .user(user)
                .createdAt(Instant.now())
                .build();

        messageReactionRepository.save(reaction);

        MessageResponse updated = messageService.toResponse(
                messageRepository.findById(messageId).orElseThrow(),
                currentUserId
        );
        broadcastService.broadcastMessage(updated.channelId(), updated);
    }

    // DELETE /api/messages/{messageId}/reactions/{emoji}
    public void removeReaction(UUID messageId, String emoji, UUID currentUserId) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new NotFoundException("Message not found"));

        // Verify membership in channel
        channelMemberRepository.findByIdChannelIdAndIdUserId(message.getChannel().getId(), currentUserId)
                .orElseThrow(() -> new ForbiddenException("Access denied: Must be a member of the channel to remove reactions"));

        // 1. Build MessageReactionId(messageId, currentUserId, emoji)
        MessageReactionId reactionId = MessageReactionId.builder()
                .messageId(messageId)
                .userId(currentUserId)
                .emoji(emoji)
                .build();

        // 2. Delete if exists (deleteById — no-op if already gone)
        if (messageReactionRepository.existsById(reactionId)) {
            messageReactionRepository.deleteById(reactionId);
        }

        MessageResponse updated = messageService.toResponse(
                messageRepository.findById(messageId).orElseThrow(),
                currentUserId
        );
        broadcastService.broadcastMessage(updated.channelId(), updated);
    }
}
