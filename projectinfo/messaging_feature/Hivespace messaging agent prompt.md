# Hivespace — Phase 3 Messaging Implementation Prompt
## For: Coding Agent (Claude Code / Cursor / similar)

---

## What You Are Building

Replace the current **mock/static chat UI** with a fully working real-time messaging system.  
This is Phase 3 of Hivespace — a Jira + Slack + Notion combined platform.

The result must support:
- Public and private workspace/project/team channels
- Direct Messages (DM) between two users in the same workspace
- Threaded replies
- Emoji reactions
- Unread counts
- Typing indicators (ephemeral, no DB)
- Cursor-based pagination (load older messages on scroll)
- STOMP WebSocket for real-time delivery + REST for history/reliability

---

## Stack Context

| Layer | Technology |
|---|---|
| Frontend | Next.js (App Router), Tailwind CSS, ShadCN UI |
| Backend | Spring Boot (Java) |
| Database | Supabase (PostgreSQL) |
| Auth | Spring Security + JWT — every request carries `Authorization: Bearer <jwt>` |
| Real-time | STOMP WebSocket via `spring-websocket` — client uses `@stomp/stompjs` + `sockjs-client` |
| Cache | Upstash Redis — for unread count caching |
| State | Zustand stores |

---

## Step 0 — Run the Messaging Schema

Run the following SQL in Supabase SQL editor **before touching any code**:

```sql
-- CHANNELS
CREATE TABLE channels (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR,
  type         VARCHAR NOT NULL DEFAULT 'PUBLIC'
                 CHECK (type IN ('PUBLIC', 'PRIVATE', 'DM', 'THREAD')),
  workspace_id UUID    NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id   UUID    REFERENCES projects(id)            ON DELETE CASCADE,
  team_id      UUID    REFERENCES teams(id)               ON DELETE CASCADE,
  created_by   UUID    REFERENCES users(id)               ON DELETE SET NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT now(),
  updated_at   TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT check_named_channels CHECK (
    type = 'DM' OR (name IS NOT NULL AND trim(name) <> '')
  )
);

CREATE TRIGGER trigger_channels_updated_at
  BEFORE UPDATE ON channels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_channels_workspace ON channels(workspace_id);
CREATE INDEX idx_channels_project   ON channels(project_id);
CREATE INDEX idx_channels_team      ON channels(team_id);
CREATE INDEX idx_channels_type      ON channels(type);

-- CHANNEL MEMBERS
CREATE TABLE channel_members (
  channel_id   UUID      NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  user_id      UUID      NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  last_read_at TIMESTAMP,
  joined_at    TIMESTAMP NOT NULL DEFAULT now(),
  PRIMARY KEY (channel_id, user_id)
);

CREATE INDEX idx_channel_members_user    ON channel_members(user_id);
CREATE INDEX idx_channel_members_channel ON channel_members(channel_id);

-- MESSAGES
CREATE TABLE messages (
  id         UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  content    TEXT    NOT NULL,
  type       VARCHAR NOT NULL DEFAULT 'TEXT'
               CHECK (type IN ('TEXT', 'FILE', 'SYSTEM', 'AI')),
  channel_id UUID    NOT NULL REFERENCES channels(id)  ON DELETE CASCADE,
  sender_id  UUID    REFERENCES users(id)              ON DELETE SET NULL,
  parent_id  UUID    REFERENCES messages(id)           ON DELETE CASCADE,
  edited_at  TIMESTAMP,
  deleted_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_channel ON messages(channel_id);
CREATE INDEX idx_messages_sender  ON messages(sender_id);
CREATE INDEX idx_messages_parent  ON messages(parent_id);
CREATE INDEX idx_messages_channel_active
  ON messages(channel_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- MESSAGE REACTIONS
CREATE TABLE message_reactions (
  message_id UUID    NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id    UUID    NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  emoji      VARCHAR NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id, emoji)
);

CREATE INDEX idx_message_reactions_message ON message_reactions(message_id);
```

Verify `ddl-auto=validate` still passes after running this.

---

## Step 1 — Backend: Data Models (JPA Entities)

Create these in `com.hivespace.backend.entity`:

### Channel.java
```java
@Entity @Table(name = "channels")
public class Channel {
    @Id @GeneratedValue UUID id;
    String name;                         // null for DM channels
    @Enumerated(EnumType.STRING) ChannelType type;  // PUBLIC, PRIVATE, DM, THREAD
    @ManyToOne Workspace workspace;
    @ManyToOne Project project;          // nullable
    @ManyToOne Team team;                // nullable
    @ManyToOne(fetch = LAZY) User createdBy;
    Instant createdAt;
    Instant updatedAt;
}
```

### ChannelMember.java (composite PK)
```java
@Entity @Table(name = "channel_members")
public class ChannelMember {
    @EmbeddedId ChannelMemberId id;      // { channelId, userId }
    Instant lastReadAt;
    Instant joinedAt;
}
```

### Message.java
```java
@Entity @Table(name = "messages")
public class Message {
    @Id @GeneratedValue UUID id;
    @Column(nullable = false) String content;
    @Enumerated(EnumType.STRING) MessageType type;  // TEXT, FILE, SYSTEM, AI
    @ManyToOne Channel channel;
    @ManyToOne(fetch = LAZY) User sender;
    @ManyToOne(fetch = LAZY) Message parent;        // thread parent; null for root
    Instant editedAt;
    Instant deletedAt;
    Instant createdAt;
}
```

### MessageReaction.java (composite PK)
```java
@Entity @Table(name = "message_reactions")
public class MessageReaction {
    @EmbeddedId MessageReactionId id;   // { messageId, userId, emoji }
    Instant createdAt;
}
```

---

## Step 2 — Backend: REST Endpoints

### ChannelController  `POST /api/channels`
Create a channel. Body: `{ name, type, workspaceId, projectId?, teamId? }`  
Auth: workspace MEMBER or above. PRIVATE requires ADMIN/LEAD.

### ChannelController  `GET /api/workspaces/{workspaceId}/channels`
List all channels the authenticated user is a member of, in the given workspace.  
Include `unreadCount` in each item (COUNT messages after `last_read_at`).

### ChannelController  `POST /api/channels/dm`
Start or retrieve a DM channel with another user.  
Body: `{ workspaceId, targetUserId }`  
**Before creating**: run the dedup query below. Return existing channel if found.

DM dedup query:
```sql
SELECT c.id FROM channels c
JOIN channel_members cm1 ON cm1.channel_id = c.id AND cm1.user_id = :currentUserId
JOIN channel_members cm2 ON cm2.channel_id = c.id AND cm2.user_id = :targetUserId
WHERE c.type = 'DM'
  AND c.workspace_id = :workspaceId
  AND (SELECT COUNT(*) FROM channel_members WHERE channel_id = c.id) = 2
LIMIT 1;
```
If not found: INSERT channel (type=DM, name=null) + two channel_members rows.

### MessageController  `GET /api/channels/{channelId}/messages`
Query params: `limit=50` (default), `before={messageId}` (cursor for older).  
Return messages WHERE deleted_at IS NULL, ORDER BY created_at DESC, LIMIT 50.  
For deleted messages that are thread parents: return tombstone `{ content: "Message deleted", isDeleted: true }` so the thread UI doesn't break.

### MessageController  `POST /api/channels/{channelId}/messages`
Save to DB, then STOMP broadcast to `/topic/channel.{channelId}`.  
**Do not** wait for broadcast to return 201 — fire-and-forget after save.

### MessageController  `PATCH /api/messages/{messageId}`
Edit a message. Only the sender can edit. Sets `edited_at = now()`.  
After save, broadcast updated message to `/topic/channel.{channelId}`.

### MessageController  `DELETE /api/messages/{messageId}`
Soft delete: set `deleted_at = now()`, replace content with `"[deleted]"`.  
Only sender or channel ADMIN can delete.  
After save, broadcast `{ id, deleted: true }` to `/topic/channel.{channelId}`.

### MessageController  `GET /api/channels/{channelId}/messages/{messageId}/thread`
Fetch thread replies: messages WHERE parent_id = :messageId AND deleted_at IS NULL.

### ReactionController  `POST /api/messages/{messageId}/reactions`
Body: `{ emoji }`. Upsert reaction row. Broadcast to `/topic/channel.{channelId}`.

### ReactionController  `DELETE /api/messages/{messageId}/reactions/{emoji}`
Delete reaction row. Broadcast update to `/topic/channel.{channelId}`.

### ChannelMemberController  `POST /api/channels/{channelId}/read`
Update `channel_members.last_read_at = now()` for the current user.  
Call this when the user opens a channel or scrolls to the bottom.

---

## Step 3 — Backend: STOMP WebSocket

### WebSocketConfig.java
```java
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")
                .withSockJS();
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic", "/queue");
        registry.setApplicationDestinationPrefixes("/app");
    }
}
```

### STOMP Topics
| Topic | Payload | When |
|---|---|---|
| `/topic/channel.{channelId}` | Full MessageResponse | New message, edit, delete, reaction |
| `/topic/thread.{parentMessageId}` | Full MessageResponse | New thread reply |
| `/topic/typing.{channelId}` | `{ userId, displayName, typing: true/false }` | Typing indicator (ephemeral) |

### Typing Indicator Endpoint (no DB)
```java
@MessageMapping("/channel/{channelId}/typing")
public void handleTyping(@DestinationVariable UUID channelId,
                         @Payload TypingPayload payload,
                         Principal principal) {
    // Broadcast to channel, never touch DB
    messagingTemplate.convertAndSend(
        "/topic/typing." + channelId,
        Map.of("userId", principal.getName(), "typing", payload.isTyping())
    );
}
```
Frontend clears typing indicator after 3 seconds if no further typing event.

### JWT Authentication for WebSocket
Add a STOMP interceptor that reads the JWT from the `Authorization` header in the CONNECT frame and sets the Spring Security principal. Reuse the same `JwtService` used for REST.

---

## Step 4 — Backend: MessageResponse DTO

```java
public record MessageResponse(
    UUID id,
    String content,
    MessageType type,
    UUID channelId,
    UserSummary sender,        // { id, fullName, avatarUrl, avatarColor }
    UUID parentId,
    boolean isEdited,
    boolean isDeleted,
    Instant createdAt,
    Instant editedAt,
    List<ReactionSummary> reactions,  // { emoji, count, reactedByMe }
    int replyCount             // COUNT of non-deleted thread replies
) {}
```

---

## Step 5 — Frontend: API Client

Create `lib/api/channels.ts` and `lib/api/messages.ts` with typed functions:

```typescript
// channels.ts
export async function getWorkspaceChannels(workspaceId: string): Promise<ChannelWithUnread[]>
export async function createChannel(data: CreateChannelRequest): Promise<Channel>
export async function openDm(workspaceId: string, targetUserId: string): Promise<Channel>
export async function markChannelRead(channelId: string): Promise<void>

// messages.ts
export async function getMessages(channelId: string, before?: string): Promise<MessageResponse[]>
export async function sendMessage(channelId: string, content: string): Promise<MessageResponse>
export async function editMessage(messageId: string, content: string): Promise<MessageResponse>
export async function deleteMessage(messageId: string): Promise<void>
export async function getThreadMessages(channelId: string, parentId: string): Promise<MessageResponse[]>
export async function addReaction(messageId: string, emoji: string): Promise<void>
export async function removeReaction(messageId: string, emoji: string): Promise<void>
```

---

## Step 6 — Frontend: STOMP WebSocket Hook

Create `hooks/useChannelSocket.ts`:

```typescript
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

export function useChannelSocket(channelId: string, onMessage: (msg: MessageResponse) => void) {
  const clientRef = useRef<Client | null>(null);

  useEffect(() => {
    const client = new Client({
      webSocketFactory: () => new SockJS(`${process.env.NEXT_PUBLIC_API_URL}/ws`),
      connectHeaders: { Authorization: `Bearer ${getToken()}` },
      onConnect: () => {
        client.subscribe(`/topic/channel.${channelId}`, (frame) => {
          const message = JSON.parse(frame.body) as MessageResponse;
          onMessage(message);
        });
        client.subscribe(`/topic/typing.${channelId}`, (frame) => {
          // handle typing indicator
        });
      },
    });
    client.activate();
    clientRef.current = client;
    return () => { client.deactivate(); };
  }, [channelId]);

  const sendTyping = useCallback((typing: boolean) => {
    clientRef.current?.publish({
      destination: `/app/channel/${channelId}/typing`,
      body: JSON.stringify({ typing }),
    });
  }, [channelId]);

  return { sendTyping };
}
```

---

## Step 7 — Frontend: Zustand Chat Store

Create `store/chatStore.ts`:

```typescript
interface ChatStore {
  // Channels
  channels: Record<string, ChannelWithUnread[]>;   // keyed by workspaceId
  activeChannelId: string | null;

  // Messages keyed by channelId
  messages: Record<string, MessageResponse[]>;
  hasMoreMessages: Record<string, boolean>;

  // Thread state
  activeThreadParentId: string | null;
  threadMessages: Record<string, MessageResponse[]>;

  // Typing indicators
  typingUsers: Record<string, TypingUser[]>;        // keyed by channelId

  // Actions
  setActiveChannel: (channelId: string) => void;
  appendMessage: (channelId: string, message: MessageResponse) => void;
  prependOlderMessages: (channelId: string, messages: MessageResponse[], hasMore: boolean) => void;
  updateMessage: (channelId: string, updated: MessageResponse) => void;
  removeMessage: (channelId: string, messageId: string) => void;
  setTyping: (channelId: string, userId: string, name: string, typing: boolean) => void;
  decrementUnread: (channelId: string) => void;
}
```

---

## Step 8 — Frontend: Chat Page

Replace the mock chat page at `app/(auth)/dashboard/channels/[channelId]/page.tsx`.

### What to Replace / Wire Up

1. **Channel header** — fetch real channel name, description, member count via API. Remove hardcoded mock values.

2. **Message list** — replace mock array with `messages` from store. Render from `getMessages()`. Scroll to bottom on first load. Implement infinite scroll upward (`before={oldestMessageId}`) to load older messages.

3. **Real-time updates** — mount `useChannelSocket`. On incoming message: `appendMessage()`. On edit/delete: `updateMessage()`. On reaction: `updateMessage()`.

4. **Send bar** — wire compose input to `sendMessage()`. Optimistic append with a temp ID, reconcile after API confirms. On keypress, call `sendTyping(true)`; debounce `sendTyping(false)` 3s.

5. **Typing indicator** — render `typingUsers[channelId]` as ephemeral bar above compose: `"Meera V. is typing…"`. Auto-clear after 3s via timeout.

6. **Thread panel** — on click of reply count chip, slide in 320px right panel. Mount `useChannelSocket` on thread topic. Fetch `getThreadMessages()`. Send to same `sendMessage()` with `parentId` in payload.

7. **Reactions** — on hover of message, show emoji picker. Call `addReaction()` or `removeReaction()`. Update store optimistically.

8. **Mark read** — call `markChannelRead()` when channel is opened and when user scrolls to bottom.

9. **Edit / Delete** — hover → show `...` menu → Edit (inline content editable) or Delete (soft, show tombstone).

### DM Channel Access
Route: `app/(auth)/dashboard/dm/[userId]/page.tsx`  
On mount: call `openDm(workspaceId, userId)` → get or create DM channel → route to that `channelId` and render the same `ChatPage` component. No special DM component needed — same UI, same WebSocket.

---

## Step 9 — Frontend: Channel Sidebar

Replace mock channel list in `WorkspaceSidebar.tsx`:

1. On workspace load: call `getWorkspaceChannels(workspaceId)` → populate store.
2. Group channels: **Channels** section (PUBLIC/PRIVATE) + **Direct Messages** section (DM).
3. For DM channels: display the OTHER participant's name and avatar (filter `channel.members` where `userId !== currentUserId`).
4. Unread dot: 6px solid `#F95B4E` beside channel name when `unreadCount > 0`. No number inside dot (per design system).
5. On click → `setActiveChannel(channelId)` → navigate to channel page → call `markChannelRead()`.
6. **New DM button** (+ icon in DMs section) → open member picker modal → call `openDm()`.

---

## Step 10 — Unread Count Caching (optional, improve later)

Simple approach for now: compute unread counts via SQL on each `getWorkspaceChannels` call:
```sql
SELECT COUNT(*) FROM messages
WHERE channel_id = :channelId
  AND created_at > :lastReadAt
  AND deleted_at IS NULL
  AND sender_id != :currentUserId
```

Later (Phase 6 optimisation): cache per-user unread counts in Upstash Redis, invalidate on new message, decrement on read.

---

## What NOT to Do

- Do NOT use Supabase Auth — Spring Security + JWT is the only auth system.
- Do NOT use Supabase Realtime for messaging — STOMP is the real-time layer.
- Do NOT store typing indicator state in the database — ephemeral WebSocket only.
- Do NOT block the `POST /api/messages` response waiting for STOMP broadcast to complete.
- Do NOT allow `IN_PROGRESS → DONE` task status jump — this is enforced elsewhere, not related but do not accidentally revert it.
- Do NOT use `tasks.assignee_id` — `task_assignees` table is sole source of truth.

---

## Acceptance Criteria

- [ ] A user can open a public channel and see real messages from the database
- [ ] A user can send a message and it appears in real-time for all other members in the channel without a page refresh
- [ ] A user can start a DM with another workspace member — no duplicate DM channels created
- [ ] A user can reply in a thread — thread count updates in the parent message
- [ ] Typing indicator appears and disappears (within 3 seconds) without any database writes
- [ ] Emoji reactions can be added and removed; counts update in real-time
- [ ] Scrolling to the top loads 50 more messages (cursor pagination)
- [ ] Unread dot appears on channels with messages newer than `last_read_at`
- [ ] Unread dot clears when the user opens the channel
- [ ] Soft-deleted messages show `[deleted]` tombstone and do not break threads
- [ ] DM channels appear in a separate "Direct Messages" section in the sidebar
- [ ] `ddl-auto=validate` passes with no errors after schema migration

---

*Hivespace Phase 3 — Messaging*  
*Schema: hivespace_messaging_schema.sql*  
*Context: Context_4.md (current)*