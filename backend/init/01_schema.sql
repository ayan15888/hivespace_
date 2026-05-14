-- -- =======================================================
-- -- HiveSpace Database Initialisation Script
-- -- Runs automatically when the container starts for the
-- -- first time (via /docker-entrypoint-initdb.d).
-- -- =======================================================

-- -- Enable the pgcrypto extension for gen_random_uuid()
-- CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -- ============================
-- -- 1. Users
-- -- ============================
-- CREATE TABLE IF NOT EXISTS users (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   email VARCHAR(255) NOT NULL UNIQUE,
--   username VARCHAR(255) UNIQUE,
--   password_hash TEXT NOT NULL,
--   active BOOLEAN NOT NULL DEFAULT true,
--   created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
--   updated_at TIMESTAMP
-- );

-- -- ============================
-- -- 2. Organizations
-- -- ============================
-- CREATE TABLE IF NOT EXISTS organizations (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   name VARCHAR(255) NOT NULL,
--   slug VARCHAR(100) NOT NULL UNIQUE,
--   active BOOLEAN NOT NULL DEFAULT true,
--   created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
-- );

-- -- ============================
-- -- 3. Organization Members
-- -- ============================
-- CREATE TABLE IF NOT EXISTS organization_members (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   organization_id UUID NOT NULL,
--   user_id UUID NOT NULL,
--   role VARCHAR(50) NOT NULL,
--   joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

--   CONSTRAINT fk_org_member_org
--     FOREIGN KEY (organization_id)
--     REFERENCES organizations(id)
--     ON DELETE CASCADE,

--   CONSTRAINT fk_org_member_user
--     FOREIGN KEY (user_id)
--     REFERENCES users(id)
--     ON DELETE CASCADE,

--   CONSTRAINT uq_org_user UNIQUE (organization_id, user_id)
-- );

-- -- ============================
-- -- 4. Organization Invites
-- -- ============================
-- CREATE TABLE IF NOT EXISTS organization_invites (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   organization_id UUID NOT NULL,
--   invite_code VARCHAR(20) NOT NULL UNIQUE,
--   role VARCHAR(50) NOT NULL,
--   expires_at TIMESTAMP,
--   created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

--   CONSTRAINT fk_invite_org
--     FOREIGN KEY (organization_id)
--     REFERENCES organizations(id)
--     ON DELETE CASCADE
-- );

-- -- ============================
-- -- 5. Subscriptions
-- -- ============================
-- CREATE TABLE IF NOT EXISTS subscriptions (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   organization_id UUID NOT NULL UNIQUE,
--   plan VARCHAR(50) NOT NULL,       -- FREE, PRO, ENTERPRISE
--   status VARCHAR(50) NOT NULL,
--   started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
--   expires_at TIMESTAMP,

--   CONSTRAINT fk_subscription_org
--     FOREIGN KEY (organization_id)
--     REFERENCES organizations(id)
--     ON DELETE CASCADE
-- );

-- -- ============================
-- -- 6. Workspaces
-- -- ============================
-- CREATE TABLE IF NOT EXISTS workspaces (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   organization_id UUID NOT NULL,
--   name VARCHAR(255) NOT NULL,
--   slug VARCHAR(100) NOT NULL,
--   active BOOLEAN NOT NULL DEFAULT true,
--   created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

--   CONSTRAINT fk_workspace_org
--     FOREIGN KEY (organization_id)
--     REFERENCES organizations(id)
--     ON DELETE CASCADE,

--   CONSTRAINT uq_workspace_slug UNIQUE (organization_id, slug)
-- );

-- -- ============================
-- -- 7. Workspace Members
-- -- ============================
-- CREATE TABLE IF NOT EXISTS workspace_members (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   workspace_id UUID NOT NULL,
--   organization_member_id UUID NOT NULL,
--   joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

--   CONSTRAINT fk_ws_member_workspace
--     FOREIGN KEY (workspace_id)
--     REFERENCES workspaces(id)
--     ON DELETE CASCADE,

--   CONSTRAINT fk_ws_member_org_member
--     FOREIGN KEY (organization_member_id)
--     REFERENCES organization_members(id)
--     ON DELETE CASCADE,

--   CONSTRAINT uq_workspace_member UNIQUE (workspace_id, organization_member_id)
-- );

-- -- ============================
-- -- 8. Projects
-- -- ============================
-- CREATE TABLE IF NOT EXISTS projects (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   workspace_id UUID NOT NULL,
--   name VARCHAR(255) NOT NULL,
--   slug VARCHAR(100) NOT NULL,
--   description TEXT,
--   active BOOLEAN NOT NULL DEFAULT true,
--   created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

--   CONSTRAINT fk_project_workspace
--     FOREIGN KEY (workspace_id)
--     REFERENCES workspaces(id)
--     ON DELETE CASCADE,

--   CONSTRAINT uq_project_slug UNIQUE (workspace_id, slug)
-- );

-- -- ============================
-- -- 9. Project Roles
-- -- ============================
-- CREATE TABLE IF NOT EXISTS project_roles (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   name VARCHAR(50) NOT NULL,         -- ADMIN, MEMBER, VIEWER
--   permissions JSONB NOT NULL
-- );

-- -- ============================
-- -- 10. Project Members
-- -- ============================
-- CREATE TABLE IF NOT EXISTS project_members (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   project_id UUID NOT NULL,
--   workspace_member_id UUID NOT NULL,
--   role_id UUID,
--   joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

--   CONSTRAINT fk_pm_project
--     FOREIGN KEY (project_id)
--     REFERENCES projects(id)
--     ON DELETE CASCADE,

--   CONSTRAINT fk_pm_ws_member
--     FOREIGN KEY (workspace_member_id)
--     REFERENCES workspace_members(id)
--     ON DELETE CASCADE,

--   CONSTRAINT fk_pm_role
--     FOREIGN KEY (role_id)
--     REFERENCES project_roles(id),

--   CONSTRAINT uq_project_member UNIQUE (project_id, workspace_member_id)
-- );

-- -- ============================
-- -- 11. Project Teams
-- -- ============================
-- CREATE TABLE IF NOT EXISTS project_teams (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   project_id UUID NOT NULL,
--   name VARCHAR(255) NOT NULL,
--   description TEXT,
--   created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

--   CONSTRAINT fk_project_team_project
--     FOREIGN KEY (project_id)
--     REFERENCES projects(id)
--     ON DELETE CASCADE,

--   CONSTRAINT uq_project_team_name UNIQUE (project_id, name)
-- );

-- -- ============================
-- -- 12. Project Team Members
-- -- ============================
-- CREATE TABLE IF NOT EXISTS project_team_members (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   project_team_id UUID NOT NULL,
--   project_member_id UUID NOT NULL,
--   joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

--   CONSTRAINT fk_ptm_team
--     FOREIGN KEY (project_team_id)
--     REFERENCES project_teams(id)
--     ON DELETE CASCADE,

--   CONSTRAINT fk_ptm_project_member
--     FOREIGN KEY (project_member_id)
--     REFERENCES project_members(id)
--     ON DELETE CASCADE,

--   CONSTRAINT uq_team_member UNIQUE (project_team_id, project_member_id)
-- );

-- -- ============================
-- -- 13. Task Statuses
-- -- ============================
-- CREATE TABLE IF NOT EXISTS task_statuses (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   project_id UUID NOT NULL,
--   name VARCHAR(50) NOT NULL,         -- TODO, IN_PROGRESS, DONE
--   display_name VARCHAR(50) NOT NULL, -- To Do, In Progress, Done
--   position INT NOT NULL,             -- column order
--   is_terminal BOOLEAN NOT NULL DEFAULT false,
--   created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

--   CONSTRAINT fk_task_status_project
--     FOREIGN KEY (project_id)
--     REFERENCES projects(id)
--     ON DELETE CASCADE,

--   CONSTRAINT uq_task_status UNIQUE (project_id, name)
-- );

-- -- ============================
-- -- 14. Sprints
-- -- ============================
-- CREATE TABLE IF NOT EXISTS sprints (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   project_id UUID NOT NULL,
--   name VARCHAR(100) NOT NULL,
--   start_date DATE,
--   end_date DATE,
--   status VARCHAR(20) DEFAULT 'PLANNED',  -- PLANNED, ACTIVE, DONE
--   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

--   CONSTRAINT fk_sprint_project
--     FOREIGN KEY (project_id)
--     REFERENCES projects(id)
--     ON DELETE CASCADE
-- );

-- -- ============================
-- -- 15. Tasks
-- -- ============================
-- CREATE TABLE IF NOT EXISTS tasks (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   project_id UUID NOT NULL,
--   project_team_id UUID,
--   status_id UUID NOT NULL,
--   sprint_id UUID,
--   title VARCHAR(255) NOT NULL,
--   description TEXT,
--   position INT NOT NULL DEFAULT 0,
--   priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
--   due_date TIMESTAMP,
--   created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
--   updated_at TIMESTAMP,

--   CONSTRAINT fk_task_project
--     FOREIGN KEY (project_id)
--     REFERENCES projects(id)
--     ON DELETE CASCADE,

--   CONSTRAINT fk_task_team
--     FOREIGN KEY (project_team_id)
--     REFERENCES project_teams(id)
--     ON DELETE SET NULL,

--   CONSTRAINT fk_task_status
--     FOREIGN KEY (status_id)
--     REFERENCES task_statuses(id),

--   CONSTRAINT fk_task_sprint
--     FOREIGN KEY (sprint_id)
--     REFERENCES sprints(id)
--     ON DELETE SET NULL
-- );

-- -- ============================
-- -- 16. Task Assignments
-- -- ============================
-- CREATE TABLE IF NOT EXISTS task_assignments (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   task_id UUID NOT NULL,
--   project_member_id UUID NOT NULL,
--   assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

--   CONSTRAINT fk_task_assignment_task
--     FOREIGN KEY (task_id)
--     REFERENCES tasks(id)
--     ON DELETE CASCADE,

--   CONSTRAINT fk_task_assignment_project_member
--     FOREIGN KEY (project_member_id)
--     REFERENCES project_members(id)
--     ON DELETE CASCADE,

--   CONSTRAINT uq_task_member UNIQUE (task_id, project_member_id)
-- );

-- -- ============================
-- -- 17. Task Comments
-- -- ============================
-- CREATE TABLE IF NOT EXISTS task_comments (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   task_id UUID NOT NULL,
--   user_id UUID NOT NULL,
--   parent_comment_id UUID,
--   content TEXT NOT NULL,
--   created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
--   updated_at TIMESTAMP,

--   CONSTRAINT fk_comment_task
--     FOREIGN KEY (task_id)
--     REFERENCES tasks(id)
--     ON DELETE CASCADE,

--   CONSTRAINT fk_comment_user
--     FOREIGN KEY (user_id)
--     REFERENCES users(id)
--     ON DELETE CASCADE,

--   CONSTRAINT fk_comment_parent
--     FOREIGN KEY (parent_comment_id)
--     REFERENCES task_comments(id)
--     ON DELETE CASCADE
-- );

-- -- ============================
-- -- 18. Task Status History
-- -- ============================
-- CREATE TABLE IF NOT EXISTS task_status_history (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   task_id UUID NOT NULL,
--   from_status_id UUID,
--   to_status_id UUID NOT NULL,
--   changed_by UUID NOT NULL,
--   changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

--   CONSTRAINT fk_tsh_task
--     FOREIGN KEY (task_id)
--     REFERENCES tasks(id)
--     ON DELETE CASCADE,

--   CONSTRAINT fk_tsh_from_status
--     FOREIGN KEY (from_status_id)
--     REFERENCES task_statuses(id),

--   CONSTRAINT fk_tsh_to_status
--     FOREIGN KEY (to_status_id)
--     REFERENCES task_statuses(id),

--   CONSTRAINT fk_tsh_user
--     FOREIGN KEY (changed_by)
--     REFERENCES users(id)
-- );

-- -- ============================
-- -- 19. Task Labels
-- -- ============================
-- CREATE TABLE IF NOT EXISTS task_labels (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   project_id UUID NOT NULL,
--   name VARCHAR(50) NOT NULL,
--   color VARCHAR(20),
--   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

--   CONSTRAINT fk_label_project
--     FOREIGN KEY (project_id)
--     REFERENCES projects(id)
--     ON DELETE CASCADE,

--   CONSTRAINT uq_label UNIQUE (project_id, name)
-- );

-- -- ============================
-- -- 20. Task ↔ Labels (M2M)
-- -- ============================
-- CREATE TABLE IF NOT EXISTS task_label_map (
--   task_id UUID NOT NULL,
--   label_id UUID NOT NULL,

--   PRIMARY KEY (task_id, label_id),

--   CONSTRAINT fk_tlm_task
--     FOREIGN KEY (task_id)
--     REFERENCES tasks(id)
--     ON DELETE CASCADE,

--   CONSTRAINT fk_tlm_label
--     FOREIGN KEY (label_id)
--     REFERENCES task_labels(id)
--     ON DELETE CASCADE
-- );

-- -- ============================
-- -- 21. Activity Logs
-- -- ============================
-- CREATE TABLE IF NOT EXISTS activity_logs (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   project_id UUID NOT NULL,
--   entity_type VARCHAR(50) NOT NULL,   -- TASK, PROJECT, COMMENT
--   entity_id UUID NOT NULL,
--   action VARCHAR(100) NOT NULL,       -- CREATED, UPDATED, MOVED, ASSIGNED
--   metadata JSONB,                     -- extra data (old/new values)
--   performed_by UUID NOT NULL,
--   created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

--   CONSTRAINT fk_activity_project
--     FOREIGN KEY (project_id)
--     REFERENCES projects(id)
--     ON DELETE CASCADE,

--   CONSTRAINT fk_activity_user
--     FOREIGN KEY (performed_by)
--     REFERENCES users(id)
-- );

-- -- ============================
-- -- 22. Attachments
-- -- ============================
-- CREATE TABLE IF NOT EXISTS attachments (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   entity_type VARCHAR(50) NOT NULL,  -- TASK, COMMENT
--   entity_id UUID NOT NULL,
--   file_url TEXT NOT NULL,
--   uploaded_by UUID NOT NULL,
--   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

--   CONSTRAINT fk_attachment_user
--     FOREIGN KEY (uploaded_by)
--     REFERENCES users(id)
-- );
