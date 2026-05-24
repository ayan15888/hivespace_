-- =============================================================================
-- HIVESPACE — COMPLETE DATABASE SCHEMA
-- =============================================================================
-- Run this entire file in Supabase SQL editor on a fresh database.
-- Table order matters — do not reorder without checking FK dependencies.
-- =============================================================================

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
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR NOT NULL UNIQUE,
  slug         VARCHAR NOT NULL UNIQUE,
  description  VARCHAR,
  owner_email  VARCHAR NOT NULL,
  owner_id     UUID,                          -- FK added after users table
  plan         VARCHAR NOT NULL DEFAULT 'FREE'
                 CHECK (plan IN ('FREE', 'PRO', 'ULTIMATE', 'ENTERPRISE')),
  active       BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMP NOT NULL DEFAULT now(),
  updated_at   TIMESTAMP NOT NULL DEFAULT now(),

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
  password        VARCHAR NOT NULL,             -- BCrypt hashed, never plain
  avatar_url      VARCHAR,
  avatar_color    VARCHAR,                       -- hex color e.g. #6366f1
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
-- SECTION 4: BACK-FILL FK FROM TENANTS → USERS
-- (Avoids circular reference at CREATE time)
-- =============================================================================

ALTER TABLE tenants
  ADD CONSTRAINT fk_tenants_owner
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL;


-- =============================================================================
-- SECTION 5: TENANT MEMBERS
-- =============================================================================

CREATE TABLE tenant_members (
  id         UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID    NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id    UUID    NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  role       VARCHAR NOT NULL DEFAULT 'MEMBER'
               CHECK (role IN ('OWNER', 'ADMIN', 'BILLING_ADMIN', 'MEMBER')),
  joined_at  TIMESTAMP NOT NULL DEFAULT now(),

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
  task_sequence INTEGER NOT NULL DEFAULT 0,     -- atomic counter for HS-001 identifiers
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
-- (Must come BEFORE project_teams due to FK dependency)
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
-- (Many-to-many: a team can be assigned to multiple projects)
-- (Must come AFTER both projects and teams tables)
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
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  title       VARCHAR NOT NULL,
  description TEXT,
  status      VARCHAR NOT NULL DEFAULT 'TODO'
                CHECK (status IN ('TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED')),
  priority    VARCHAR NOT NULL DEFAULT 'MEDIUM'
                CHECK (priority IN ('URGENT', 'HIGH', 'MEDIUM', 'LOW')),
  due_date    TIMESTAMP,
  points      INTEGER,                            -- story points for sprint planning
  labels      VARCHAR,                            -- comma-separated tags
  project_id  UUID    NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  team_id     UUID    REFERENCES teams(id)    ON DELETE SET NULL,
  created_by  UUID    REFERENCES users(id)    ON DELETE SET NULL,
  parent_id   UUID    REFERENCES tasks(id)    ON DELETE CASCADE,  -- subtasks (max 1 level deep)
  created_at  TIMESTAMP NOT NULL DEFAULT now(),
  updated_at  TIMESTAMP NOT NULL DEFAULT now()
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
  id        UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id   UUID    NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id   UUID    REFERENCES users(id) ON DELETE SET NULL,
  type      VARCHAR NOT NULL,   -- see activity type reference below
  old_value VARCHAR,
  new_value VARCHAR,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Activity type reference (store these exact strings in type column):
-- CREATED, STATUS_CHANGED, OWNER_CHANGED, COLLABORATOR_ADDED,
-- REVIEWER_ADDED, ASSIGNEE_REMOVED, PRIORITY_CHANGED,
-- DUE_DATE_SET, DUE_DATE_CHANGED, DUE_DATE_REMOVED,
-- TITLE_CHANGED, DESCRIPTION_CHANGED, LABELS_CHANGED,
-- TEAM_ASSIGNED, TEAM_UNASSIGNED, POINTS_SET, POINTS_CHANGED,
-- SUBTASK_ADDED, SUBTASK_REMOVED, PARENT_SET, PARENT_REMOVED


-- =============================================================================
-- SECTION 16: INVITATIONS
-- workspace_id and team_id are handled by invitation_workspaces
-- and invitation_teams junction tables — NOT stored here directly
-- tenant_role stores the org-level role to grant on acceptance
-- =============================================================================

CREATE TABLE invitations (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  token         VARCHAR NOT NULL UNIQUE,           -- raw token in URL, SHA-256 hashed before storage
  pin_hash      VARCHAR NOT NULL,                  -- BCrypt hashed PIN, shown once on creation
  tenant_id     UUID    NOT NULL REFERENCES tenants(id)  ON DELETE CASCADE,
  project_id    UUID    REFERENCES projects(id)    ON DELETE CASCADE,
  inviter_id    UUID    NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  tenant_role   VARCHAR NOT NULL DEFAULT 'MEMBER'
                  CHECK (tenant_role IN ('OWNER', 'ADMIN', 'BILLING_ADMIN', 'MEMBER')),
  max_uses      INTEGER NOT NULL DEFAULT 1,
  current_uses  INTEGER NOT NULL DEFAULT 0,
  status        VARCHAR NOT NULL DEFAULT 'ACTIVE'
                  CHECK (status IN ('ACTIVE', 'EXPIRED', 'EXHAUSTED', 'REVOKED')),
  expires_at    TIMESTAMP NOT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT now()
);


-- =============================================================================
-- SECTION 17: INVITATION ATTEMPTS
-- (Rate limiting — max 5 failed PIN attempts per token per IP per hour)
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
-- (Multi-workspace support — one invitation can grant access to multiple workspaces)
-- =============================================================================

CREATE TABLE invitation_workspaces (
  invitation_id UUID NOT NULL REFERENCES invitations(id)  ON DELETE CASCADE,
  workspace_id  UUID NOT NULL REFERENCES workspaces(id)   ON DELETE CASCADE,

  PRIMARY KEY (invitation_id, workspace_id)
);


-- =============================================================================
-- SECTION 19: INVITATION TEAMS
-- (Multi-team support — one invitation can add user to multiple teams)
-- =============================================================================

CREATE TABLE invitation_teams (
  invitation_id UUID NOT NULL REFERENCES invitations(id) ON DELETE CASCADE,
  team_id       UUID NOT NULL REFERENCES teams(id)       ON DELETE CASCADE,

  PRIMARY KEY (invitation_id, team_id)
);


-- =============================================================================
-- SECTION 20: SHAREABLE LINKS
-- (Project progress sharing with external stakeholders)
-- scope_type determines which of project_id/workspace_id/team_id is used
-- Exactly one scope reference must be non-null (enforced by CHECK constraint)
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
  scope            JSONB,             -- controls what is visible on public page
  password_hash    VARCHAR,           -- optional BCrypt password protection
  expires_at       TIMESTAMP,         -- null means never expires
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


-- =============================================================================
-- SECTION 21: INDEXES
-- Add all indexes after tables are created
-- =============================================================================

-- Users
CREATE INDEX idx_users_tenant        ON users(tenant_id);
CREATE INDEX idx_users_email         ON users(email);
CREATE INDEX idx_users_username      ON users(username);

-- Tenants
CREATE INDEX idx_tenants_slug        ON tenants(slug);
CREATE INDEX idx_tenants_owner       ON tenants(owner_id);

-- Tenant members
CREATE INDEX idx_tenant_members_user   ON tenant_members(user_id);
CREATE INDEX idx_tenant_members_tenant ON tenant_members(tenant_id);

-- Workspaces
CREATE INDEX idx_workspaces_tenant   ON workspaces(tenant_id);

-- Workspace members
CREATE INDEX idx_workspace_members_user      ON workspace_members(user_id);
CREATE INDEX idx_workspace_members_workspace ON workspace_members(workspace_id);

-- Projects
CREATE INDEX idx_projects_workspace  ON projects(workspace_id);
CREATE INDEX idx_projects_status     ON projects(status);

-- Project members
CREATE INDEX idx_project_members_user    ON project_members(user_id);
CREATE INDEX idx_project_members_project ON project_members(project_id);

-- Project teams
CREATE INDEX idx_project_teams_project ON project_teams(project_id);
CREATE INDEX idx_project_teams_team    ON project_teams(team_id);

-- Teams
CREATE INDEX idx_teams_workspace     ON teams(workspace_id);

-- Team members
CREATE INDEX idx_team_members_user   ON team_members(user_id);
CREATE INDEX idx_team_members_team   ON team_members(team_id);

-- Tasks
CREATE INDEX idx_tasks_project       ON tasks(project_id);
CREATE INDEX idx_tasks_status        ON tasks(status);
CREATE INDEX idx_tasks_priority      ON tasks(priority);
CREATE INDEX idx_tasks_created_by    ON tasks(created_by);
CREATE INDEX idx_tasks_parent        ON tasks(parent_id);
CREATE INDEX idx_tasks_team          ON tasks(team_id);
CREATE INDEX idx_tasks_due_date      ON tasks(due_date);

-- Task assignees
CREATE INDEX idx_task_assignees_task ON task_assignees(task_id);
CREATE INDEX idx_task_assignees_user ON task_assignees(user_id);
CREATE INDEX idx_task_assignees_role ON task_assignees(role);

-- Task activities
CREATE INDEX idx_task_activities_task       ON task_activities(task_id);
CREATE INDEX idx_task_activities_created_at ON task_activities(created_at DESC);

-- Invitations
CREATE INDEX idx_invitations_token   ON invitations(token);
CREATE INDEX idx_invitations_tenant  ON invitations(tenant_id);
CREATE INDEX idx_invitations_status  ON invitations(status);

-- Invitation attempts
CREATE INDEX idx_invitation_attempts_invitation ON invitation_attempts(invitation_id);
CREATE INDEX idx_invitation_attempts_ip         ON invitation_attempts(ip_address);
CREATE INDEX idx_invitation_attempts_at         ON invitation_attempts(attempted_at DESC);

-- Invitation workspaces
CREATE INDEX idx_invitation_workspaces_invitation ON invitation_workspaces(invitation_id);
CREATE INDEX idx_invitation_workspaces_workspace  ON invitation_workspaces(workspace_id);

-- Invitation teams
CREATE INDEX idx_invitation_teams_invitation ON invitation_teams(invitation_id);
CREATE INDEX idx_invitation_teams_team       ON invitation_teams(team_id);

-- Shareable links
CREATE INDEX idx_shareable_links_token     ON shareable_links(token);
CREATE INDEX idx_shareable_links_project   ON shareable_links(project_id);
CREATE INDEX idx_shareable_links_workspace ON shareable_links(workspace_id);
CREATE INDEX idx_shareable_links_team      ON shareable_links(team_id);
CREATE INDEX idx_shareable_links_active    ON shareable_links(is_active);


-- =============================================================================
-- SCHEMA COMPLETE
-- =============================================================================
-- Tables created (20):
--   tenants, users, tenant_members,
--   workspaces, workspace_members,
--   projects, project_members,
--   teams, team_members, project_teams,
--   tasks, task_assignees, task_activities,
--   invitations, invitation_attempts,
--   invitation_workspaces, invitation_teams,
--   shareable_links
--
-- Triggers (5):
--   tenants, users, workspaces, projects, teams, tasks
--
-- Indexes (44 total across all tables)
--
-- Tables NOT in this schema (created in later phases):
--   channels, channel_members, messages, message_reactions  → Phase 3 (Chat)
--   documents, document_content, document_versions,
--   document_links, document_chunks                         → Phase 4 (Docs)
--   github_connections, github_repo_links,
--   github_sync_log                                         → Phase 2 (GitHub)
--   file_uploads, org_storage                               → Phase 8 (Storage)
--   subscriptions                                           → Phase 6 (Billing)
-- =============================================================================