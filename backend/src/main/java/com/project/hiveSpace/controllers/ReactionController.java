package com.project.hiveSpace.controllers;

import com.project.hiveSpace.dto.AddReactionRequest;
import com.project.hiveSpace.models.User;
import com.project.hiveSpace.services.ReactionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/messages/{messageId}/reactions")
@RequiredArgsConstructor
public class ReactionController {

    private final ReactionService reactionService;

    @PostMapping
    public ResponseEntity<Void> addReaction(
            @PathVariable UUID messageId,
            @RequestBody AddReactionRequest req,
            @AuthenticationPrincipal User user
    ) {
        reactionService.addReaction(messageId, req.emoji(), user.getId());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{emoji}")
    public ResponseEntity<Void> removeReaction(
            @PathVariable UUID messageId,
            @PathVariable String emoji,
            @AuthenticationPrincipal User user
    ) {
        reactionService.removeReaction(messageId, emoji, user.getId());
        return ResponseEntity.noContent().build();
    }
}
