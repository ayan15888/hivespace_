-- CURENNTLY RUNNIG SCHEMA OF THE SUPABASE
-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.tenants (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL UNIQUE,
  slug character varying NOT NULL UNIQUE CHECK (slug::text = lower(slug::text)),
  description character varying,
  owner_email character varying NOT NULL,
  owner_id uuid,
  plan character varying NOT NULL DEFAULT 'FREE'::character varying CHECK (plan::text = ANY (ARRAY['FREE'::character varying, 'PRO'::character varying, 'ULTIMATE'::character varying, 'ENTERPRISE'::character varying]::text[])),
  active boolean NOT NULL DEFAULT true,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT tenants_pkey PRIMARY KEY (id),
  CONSTRAINT fk_tenants_owner FOREIGN KEY (owner_id) REFERENCES public.users(id)
);
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  full_name character varying,
  username character varying NOT NULL UNIQUE,
  email character varying NOT NULL UNIQUE,
  password character varying NOT NULL,
  avatar_url character varying,
  avatar_color character varying,
  bio text,
  job_title character varying,
  github_id bigint,
  github_username character varying,
  active boolean NOT NULL DEFAULT true,
  tenant_id uuid,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id)
);
CREATE TABLE public.tenant_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role character varying NOT NULL DEFAULT 'MEMBER'::character varying CHECK (role::text = ANY (ARRAY['OWNER'::character varying, 'ADMIN'::character varying, 'BILLING_ADMIN'::character varying, 'MEMBER'::character varying]::text[])),
  joined_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT tenant_members_pkey PRIMARY KEY (id),
  CONSTRAINT tenant_members_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
  CONSTRAINT tenant_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.workspaces (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  description character varying,
  tenant_id uuid NOT NULL,
  created_by uuid,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT workspaces_pkey PRIMARY KEY (id),
  CONSTRAINT workspaces_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
  CONSTRAINT workspaces_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);
CREATE TABLE public.workspace_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role character varying NOT NULL DEFAULT 'MEMBER'::character varying CHECK (role::text = ANY (ARRAY['ADMIN'::character varying, 'MEMBER'::character varying, 'VIEWER'::character varying]::text[])),
  joined_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT workspace_members_pkey PRIMARY KEY (id),
  CONSTRAINT workspace_members_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id),
  CONSTRAINT workspace_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.projects (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  description character varying,
  status character varying NOT NULL DEFAULT 'ACTIVE'::character varying CHECK (status::text = ANY (ARRAY['ACTIVE'::character varying, 'ARCHIVED'::character varying, 'COMPLETED'::character varying]::text[])),
  color character varying,
  workspace_id uuid NOT NULL,
  created_by uuid,
  start_date timestamp without time zone,
  end_date timestamp without time zone,
  task_sequence integer NOT NULL DEFAULT 0,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT projects_pkey PRIMARY KEY (id),
  CONSTRAINT projects_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id),
  CONSTRAINT projects_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);
CREATE TABLE public.project_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role character varying NOT NULL DEFAULT 'MEMBER'::character varying CHECK (role::text = ANY (ARRAY['LEAD'::character varying, 'MEMBER'::character varying, 'VIEWER'::character varying]::text[])),
  joined_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT project_members_pkey PRIMARY KEY (id),
  CONSTRAINT project_members_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id),
  CONSTRAINT project_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.teams (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  description character varying,
  workspace_id uuid NOT NULL,
  created_by uuid,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT teams_pkey PRIMARY KEY (id),
  CONSTRAINT teams_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id),
  CONSTRAINT teams_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);
CREATE TABLE public.team_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role character varying NOT NULL DEFAULT 'MEMBER'::character varying CHECK (role::text = ANY (ARRAY['LEAD'::character varying, 'MEMBER'::character varying]::text[])),
  joined_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT team_members_pkey PRIMARY KEY (id),
  CONSTRAINT team_members_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id),
  CONSTRAINT team_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.project_teams (
  project_id uuid NOT NULL,
  team_id uuid NOT NULL,
  assigned_at timestamp without time zone NOT NULL DEFAULT now(),
  assigned_by uuid,
  CONSTRAINT project_teams_pkey PRIMARY KEY (project_id, team_id),
  CONSTRAINT project_teams_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id),
  CONSTRAINT project_teams_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id),
  CONSTRAINT project_teams_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(id)
);
CREATE TABLE public.tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title character varying NOT NULL,
  description text,
  status character varying NOT NULL DEFAULT 'TODO'::character varying CHECK (status::text = ANY (ARRAY['TODO'::character varying, 'IN_PROGRESS'::character varying, 'IN_REVIEW'::character varying, 'DONE'::character varying, 'CANCELLED'::character varying]::text[])),
  priority character varying NOT NULL DEFAULT 'MEDIUM'::character varying CHECK (priority::text = ANY (ARRAY['URGENT'::character varying, 'HIGH'::character varying, 'MEDIUM'::character varying, 'LOW'::character varying]::text[])),
  due_date timestamp without time zone,
  points integer,
  labels character varying,
  sequence_number integer,
  project_id uuid NOT NULL,
  team_id uuid,
  created_by uuid,
  parent_id uuid,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT tasks_pkey PRIMARY KEY (id),
  CONSTRAINT tasks_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id),
  CONSTRAINT tasks_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id),
  CONSTRAINT tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id),
  CONSTRAINT tasks_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.tasks(id)
);
CREATE TABLE public.task_assignees (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role character varying NOT NULL DEFAULT 'OWNER'::character varying CHECK (role::text = ANY (ARRAY['OWNER'::character varying, 'COLLABORATOR'::character varying, 'REVIEWER'::character varying]::text[])),
  assigned_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT task_assignees_pkey PRIMARY KEY (id),
  CONSTRAINT task_assignees_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id),
  CONSTRAINT task_assignees_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.task_activities (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL,
  user_id uuid,
  type character varying NOT NULL,
  old_value character varying,
  new_value character varying,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT task_activities_pkey PRIMARY KEY (id),
  CONSTRAINT task_activities_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id),
  CONSTRAINT task_activities_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.invitations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  token character varying NOT NULL UNIQUE,
  pin_hash character varying NOT NULL,
  tenant_id uuid NOT NULL,
  project_id uuid,
  inviter_id uuid NOT NULL,
  tenant_role character varying NOT NULL DEFAULT 'MEMBER'::character varying CHECK (tenant_role::text = ANY (ARRAY['OWNER'::character varying, 'ADMIN'::character varying, 'BILLING_ADMIN'::character varying, 'MEMBER'::character varying]::text[])),
  max_uses integer NOT NULL DEFAULT 1,
  current_uses integer NOT NULL DEFAULT 0,
  status character varying NOT NULL DEFAULT 'ACTIVE'::character varying CHECK (status::text = ANY (ARRAY['ACTIVE'::character varying, 'EXPIRED'::character varying, 'EXHAUSTED'::character varying, 'REVOKED'::character varying]::text[])),
  expires_at timestamp without time zone NOT NULL,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT invitations_pkey PRIMARY KEY (id),
  CONSTRAINT invitations_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
  CONSTRAINT invitations_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id),
  CONSTRAINT invitations_inviter_id_fkey FOREIGN KEY (inviter_id) REFERENCES public.users(id)
);
CREATE TABLE public.invitation_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  invitation_id uuid NOT NULL,
  ip_address character varying NOT NULL,
  attempted_at timestamp without time zone NOT NULL DEFAULT now(),
  success boolean NOT NULL DEFAULT false,
  CONSTRAINT invitation_attempts_pkey PRIMARY KEY (id),
  CONSTRAINT invitation_attempts_invitation_id_fkey FOREIGN KEY (invitation_id) REFERENCES public.invitations(id)
);
CREATE TABLE public.invitation_workspaces (
  invitation_id uuid NOT NULL,
  workspace_id uuid NOT NULL,
  CONSTRAINT invitation_workspaces_pkey PRIMARY KEY (invitation_id, workspace_id),
  CONSTRAINT invitation_workspaces_invitation_id_fkey FOREIGN KEY (invitation_id) REFERENCES public.invitations(id),
  CONSTRAINT invitation_workspaces_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id)
);
CREATE TABLE public.invitation_teams (
  invitation_id uuid NOT NULL,
  team_id uuid NOT NULL,
  CONSTRAINT invitation_teams_pkey PRIMARY KEY (invitation_id, team_id),
  CONSTRAINT invitation_teams_invitation_id_fkey FOREIGN KEY (invitation_id) REFERENCES public.invitations(id),
  CONSTRAINT invitation_teams_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id)
);
CREATE TABLE public.shareable_links (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  token character varying NOT NULL UNIQUE,
  scope_type character varying NOT NULL CHECK (scope_type::text = ANY (ARRAY['PROJECT'::character varying, 'WORKSPACE'::character varying, 'TEAM'::character varying]::text[])),
  project_id uuid,
  workspace_id uuid,
  team_id uuid,
  created_by uuid,
  scope jsonb,
  password_hash character varying,
  expires_at timestamp without time zone,
  last_accessed_at timestamp without time zone,
  access_count integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT shareable_links_pkey PRIMARY KEY (id),
  CONSTRAINT shareable_links_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id),
  CONSTRAINT shareable_links_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id),
  CONSTRAINT shareable_links_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id),
  CONSTRAINT shareable_links_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);
CREATE TABLE public.documents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title character varying NOT NULL DEFAULT 'Untitled'::character varying,
  icon character varying,
  workspace_id uuid NOT NULL,
  project_id uuid,
  team_id uuid,
  parent_id uuid,
  created_by uuid,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT documents_pkey PRIMARY KEY (id),
  CONSTRAINT documents_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id),
  CONSTRAINT documents_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id),
  CONSTRAINT documents_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id),
  CONSTRAINT documents_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id),
  CONSTRAINT documents_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.documents(id)
);
CREATE TABLE public.document_content (
  document_id uuid NOT NULL,
  content jsonb,
  text_content text,
  version integer NOT NULL DEFAULT 1,
  updated_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT document_content_pkey PRIMARY KEY (document_id),
  CONSTRAINT document_content_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id)
);
CREATE TABLE public.document_versions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL,
  content jsonb NOT NULL,
  saved_by uuid,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT document_versions_pkey PRIMARY KEY (id),
  CONSTRAINT document_versions_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id),
  CONSTRAINT document_versions_saved_by_fkey FOREIGN KEY (saved_by) REFERENCES public.users(id)
);
CREATE TABLE public.document_links (
  source_doc_id uuid NOT NULL,
  target_doc_id uuid NOT NULL,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT document_links_pkey PRIMARY KEY (source_doc_id, target_doc_id),
  CONSTRAINT document_links_source_doc_id_fkey FOREIGN KEY (source_doc_id) REFERENCES public.documents(id),
  CONSTRAINT document_links_target_doc_id_fkey FOREIGN KEY (target_doc_id) REFERENCES public.documents(id)
);
CREATE TABLE public.channels (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying,
  type character varying NOT NULL DEFAULT 'PUBLIC'::character varying CHECK (type::text = ANY (ARRAY['PUBLIC'::character varying, 'PRIVATE'::character varying, 'DM'::character varying, 'THREAD'::character varying]::text[])),
  workspace_id uuid NOT NULL,
  project_id uuid,
  team_id uuid,
  created_by uuid,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT channels_pkey PRIMARY KEY (id),
  CONSTRAINT channels_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id),
  CONSTRAINT channels_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id),
  CONSTRAINT channels_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id),
  CONSTRAINT channels_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);
CREATE TABLE public.channel_members (
  channel_id uuid NOT NULL,
  user_id uuid NOT NULL,
  last_read_at timestamp without time zone,
  joined_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT channel_members_pkey PRIMARY KEY (channel_id, user_id),
  CONSTRAINT channel_members_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.channels(id),
  CONSTRAINT channel_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  content text NOT NULL,
  type character varying NOT NULL DEFAULT 'TEXT'::character varying CHECK (type::text = ANY (ARRAY['TEXT'::character varying, 'FILE'::character varying, 'SYSTEM'::character varying, 'AI'::character varying]::text[])),
  channel_id uuid NOT NULL,
  sender_id uuid,
  parent_id uuid,
  edited_at timestamp without time zone,
  deleted_at timestamp without time zone,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.channels(id),
  CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id),
  CONSTRAINT messages_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.messages(id)
);
CREATE TABLE public.message_reactions (
  message_id uuid NOT NULL,
  user_id uuid NOT NULL,
  emoji character varying NOT NULL,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT message_reactions_pkey PRIMARY KEY (message_id, user_id, emoji),
  CONSTRAINT message_reactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT message_reactions_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.messages(id)
);
CREATE TABLE public.notifications (
  id uuid NOT NULL,
  content character varying NOT NULL,
  created_at timestamp without time zone NOT NULL,
  is_read boolean NOT NULL,
  type character varying NOT NULL CHECK (type::text = ANY (ARRAY['MENTION'::character varying, 'TASK_ASSIGNED'::character varying, 'SYSTEM'::character varying]::text[])),
  actor_id uuid,
  channel_id uuid,
  message_id uuid,
  user_id uuid NOT NULL,
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT fk4sd9fik0uthbk6d9rsxco4uja FOREIGN KEY (actor_id) REFERENCES public.users(id),
  CONSTRAINT fkmiftu2o020axe0hjhdvebm2sh FOREIGN KEY (channel_id) REFERENCES public.channels(id),
  CONSTRAINT fkibag5l76gvbhaumitjend434e FOREIGN KEY (message_id) REFERENCES public.messages(id),
  CONSTRAINT fk9y21adhxn0ayjhfocscqox7bh FOREIGN KEY (user_id) REFERENCES public.users(id)
);