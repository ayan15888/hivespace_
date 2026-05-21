"use client";

import { useState, useEffect } from "react";
import { 
  Building2, 
  Layers, 
  FolderGit2, 
  Users2, 
  CheckSquare, 
  Fingerprint,
  X,
  ShieldCheck
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { useMembers } from "@/hooks/useMembers";
import { useAuth } from "@/hooks/useAuth";
import { useOrgStore } from "@/store/orgStore";
import { canManageOrgMembers } from "@/lib/permissions/tenant";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { gooeyToast as toast } from "@/components/ui/goey-toaster";
import { updateOrganizationMemberRole, removeOrganizationMember } from "@/lib/api/orgs";

// Modular sub-components
import { LevelType, LevelDetail } from "@/components/features/settings/roles/types";
import LevelTabs from "@/components/features/settings/roles/LevelTabs";
import LevelOverview from "@/components/features/settings/roles/LevelOverview";
import ActiveRolesDirectory from "@/components/features/settings/roles/ActiveRolesDirectory";
import CapabilityMatrix from "@/components/features/settings/roles/CapabilityMatrix";

const levelsData: Record<LevelType, LevelDetail> = {
  tenant: {
    id: "tenant",
    name: "Organization / Tenant Level",
    tableName: "tenant_members",
    icon: Building2,
    description: "Governs administrative capabilities, subscriptions, billing, and global resource creation for the entire platform tenant.",
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
      { action: "Delete Organization", description: "Hard purge of the tenant account and all related system records.", rolesGranted: ["OWNER"] },
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
        colorClass: "text-emerald-400 bg-[#34d399]/10 border-[#34d399]/20",
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

export default function RolesPermissionsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { activeOrg } = useOrgStore();
  const { members: apiMembers, loading: apiLoading } = useMembers();

  const [activeLevel, setActiveLevel] = useState<LevelType>("tenant");
  const [helpModalLevel, setHelpModalLevel] = useState<LevelType | null>(null);
  
  const [membersList, setMembersList] = useState<any[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("");

  const activeDetail = levelsData[activeLevel];

  // RBAC validation: Only Admin and Owner are allowed to allocate, promote, or revoke roles
  const canManage = canManageOrgMembers(apiMembers, user?.email, activeOrg);

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
      setMembersList([]);
    }
  }, [apiMembers]);

  // Set initial state of new role selection based on active level roles
  useEffect(() => {
    if (activeDetail.roles.length > 0) {
      setNewRole(activeDetail.roles[0].name);
    }
  }, [activeLevel, activeDetail]);

  const handleTogglePermission = (action: string, role: string) => {
    toast.info(
      `Protected: HiveSpace enforces "${action}" for the "${role}" role across all workspace levels.`,
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
  
  // 1. Assign User Level Role
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
    toast.success(`Allocated ${newMember.fullName} locally to the ${newRole} role. Secure invitation may be sent via Members tab.`);
  };

  // 2. Revoke User Level Credentials (with real DB persistence!)
  const handleRevokeMember = async (userId: string) => {
    const target = membersList.find(m => m.id === userId);
    if (!target) return;

    try {
      if (activeLevel === "tenant" && activeOrg?.id) {
        await removeOrganizationMember(activeOrg.id, userId);
        queryClient.invalidateQueries({ queryKey: queryKeys.members(activeOrg.id) });
        toast.success(`Revoked organization membership for ${target.fullName} successfully!`);
      } else {
        setMembersList(prev => prev.filter(m => m.id !== userId));
        toast.success(`[Simulated] Credentials revoked for ${target.fullName} inside this workspace context.`);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to revoke active membership");
    }
  };

  // 3. Promote / Change Member Roles (with real DB persistence!)
  const handlePromoteMember = async (userId: string, targetRole: string) => {
    const target = membersList.find(m => m.id === userId);
    if (!target) return;

    try {
      if (activeLevel === "tenant" && activeOrg?.id) {
        await updateOrganizationMemberRole(activeOrg.id, userId, targetRole);
        queryClient.invalidateQueries({ queryKey: queryKeys.members(activeOrg.id) });
        toast.success(`Promoted ${target.fullName} to ${targetRole} successfully!`);
      } else {
        setMembersList(prev => prev.map(m => m.id === userId ? { ...m, role: targetRole } : m));
        toast.success(`[Simulated] Role updated to ${targetRole} for ${target.fullName}.`);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update role");
    }
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
              Explore HiveSpace's multi-layered permission models, fully mapped and enforced across the platform resources.
            </p>
          </div>
        </div>
      </header>

      {/* LEVEL SELECTOR TABS WITH INTEGRATED POPUPS */}
      <LevelTabs 
        activeLevel={activeLevel} 
        setActiveLevel={setActiveLevel} 
        levelsData={levelsData} 
        onOpenHelp={(level) => setHelpModalLevel(level)}
      />

      <div className="space-y-6 mb-8">
        {/* LEVEL OVERVIEW CARD */}
        <LevelOverview activeDetail={activeDetail} />
      </div>

      {/* MINIMALIST ACTIVE ROLES MANAGER DIRECTORY */}
      {apiLoading ? (
        <div className="bg-[#1C1B1E] border border-zinc-800/80 rounded-xl p-6 mb-8 text-center text-xs text-zinc-500 animate-pulse">
          Loading active memberships...
        </div>
      ) : (
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
          canManage={canManage}
        />
      )}

      {/* COMPREHENSIVE ACCESS MATRIX */}
      <CapabilityMatrix 
        activeDetail={activeDetail}
        handleTogglePermission={handleTogglePermission}
      />

      {/* DYNAMIC HIGH-FIDELITY OVERLAY POPUP GUIDE */}
      {helpModalLevel && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300"
          onClick={() => setHelpModalLevel(null)}
        >
          <div 
            className="bg-[#1C1B1E] border border-zinc-800 rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto p-8 shadow-2xl relative animate-in zoom-in-95 duration-300 text-left overflow-hidden"
            onClick={(e) => e.stopPropagation()} 
          >
            {/* High-Fidelity Ambient Background Glows */}
            <div className="absolute -left-48 -top-48 w-96 h-96 rounded-full bg-[#7C5CFC]/10 blur-[130px] pointer-events-none" />
            <div className="absolute -right-48 -bottom-48 w-96 h-96 rounded-full bg-emerald-500/5 blur-[130px] pointer-events-none" />

            {/* Close Trigger Icon */}
            <button
              onClick={() => setHelpModalLevel(null)}
              className="absolute top-5 right-5 text-zinc-400 hover:text-white p-2 hover:bg-zinc-800/60 rounded-full transition-colors cursor-pointer z-20"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3.5 mb-8 pb-5 border-b border-zinc-800/80 relative z-10">
              <div className="p-3 bg-[#7C5CFC]/10 border border-[#7C5CFC]/20 rounded-xl">
                {(() => {
                  const ActiveIcon = levelsData[helpModalLevel].icon;
                  return <ActiveIcon className="h-7 w-7 text-[#7C5CFC]" />;
                })()}
              </div>
              <div>
                <span className="text-[11px] font-bold text-[#7C5CFC] uppercase tracking-widest font-mono">
                  Access Specifications Guide
                </span>
                <h2 className="text-2xl font-extrabold text-white mt-1 tracking-tight">
                  {levelsData[helpModalLevel].name} clearances
                </h2>
              </div>
            </div>

            {/* Redesigned grid container displaying roles dynamically side-by-side in one row */}
            <div 
              className={cn(
                "grid grid-cols-1 gap-5 w-full mb-8 relative z-10",
                levelsData[helpModalLevel].roles.length === 2 && "md:grid-cols-2",
                levelsData[helpModalLevel].roles.length === 3 && "md:grid-cols-3",
                levelsData[helpModalLevel].roles.length === 4 && "md:grid-cols-4"
              )}
            >
              {levelsData[helpModalLevel].roles.map((role) => (
                <div 
                  key={role.name} 
                  className="p-6 bg-[#252427]/40 border border-zinc-800/90 rounded-xl flex flex-col justify-between h-full hover:border-zinc-700/60 shadow-lg hover:shadow-xl hover:shadow-[#7C5CFC]/2 transition-all duration-350 hover:translate-y-[-3px]"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                      <Badge className={cn("text-[11px] px-3 py-1 font-bold uppercase tracking-wider rounded border", role.colorClass)}>
                        {role.label}
                      </Badge>
                      <span className="text-xs font-mono text-zinc-550 font-bold">
                        {role.name}
                      </span>
                    </div>

                    {/* Highly readable upgraded text */}
                    <p className="text-[14.5px] font-medium text-white leading-relaxed mb-5">
                      {role.description}
                    </p>
                  </div>
                  
                  {/* Clearance pill tag flow with high-fidelity green chips */}
                  <div className="mt-auto pt-4 border-t border-zinc-800/80">
                    <div className="flex items-center gap-1.5 mb-2.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest font-mono">
                        Clearances Granted
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {role.capabilities.map((cap, i) => (
                        <span 
                          key={i} 
                          className="inline-flex items-center gap-1.5 text-xs font-semibold bg-emerald-950/45 border border-emerald-500/20 text-[#a7f3d0] px-2.5 py-1 rounded-md hover:bg-emerald-900/30 transition-colors duration-250 cursor-default"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
                          {cap}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex justify-end pt-3 relative z-10">
              <button
                onClick={() => setHelpModalLevel(null)}
                className="bg-[#7C5CFC] hover:bg-[#6b4ee3] text-white font-bold text-xs px-6 py-3 rounded-xl transition-all duration-200 transform hover:scale-[1.02] shadow-lg shadow-[#7C5CFC]/15 cursor-pointer"
              >
                Got it, Close Guide
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
