-- =============================================================================
-- HIVESPACE — MESSAGING SCHEMA (Phase 3)
-- Run this in Supabase SQL editor AFTER the existing 22 tables are in place.
--
-- Tables added:
--   channels          — workspace/project/team channels + DM channels
--   channel_members   — membership + unread tracking
--   messages          — all messages (channel, thread, DM) with soft-delete
--   message_reactions — emoji reactions per message per user
--
-- DM support: built-in via channels.type = 'DM'
--   • DM channels are stored as regular channels with type='DM'
--   • Scoped to workspace (both users must be workspace members)
--   • Duplicate prevention handled at application layer (see note below)
--   • DM display name derived from the OTHER participant — no name stored in DB
-- =============================================================================


-- -----------------------------------------------------------------------------
-- CHANNELS
-- -----------------------------------------------------------------------------

CREATE TABLE channels (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),

  -- name is required for PUBLIC/PRIVATE/THREAD; NULL for DM channels
  -- DM display name is derived from the other participant at query time
  name         VARCHAR,

  type         VARCHAR NOT NULL DEFAULT 'PUBLIC'
                 CHECK (type IN ('PUBLIC', 'PRIVATE', 'DM', 'THREAD')),

  -- Scope: channels always belong to a workspace.
  -- Optionally scoped further to a project or team (both nullable).
  -- DM channels set project_id = NULL and team_id = NULL.
  workspace_id UUID    NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id   UUID    REFERENCES projects(id)            ON DELETE CASCADE,
  team_id      UUID    REFERENCES teams(id)               ON DELETE CASCADE,

  created_by   UUID    REFERENCES users(id)               ON DELETE SET NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT now(),
  updated_at   TIMESTAMP NOT NULL DEFAULT now(),

  -- PUBLIC/PRIVATE/THREAD channels must have a name
  CONSTRAINT check_named_channels CHECK (
    type = 'DM' OR (name IS NOT NULL AND trim(name) <> '')
  )
);

CREATE TRIGGER trigger_channels_updated_at
  BEFORE UPDATE ON channels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX idx_channels_workspace ON channels(workspace_id);
CREATE INDEX idx_channels_project   ON channels(project_id);
CREATE INDEX idx_channels_team      ON channels(team_id);
CREATE INDEX idx_channels_type      ON channels(type);


-- -----------------------------------------------------------------------------
-- APPLICATION NOTE — DM DEDUPLICATION (no DB-level constraint possible)
--
-- Before creating a new DM channel, query for an existing one:
--
--   SELECT c.id
--   FROM channels c
--   JOIN channel_members cm1 ON cm1.channel_id = c.id AND cm1.user_id = :user_a
--   JOIN channel_members cm2 ON cm2.channel_id = c.id AND cm2.user_id = :user_b
--   WHERE c.type = 'DM'
--     AND c.workspace_id = :workspace_id
--     AND (SELECT COUNT(*) FROM channel_members WHERE channel_id = c.id) = 2
--   LIMIT 1;
--
-- If a row is returned → reuse that channel.
-- Only INSERT a new channel + 2 channel_members rows if no result found.
-- DM channels always have exactly 2 members; enforce at service layer.
-- -----------------------------------------------------------------------------


-- -----------------------------------------------------------------------------
-- CHANNEL MEMBERS
-- -----------------------------------------------------------------------------

CREATE TABLE channel_members (
  channel_id   UUID      NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  user_id      UUID      NOT NULL REFERENCES users(id)    ON DELETE CASCADE,

  -- Tracks the last message the user has read — used to compute unread counts.
  -- NULL means the user has never opened the channel.
  last_read_at TIMESTAMP,

  joined_at    TIMESTAMP NOT NULL DEFAULT now(),

  PRIMARY KEY (channel_id, user_id)
);

-- Reverse lookup: "what channels is this user in?"
CREATE INDEX idx_channel_members_user    ON channel_members(user_id);
CREATE INDEX idx_channel_members_channel ON channel_members(channel_id);


-- -----------------------------------------------------------------------------
-- MESSAGES
-- -----------------------------------------------------------------------------

CREATE TABLE messages (
  id         UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  content    TEXT    NOT NULL,

  type       VARCHAR NOT NULL DEFAULT 'TEXT'
               CHECK (type IN ('TEXT', 'FILE', 'SYSTEM', 'AI')),

  channel_id UUID    NOT NULL REFERENCES channels(id)  ON DELETE CASCADE,
  sender_id  UUID    REFERENCES users(id)              ON DELETE SET NULL,

  -- Non-null for thread replies: points to the root message in the thread.
  -- Thread channels (type=THREAD) broadcast on /topic/thread.{parent_id}.
  parent_id  UUID    REFERENCES messages(id)           ON DELETE CASCADE,

  -- NULL = not edited; set to edit timestamp when user edits.
  edited_at  TIMESTAMP,

  -- Soft delete: set to timestamp when deleted; filter with WHERE deleted_at IS NULL.
  -- Content is replaced with a tombstone string at the service layer on delete,
  -- so the message row is preserved for thread integrity.
  deleted_at TIMESTAMP,

  created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- General purpose indexes
CREATE INDEX idx_messages_channel ON messages(channel_id);
CREATE INDEX idx_messages_sender  ON messages(sender_id);
CREATE INDEX idx_messages_parent  ON messages(parent_id);

-- Critical performance index: powers the common "list active messages in a channel"
-- query (ORDER BY created_at DESC, WHERE deleted_at IS NULL) without scanning
-- deleted rows. This is the hot path for every channel open.
CREATE INDEX idx_messages_channel_active
  ON messages(channel_id, created_at DESC)
  WHERE deleted_at IS NULL;


-- -----------------------------------------------------------------------------
-- MESSAGE REACTIONS
-- -----------------------------------------------------------------------------

CREATE TABLE message_reactions (
  message_id UUID    NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id    UUID    NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  emoji      VARCHAR NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),

  -- One reaction per user per emoji per message
  PRIMARY KEY (message_id, user_id, emoji)
);

CREATE INDEX idx_message_reactions_message ON message_reactions(message_id);


-- =============================================================================
-- SUMMARY
-- =============================================================================
-- Tables added   : channels, channel_members, messages, message_reactions
-- Indexes added  : 11 (including 1 partial index for soft-delete hot path)
-- Triggers added : 1 (channels updated_at)
-- DM support     : YES — channels.type = 'DM', dedup at app layer
-- Thread support : YES — messages.parent_id → STOMP /topic/thread.{id}
-- Unread counts  : YES — channel_members.last_read_at vs messages.created_at
-- Soft deletes   : YES — messages.deleted_at, tombstone content at service layer
-- =============================================================================