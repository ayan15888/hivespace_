# Hivespace — Step 3: STOMP WebSocket & Real-Time Broadcasting

## Context

You are working on **Hivespace**, a combined Jira + Slack + Notion platform.  
Stack: **Spring Boot (Java)**, **Supabase (PostgreSQL)**, **Spring Security + JWT**.

**Steps 1 and 2 are complete:**
- All 4 entities exist and `ddl-auto=validate` passes
- All REST endpoints are working and manually tested
- Every place that needs a broadcast has a `// TODO: broadcast via STOMP (Step 3)` comment

This step wires the real-time layer. By the end, sending a message via REST will also push it live to every connected client in that channel — no page refresh needed.

---

## Dependencies Check

Before writing any code, verify these are already in `pom.xml`. Add only what is missing:

```xml
<!-- WebSocket + STOMP -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-websocket</artifactId>
</dependency>

<!-- SockJS fallback support is included in spring-boot-starter-websocket -->
<!-- No separate dependency needed -->
```

If either is missing, add it and confirm the project compiles before continuing.

---

## What to Build in This Step

1. `WebSocketConfig.java` — register STOMP endpoint, configure broker
2. `WebSocketAuthInterceptor.java` — validate JWT from STOMP CONNECT frame
3. `MessagingBroadcastService.java` — single service that wraps `SimpMessagingTemplate`
4. Wire `MessagingBroadcastService` into `MessageService` and `ReactionService` (replace all `// TODO: broadcast via STOMP` comments)
5. Typing indicator endpoint — ephemeral, no DB write

---

## File 1: `WebSocketConfig.java`

Location: `com.hivespace.backend.config`

```java
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")  // tighten in production
                .withSockJS();
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic", "/queue");
        registry.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        // Wire the JWT interceptor here (File 2)
        registration.interceptors(webSocketAuthInterceptor());
    }

    @Bean
    public WebSocketAuthInterceptor webSocketAuthInterceptor() {
        return new WebSocketAuthInterceptor();
    }
}
```

**Notes:**
- `/ws` is the SockJS endpoint — frontend connects to `${API_URL}/ws`
- `/topic` = pub/sub broadcast (channels, typing)
- `/queue` = user-specific (reserved for future DM notifications)
- `/app` prefix = messages routed to `@MessageMapping` handlers

---

## File 2: `WebSocketAuthInterceptor.java`

Location: `com.hivespace.backend.config`

This interceptor reads the JWT from the STOMP CONNECT frame and sets the Spring Security principal. It must reuse the existing `JwtService` — do not duplicate JWT logic.

```java
@Component
@RequiredArgsConstructor
public class WebSocketAuthInterceptor implements ChannelInterceptor {

    private final JwtService jwtService;             // existing service
    private final UserDetailsService userDetailsService; // existing service

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor =
            MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
            String authHeader = accessor.getFirstNativeHeader("Authorization");

            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                throw new IllegalArgumentException("Missing or invalid Authorization header in STOMP CONNECT");
            }

            String token = authHeader.substring(7);

            try {
                String username = jwtService.extractUsername(token);
                UserDetails userDetails = userDetailsService.loadUserByUsername(username);

                if (jwtService.isTokenValid(token, userDetails)) {
                    UsernamePasswordAuthenticationToken auth =
                        new UsernamePasswordAuthenticationToken(
                            userDetails, null, userDetails.getAuthorities()
                        );
                    accessor.setUser(auth);
                } else {
                    throw new IllegalArgumentException("Invalid JWT token in STOMP CONNECT");
                }
            } catch (Exception e) {
                throw new IllegalArgumentException("JWT validation failed: " + e.getMessage());
            }
        }

        return message;
    }
}
```

**Key notes:**
- The `jwtService.extractUsername()` and `jwtService.isTokenValid()` method names — match exactly what exists in your `JwtService`. Check the existing service and rename if needed.
- `accessor.setUser(auth)` makes the principal available in `@MessageMapping` handlers via `Principal principal`.
- If CONNECT has no token, reject it. Do not allow anonymous WebSocket connections.

---

## File 3: `MessagingBroadcastService.java`

Location: `com.hivespace.backend.service`

This is the single place all STOMP broadcasts go through. Nothing else should call `SimpMessagingTemplate` directly.

```java
@Service
@RequiredArgsConstructor
public class MessagingBroadcastService {

    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Broadcast a new, edited, or reaction-updated message to all subscribers of a channel.
     * Topic: /topic/channel.{channelId}
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
     * Broadcast a typing indicator. Never touches the DB.
     * Topic: /topic/typing.{channelId}
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
```

---

## File 4: `TypingController.java`

Location: `com.hivespace.backend.controller`

Handles inbound typing events from clients. Ephemeral — no DB write, no service call, just re-broadcast.

```java
@Controller
@RequiredArgsConstructor
public class TypingController {

    private final MessagingBroadcastService broadcastService;
    private final UserRepository userRepository;  // existing repository

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

        broadcastService.broadcastTyping(channelId, userId, displayName, payload.isTyping());
    }
}
```

Create the payload record in `com.hivespace.backend.dto.messaging`:

```java
public record TypingPayload(boolean typing) {}
```

**Note:** `@Controller` (not `@RestController`) is required for `@MessageMapping` handlers.

---

## File 5: Wire Broadcasts into Existing Services

Find every `// TODO: broadcast via STOMP (Step 3)` comment in `MessageService` and `ReactionService` and replace as follows.

### In `MessageService` — inject `MessagingBroadcastService`

```java
@Service
@Transactional
@RequiredArgsConstructor
public class MessageService {

    // Add to existing injections:
    private final MessagingBroadcastService broadcastService;

    // ...
}
```

#### `sendMessage()` — after save:
```java
// Replace: // TODO: broadcast via STOMP (Step 3)
MessageResponse response = toResponse(savedMessage, currentUserId);
broadcastService.broadcastMessage(channelId, response);

// Also: if this is a thread reply, broadcast to thread topic too
if (req.parentId() != null) {
    broadcastService.broadcastThreadReply(req.parentId(), response);
}

return response;
```

#### `editMessage()` — after save:
```java
// Replace: // TODO: broadcast via STOMP (Step 3)
MessageResponse response = toResponse(savedMessage, currentUserId);
broadcastService.broadcastMessage(savedMessage.getChannel().getId(), response);
return response;
```

#### `deleteMessage()` — after save:
```java
// Replace: // TODO: broadcast via STOMP (Step 3)
broadcastService.broadcastDeletion(message.getChannel().getId(), messageId);
```

### In `ReactionService` — inject `MessagingBroadcastService`

```java
@Service
@Transactional
@RequiredArgsConstructor
public class ReactionService {

    // Add to existing injections:
    private final MessagingBroadcastService broadcastService;
    private final MessageService messageService;  // to build MessageResponse after reaction change

    // ...
}
```

#### `addReaction()` — after save:
```java
// Replace: // TODO: broadcast via STOMP (Step 3)
MessageResponse updated = messageService.toResponse(
    messageRepository.findById(messageId).orElseThrow(),
    currentUserId
);
broadcastService.broadcastMessage(updated.channelId(), updated);
```

#### `removeReaction()` — after delete:
```java
// Replace: // TODO: broadcast via STOMP (Step 3)
MessageResponse updated = messageService.toResponse(
    messageRepository.findById(messageId).orElseThrow(),
    currentUserId
);
broadcastService.broadcastMessage(updated.channelId(), updated);
```

**Note:** `toResponse()` in `MessageService` must be package-accessible (not `private`) for `ReactionService` to call it. Change the visibility to `public` or `protected`.

---

## STOMP Topics Reference

| Topic | Direction | Payload | Triggered By |
|---|---|---|---|
| `/topic/channel.{channelId}` | Server → Client | `MessageResponse` | send, edit, delete, reaction |
| `/topic/thread.{parentMessageId}` | Server → Client | `MessageResponse` | thread reply |
| `/topic/typing.{channelId}` | Server → Client | `{ userId, displayName, typing }` | typing event |
| `/app/channel/{channelId}/typing` | Client → Server | `{ typing: true/false }` | user keypress |

---

## What NOT to Do

- Do NOT call `SimpMessagingTemplate` directly from controllers or services — always go through `MessagingBroadcastService`.
- Do NOT wait for the broadcast to complete before returning the REST response — `convertAndSend` is fire-and-forget; the REST 201 returns immediately after DB save.
- Do NOT store typing state in the DB — `broadcastTyping()` is the only thing that happens on a typing event.
- Do NOT use `@SendTo` annotation on `@MessageMapping` handlers — use `MessagingBroadcastService.broadcastMessage()` explicitly so the channel ID is always controlled server-side.
- Do NOT allow unauthenticated STOMP connections — the interceptor must reject CONNECT frames with no valid JWT.
- Do NOT duplicate `JwtService` logic — reuse the existing service, just match the method names exactly.
- Do NOT make `TypingController` a `@RestController` — it must be `@Controller` for `@MessageMapping` to work.

---

## Done When

- [ ] `WebSocketConfig.java` created — app starts with no bean errors
- [ ] `WebSocketAuthInterceptor.java` created — JWT interceptor wired into inbound channel
- [ ] `MessagingBroadcastService.java` created with all 4 broadcast methods
- [ ] `TypingController.java` created with `@MessageMapping` handler
- [ ] `TypingPayload` record created
- [ ] All `// TODO: broadcast via STOMP` comments replaced in `MessageService` and `ReactionService`
- [ ] `toResponse()` visibility changed to `public` in `MessageService`
- [ ] Application starts with no errors
- [ ] Manual WebSocket test:
  - Connect two browser tabs to the same channel using a STOMP client (e.g. `websocat` or a test HTML page with `@stomp/stompjs`)
  - Send a message via `POST /api/channels/{id}/messages` in Tab 1
  - Confirm Tab 2 receives the message on `/topic/channel.{channelId}` without refresh
  - Send a typing event from Tab 1 to `/app/channel/{id}/typing`
  - Confirm Tab 2 receives `{ userId, displayName, typing: true }` on `/topic/typing.{channelId}`
  - Delete a message and confirm Tab 2 receives `{ id, isDeleted: true }` on the channel topic