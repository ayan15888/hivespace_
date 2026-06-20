# Hivespace — Step 1: JPA Entities for Messaging

## Context

You are working on **Hivespace**, a combined Jira + Slack + Notion platform.  
Stack: **Spring Boot (Java)**, **Supabase (PostgreSQL)**, **Spring Security + JWT**.

**The messaging schema has already been run in Supabase.** These four tables now exist:

| Table | Notes |
|---|---|
| `channels` | Has `id`, `name` (nullable for DMs), `type` (PUBLIC/PRIVATE/DM/THREAD), `workspace_id`, `project_id` (nullable), `team_id` (nullable), `created_by`, `created_at`, `updated_at` |
| `channel_members` | Composite PK: `(channel_id, user_id)`. Has `last_read_at`, `joined_at` |
| `messages` | Has `id`, `content`, `type` (TEXT/FILE/SYSTEM/AI), `channel_id`, `sender_id`, `parent_id` (self-ref for threads, nullable), `edited_at`, `deleted_at` (soft delete), `created_at` |
| `message_reactions` | Composite PK: `(message_id, user_id, emoji)`. Has `created_at` |

The existing entities you must reference (already in the codebase, do NOT recreate):
- `com.hivespace.backend.entity.User`
- `com.hivespace.backend.entity.Workspace`
- `com.hivespace.backend.entity.Project`
- `com.hivespace.backend.entity.Team`

The existing enums package is `com.hivespace.backend.enums`.  
The existing entity package is `com.hivespace.backend.entity`.

---

## Your Task

Create **4 new JPA entity classes** and **2 new enums** in the correct packages.  
Do not touch anything outside of these new files.

---

## Enums to Create

### `com.hivespace.backend.enums.ChannelType`
```java
public enum ChannelType {
    PUBLIC, PRIVATE, DM, THREAD
}
```

### `com.hivespace.backend.enums.MessageType`
```java
public enum MessageType {
    TEXT, FILE, SYSTEM, AI
}
```

---

## Entities to Create

### 1. `com.hivespace.backend.entity.Channel`

```java
@Entity
@Table(name = "channels")
public class Channel {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "name")
    private String name;  // null for DM channels — do NOT mark as nullable=false

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false)
    private ChannelType type;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workspace_id", nullable = false)
    private Workspace workspace;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id")
    private Project project;  // nullable

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "team_id")
    private Team team;  // nullable

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    // getters + setters or use Lombok @Getter @Setter
}
```

**Key notes:**
- `name` is nullable — DM channels have no name.
- `project` and `team` are both nullable — channels can be workspace-scoped, project-scoped, or team-scoped.
- All `@ManyToOne` use `FetchType.LAZY` — never EAGER.
- `createdAt` is `updatable = false` — the DB trigger owns `updated_at`.

---

### 2. `com.hivespace.backend.entity.ChannelMember`

This entity uses a **composite primary key**.

First, create the embeddable key class:

```java
// com.hivespace.backend.entity.ChannelMemberId
@Embeddable
public class ChannelMemberId implements Serializable {

    @Column(name = "channel_id")
    private UUID channelId;

    @Column(name = "user_id")
    private UUID userId;

    // equals(), hashCode(), no-arg constructor, all-arg constructor
}
```

Then the entity:

```java
@Entity
@Table(name = "channel_members")
public class ChannelMember {

    @EmbeddedId
    private ChannelMemberId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("channelId")
    @JoinColumn(name = "channel_id")
    private Channel channel;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("userId")
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "last_read_at")
    private Instant lastReadAt;  // nullable — null means never read

    @Column(name = "joined_at", nullable = false, updatable = false)
    private Instant joinedAt;

    // getters + setters
}
```

---

### 3. `com.hivespace.backend.entity.Message`

```java
@Entity
@Table(name = "messages")
public class Message {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "content", nullable = false)
    private String content;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false)
    private MessageType type;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "channel_id", nullable = false)
    private Channel channel;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_id")
    private User sender;  // nullable (user may be deleted)

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private Message parent;  // nullable — null means root message, non-null means thread reply

    @Column(name = "edited_at")
    private Instant editedAt;  // null until first edit

    @Column(name = "deleted_at")
    private Instant deletedAt;  // null until soft-deleted

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    // getters + setters
}
```

**Key notes:**
- `parent` is a self-referencing `@ManyToOne` on the same `messages` table via `parent_id`.
- `deletedAt` being non-null means the message is soft-deleted. Never hard-delete rows.
- Do NOT add a `@OneToMany replies` collection — it is never fetched eagerly and the count is computed via query.

---

### 4. `com.hivespace.backend.entity.MessageReaction`

This entity uses a **composite primary key** with three fields.

First, the embeddable key:

```java
// com.hivespace.backend.entity.MessageReactionId
@Embeddable
public class MessageReactionId implements Serializable {

    @Column(name = "message_id")
    private UUID messageId;

    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "emoji")
    private String emoji;

    // equals(), hashCode(), no-arg constructor, all-arg constructor
}
```

Then the entity:

```java
@Entity
@Table(name = "message_reactions")
public class MessageReaction {

    @EmbeddedId
    private MessageReactionId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("messageId")
    @JoinColumn(name = "message_id")
    private Message message;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("userId")
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    // getters + setters
}
```

---

## Hibernate / ddl-auto Requirement

`spring.jpa.hibernate.ddl-auto=validate` is set in application properties.  
After you create these entities, **restart the application** and confirm:

- No `SchemaManagementException` is thrown
- No `Missing table` or `Missing column` errors in the logs
- Application starts cleanly on the `/health` endpoint

If validation fails, check column name mappings (`@Column(name=...)`) against the actual table DDL above.

---

## What NOT to Do

- Do NOT create repositories or services in this step — entities only.
- Do NOT add `@OneToMany` collections to any entity — they are not needed and will cause N+1 problems.
- Do NOT use `GenerationType.IDENTITY` — use `GenerationType.UUID`.
- Do NOT mark `Channel.name` as `nullable = false` — DM channels have a null name by design.
- Do NOT use `FetchType.EAGER` anywhere.
- Do NOT modify any existing entity (`User`, `Workspace`, `Project`, `Team`).
- Do NOT run any new SQL — the schema is already in the database.

---

## Done When

- [ ] `ChannelType` enum created
- [ ] `MessageType` enum created  
- [ ] `Channel.java` entity created with correct nullable fields
- [ ] `ChannelMemberId.java` embeddable created with correct `equals()` and `hashCode()`
- [ ] `ChannelMember.java` entity created with `@EmbeddedId` + `@MapsId`
- [ ] `Message.java` entity created with self-referencing `parent` field
- [ ] `MessageReactionId.java` embeddable created
- [ ] `MessageReaction.java` entity created
- [ ] Application starts and `ddl-auto=validate` passes with no errors