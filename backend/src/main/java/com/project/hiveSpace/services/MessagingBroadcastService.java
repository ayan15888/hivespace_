package com.project.hiveSpace.services;

import com.project.hiveSpace.dto.MessageResponse;
import com.project.hiveSpace.dto.ReactionBroadcast;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MessagingBroadcastService {

    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Broadcast a new, edited, or reaction-updated message to all subscribers of a channel.
      Topic: /topic/channel.{channelId}
     */
    public void broadcastMessage(UUID channelId, MessageResponse message) {
        messagingTemplate.convertAndSend(
                "/topic/channel." + channelId,
                message
        );
    }

    /**
     * Broadcast a soft-delete tombstone to channel subscribers.
     * Topic: /topic/channel.{channelId}
     * Payload: minimal object — frontend uses isDeleted=true to render tombstone.
     */
    public void broadcastDeletion(UUID channelId, UUID messageId) {
        messagingTemplate.convertAndSend(
                "/topic/channel." + channelId,
                Map.of(
                        "id", messageId,
                        "isDeleted", true
                )
        );
    }

    /**
     * Broadcast a thread reply to subscribers of the thread panel.
     * Topic: /topic/thread.{parentMessageId}
     */
    public void broadcastThreadReply(UUID parentMessageId, MessageResponse reply) {
        messagingTemplate.convertAndSend(
                "/topic/thread." + parentMessageId,
                reply
        );
    }

    /**
     * Broadcast a reaction add/remove event without per-viewer reactedByMe bias.
     * Topic: /topic/channel.{channelId}
     * Each client applies the delta to its own local state.
     */
    public void broadcastReaction(UUID channelId, UUID messageId, String emoji, UUID reactorUserId, int delta) {
        messagingTemplate.convertAndSend(
                "/topic/channel." + channelId,
                new ReactionBroadcast("REACTION_UPDATE", messageId, channelId, emoji, reactorUserId, delta)
        );
    }

    /**
     * Broadcast typing status to subscribers of /topic/typing.{channelId}
     */
    public void broadcastTyping(UUID channelId, UUID userId, String displayName, boolean typing) {
        messagingTemplate.convertAndSend(
                "/topic/typing." + channelId,
                Map.of(
                        "userId", userId,
                        "displayName", displayName,
                        "typing", typing
                )
        );
    }
}
