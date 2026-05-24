===========================================================================
---------------------------------------------------------------------------
---------------------- UP AND RUNNING IN THE DB ---------------------------
---------------------------------------------------------------------------

-- Trigger function for auto-updating updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- TENANTS
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  slug VARCHAR NOT NULL,
  description VARCHAR,
  owner_email VARCHAR NOT NULL,
  owner_id UUID,
  plan VARCHAR NOT NULL DEFAULT 'FREE'
    CHECK (plan IN ('FREE', 'PRO', 'ULTIMATE', 'ENTERPRISE')),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT check_slug_lowercase CHECK (slug = lower(slug))
);

-- USERS
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR,
  username VARCHAR NOT NULL UNIQUE,
  email VARCHAR NOT NULL UNIQUE,
  password VARCHAR NOT NULL,
  avatar_url VARCHAR,
  bio TEXT,
  job_title VARCHAR,
  github_id BIGINT,
  github_username VARCHAR,
  avatar_color VARCHAR,
  active BOOLEAN NOT NULL DEFAULT true,
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- ADD FK CONSTRAINT FOR TENANTS OWNER (AVOIDS CIRCULAR REFERENCE AT TABLE CREATION)
ALTER TABLE tenants ADD CONSTRAINT fk_tenants_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL;

-- TRIGGERS TO AUTO-UPDATE updated_at
CREATE TRIGGER trigger_update_tenants_updated_at
BEFORE UPDATE ON tenants
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


-- TENANT MEMBERS
CREATE TABLE tenant_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR NOT NULL DEFAULT 'MEMBER'
    CHECK (role IN ('OWNER', 'ADMIN', 'BILLING_ADMIN', 'MEMBER')),
  joined_at TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id)
);

-- WORKSPACES
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  description VARCHAR,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- WORKSPACE MEMBERS
CREATE TABLE workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR NOT NULL DEFAULT 'MEMBER'
    CHECK (role IN ('ADMIN', 'MEMBER', 'VIEWER')),
  joined_at TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, user_id)
);

-- PROJECTS
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  description VARCHAR,
  status VARCHAR NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE', 'ARCHIVED', 'COMPLETED')),
  color VARCHAR,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- PROJECT MEMBERS
CREATE TABLE project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR NOT NULL DEFAULT 'MEMBER'
    CHECK (role IN ('LEAD', 'MEMBER', 'VIEWER')),
  joined_at TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE (project_id, user_id)
);

-- PROJECTS TEAMS 
CREATE TABLE project_teams (
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP NOT NULL DEFAULT now(),
  assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
  PRIMARY KEY (project_id, team_id)
);

-- TEAMS
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  description VARCHAR,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- TEAM MEMBERS
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR NOT NULL DEFAULT 'MEMBER'
    CHECK (role IN ('LEAD', 'MEMBER')),
  joined_at TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE (team_id, user_id)
);

-- TASKS
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR NOT NULL,
  description TEXT,
  status VARCHAR NOT NULL DEFAULT 'TODO'
    CHECK (status IN ('TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED')),
  priority VARCHAR NOT NULL DEFAULT 'MEDIUM'
    CHECK (priority IN ('URGENT', 'HIGH', 'MEDIUM', 'LOW')),
  due_date TIMESTAMP,
  points INTEGER,
  labels VARCHAR,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  parent_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- TASK ASSIGNEES
CREATE TABLE task_assignees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR NOT NULL DEFAULT 'OWNER'
    CHECK (role IN ('OWNER', 'COLLABORATOR', 'REVIEWER')),
  assigned_at TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE (task_id, user_id)
);

-- TASK ACTIVITIES
CREATE TABLE task_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  type VARCHAR NOT NULL,
  old_value VARCHAR,
  new_value VARCHAR,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- INVITATIONS
CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token VARCHAR NOT NULL UNIQUE,
  pin_hash VARCHAR NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  inviter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR NOT NULL DEFAULT 'MEMBER',
  max_uses INTEGER NOT NULL DEFAULT 1,
  current_uses INTEGER NOT NULL DEFAULT 0,
  status VARCHAR NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE', 'EXPIRED', 'EXHAUSTED', 'REVOKED')),
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- INVITATION ATTEMPTS
CREATE TABLE invitation_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id UUID NOT NULL REFERENCES invitations(id) ON DELETE CASCADE,
  ip_address VARCHAR NOT NULL,
  attempted_at TIMESTAMP NOT NULL DEFAULT now(),
  success BOOLEAN NOT NULL DEFAULT false
);

-- INVITATION WORKSPACES
CREATE TABLE invitation_workspaces (
  invitation_id UUID NOT NULL REFERENCES invitations(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  PRIMARY KEY (invitation_id, workspace_id)
);

-- INVITATION TEAMS
CREATE TABLE invitation_teams (
  invitation_id UUID NOT NULL REFERENCES invitations(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  PRIMARY KEY (invitation_id, team_id)
);

==========================================================================
---------------------------------------------------------------------------
---------------------- NOT ADDED IN THE DB YET ----------------------------
---------------------------------------------------------------------------

-- CHANNELS
CREATE TABLE channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  type VARCHAR NOT NULL DEFAULT 'PUBLIC'
    CHECK (type IN ('PUBLIC', 'PRIVATE', 'DM', 'THREAD')),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- CHANNEL MEMBERS
CREATE TABLE channel_members (
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_read_at TIMESTAMP,
  joined_at TIMESTAMP NOT NULL DEFAULT now(),
  PRIMARY KEY (channel_id, user_id)
);

-- MESSAGES
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  type VARCHAR NOT NULL DEFAULT 'TEXT'
    CHECK (type IN ('TEXT', 'FILE', 'SYSTEM', 'AI')),
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
  parent_id UUID REFERENCES messages(id) ON DELETE CASCADE,  -- threads
  edited_at TIMESTAMP,
  deleted_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- MESSAGE REACTIONS
CREATE TABLE message_reactions (
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji VARCHAR NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id, emoji)
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
CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);