package com.project.hiveSpace.services;

import com.project.hiveSpace.dto.*;
import com.project.hiveSpace.exceptions.ForbiddenException;
import com.project.hiveSpace.exceptions.NotFoundException;
import com.project.hiveSpace.models.*;
import com.project.hiveSpace.repository.*;
import com.project.hiveSpace.security.RbacService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class MessageService {

    private final MessageRepository messageRepository;
    private final ChannelRepository channelRepository;
    private final ChannelMemberRepository channelMemberRepository;
    private final MessageReactionRepository messageReactionRepository;
    private final UserRepository userRepository;
    private final RbacService rbacService;

    // GET /api/channels/{channelId}/messages
    @Transactional(readOnly = true)
    public List<MessageResponse> getMessages(UUID channelId, UUID before, UUID currentUserId) {
        // 1. Verify currentUserId is a member of channelId (check ChannelMember)
        channelMemberRepository.findByIdChannelIdAndIdUserId(channelId, currentUserId)
                .orElseThrow(() -> new ForbiddenException("Access denied: Must be a member of the channel to view messages"));

        // 2. messageRepository.findPageByChannel(channelId, before, PageRequest.of(0, 50))
        List<Message> messages = messageRepository.findPageByChannel(channelId, before, PageRequest.of(0, 50));

        // 3. For each message: if deletedAt != null, return tombstone
        // 4. Map to MessageResponse
        return messages.stream()
                .map(msg -> toResponse(msg, currentUserId))
                .collect(Collectors.toList());
    }

    // POST /api/channels/{channelId}/messages
    public MessageResponse sendMessage(UUID channelId, SendMessageRequest req, UUID currentUserId) {
        // 1. Verify currentUserId is member of channelId
        channelMemberRepository.findByIdChannelIdAndIdUserId(channelId, currentUserId)
                .orElseThrow(() -> new ForbiddenException("Access denied: Must be a member of the channel to send messages"));

        Channel channel = channelRepository.findById(channelId)
                .orElseThrow(() -> new NotFoundException("Channel not found"));

        User sender = userRepository.findById(currentUserId)
                .orElseThrow(() -> new NotFoundException("Sender not found"));

        Message parent = null;
        if (req.parentId() != null) {
            // 2. If req.parentId != null, verify parent message exists in same channel
            parent = messageRepository.findById(req.parentId())
                    .orElseThrow(() -> new NotFoundException("Parent message not found"));
            if (!parent.getChannel().getId().equals(channelId)) {
                throw new IllegalArgumentException("Parent message must be in the same channel");
            }
        }

        // 3. Build Message entity, set createdAt = Instant.now()
        Message message = Message.builder()
                .content(req.content())
                .type(req.type() != null ? req.type() : MessageType.TEXT)
                .channel(channel)
                .sender(sender)
                .parent(parent)
                .createdAt(Instant.now())
                .build();

        // 4. Save message
        Message saved = messageRepository.save(message);

        // TODO: broadcast via STOMP (Step 3)

        // 5. Map to MessageResponse
        return toResponse(saved, currentUserId);
    }

    // PATCH /api/messages/{messageId}
    public MessageResponse editMessage(UUID messageId, EditMessageRequest req, UUID currentUserId) {
        // 1. Load message; throw 404 if not found
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new NotFoundException("Message not found"));

        // 2. Verify message.sender.id == currentUserId (only sender can edit)
        if (message.getSender() == null || !message.getSender().getId().equals(currentUserId)) {
            throw new ForbiddenException("Access denied: Only the sender can edit this message");
        }

        // 3. message.setContent(req.content())
        message.setContent(req.content());

        // 4. message.setEditedAt(Instant.now())
        message.setEditedAt(Instant.now());

        // 5. Save
        Message saved = messageRepository.save(message);

        // TODO: broadcast via STOMP (Step 3)

        // 6. Map to MessageResponse
        return toResponse(saved, currentUserId);
    }

    // DELETE /api/messages/{messageId}
    public void deleteMessage(UUID messageId, UUID currentUserId) {
        // 1. Load message; throw 404 if not found
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new NotFoundException("Message not found"));

        // 2. Verify message.sender.id == currentUserId OR currentUser is workspace admin
        boolean isSender = message.getSender() != null && message.getSender().getId().equals(currentUserId);
        boolean isWorkspaceAdmin = rbacService.canAdminWorkspace(message.getChannel().getWorkspace().getId());

        if (!isSender && !isWorkspaceAdmin) {
            throw new ForbiddenException("Access denied: Only the sender or a workspace administrator can delete this message");
        }

        // 3. message.setDeletedAt(Instant.now())
        message.setDeletedAt(Instant.now());

        // 4. message.setContent("[deleted]")
        message.setContent("[deleted]");

        // 5. Save
        messageRepository.save(message);

        // TODO: broadcast { id, deleted: true } via STOMP (Step 3)
    }

    // GET /api/channels/{channelId}/messages/{messageId}/thread
    @Transactional(readOnly = true)
    public List<MessageResponse> getThreadReplies(UUID messageId, UUID currentUserId) {
        // 1. Load parent message; throw 404 if not found
        Message parent = messageRepository.findById(messageId)
                .orElseThrow(() -> new NotFoundException("Parent message not found"));

        // 2. Verify currentUserId is member of the channel
        channelMemberRepository.findByIdChannelIdAndIdUserId(parent.getChannel().getId(), currentUserId)
                .orElseThrow(() -> new ForbiddenException("Access denied: Must be a member of the channel to view thread replies"));

        // 3. messageRepository.findThreadReplies(messageId)
        List<Message> replies = messageRepository.findThreadReplies(messageId);

        // 4. Map to MessageResponse list (ASC order)
        return replies.stream()
                .map(msg -> toResponse(msg, currentUserId))
                .collect(Collectors.toList());
    }

    // Helper: map Message entity → MessageResponse
    private MessageResponse toResponse(Message message, UUID currentUserId) {
        boolean isDeleted = message.getDeletedAt() != null;

        if (isDeleted) {
            return new MessageResponse(
                    message.getId(),
                    "Message deleted",
                    message.getType(),
                    message.getChannel().getId(),
                    null,
                    message.getParent() != null ? message.getParent().getId() : null,
                    message.getEditedAt() != null,
                    true,
                    message.getCreatedAt(),
                    message.getEditedAt(),
                    List.of(),
                    0
            );
        }

        UserSummary senderSummary = null;
        if (message.getSender() != null) {
            User sender = message.getSender();
            senderSummary = new UserSummary(
                    sender.getId(),
                    sender.getFullName(),
                    sender.getAvatarUrl(),
                    sender.getAvatarColor()
            );
        }

        List<MessageReaction> reactions = messageReactionRepository.findByIdMessageId(message.getId());
        Map<String, List<MessageReaction>> reactionsByEmoji = reactions.stream()
                .collect(Collectors.groupingBy(r -> r.getId().getEmoji()));

        List<ReactionSummary> reactionSummaries = reactionsByEmoji.entrySet().stream()
                .map(entry -> {
                    String emoji = entry.getKey();
                    long count = entry.getValue().size();
                    boolean reactedByMe = entry.getValue().stream()
                            .anyMatch(r -> r.getUser() != null && r.getUser().getId().equals(currentUserId));
                    return new ReactionSummary(emoji, count, reactedByMe);
                }).collect(Collectors.toList());

        int replyCount = messageRepository.countReplies(message.getId());

        return new MessageResponse(
                message.getId(),
                message.getContent(),
                message.getType(),
                message.getChannel().getId(),
                senderSummary,
                message.getParent() != null ? message.getParent().getId() : null,
                message.getEditedAt() != null,
                false,
                message.getCreatedAt(),
                message.getEditedAt(),
                reactionSummaries,
                replyCount
        );
    }
}
