"use client";

import { useState, useEffect } from "react";
import { 
  Building2, 
  Layers, 
  FolderGit2, 
  Users2, 
  CheckSquare, 
  Fingerprint,
  ShieldAlert
} from "lucide-react";
import { gooeyToast as toast } from "@/components/ui/goey-toaster";
import { useMembers } from "@/hooks/useMembers";

// Modular sub-components
import { LevelType, LevelDetail } from "@/components/features/settings/roles/types";
import LevelTabs from "@/components/features/settings/roles/LevelTabs";
import LevelOverview from "@/components/features/settings/roles/LevelOverview";
import RolesList from "@/components/features/settings/roles/RolesList";
import SchemaIntegrity from "@/components/features/settings/roles/SchemaIntegrity";
import ActiveRolesDirectory from "@/components/features/settings/roles/ActiveRolesDirectory";
import CapabilityMatrix from "@/components/features/settings/roles/CapabilityMatrix";

const levelsData: Record<LevelType, LevelDetail> = {
  tenant: {
    id: "tenant",
    name: "Organization / Tenant Level",
    tableName: "tenant_members",
    icon: Building2,
    description: "Governs administrative capabilities, subscriptions, billing, and global resource creation for the entire platform tenant.",
    sqlCheck: "CHECK (role IN ('OWNER', 'ADMIN', 'BILLING_ADMIN', 'MEMBER'))",
    ddl: `CREATE TABLE tenant_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR NOT NULL DEFAULT 'MEMBER'
    CHECK (role IN ('OWNER', 'ADMIN', 'BILLING_ADMIN', 'MEMBER')),
  joined_at TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id)
);`,
    indexes: [
      "CREATE INDEX idx_users_tenant ON users(tenant_id);",
      "CREATE INDEX idx_tenant_members_user ON tenant_members(user_id);"
    ],
    roles: [
      {
        name: "OWNER",
        label: "Owner",
        colorClass: "text-[#7C5CFC] bg-[#7C5CFC]/10 border-[#7C5CFC]/20",
        description: "Full account authority and legal ownership. Retains absolute power over settings, invoices, deletion, and credentials.",
        capabilities: ["Delete Organization", "Update Plan & Billing", "Change Stripe Seats", "Manage Owners & Admins", "Full Resource Deletion"]
      },
      {
        name: "ADMIN",
        label: "Admin",
        colorClass: "text-blue-400 bg-blue-400/10 border-blue-400/20",
        description: "Operational administrator. Manages workspaces, projects, teams, and invites members, but cannot touch owner accounts or delete organization.",
        capabilities: ["Invite Workspace Members", "Create Workspaces & Teams", "Revoke General Members", "Edit Integration Connectors", "Manage Project Scope"]
      },
      {
        name: "BILLING_ADMIN",
        label: "Billing Admin",
        colorClass: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
        description: "Financial controller. Inspects billing cycles, invoice registers, modifies cards, and requests subscription adjustments.",
        capabilities: ["Access Stripe Gateways", "Read & Download Invoices", "Update Billing Address", "View Seats Count", "Inspect Org Storage Tracker"]
      },
      {
        name: "MEMBER",
        label: "Member",
        colorClass: "text-zinc-400 bg-zinc-800 border-zinc-700",
        description: "General staff collaborator. Participates within assigned workspaces and teams. Has no organization-wide settings control.",
        capabilities: ["Collaborate on Projects", "Access Public Channels", "Invite Task Reviewers", "Create Inner Tasks", "Edit Personal Profile"]
      }
    ],
    matrix: [
      { action: "Delete Organization", description: "Hard purge of the tenant account and all related database records.", rolesGranted: ["OWNER"] },
      { action: "Manage Subscription", description: "Change billing plan (FREE, PRO, ULTIMATE), adjust seats count, or modify payment card.", rolesGranted: ["OWNER", "BILLING_ADMIN"] },
      { action: "Invite Members", description: "Generate new member invite links and security PINs for the tenant.", rolesGranted: ["OWNER", "ADMIN"] },
      { action: "Create Workspaces", description: "Spin up brand new workspaces and structure the organizational hierarchy.", rolesGranted: ["OWNER", "ADMIN"] },
      { action: "View Financial Invoices", description: "Browse invoice records, billing cycles, and stripe statements.", rolesGranted: ["OWNER", "BILLING_ADMIN"] },
      { action: "Link Global Integrations", description: "Install GitHub Organization connections or link system webhooks.", rolesGranted: ["OWNER", "ADMIN"] },
      { action: "Join Workspaces", description: "Explore and gain standard entry to workspaces inside the organization.", rolesGranted: ["OWNER", "ADMIN", "MEMBER"] }
    ]
  },
  workspace: {
    id: "workspace",
    name: "Workspace Level",
    tableName: "workspace_members",
    icon: Layers,
    description: "Controls collaboration, access rights, and repository linking within individual workspaces inside the tenant.",
    sqlCheck: "CHECK (role IN ('ADMIN', 'MEMBER', 'VIEWER'))",
    ddl: `CREATE TABLE workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR NOT NULL DEFAULT 'MEMBER'
    CHECK (role IN ('ADMIN', 'MEMBER', 'VIEWER')),
  joined_at TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, user_id)
);`,
    indexes: [
      "CREATE INDEX idx_workspace_members_user ON workspace_members(user_id);",
      "CREATE INDEX idx_workspace_members_workspace ON workspace_members(workspace_id);"
    ],
    roles: [
      {
        name: "ADMIN",
        label: "Workspace Admin",
        colorClass: "text-[#7C5CFC] bg-[#7C5CFC]/10 border-[#7C5CFC]/20",
        description: "Manages all aspects of the workspace including projects, teams, public channels, documents, and membership access.",
        capabilities: ["Manage Projects & Teams", "Configure Channels & Threads", "Manage Workspace Membership", "Configure R2 File Thresholds", "Create Knowledge Documents"]
      },
      {
        name: "MEMBER",
        label: "Workspace Member",
        colorClass: "text-blue-400 bg-blue-400/10 border-blue-400/20",
        description: "Active contributor within the workspace. Creates projects, teams, tasks, documents, and writes/edits messages.",
        capabilities: ["Create Projects & Tasks", "Write Messages & Reactions", "Upload Files to Storage", "Publish Knowledge Docs", "Participate in Threads"]
      },
      {
        name: "VIEWER",
        label: "Workspace Viewer",
        colorClass: "text-zinc-400 bg-zinc-800 border-zinc-700",
        description: "Read-only workspace member. Can observe discussions, view boards, and read documents without making modifications.",
        capabilities: ["Read Workspace Boards", "View Published Documents", "Inspect Public Channels", "Download Project Files", "View Team Directories"]
      }
    ],
    matrix: [
      { action: "Configure Settings", description: "Modify workspace name, description, active rules, and deletion properties.", rolesGranted: ["ADMIN"] },
      { action: "Manage Projects", description: "Create new projects, archive completed ones, or customize color tags.", rolesGranted: ["ADMIN", "MEMBER"] },
      { action: "Link GitHub Repo", description: "Link full GitHub repositories to specific projects for sync logs.", rolesGranted: ["ADMIN"] },
      { action: "Create Channels", description: "Set up communication channels (PUBLIC, PRIVATE, DMs, THREADS).", rolesGranted: ["ADMIN", "MEMBER"] },
      { action: "Delete Messages", description: "Perform administrative override to purge conversations from logs.", rolesGranted: ["ADMIN"] },
      { action: "Publish Documents", description: "Convert local tiptap editor drafts into published team guides.", rolesGranted: ["ADMIN", "MEMBER"] },
      { action: "Read Boards & Tasks", description: "Inspect active Kanban boards, task activity lists, and progress charts.", rolesGranted: ["ADMIN", "MEMBER", "VIEWER"] }
    ]
  },
  project: {
    id: "project",
    name: "Project Level",
    tableName: "project_members",
    icon: FolderGit2,
    description: "Determines contribution scopes and repository-linking details inside active projects.",
    sqlCheck: "CHECK (role IN ('LEAD', 'MEMBER', 'VIEWER'))",
    ddl: `CREATE TABLE project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR NOT NULL DEFAULT 'MEMBER'
    CHECK (role IN ('LEAD', 'MEMBER', 'VIEWER')),
  joined_at TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE (project_id, user_id)
);`,
    indexes: [
      "CREATE INDEX idx_project_members_user ON project_members(user_id);",
      "CREATE INDEX idx_project_members_project ON project_members(project_id);"
    ],
    roles: [
      {
        name: "LEAD",
        label: "Project Lead",
        colorClass: "text-[#7C5CFC] bg-[#7C5CFC]/10 border-[#7C5CFC]/20",
        description: "Primary director of the project. Manages repository links, task schedules, milestones, and assigns members.",
        capabilities: ["Link GitHub Repositories", "Assign & Route Tasks", "Change Project Status", "Override Active Milestones", "Configure Custom Task Labels"]
      },
      {
        name: "MEMBER",
        label: "Project Member",
        colorClass: "text-blue-400 bg-blue-400/10 border-blue-400/20",
        description: "Core participant of the project. Creates and updates tasks, submits work items, and uploads assets.",
        capabilities: ["Create & Update Tasks", "Upload Relevant File Attachments", "Contribute to Project Docs", "Update Assignee Progress", "Add Activity Logging"]
      },
      {
        name: "VIEWER",
        label: "Project Viewer",
        colorClass: "text-zinc-400 bg-zinc-800 border-zinc-700",
        description: "Read-only access. Follows updates, reviews boards, and tracks deliverables without write permissions.",
        capabilities: ["View Task Progress", "Download Shared Assets", "Read Project Documents", "View Repository Links", "Inspect Timeline Schedules"]
      }
    ],
    matrix: [
      { action: "Configure GitHub Sync", description: "Link repo, map issues to tasks, and monitor active webhook callbacks.", rolesGranted: ["LEAD"] },
      { action: "Change Project Metadata", description: "Edit title, color, start date, target deadlines, and status flags.", rolesGranted: ["LEAD"] },
      { action: "Add Project Members", description: "Invite workspace members into this project with custom project roles.", rolesGranted: ["LEAD"] },
      { action: "Create & Dispatch Tasks", description: "Draft task requirements, assign due dates, and specify priority levels.", rolesGranted: ["LEAD", "MEMBER"] },
      { action: "Edit Task Milestones", description: "Change due dates, points, parent tasks, and priority mappings.", rolesGranted: ["LEAD", "MEMBER"] },
      { action: "View Progress Dashboards", description: "Track real-time gantt charts, burndowns, and task lists.", rolesGranted: ["LEAD", "MEMBER", "VIEWER"] }
    ]
  },
  team: {
    id: "team",
    name: "Team Level",
    tableName: "team_members",
    icon: Users2,
    description: "Determines internal leadership structures and task coordination scopes for cross-functional teams.",
    sqlCheck: "CHECK (role IN ('LEAD', 'MEMBER'))",
    ddl: `CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR NOT NULL DEFAULT 'MEMBER'
    CHECK (role IN ('LEAD', 'MEMBER')),
  joined_at TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE (team_id, user_id)
);`,
    indexes: [
      "CREATE INDEX idx_team_members_user ON team_members(user_id);",
      "CREATE INDEX idx_team_members_team ON team_members(team_id);"
    ],
    roles: [
      {
        name: "LEAD",
        label: "Team Lead",
        colorClass: "text-[#7C5CFC] bg-[#7C5CFC]/10 border-[#7C5CFC]/20",
        description: "Orchestrates team activities, manages assignments, schedules tasks, and coordinates delivery goals.",
        capabilities: ["Route Team Workloads", "Assign Team Tasks", "Add/Remove Team Members", "Manage Team Description", "Create Team Channels"]
      },
      {
        name: "MEMBER",
        label: "Team Member",
        colorClass: "text-blue-400 bg-blue-400/10 border-blue-400/20",
        description: "Engages in team operations, executes assignments, and contributes to team communications.",
        capabilities: ["Execute Team Tasks", "Participate in Team DMs", "Collaborate on Shared Scope", "Log Daily Progress", "View Team Dashboards"]
      }
    ],
    matrix: [
      { action: "Manage Team Details", description: "Rename team, update descriptions, and govern team settings.", rolesGranted: ["LEAD"] },
      { action: "Add/Remove Members", description: "Manage members inside this specific cross-functional squad.", rolesGranted: ["LEAD"] },
      { action: "Assign Squad Tasks", description: "Distribute team task backlogs among active members.", rolesGranted: ["LEAD"] },
      { action: "Write Team Messages", description: "Collaborate inside squad-specific communication channels.", rolesGranted: ["LEAD", "MEMBER"] },
      { action: "View Deliverable Graphs", description: "Monitor team-specific workload charts and velocity reports.", rolesGranted: ["LEAD", "MEMBER"] }
    ]
  },
  task: {
    id: "task",
    name: "Task Level",
    tableName: "task_assignees",
    icon: CheckSquare,
    description: "Determines localized responsibility scopes and audit-trails for granular task delivery.",
    sqlCheck: "CHECK (role IN ('OWNER', 'COLLABORATOR', 'REVIEWER'))",
    ddl: `CREATE TABLE task_assignees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR NOT NULL DEFAULT 'OWNER'
    CHECK (role IN ('OWNER', 'COLLABORATOR', 'REVIEWER')),
  assigned_at TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE (task_id, user_id)
);`,
    indexes: [
      "CREATE INDEX idx_task_assignees_task ON task_assignees(task_id);",
      "CREATE INDEX idx_task_assignees_user ON task_assignees(user_id);"
    ],
    roles: [
      {
        name: "OWNER",
        label: "Task Owner",
        colorClass: "text-[#7C5CFC] bg-[#7C5CFC]/10 border-[#7C5CFC]/20",
        description: "Primary driver of delivery. Directly accountable for complete implementation and milestone checkpoints.",
        capabilities: ["Change Task Status", "Modify Task Requirements", "Delegate Subtask Items", "Submit for Code Review", "Log Activity History"]
      },
      {
        name: "COLLABORATOR",
        label: "Task Collaborator",
        colorClass: "text-blue-400 bg-blue-400/10 border-blue-400/20",
        description: "Assisting builder on the task scope. Modifies details, adds notes, logs subtasks, and contributes to delivery.",
        capabilities: ["Contribute Code/Assets", "Add Notes & Comments", "Check Subtask Elements", "Add Work progress logs", "View Requirements Scope"]
      },
      {
        name: "REVIEWER",
        label: "Task Reviewer",
        colorClass: "text-emerald-400 bg-emerald-400/10 border-[#34d399]/20",
        description: "Quality assurance and gatekeeper. Performs structural evaluation and approves the task to transition to 'DONE'.",
        capabilities: ["Approve Completion", "Reject with Feedback", "Review Code Diffs", "Add Acceptance Notes", "Lock Completed Task"]
      }
    ],
    matrix: [
      { action: "Approve to 'DONE'", description: "Review and merge deliverables, officially shifting the status to DONE.", rolesGranted: ["REVIEWER"] },
      { action: "Modify Core Requirements", description: "Change due date, points, title, and key constraints.", rolesGranted: ["OWNER"] },
      { action: "Add Work Progress Logs", description: "Post updates, logs, or commit references to the activity history.", rolesGranted: ["OWNER", "COLLABORATOR"] },
      { action: "Complete Subtasks", description: "Check off items on the task's child check-list.", rolesGranted: ["OWNER", "COLLABORATOR"] },
      { action: "Reject & Request Revisions", description: "Shift task status back to 'TODO' or 'IN_PROGRESS' with comments.", rolesGranted: ["REVIEWER"] },
      { action: "Post Task Comments", description: "Participate in localized QA discussions and upload debug logs.", rolesGranted: ["OWNER", "COLLABORATOR", "REVIEWER"] }
    ]
  }
};

const initialSeedMembers = [
  { id: "s1", fullName: "Alex Rivera", email: "alex.r@hivespace.app", role: "OWNER", avatarUrl: "" },
  { id: "s2", fullName: "Sarah Chen", email: "sarah.c@hivespace.app", role: "ADMIN", avatarUrl: "" },
  { id: "s3", fullName: "Marcus Vance", email: "marcus.v@hivespace.app", role: "BILLING_ADMIN", avatarUrl: "" },
  { id: "s4", fullName: "Elena Rostova", email: "elena.r@hivespace.app", role: "MEMBER", avatarUrl: "" },
];

export default function RolesPermissionsPage() {
  const { members: apiMembers, loading: apiLoading } = useMembers();

  const [activeLevel, setActiveLevel] = useState<LevelType>("tenant");
  const [showSql, setShowSql] = useState<boolean>(false);
  
  const [membersList, setMembersList] = useState<any[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("");

  const activeDetail = levelsData[activeLevel];

  // Initialize members list on mount / API updates
  useEffect(() => {
    if (apiMembers && apiMembers.length > 0) {
      setMembersList(
        apiMembers.map(m => ({
          id: m.id,
          fullName: m.fullName || m.username || "User",
          email: m.email,
          role: m.role || "MEMBER",
          avatarUrl: m.avatarUrl
        }))
      );
    } else {
      setMembersList(initialSeedMembers);
    }
  }, [apiMembers]);

  // Set initial state of new role selection based on active level roles
  useEffect(() => {
    if (activeDetail.roles.length > 0) {
      setNewRole(activeDetail.roles[0].name);
    }
  }, [activeLevel, activeDetail]);

  const handleCopyDdl = () => {
    navigator.clipboard.writeText(activeDetail.ddl);
    toast.success("DDL copied to clipboard!");
  };

  const handleTogglePermission = (action: string, role: string) => {
    toast.info(
      `Protected: HiveSpace enforces "${action}" for the "${role}" role via PostgreSQL "${activeDetail.tableName}" CHECK constraints.`,
      { duration: 4000 }
    );
  };

  // Maps custom DB roles per tier level dynamically
  function getMappedRole(originalRole: string, level: LevelType): string {
    const norm = originalRole?.toUpperCase() ?? "MEMBER";
    
    switch (level) {
      case "tenant":
        if (["OWNER", "ADMIN", "BILLING_ADMIN", "MEMBER"].includes(norm)) return norm;
        return "MEMBER";
      case "workspace":
        if (norm === "OWNER" || norm === "ADMIN") return "ADMIN";
        if (norm === "VIEWER") return "VIEWER";
        return "MEMBER";
      case "project":
        if (norm === "OWNER" || norm === "ADMIN" || norm === "LEAD") return "LEAD";
        if (norm === "VIEWER") return "VIEWER";
        return "MEMBER";
      case "team":
        if (norm === "OWNER" || norm === "ADMIN" || norm === "LEAD") return "LEAD";
        return "MEMBER";
      case "task":
        if (norm === "OWNER" || norm === "LEAD" || norm === "ADMIN") return "OWNER";
        if (norm === "VIEWER" || norm === "REVIEWER") return "REVIEWER";
        return "COLLABORATOR";
      default:
        return "MEMBER";
    }
  }

  // --- MEMBER DIRECTORY ACTIONS ---
  const handleAssignUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newEmail.includes("@")) {
      toast.error("Please provide a valid email address");
      return;
    }
    
    if (membersList.some(m => m.email.toLowerCase() === newEmail.toLowerCase())) {
      toast.error("User is already assigned to a role!");
      return;
    }

    const username = newEmail.split("@")[0];
    const computedName = username.split(".").map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
    
    const newMember = {
      id: "u_" + Math.random().toString(36).substr(2, 9),
      fullName: computedName,
      email: newEmail.toLowerCase(),
      role: newRole,
      avatarUrl: ""
    };

    setMembersList(prev => [newMember, ...prev]);
    setNewEmail("");
    toast.success(`Assigned ${newMember.fullName} to the ${newRole} role!`);
  };

  const handleRevokeMember = (userId: string) => {
    const target = membersList.find(m => m.id === userId);
    if (!target) return;

    setMembersList(prev => prev.filter(m => m.id !== userId));
    toast.success(`Access level revoked for ${target.fullName}.`);
  };

  const handlePromoteMember = (userId: string, targetRole: string) => {
    const target = membersList.find(m => m.id === userId);
    if (!target) return;

    setMembersList(prev => prev.map(m => m.id === userId ? { ...m, role: targetRole } : m));
    toast.success(`Promoted ${target.fullName} to ${targetRole}!`);
  };

  return (
    <div className="max-w-5xl px-8 py-6 text-[#E5E1E4]">
      {/* HEADER SECTION */}
      <header className="mb-8 relative">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#7C5CFC]/10 border border-[#7C5CFC]/20 rounded-lg">
            <Fingerprint className="h-6 w-6 text-[#7C5CFC]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
              Roles & Permissions
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Explore HiveSpace's multi-layered permission models, fully mapped and enforced according to <code className="bg-zinc-800 px-1 py-0.5 rounded text-xs text-[#7C5CFC] font-mono">HIveSpaceSchema.sql</code>.
            </p>
          </div>
        </div>
      </header>

      {/* MODULAR COMPONENT: LEVEL SELECTOR TABS */}
      <LevelTabs 
        activeLevel={activeLevel} 
        setActiveLevel={setActiveLevel} 
        levelsData={levelsData} 
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start mb-8">
        {/* ACTIVE LEVEL OVERVIEW & ROLES */}
        <div className="lg:col-span-2 space-y-6">
          {/* MODULAR COMPONENT: LEVEL OVERVIEW CARD */}
          <LevelOverview activeDetail={activeDetail} />

          {/* MODULAR COMPONENT: DEFINED ROLES LIST */}
          <RolesList roles={activeDetail.roles} />
        </div>

        {/* DATABASE INTEGRITY SIDEBAR */}
        <div className="space-y-6">
          {/* MODULAR COMPONENT: SCHEMA INTEGRITY VIEWER */}
          <SchemaIntegrity 
            activeDetail={activeDetail}
            showSql={showSql}
            setShowSql={setShowSql}
            handleCopyDdl={handleCopyDdl}
          />

          <div className="border border-amber-500/20 bg-amber-500/5 rounded-xl p-4 flex gap-3">
            <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <span className="text-xs font-bold text-amber-500 block">
                Database Level Constraints
              </span>
              <span className="text-[11px] text-zinc-400 mt-1 leading-normal block">
                HiveSpace implements strict Postgres <code className="text-amber-400 font-mono text-[10px]">CHECK</code> constraints. Privilege scaling requires valid ownership token signoffs to block privilege escalation.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* MODULAR COMPONENT: MINIMALIST ACTIVE ROLES MANAGER DIRECTORY */}
      <ActiveRolesDirectory 
        activeDetail={activeDetail}
        activeLevel={activeLevel}
        membersList={membersList}
        newEmail={newEmail}
        setNewEmail={setNewEmail}
        newRole={newRole}
        setNewRole={setNewRole}
        handleAssignUser={handleAssignUser}
        handlePromoteMember={handlePromoteMember}
        handleRevokeMember={handleRevokeMember}
        getMappedRole={getMappedRole}
      />

      {/* MODULAR COMPONENT: ACCESS MATRIX */}
      <CapabilityMatrix 
        activeDetail={activeDetail}
        handleTogglePermission={handleTogglePermission}
      />
    </div>
  );
}
