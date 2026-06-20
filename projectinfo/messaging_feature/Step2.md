# Hivespace — Step 2: REST Endpoints for Messaging

## Context

You are working on **Hivespace**, a combined Jira + Slack + Notion platform.  
Stack: **Spring Boot (Java)**, **Supabase (PostgreSQL)**, **Spring Security + JWT**.

**Step 1 is complete.** The following entities are already in the codebase and working:
- `com.hivespace.backend.entity.Channel` (with `ChannelType` enum)
- `com.hivespace.backend.entity.ChannelMember` + `ChannelMemberId`
- `com.hivespace.backend.entity.Message` (with `MessageType` enum)
- `com.hivespace.backend.entity.MessageReaction` + `MessageReactionId`

`ddl-auto=validate` passes — do not touch entities or schema.

Existing patterns in the codebase to follow (look at any existing controller/service/repository for reference):
- Controllers in `com.hivespace.backend.controller`
- Services in `com.hivespace.backend.service`
- Repositories in `com.hivespace.backend.repository`
- DTOs/records in `com.hivespace.backend.dto`
- Auth principal extracted via `@AuthenticationPrincipal UserDetails userDetails` — get the current user UUID from `userDetails.getUsername()` (which returns the UUID string)
- Standard response pattern: `ResponseEntity<T>`

---

## What to Build in This Step

**Repositories → Services → Controllers**, in that order, for:

1. Channel management (create, list, DM open/dedup)
2. Message CRUD (send, list with cursor pagination, edit, soft-delete, thread fetch)
3. Reactions (add, remove)
4. Mark channel as read

**STOMP broadcast is NOT part of this step.** Every endpoint that says "then broadcast" — skip the broadcast for now. A `// TODO: broadcast via STOMP` comment is sufficient. STOMP is wired in Step 3.

---

## Repositories to Create

### `ChannelRepository`
```java
public interface ChannelRepository extends JpaRepository<Channel, UUID> {

    // All channels in a workspace that the user is a member of
    @Query("""
        SELECT c FROM Channel c
        JOIN ChannelMember cm ON cm.id.channelId = c.id
        WHERE c.workspace.id = :workspaceId
          AND cm.id.userId = :userId
        ORDER BY c.createdAt ASC
    """)
    List<Channel> findByWorkspaceAndMember(UUID workspaceId, UUID userId);

    // DM dedup: find existing DM channel between exactly two users in a workspace
    @Query(value = """
        SELECT c.id FROM channels c
        JOIN channel_members cm1 ON cm1.channel_id = c.id AND cm1.user_id = :userA
        JOIN channel_members cm2 ON cm2.channel_id = c.id AND cm2.user_id = :userB
        WHERE c.type = 'DM'
          AND c.workspace_id = :workspaceId
          AND (SELECT COUNT(*) FROM channel_members WHERE channel_id = c.id) = 2
        LIMIT 1
    """, nativeQuery = true)
    Optional<UUID> findExistingDmChannel(UUID workspaceId, UUID userA, UUID userB);
}
```

### `ChannelMemberRepository`
```java
public interface ChannelMemberRepository extends JpaRepository<ChannelMember, ChannelMemberId> {

    List<ChannelMember> findByIdChannelId(UUID channelId);

    Optional<ChannelMember> findByIdChannelIdAndIdUserId(UUID channelId, UUID userId);

    // Unread count for a user in a channel
    @Query("""
        SELECT COUNT(m) FROM Message m
        WHERE m.channel.id = :channelId
          AND m.deletedAt IS NULL
          AND m.sender.id != :userId
          AND (:lastReadAt IS NULL OR m.createdAt > :lastReadAt)
    """)
    long countUnread(UUID channelId, UUID userId, Instant lastReadAt);
}
```

### `MessageRepository`
```java
public interface MessageRepository extends JpaRepository<Message, UUID> {

    // Cursor pagination — 50 most recent active messages before a given message
    @Query("""
        SELECT m FROM Message m
        WHERE m.channel.id = :channelId
          AND m.parent IS NULL
          AND m.deletedAt IS NULL
          AND (:before IS NULL OR m.createdAt < (
              SELECT m2.createdAt FROM Message m2 WHERE m2.id = :before
          ))
        ORDER BY m.createdAt DESC
    """)
    List<Message> findPageByChannel(UUID channelId, UUID before, Pageable pageable);

    // Thread replies for a parent message
    @Query("""
        SELECT m FROM Message m
        WHERE m.parent.id = :parentId
          AND m.deletedAt IS NULL
        ORDER BY m.createdAt ASC
    """)
    List<Message> findThreadReplies(UUID parentId);

    // Reply count for a parent (used in MessageResponse)
    @Query("""
        SELECT COUNT(m) FROM Message m
        WHERE m.parent.id = :parentId
          AND m.deletedAt IS NULL
    """)
    int countReplies(UUID parentId);
}
```

### `MessageReactionRepository`
```java
public interface MessageReactionRepository extends JpaRepository<MessageReaction, MessageReactionId> {

    List<MessageReaction> findByIdMessageId(UUID messageId);
}
```

---

## DTOs to Create

All DTOs as Java records in `com.hivespace.backend.dto.messaging`:

### Request DTOs

```java
public record CreateChannelRequest(
    String name,
    ChannelType type,       // PUBLIC, PRIVATE, DM, THREAD
    UUID workspaceId,
    UUID projectId,         // nullable
    UUID teamId             // nullable
) {}

public record OpenDmRequest(
    UUID workspaceId,
    UUID targetUserId
) {}

public record SendMessageRequest(
    String content,
    MessageType type,       // default TEXT
    UUID parentId           // nullable — set for thread replies
) {}

public record EditMessageRequest(
    String content
) {}

public record AddReactionRequest(
    String emoji
) {}
```

### Response DTOs

```java
public record UserSummary(
    UUID id,
    String fullName,
    String avatarUrl,
    String avatarColor
) {}

public record ReactionSummary(
    String emoji,
    long count,
    boolean reactedByMe
) {}

public record MessageResponse(
    UUID id,
    String content,
    MessageType type,
    UUID channelId,
    UserSummary sender,
    UUID parentId,
    boolean isEdited,
    boolean isDeleted,
    Instant createdAt,
    Instant editedAt,
    List<ReactionSummary> reactions,
    int replyCount
) {}

public record ChannelResponse(
    UUID id,
    String name,
    ChannelType type,
    UUID workspaceId,
    UUID projectId,
    UUID teamId,
    long unreadCount
) {}
```

---

## Services to Create

### `ChannelService`

```java
@Service
@Transactional
public class ChannelService {

    // POST /api/channels
    public ChannelResponse createChannel(CreateChannelRequest req, UUID currentUserId) {
        // 1. Verify currentUser is a MEMBER or above in req.workspaceId
        //    (look up WorkspaceMember — reuse existing workspace member check pattern)
        // 2. If type == PRIVATE, verify user is ADMIN or workspace owner
        // 3. Build and save Channel entity
        // 4. Add creator as first channel member
        // 5. Return ChannelResponse (unreadCount = 0 for new channel)
    }

    // GET /api/workspaces/{workspaceId}/channels
    public List<ChannelResponse> getChannelsForUser(UUID workspaceId, UUID currentUserId) {
        // 1. channelRepository.findByWorkspaceAndMember(workspaceId, currentUserId)
        // 2. For each channel, look up the ChannelMember row to get lastReadAt
        // 3. Compute unreadCount via channelMemberRepository.countUnread()
        // 4. Map to ChannelResponse list
    }

    // POST /api/channels/dm
    public ChannelResponse openDm(OpenDmRequest req, UUID currentUserId) {
        // 1. Run dedup: channelRepository.findExistingDmChannel(req.workspaceId, currentUserId, req.targetUserId)
        // 2. If found: load that Channel and return ChannelResponse (unreadCount computed normally)
        // 3. If not found:
        //    a. INSERT Channel (type=DM, name=null, workspaceId=req.workspaceId)
        //    b. INSERT ChannelMember for currentUserId
        //    c. INSERT ChannelMember for targetUserId
        //    d. Return ChannelResponse (unreadCount = 0)
    }

    // POST /api/channels/{channelId}/read
    public void markRead(UUID channelId, UUID currentUserId) {
        // Find ChannelMember by channelId + currentUserId
        // Set lastReadAt = Instant.now()
        // Save
    }
}
```

### `MessageService`

```java
@Service
@Transactional
public class MessageService {

    // GET /api/channels/{channelId}/messages
    public List<MessageResponse> getMessages(UUID channelId, UUID before, UUID currentUserId) {
        // 1. Verify currentUserId is a member of channelId (check ChannelMember)
        // 2. messageRepository.findPageByChannel(channelId, before, PageRequest.of(0, 50))
        // 3. For each message: if deletedAt != null, return tombstone
        //    { content="Message deleted", isDeleted=true, reactions=[], replyCount=0 }
        //    but keep id, channelId, createdAt intact so thread UI doesn't break
        // 4. Map to MessageResponse (fetch reactions, replyCount per message)
        // 5. Return list (still DESC from DB; frontend reverses for display)
    }

    // POST /api/channels/{channelId}/messages
    public MessageResponse sendMessage(UUID channelId, SendMessageRequest req, UUID currentUserId) {
        // 1. Verify currentUserId is member of channelId
        // 2. If req.parentId != null, verify parent message exists in same channel
        // 3. Build Message entity, set createdAt = Instant.now()
        // 4. Save message
        // 5. Map to MessageResponse
        // TODO: broadcast via STOMP (Step 3)
    }

    // PATCH /api/messages/{messageId}
    public MessageResponse editMessage(UUID messageId, EditMessageRequest req, UUID currentUserId) {
        // 1. Load message; throw 404 if not found
        // 2. Verify message.sender.id == currentUserId (only sender can edit)
        // 3. message.setContent(req.content())
        // 4. message.setEditedAt(Instant.now())
        // 5. Save
        // 6. Map to MessageResponse
        // TODO: broadcast via STOMP (Step 3)
    }

    // DELETE /api/messages/{messageId}
    public void deleteMessage(UUID messageId, UUID currentUserId) {
        // 1. Load message; throw 404 if not found
        // 2. Verify message.sender.id == currentUserId OR currentUser is channel ADMIN
        // 3. message.setDeletedAt(Instant.now())
        // 4. message.setContent("[deleted]")
        // 5. Save
        // TODO: broadcast { id, deleted: true } via STOMP (Step 3)
    }

    // GET /api/channels/{channelId}/messages/{messageId}/thread
    public List<MessageResponse> getThreadReplies(UUID messageId, UUID currentUserId) {
        // 1. Load parent message; throw 404 if not found
        // 2. Verify currentUserId is member of the channel
        // 3. messageRepository.findThreadReplies(messageId)
        // 4. Map to MessageResponse list (ASC order)
    }

    // Helper: map Message entity → MessageResponse
    private MessageResponse toResponse(Message message, UUID currentUserId) {
        // Build UserSummary from message.getSender() (null-safe — sender may be deleted)
        // Fetch reactions via messageReactionRepository.findByIdMessageId(message.getId())
        // Group reactions by emoji: ReactionSummary(emoji, count, reactedByMe)
        // replyCount = messageRepository.countReplies(message.getId())
        // isEdited = message.getEditedAt() != null
        // isDeleted = message.getDeletedAt() != null
    }
}
```

### `ReactionService`

```java
@Service
@Transactional
public class ReactionService {

    // POST /api/messages/{messageId}/reactions
    public void addReaction(UUID messageId, String emoji, UUID currentUserId) {
        // 1. Load message; throw 404 if not found
        // 2. Build MessageReactionId(messageId, currentUserId, emoji)
        // 3. If already exists (findById), do nothing (idempotent)
        // 4. Else save new MessageReaction
        // TODO: broadcast updated message reactions via STOMP (Step 3)
    }

    // DELETE /api/messages/{messageId}/reactions/{emoji}
    public void removeReaction(UUID messageId, String emoji, UUID currentUserId) {
        // 1. Build MessageReactionId(messageId, currentUserId, emoji)
        // 2. Delete if exists (deleteById — no-op if already gone)
        // TODO: broadcast updated message reactions via STOMP (Step 3)
    }
}
```

---

## Controllers to Create

### `ChannelController`

```java
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ChannelController {

    @PostMapping("/channels")
    public ResponseEntity<ChannelResponse> createChannel(
        @RequestBody CreateChannelRequest req,
        @AuthenticationPrincipal UserDetails userDetails
    ) { ... }

    @GetMapping("/workspaces/{workspaceId}/channels")
    public ResponseEntity<List<ChannelResponse>> getChannels(
        @PathVariable UUID workspaceId,
        @AuthenticationPrincipal UserDetails userDetails
    ) { ... }

    @PostMapping("/channels/dm")
    public ResponseEntity<ChannelResponse> openDm(
        @RequestBody OpenDmRequest req,
        @AuthenticationPrincipal UserDetails userDetails
    ) { ... }

    @PostMapping("/channels/{channelId}/read")
    public ResponseEntity<Void> markRead(
        @PathVariable UUID channelId,
        @AuthenticationPrincipal UserDetails userDetails
    ) { ... }
}
```

### `MessageController`

```java
@RestController
@RequestMapping("/api/channels/{channelId}/messages")
@RequiredArgsConstructor
public class MessageController {

    @GetMapping
    public ResponseEntity<List<MessageResponse>> getMessages(
        @PathVariable UUID channelId,
        @RequestParam(required = false) UUID before,   // cursor — null means latest
        @AuthenticationPrincipal UserDetails userDetails
    ) { ... }

    @PostMapping
    public ResponseEntity<MessageResponse> sendMessage(
        @PathVariable UUID channelId,
        @RequestBody SendMessageRequest req,
        @AuthenticationPrincipal UserDetails userDetails
    ) { ... }  // returns 201 Created

    @PatchMapping("/{messageId}")
    public ResponseEntity<MessageResponse> editMessage(
        @PathVariable UUID channelId,
        @PathVariable UUID messageId,
        @RequestBody EditMessageRequest req,
        @AuthenticationPrincipal UserDetails userDetails
    ) { ... }

    @DeleteMapping("/{messageId}")
    public ResponseEntity<Void> deleteMessage(
        @PathVariable UUID channelId,
        @PathVariable UUID messageId,
        @AuthenticationPrincipal UserDetails userDetails
    ) { ... }  // returns 204 No Content

    @GetMapping("/{messageId}/thread")
    public ResponseEntity<List<MessageResponse>> getThread(
        @PathVariable UUID channelId,
        @PathVariable UUID messageId,
        @AuthenticationPrincipal UserDetails userDetails
    ) { ... }
}
```

### `ReactionController`

```java
@RestController
@RequestMapping("/api/messages/{messageId}/reactions")
@RequiredArgsConstructor
public class ReactionController {

    @PostMapping
    public ResponseEntity<Void> addReaction(
        @PathVariable UUID messageId,
        @RequestBody AddReactionRequest req,
        @AuthenticationPrincipal UserDetails userDetails
    ) { ... }  // returns 204

    @DeleteMapping("/{emoji}")
    public ResponseEntity<Void> removeReaction(
        @PathVariable UUID messageId,
        @PathVariable String emoji,
        @AuthenticationPrincipal UserDetails userDetails
    ) { ... }  // returns 204
}
```

---

## Error Handling

Use the existing exception handling pattern in the codebase. At minimum:

| Condition | HTTP Status |
|---|---|
| Channel / Message not found | 404 Not Found |
| User not a member of channel | 403 Forbidden |
| Edit/delete attempted by non-sender (non-admin) | 403 Forbidden |
| Missing required field in request body | 400 Bad Request |

---

## What NOT to Do

- Do NOT add STOMP broadcasting in this step — leave `// TODO: broadcast via STOMP (Step 3)` comments wherever it's needed.
- Do NOT hard-delete messages — always soft-delete (`deletedAt = Instant.now()`).
- Do NOT use `FetchType.EAGER` in any new queries.
- Do NOT skip the DM dedup check — always run `findExistingDmChannel` before creating a DM channel.
- Do NOT return deleted message content — replace with `"Message deleted"` in `toResponse()` when `deletedAt != null`.
- Do NOT break the cursor pagination by loading all messages and slicing in memory — use the repository query with `Pageable`.
- Do NOT modify existing controllers, services, or repositories.

---

## Done When

- [ ] All 4 repositories created and compile cleanly
- [ ] All request + response DTOs created
- [ ] `ChannelService` implemented with create, list, openDm, markRead
- [ ] `MessageService` implemented with getMessages, sendMessage, editMessage, deleteMessage, getThreadReplies, toResponse helper
- [ ] `ReactionService` implemented with addReaction, removeReaction (idempotent)
- [ ] All 3 controllers created with correct route mappings
- [ ] Application starts with no errors
- [ ] Manual test via curl or Postman:
  - `POST /api/channels` → creates a channel, returns ChannelResponse
  - `GET /api/workspaces/{id}/channels` → returns channel list with unreadCount
  - `POST /api/channels/dm` (called twice with same users) → returns same channel ID both times
  - `POST /api/channels/{id}/messages` → saves message, returns MessageResponse
  - `GET /api/channels/{id}/messages` → returns up to 50 messages, DESC
  - `DELETE /api/channels/{id}/messages/{id}` → message shows `"Message deleted"` on next GET
  - `POST /api/messages/{id}/reactions` → reaction stored, idempotent on repeat call