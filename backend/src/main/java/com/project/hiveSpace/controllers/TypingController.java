package com.project.hiveSpace.controllers;

import com.project.hiveSpace.dto.TypingPayload;
import com.project.hiveSpace.repository.UserRepository;
import com.project.hiveSpace.services.MessagingBroadcastService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.util.UUID;

@Controller
@RequiredArgsConstructor
public class TypingController {

    private final MessagingBroadcastService broadcastService;
    private final UserRepository userRepository;

    @MessageMapping("/channel/{channelId}/typing")
    public void handleTyping(
            @DestinationVariable UUID channelId,
            @Payload TypingPayload payload,
            Principal principal
    ) {
        UUID userId = UUID.fromString(principal.getName());

        // Load display name — keep it lightweight, no full User fetch needed
        String displayName = userRepository.findById(userId)
                .map(u -> u.getFullName() != null ? u.getFullName() : u.getUsername())
                .orElse("Unknown");

        broadcastService.broadcastTyping(channelId, userId, displayName, payload.typing());
    }
}
