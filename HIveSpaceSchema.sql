===========================================================================
---------------------------------------------------------------------------
---------------------- UP AND RUNNING IN THE DB ---------------------------
---------------------------------------------------------------------------

-- =============================================================================
-- SECTION 1: TRIGGER FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';


-- =============================================================================
-- SECTION 2: TENANTS
-- =============================================================================

CREATE TABLE tenants (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR NOT NULL UNIQUE,
  slug        VARCHAR NOT NULL UNIQUE,
  description VARCHAR,
  owner_email VARCHAR NOT NULL,
  owner_id    UUID,
  plan        VARCHAR NOT NULL DEFAULT 'FREE'
                CHECK (plan IN ('FREE', 'PRO', 'ULTIMATE', 'ENTERPRISE')),
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMP NOT NULL DEFAULT now(),
  updated_at  TIMESTAMP NOT NULL DEFAULT now(),

  CONSTRAINT check_slug_lowercase    CHECK (slug = lower(slug)),
  CONSTRAINT check_slug_not_reserved CHECK (slug NOT IN (
    'api', 'app', 'auth', 'invite', 'share', 'admin',
    'billing', 'settings', 'health', 'static', 'support',
    'www', 'dashboard', 'signin', 'signup', 'public',
    'login', 'logout', 'register', 'reset', 'verify'
  ))
);

CREATE TRIGGER trigger_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- =============================================================================
-- SECTION 3: USERS
-- =============================================================================

CREATE TABLE users (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name       VARCHAR,
  username        VARCHAR NOT NULL UNIQUE,
  email           VARCHAR NOT NULL UNIQUE,
  password        VARCHAR NOT NULL,
  avatar_url      VARCHAR,
  avatar_color    VARCHAR,
  bio             TEXT,
  job_title       VARCHAR,
  github_id       BIGINT,
  github_username VARCHAR,
  active          BOOLEAN NOT NULL DEFAULT true,
  tenant_id       UUID REFERENCES tenants(id) ON DELETE SET NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT now(),
  updated_at      TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TRIGGER trigger_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- =============================================================================
-- SECTION 4: TENANTS OWNER FK
-- (Added after users to avoid circular reference)
-- =============================================================================

ALTER TABLE tenants
  ADD CONSTRAINT fk_tenants_owner
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL;


-- =============================================================================
-- SECTION 5: TENANT MEMBERS
-- =============================================================================

CREATE TABLE tenant_members (
  id        UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID    NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id   UUID    NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  role      VARCHAR NOT NULL DEFAULT 'MEMBER'
              CHECK (role IN ('OWNER', 'ADMIN', 'BILLING_ADMIN', 'MEMBER')),
  joined_at TIMESTAMP NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, user_id)
);


-- =============================================================================
-- SECTION 6: WORKSPACES
-- =============================================================================

CREATE TABLE workspaces (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR NOT NULL,
  description VARCHAR,
  tenant_id   UUID    NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_by  UUID    REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT now(),
  updated_at  TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TRIGGER trigger_workspaces_updated_at
  BEFORE UPDATE ON workspaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- =============================================================================
-- SECTION 7: WORKSPACE MEMBERS
-- =============================================================================

CREATE TABLE workspace_members (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID    NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id      UUID    NOT NULL REFERENCES users(id)      ON DELETE CASCADE,
  role         VARCHAR NOT NULL DEFAULT 'MEMBER'
                 CHECK (role IN ('ADMIN', 'MEMBER', 'VIEWER')),
  joined_at    TIMESTAMP NOT NULL DEFAULT now(),

  UNIQUE (workspace_id, user_id)
);


-- =============================================================================
-- SECTION 8: PROJECTS
-- =============================================================================

CREATE TABLE projects (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR NOT NULL,
  description   VARCHAR,
  status        VARCHAR NOT NULL DEFAULT 'ACTIVE'
                  CHECK (status IN ('ACTIVE', 'ARCHIVED', 'COMPLETED')),
  color         VARCHAR,
  workspace_id  UUID    NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by    UUID    REFERENCES users(id) ON DELETE SET NULL,
  start_date    TIMESTAMP,
  end_date      TIMESTAMP,
  task_sequence INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMP NOT NULL DEFAULT now(),
  updated_at    TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TRIGGER trigger_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- =============================================================================
-- SECTION 9: PROJECT MEMBERS
-- =============================================================================

CREATE TABLE project_members (
  id         UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID    NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id    UUID    NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  role       VARCHAR NOT NULL DEFAULT 'MEMBER'
               CHECK (role IN ('LEAD', 'MEMBER', 'VIEWER')),
  joined_at  TIMESTAMP NOT NULL DEFAULT now(),

  UNIQUE (project_id, user_id)
);


-- =============================================================================
-- SECTION 10: TEAMS
-- =============================================================================

CREATE TABLE teams (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR NOT NULL,
  description  VARCHAR,
  workspace_id UUID    NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by   UUID    REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT now(),
  updated_at   TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TRIGGER trigger_teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- =============================================================================
-- SECTION 11: TEAM MEMBERS
-- =============================================================================

CREATE TABLE team_members (
  id        UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id   UUID    NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id   UUID    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role      VARCHAR NOT NULL DEFAULT 'MEMBER'
              CHECK (role IN ('LEAD', 'MEMBER')),
  joined_at TIMESTAMP NOT NULL DEFAULT now(),

  UNIQUE (team_id, user_id)
);


-- =============================================================================
-- SECTION 12: PROJECT TEAMS
-- =============================================================================

CREATE TABLE project_teams (
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  team_id     UUID NOT NULL REFERENCES teams(id)    ON DELETE CASCADE,
  assigned_at TIMESTAMP NOT NULL DEFAULT now(),
  assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,

  PRIMARY KEY (project_id, team_id)
);


-- =============================================================================
-- SECTION 13: TASKS
-- =============================================================================

CREATE TABLE tasks (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  title           VARCHAR NOT NULL,
  description     TEXT,
  status          VARCHAR NOT NULL DEFAULT 'TODO'
                    CHECK (status IN ('TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED')),
  priority        VARCHAR NOT NULL DEFAULT 'MEDIUM'
                    CHECK (priority IN ('URGENT', 'HIGH', 'MEDIUM', 'LOW')),
  due_date        TIMESTAMP,
  points          INTEGER,
  labels          VARCHAR,
  sequence_number INTEGER,
  project_id      UUID    NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  team_id         UUID    REFERENCES teams(id)    ON DELETE SET NULL,
  created_by      UUID    REFERENCES users(id)    ON DELETE SET NULL,
  parent_id       UUID    REFERENCES tasks(id)    ON DELETE CASCADE,
  created_at      TIMESTAMP NOT NULL DEFAULT now(),
  updated_at      TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TRIGGER trigger_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- =============================================================================
-- SECTION 14: TASK ASSIGNEES
-- =============================================================================

CREATE TABLE task_assignees (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     UUID    NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id     UUID    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        VARCHAR NOT NULL DEFAULT 'OWNER'
                CHECK (role IN ('OWNER', 'COLLABORATOR', 'REVIEWER')),
  assigned_at TIMESTAMP NOT NULL DEFAULT now(),

  UNIQUE (task_id, user_id)
);


-- =============================================================================
-- SECTION 15: TASK ACTIVITIES
-- =============================================================================

CREATE TABLE task_activities (
  id         UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id    UUID    NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id    UUID    REFERENCES users(id) ON DELETE SET NULL,
  type       VARCHAR NOT NULL,
  old_value  VARCHAR,
  new_value  VARCHAR,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);


-- =============================================================================
-- SECTION 16: INVITATIONS
-- =============================================================================

CREATE TABLE invitations (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  token        VARCHAR NOT NULL UNIQUE,
  pin_hash     VARCHAR NOT NULL,
  tenant_id    UUID    NOT NULL REFERENCES tenants(id)  ON DELETE CASCADE,
  project_id   UUID    REFERENCES projects(id)          ON DELETE CASCADE,
  inviter_id   UUID    NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  tenant_role  VARCHAR NOT NULL DEFAULT 'MEMBER'
                 CHECK (tenant_role IN ('OWNER', 'ADMIN', 'BILLING_ADMIN', 'MEMBER')),
  max_uses     INTEGER NOT NULL DEFAULT 1,
  current_uses INTEGER NOT NULL DEFAULT 0,
  status       VARCHAR NOT NULL DEFAULT 'ACTIVE'
                 CHECK (status IN ('ACTIVE', 'EXPIRED', 'EXHAUSTED', 'REVOKED')),
  expires_at   TIMESTAMP NOT NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT now()
);


-- =============================================================================
-- SECTION 17: INVITATION ATTEMPTS
-- =============================================================================

CREATE TABLE invitation_attempts (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id UUID    NOT NULL REFERENCES invitations(id) ON DELETE CASCADE,
  ip_address    VARCHAR NOT NULL,
  attempted_at  TIMESTAMP NOT NULL DEFAULT now(),
  success       BOOLEAN NOT NULL DEFAULT false
);


-- =============================================================================
-- SECTION 18: INVITATION WORKSPACES
-- =============================================================================

CREATE TABLE invitation_workspaces (
  invitation_id UUID NOT NULL REFERENCES invitations(id)  ON DELETE CASCADE,
  workspace_id  UUID NOT NULL REFERENCES workspaces(id)   ON DELETE CASCADE,

  PRIMARY KEY (invitation_id, workspace_id)
);


-- =============================================================================
-- SECTION 19: INVITATION TEAMS
-- =============================================================================

CREATE TABLE invitation_teams (
  invitation_id UUID NOT NULL REFERENCES invitations(id) ON DELETE CASCADE,
  team_id       UUID NOT NULL REFERENCES teams(id)       ON DELETE CASCADE,

  PRIMARY KEY (invitation_id, team_id)
);


-- =============================================================================
-- SECTION 20: SHAREABLE LINKS
-- =============================================================================

CREATE TABLE shareable_links (
  id               UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  token            VARCHAR NOT NULL UNIQUE,
  scope_type       VARCHAR NOT NULL
                     CHECK (scope_type IN ('PROJECT', 'WORKSPACE', 'TEAM')),
  project_id       UUID REFERENCES projects(id)   ON DELETE CASCADE,
  workspace_id     UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  team_id          UUID REFERENCES teams(id)      ON DELETE CASCADE,
  created_by       UUID REFERENCES users(id)      ON DELETE SET NULL,
  scope            JSONB,
  password_hash    VARCHAR,
  expires_at       TIMESTAMP,
  last_accessed_at TIMESTAMP,
  access_count     INTEGER NOT NULL DEFAULT 0,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMP NOT NULL DEFAULT now(),

  CONSTRAINT check_exactly_one_scope CHECK (
    (CASE WHEN project_id   IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN workspace_id IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN team_id      IS NOT NULL THEN 1 ELSE 0 END) = 1
  )
);

-- DOCUMENTS
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR NOT NULL DEFAULT 'Untitled',
  icon VARCHAR,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- DOCUMENT CONTENT
CREATE TABLE document_content (
  document_id UUID PRIMARY KEY REFERENCES documents(id) ON DELETE CASCADE,
  content JSONB,                -- ProseMirror JSON from Tiptap
  text_content TEXT,            -- plain text for full-text search
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- DOCUMENT VERSIONS
CREATE TABLE document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  content JSONB NOT NULL,
  saved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- DOCUMENT LINKS (for knowledge graph)
CREATE TABLE document_links (
  source_doc_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  target_doc_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  PRIMARY KEY (source_doc_id, target_doc_id)
);

-- -----------------------------------------------------------------------------
-- NOTIFICATIONS
-- -----------------------------------------------------------------------------

CREATE TABLE notifications (
    id          UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id     UUID         NOT NULL REFERENCES users(id),
    actor_id    UUID                  REFERENCES users(id),
    type        VARCHAR(255) NOT NULL,  -- enum stored as string: 'MENTION'
    content     VARCHAR(255) NOT NULL,
    message_id  UUID                  REFERENCES messages(id),
    channel_id  UUID                  REFERENCES channels(id),
    is_read     BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP    NOT NULL
);

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

==========================================================================
---------------------------------------------------------------------------
---------------------- NOT ADDED IN THE DB YET ----------------------------
---------------------------------------------------------------------------


-- GITHUB CONNECTIONS
CREATE TABLE github_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  github_org_name VARCHAR NOT NULL,
  access_token TEXT NOT NULL,        -- encrypted at rest
  webhook_secret VARCHAR NOT NULL,
  connected_by UUID REFERENCES users(id) ON DELETE SET NULL,
  connected_at TIMESTAMP NOT NULL DEFAULT now()
);

-- GITHUB REPO LINKS
CREATE TABLE github_repo_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  github_repo_full_name VARCHAR NOT NULL,
  linked_by UUID REFERENCES users(id) ON DELETE SET NULL,
  linked_at TIMESTAMP NOT NULL DEFAULT now()
);

-- GITHUB SYNC LOG (prevents infinite loops)
CREATE TABLE github_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action VARCHAR NOT NULL,
  github_event_id VARCHAR,
  processed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- SHAREABLE LINKS (stakeholder progress sharing)
CREATE TABLE shareable_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token VARCHAR NOT NULL UNIQUE,
  scope_type VARCHAR NOT NULL
    CHECK (scope_type IN ('PROJECT', 'WORKSPACE', 'TEAM')),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  scope JSONB,
  password_hash VARCHAR,
  expires_at TIMESTAMP,
  last_accessed_at TIMESTAMP,
  access_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT check_exactly_one_scope CHECK (
    (CASE WHEN project_id IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN workspace_id IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN team_id IS NOT NULL THEN 1 ELSE 0 END) = 1
  )
);

-- FILE UPLOADS
CREATE TABLE file_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  r2_key VARCHAR NOT NULL,            -- full path in Cloudflare R2
  original_filename VARCHAR NOT NULL,
  mime_type VARCHAR NOT NULL,
  size_bytes BIGINT NOT NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- ORG STORAGE TRACKER
CREATE TABLE org_storage (
  tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  used_bytes BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- SUBSCRIPTION
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  stripe_customer_id VARCHAR,
  stripe_subscription_id VARCHAR,
  plan VARCHAR NOT NULL DEFAULT 'FREE'
    CHECK (plan IN ('FREE', 'PRO', 'ULTIMATE', 'ENTERPRISE')),
  seat_count INTEGER NOT NULL DEFAULT 1,
  billing_cycle VARCHAR DEFAULT 'MONTHLY'
    CHECK (billing_cycle IN ('MONTHLY', 'ANNUAL')),
  status VARCHAR NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE', 'PAST_DUE', 'CANCELLED', 'TRIALING')),
  trial_ends_at TIMESTAMP,
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- AT LAST STAGE WE WILL DO INDEXING ON ALL TABLES (add these — critical for performance)
-- INDEXES
CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_tenant_members_user ON tenant_members(user_id);
CREATE INDEX idx_workspace_members_user ON workspace_members(user_id);
CREATE INDEX idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX idx_project_members_user ON project_members(user_id);
CREATE INDEX idx_project_members_project ON project_members(project_id);
CREATE INDEX idx_team_members_user ON team_members(user_id);
CREATE INDEX idx_team_members_team ON team_members(team_id);
CREATE INDEX idx_teams_workspace ON teams(workspace_id);
CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_created_by ON tasks(created_by);
CREATE INDEX idx_task_assignees_task ON task_assignees(task_id);
CREATE INDEX idx_task_assignees_user ON task_assignees(user_id);
CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_shareable_links_token ON shareable_links(token);
CREATE INDEX idx_shareable_links_project ON shareable_links(project_id);
CREATE INDEX idx_shareable_links_workspace ON shareable_links(workspace_id);
CREATE INDEX idx_shareable_links_team ON shareable_links(team_id);
CREATE INDEX idx_shareable_links_token ON shareable_links(token);
CREATE INDEX idx_shareable_links_project ON shareable_links(project_id);
CREATE UNIQUE INDEX idx_tenants_slug_lower ON tenants (lower(slug));
CREATE UNIQUE INDEX idx_tenants_name_lower ON tenants (lower(name));
CREATE INDEX idx_project_teams_project ON project_teams(project_id);
CREATE INDEX idx_project_teams_team ON project_teams(team_id);
-- INDEXES 
CREATE INDEX idx_workspace_members_user ON workspace_members(user_id);
CREATE INDEX idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX idx_team_members_user ON team_members(user_id);
CREATE INDEX idx_team_members_team ON team_members(team_id);
CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_messages_channel ON messages(channel_id);
CREATE INDEX idx_messages_created ON messages(created_at DESC);
CREATE INDEX idx_messages_parent ON messages(parent_id);
CREATE INDEX idx_documents_workspace ON documents(workspace_id);
CREATE INDEX idx_documents_parent ON documents(parent_id);
CREATE INDEX idx_documents_project ON documents(project_id);
CREATE INDEX idx_documents_created_by ON documents(created_by);
CREATE INDEX idx_document_content_updated ON document_content(updated_at);
CREATE INDEX idx_document_versions_doc ON document_versions(document_id);
CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);