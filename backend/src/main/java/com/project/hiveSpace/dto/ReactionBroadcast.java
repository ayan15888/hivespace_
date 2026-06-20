package com.project.hiveSpace.dto;

import java.util.UUID;

/**
 * Lightweight STOMP broadcast payload for a reaction add/remove event.
 * Sent to /topic/channel.{channelId} alongside the full MessageResponse.
 *
 * delta:  +1 = reaction added,  -1 = reaction removed
 * userId: who reacted (so each viewer can compute their own reactedByMe)
 */
public record ReactionBroadcast(
    String  type,       // always "REACTION_UPDATE"
    UUID    messageId,
    UUID    channelId,
    String  emoji,
    UUID    userId,
    int     delta       // +1 or -1
) {}
