"use client";

import { 
  ChevronDown, 
  Plus, 
  Users, 
  ExternalLink, 
  Palette,
  Check,
  KanbanSquare,
  FileText,
  MessageSquare,
  Settings,
  Layout
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CreateOrgModal } from "@/components/features/organizations/CreateOrgModal";
import { CreateWorkspaceModal } from "@/components/features/workspaces/CreateWorkspaceModal";
import { CreateProjectModal } from "@/components/features/projects/CreateProjectModal";
import { CreateTeamModal } from "@/components/features/teams/CreateTeamModal";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useOrgs } from "@/hooks/useOrgs";
import { useOrgStore } from "@/store/orgStore";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { useProjects } from "@/hooks/useProjects";
import { useTeams } from "@/hooks/useTeams";


import { PROJECT_COLOR_MAP } from "@/lib/constants/colors";

const ALL_CHANNELS = [
  { name: "backend-ops", unreadCount: 4, projectId: "sprint-3" },
  { name: "design-sync", unreadCount: 0, projectId: "frontend-redesign" },
  { name: "general", unreadCount: 0, projectId: null }
];

export function WorkspaceSidebar() {
  const pathname = usePathname();
  const [manualExpandedId, setManualExpandedId] = useState<string | null>(null);
  const [isCreateWorkspaceModalOpen, setIsCreateWorkspaceModalOpen] = useState(false);
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);
  const [isCreateOrgModalOpen, setIsCreateOrgModalOpen] = useState(false);
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false);
  
  const { orgs } = useOrgs();
  const { activeOrg, setActiveOrg } = useOrgStore();
  
  const { workspaces } = useWorkspaces();
  const { activeWorkspace, setActiveWorkspace } = useWorkspaceStore();
  const { projects, loading: projectsLoading } = useProjects();
  const activeProject = projects.find(p => pathname.startsWith(`/dashboard/projects/${p.id}`));
  const activeProjectId = activeProject?.id || null;
  
  const expandedProjectId = manualExpandedId !== null ? manualExpandedId : activeProjectId;
  const { teams } = useTeams(activeWorkspace?.id || undefined);

  // Auto-select first workspace if none active
  useEffect(() => {
    if (!activeWorkspace && workspaces.length > 0) {
      setActiveWorkspace(workspaces[0]);
    }
  }, [workspaces, activeWorkspace, setActiveWorkspace]);

  const toggleExpand = (projectId: string) => {
    setManualExpandedId(expandedProjectId === projectId ? "" : projectId);
  };

  const isProjectLead = true; // Use mock role for now

  return (
    <aside className="fixed top-0 left-[56px] z-40 flex h-full w-[220px] flex-col bg-hs-nav border-r border-border/50">
      
      {/* 1. WORKSPACE HEADER */}
      <Popover>
        <PopoverTrigger asChild>
          <div className="flex h-[48px] w-full cursor-pointer items-center justify-between px-4 hover:bg-muted/50 transition-colors border-b border-border/50">
            <div className="flex flex-col justify-center">
              <span className="text-sm font-medium text-foreground leading-tight">
                {activeWorkspace?.name || "Select Workspace"}
              </span>
              <span className="text-xs text-muted-foreground leading-tight">
                {activeOrg?.name || "Hivespace"}
              </span>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
          </div>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[200px] ml-4 bg-sidebar/95 backdrop-blur-xl border border-zinc-800 text-foreground p-1 rounded-md shadow-lg shadow-black/40">
          <div className="flex flex-col gap-1">
            {workspaces.map((workspace) => (
              <div 
                key={workspace.id}
                onClick={() => setActiveWorkspace(workspace)}
                className={cn(
                  "flex items-center justify-between px-2 py-1.5 cursor-pointer hover:bg-muted/50 rounded-sm border-l-2 transition-all",
                  activeWorkspace?.id === workspace.id 
                    ? "border-primary bg-muted/30 text-foreground" 
                    : "border-transparent text-muted-foreground"
                )}
              >
                <span className={cn("text-sm", activeWorkspace?.id === workspace.id ? "font-medium" : "")}>
                  {workspace.name}
                </span>
                {activeWorkspace?.id === workspace.id && (
                  <Check className="h-4 w-4 text-hs-accent" strokeWidth={1.5} />
                )}
              </div>
            ))}
            
            {workspaces.length > 0 && <div className="h-px bg-border/50 my-1 mx-2" />}
            <div 
              className="flex items-center px-2 py-1.5 cursor-pointer hover:bg-muted/50 rounded-sm text-muted-foreground"
              onClick={() => setIsCreateWorkspaceModalOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" strokeWidth={1.5} />
              <span className="text-sm">Create Workspace</span>
            </div>
            <div className="h-px bg-border/50 my-1 mx-2" />
            <div className="flex items-center justify-between px-2 py-1 mb-1">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Organizations</span>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-4 w-4 text-zinc-500 hover:text-zinc-300"
                onClick={() => setIsCreateOrgModalOpen(true)}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            {orgs.map((org) => (
              <div 
                key={org.id}
                onClick={() => {
                  setActiveOrg(org);
                  setActiveWorkspace(null); // Reset workspace when switching org
                }}
                className={cn(
                  "flex items-center justify-between px-2 py-1.5 cursor-pointer hover:bg-muted/50 rounded-sm border-l-2 transition-all",
                  activeOrg?.id === org.id 
                    ? "border-primary bg-muted/20 text-foreground" 
                    : "border-transparent text-muted-foreground"
                )}
              >
                <span className="text-xs">{org.name}</span>
                {activeOrg?.id === org.id && (
                  <Check className="h-3 w-3 text-hs-accent" strokeWidth={1.5} />
                )}
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 flex flex-col gap-6 scrollbar-none pb-8">
        
        {/* 2. + New Project Button */}
        <div className="relative w-full group/btn-wrap">
          <div className="glowing-border-btn-glow" />
          <div className="glowing-border-btn-wrap">
            <Button 
              variant="ghost" 
              className="w-full justify-start text-xs text-muted-foreground hover:text-foreground h-8 px-2 bg-transparent hover:bg-transparent border-none rounded-[inherit]"
              onClick={() => setIsCreateProjectModalOpen(true)}
            >
              <Plus strokeWidth={1.5} className="mr-2 h-3.5 w-3.5" />
              New Project
            </Button>
          </div>
        </div>

        <div className="flex flex-col">
          <span className="px-2 mb-2 text-xs font-semibold text-muted-foreground/60 tracking-widest uppercase">Projects</span>
          
          <div className="flex flex-col gap-0.5">
            <AnimatePresence initial={false}>
              {projects.map(project => {
                const projectPath = `/dashboard/projects/${project.id}`;
                const isActive = pathname.startsWith(projectPath);
                const isExpanded = expandedProjectId === project.id;
                const dotColor = PROJECT_COLOR_MAP[project.color || ""] || "var(--hs-accent)";
                
                return (
                  <motion.div 
                    key={project.id} 
                    className="flex flex-col"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {/* Project Row */}
                    <div className="relative group/row">
                      <Link 
                        href={projectPath}
                        className={cn(
                          "group flex h-8 items-center justify-between cursor-pointer rounded-r-md px-2 border-l-2 transition-colors",
                          !isActive && "border-transparent text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                        )}
                        style={isActive ? {
                          backgroundColor: `color-mix(in srgb, ${dotColor} 20%, transparent)`,
                          borderColor: dotColor,
                          color: "var(--foreground)"
                        } : undefined}
                      >
                        <div className="flex items-center gap-1.5 min-w-0 pl-4">
                          <div className="flex items-center justify-center w-4 h-4 rounded-sm" style={{ backgroundColor: `color-mix(in srgb, ${dotColor} 20%, transparent)` }}>
                            <Layout className="h-2.5 w-2.5" style={{ color: dotColor }} />
                          </div>
                          <span className="text-sm truncate font-medium">{project.name}</span>
                        </div>
                      </Link>
                      
                      {/* Separate Toggle Area */}
                      <div 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleExpand(project.id);
                        }}
                        className="absolute left-0 top-0 bottom-0 w-8 flex items-center justify-center cursor-pointer hover:bg-white/5 transition-colors rounded-l-md"
                      >
                        <motion.div
                          animate={{ rotate: isExpanded ? 0 : -90 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronDown className="h-3 w-3 text-zinc-500 hover:text-zinc-300" strokeWidth={2} />
                        </motion.div>
                      </div>
                    </div>

                    {/* Sub-items */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div 
                          className="flex flex-col py-0.5 overflow-hidden"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <SubItem 
                            icon={KanbanSquare} 
                            label="Board" 
                            href={`${projectPath}/board`} 
                            isActive={pathname === `${projectPath}/board`} 
                            activeColor={dotColor}
                          />
                          <SubItem 
                            icon={FileText} 
                            label="Docs" 
                            href="/dashboard/docs" 
                            isActive={pathname.startsWith("/dashboard/docs")} 
                            activeColor={dotColor}
                          />
                          <SubItem 
                            icon={MessageSquare} 
                            label="Channels" 
                            href={`/dashboard/chat/${project.id}`} 
                            isActive={pathname.startsWith("/dashboard/chat")} 
                            activeColor={dotColor}
                          />
                          {isProjectLead && (
                            <SubItem 
                              icon={Settings} 
                              label="Settings" 
                              href={`${projectPath}/settings`} 
                              isActive={pathname === `${projectPath}/settings`} 
                              activeColor={dotColor}
                            />
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            {projects.length === 0 && !projectsLoading && (
              <div className="px-4 py-2 text-xs text-zinc-500 italic">No projects found</div>
            )}
          </div>
        </div>

        {/* 4. TEAMS */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-xs font-semibold text-muted-foreground/60 tracking-widest uppercase">Teams</span>
            {activeWorkspace?.id && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-4 w-4 text-zinc-500 hover:text-zinc-300"
                onClick={() => setIsCreateTeamOpen(true)}
              >
                <Plus className="h-3 w-3" strokeWidth={1.5} />
              </Button>
            )}
          </div>
          
          <div className="flex flex-col gap-0.5">
            {teams.length > 0 ? teams.map(team => {
              const path = `/dashboard/teams/${team.id}`;
              const isActive = pathname === path;
              return (
                <motion.div
                  key={team.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Link 
                    href={path}
                    className={cn(
                      "group flex h-8 items-center justify-between cursor-pointer rounded-r-md px-2 border-l-2 transition-colors",
                      isActive 
                        ? "border-primary bg-muted/50 text-foreground" 
                        : "border-transparent text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Users className="h-[14px] w-[14px] text-zinc-500 group-hover:text-zinc-400" />
                      <span className="text-sm truncate">{team.name}</span>
                    </div>
                  </Link>
                </motion.div>
              );
            }) : (
              <div className="px-2 py-1 text-xs text-zinc-500 italic">No teams found</div>
            )}
          </div>
        </div>

        {/* 5. CHANNELS */}
        <div className="flex flex-col">
          <span className="px-2 mb-2 text-[10px] font-bold text-muted-foreground/60 tracking-widest uppercase">
            Channels ({activeWorkspace?.name || "No Workspace"})
          </span>
          
          <div className="flex flex-col gap-0.5">
             {ALL_CHANNELS
              .filter(c => !expandedProjectId || c.projectId === expandedProjectId || c.projectId === null)
              .map(channel => {
                const path = `/dashboard/chat/${channel.name}`;
                const isActive = pathname === path;
                const channelProject = projects.find(p => p.id === channel.projectId);
                const channelColor = PROJECT_COLOR_MAP[channelProject?.color || ""] || "var(--hs-accent)";

                return (
                  <Link 
                    href={path}
                    key={channel.name}
                    className={cn(
                      "flex h-8 items-center justify-between cursor-pointer rounded-r-md px-2 border-l-2 transition-colors",
                      !isActive && "border-transparent text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                    )}
                    style={isActive ? {
                      backgroundColor: `color-mix(in srgb, ${channelColor} 20%, transparent)`,
                      borderColor: channelColor,
                      color: "var(--foreground)"
                    } : undefined}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-zinc-500 font-light text-lg leading-none mb-0.5" style={isActive ? { color: channelColor } : undefined}>#</span>
                      <span className="text-sm truncate">{channel.name}</span>
                    </div>
                    {channel.unreadCount > 0 && !isActive && (
                      <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: channelColor }} />
                    )}
                  </Link>
                );
            })}
          </div>
        </div>
      </div>

      {/* 6. RESOURCES (Bottom) */}
      <div className="flex flex-col gap-1 p-3 mt-auto border-t border-zinc-800/50">
        <div className="flex items-center gap-2 cursor-pointer px-2 py-1.5 text-zinc-500 hover:text-zinc-300 transition-colors">
          <ExternalLink className="h-[14px] w-[14px]" />
          <span className="text-xs">API Docs</span>
        </div>
        <div className="flex items-center gap-2 cursor-pointer px-2 py-1.5 text-zinc-500 hover:text-zinc-300 transition-colors">
          <Palette className="h-[14px] w-[14px]" />
          <span className="text-xs">Design Kit</span>
        </div>
      </div>

      <CreateWorkspaceModal 
        isOpen={isCreateWorkspaceModalOpen} 
        onClose={() => setIsCreateWorkspaceModalOpen(false)} 
      />

      <CreateProjectModal 
        isOpen={isCreateProjectModalOpen}
        onClose={() => setIsCreateProjectModalOpen(false)}
      />

      <CreateOrgModal 
        isOpen={isCreateOrgModalOpen}
        onClose={() => setIsCreateOrgModalOpen(false)}
      />

      {activeWorkspace?.id && (
        <CreateTeamModal 
          isOpen={isCreateTeamOpen} 
          workspaceId={activeWorkspace.id}
          onClose={() => setIsCreateTeamOpen(false)}
        />
      )}
    </aside>
  );
}

function SubItem({ 
  icon: Icon, 
  label, 
  href, 
  isActive,
  activeColor = "var(--hs-accent)"
}: { 
  icon: React.ElementType; 
  label: string; 
  href: string; 
  isActive: boolean;
  activeColor?: string;
}) {
  return (
    <Link 
      href={href}
      className={cn(
        "flex h-7 items-center gap-2 pl-8 pr-2 transition-colors rounded-md no-underline",
        !isActive && "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
      )}
      style={isActive ? {
        backgroundColor: `color-mix(in srgb, ${activeColor} 15%, transparent)`,
        color: "white"
      } : undefined}
    >
      <Icon 
        className="h-3 w-3" 
        style={{ color: isActive ? activeColor : "rgb(113 113 122)" }} 
        strokeWidth={1.5} 
      />
      <span className="text-xs font-normal">{label}</span>
    </Link>
  );
}
