-- CURENNTLY RUNNIG SCHEMA OF THE SUPABASE
-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.invitation_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  invitation_id uuid NOT NULL,
  ip_address character varying NOT NULL,
  attempted_at timestamp without time zone NOT NULL DEFAULT now(),
  success boolean NOT NULL DEFAULT false,
  CONSTRAINT invitation_attempts_pkey PRIMARY KEY (id),
  CONSTRAINT invitation_attempts_invitation_id_fkey FOREIGN KEY (invitation_id) REFERENCES public.invitations(id)
);
CREATE TABLE public.invitations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  token character varying NOT NULL UNIQUE,
  pin_hash character varying NOT NULL,
  tenant_id uuid NOT NULL,
  workspace_id uuid,
  team_id uuid,
  inviter_id uuid NOT NULL,
  role character varying NOT NULL DEFAULT 'MEMBER'::character varying,
  max_uses integer NOT NULL DEFAULT 1,
  current_uses integer NOT NULL DEFAULT 0,
  status character varying NOT NULL DEFAULT 'ACTIVE'::character varying CHECK (status::text = ANY (ARRAY['ACTIVE'::character varying, 'EXPIRED'::character varying, 'EXHAUSTED'::character varying, 'REVOKED'::character varying]::text[])),
  expires_at timestamp without time zone NOT NULL,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  project_id uuid,
  CONSTRAINT invitations_pkey PRIMARY KEY (id),
  CONSTRAINT invitations_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
  CONSTRAINT invitations_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id),
  CONSTRAINT invitations_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id),
  CONSTRAINT invitations_inviter_id_fkey FOREIGN KEY (inviter_id) REFERENCES public.users(id),
  CONSTRAINT invitations_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id)
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
CREATE TABLE public.projects (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  description character varying,
  status character varying NOT NULL DEFAULT 'ACTIVE'::character varying CHECK (status::text = ANY (ARRAY['ACTIVE'::character varying, 'ARCHIVED'::character varying, 'COMPLETED'::character varying]::text[])),
  color character varying,
  workspace_id uuid NOT NULL,
  created_by uuid,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now(),
  members_count integer NOT NULL,
  teams_count integer NOT NULL,
  start_date timestamp without time zone,
  end_date timestamp without time zone,
  CONSTRAINT projects_pkey PRIMARY KEY (id),
  CONSTRAINT projects_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id),
  CONSTRAINT projects_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
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
CREATE TABLE public.tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title character varying NOT NULL,
  description text,
  status character varying NOT NULL DEFAULT 'TODO'::character varying CHECK (status::text = ANY (ARRAY['TODO'::character varying, 'IN_PROGRESS'::character varying, 'IN_REVIEW'::character varying, 'DONE'::character varying, 'CANCELLED'::character varying]::text[])),
  priority character varying NOT NULL DEFAULT 'MEDIUM'::character varying CHECK (priority::text = ANY (ARRAY['URGENT'::character varying, 'HIGH'::character varying, 'MEDIUM'::character varying, 'LOW'::character varying]::text[])),
  due_date timestamp without time zone,
  points integer,
  labels character varying,
  project_id uuid NOT NULL,
  team_id uuid,
  created_by uuid,
  parent_id uuid,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now(),
  assignee_id uuid,
  CONSTRAINT tasks_pkey PRIMARY KEY (id),
  CONSTRAINT tasks_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id),
  CONSTRAINT tasks_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id),
  CONSTRAINT tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id),
  CONSTRAINT tasks_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.tasks(id),
  CONSTRAINT fkekr1dgiqktpyoip3qmp6lxsit FOREIGN KEY (assignee_id) REFERENCES public.users(id)
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
CREATE TABLE public.teams (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  description character varying,
  workspace_id uuid NOT NULL,
  project_id uuid,
  created_by uuid,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now(),
  members_count integer NOT NULL,
  CONSTRAINT teams_pkey PRIMARY KEY (id),
  CONSTRAINT teams_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id),
  CONSTRAINT teams_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id),
  CONSTRAINT teams_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
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
CREATE TABLE public.tenants (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL UNIQUE,
  slug character varying NOT NULL UNIQUE CHECK (slug::text <> ALL (ARRAY['api'::character varying, 'app'::character varying, 'auth'::character varying, 'invite'::character varying, 'share'::character varying, 'admin'::character varying, 'billing'::character varying, 'settings'::character varying, 'health'::character varying, 'static'::character varying, 'support'::character varying, 'www'::character varying, 'dashboard'::character varying, 'signin'::character varying, 'signup'::character varying, 'public'::character varying]::text[])),
  description character varying,
  owner_email character varying NOT NULL,
  plan character varying NOT NULL DEFAULT 'FREE'::character varying CHECK (plan::text = ANY (ARRAY['FREE'::character varying, 'PRO'::character varying, 'ULTIMATE'::character varying, 'ENTERPRISE'::character varying]::text[])),
  active boolean NOT NULL DEFAULT true,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now(),
  members_count integer NOT NULL,
  workspaces_count integer NOT NULL,
  CONSTRAINT tenants_pkey PRIMARY KEY (id)
);
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  full_name character varying,
  username character varying NOT NULL UNIQUE,
  email character varying NOT NULL UNIQUE,
  password character varying NOT NULL,
  avatar_url character varying,
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
CREATE TABLE public.workspace_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role character varying NOT NULL DEFAULT 'MEMBER'::character varying CHECK (role::text = ANY (ARRAY['ADMIN'::character varying, 'MEMBER'::character varying, 'VIEWER'::character varying]::text[])),
  joined_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT workspace_members_pkey PRIMARY KEY (id),
  CONSTRAINT workspace_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT workspace_members_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id)
);
CREATE TABLE public.workspaces (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  description character varying,
  tenant_id uuid NOT NULL,
  created_by uuid,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now(),
  members_count integer NOT NULL,
  CONSTRAINT workspaces_pkey PRIMARY KEY (id),
  CONSTRAINT workspaces_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
  CONSTRAINT workspaces_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);