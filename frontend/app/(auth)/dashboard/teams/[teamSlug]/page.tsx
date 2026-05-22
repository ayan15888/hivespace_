"use client";

import { useState } from "react";
import { 
  Users, 
  Settings, 
  UserPlus, 
  MessageSquare, 
  PlusCircle, 
  CheckCircle,
  AlertTriangle,
  ChevronDown,
  MoreVertical,
  Crown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger,
  SheetFooter
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

// Components
import { TeamBreadcrumbs } from "@/components/features/teams/TeamBreadcrumbs";
import { TeamHeader } from "@/components/features/teams/TeamHeader";
import { OverviewTab } from "@/components/features/teams/OverviewTab";
import { MembersTab } from "@/components/features/teams/MembersTab";
import { TasksTab } from "@/components/features/teams/TasksTab";
import { ChannelsTab } from "@/components/features/teams/ChannelsTab";
import { ManageTeamSheet } from "@/components/features/teams/ManageTeamSheet";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { useTeams } from "@/hooks/useTeams";
import { useParams } from "next/navigation";

export default function BackendTeamPage() {
  const params = useParams();
  const teamId = params?.teamSlug as string || "";
  const { activeWorkspace } = useWorkspaceStore();
  const { teams, refresh: refreshTeams } = useTeams(activeWorkspace?.id);
  const currentTeam = teams.find(t => t.id === teamId);

  const formattedSlug = teamId
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ") + " Team";

  const displayTitle = currentTeam ? currentTeam.name : formattedSlug;

  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="flex h-screen flex-col bg-hs-main text-foreground overflow-hidden">
      {/* TOP BREADCRUMB BAR */}
      <TeamBreadcrumbs 
        teamName={displayTitle} 
        teamId={teamId}
        projectId={currentTeam?.projectId}
        teamDescription={currentTeam?.description}
        refresh={refreshTeams}
      />

      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* TEAM HEADER SECTION */}
        <TeamHeader teamName={displayTitle} />

        {/* TAB NAVIGATION */}
        <Tabs defaultValue="overview" className="w-full" onValueChange={setActiveTab}>
          <div className="sticky top-0 z-20 border-b border-border/50 bg-hs-main px-6 py-2 flex items-center justify-between">
          <TabsList className="h-auto w-auto justify-start gap-1 bg-transparent p-0 flex flex-wrap">
            <TabsTrigger 
              value="overview" 
              className="relative h-7 w-20 rounded-full border border-border/50 bg-hs-card/25 text-[11px] font-medium text-zinc-500 hover:text-foreground hover:border-border transition-all duration-200 data-[state=active]:bg-transparent data-[state=active]:border-transparent data-[state=active]:text-hs-accent data-[state=active]:shadow-none shadow-none cursor-pointer flex items-center justify-center z-10"
            >
              <span>Overview</span>
              {activeTab === "overview" && (
                <motion.div 
                  layoutId="activeTeamTabIndicator" 
                  className="absolute inset-0 rounded-full border border-hs-accent bg-hs-accent/10 -z-10"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="members"
              className="relative h-7 w-20 rounded-full border border-border/50 bg-hs-card/25 text-[11px] font-medium text-zinc-500 hover:text-foreground hover:border-border transition-all duration-200 data-[state=active]:bg-transparent data-[state=active]:border-transparent data-[state=active]:text-hs-accent data-[state=active]:shadow-none shadow-none cursor-pointer flex items-center justify-center z-10"
            >
              <span>Members</span>
              {activeTab === "members" && (
                <motion.div 
                  layoutId="activeTeamTabIndicator" 
                  className="absolute inset-0 rounded-full border border-hs-accent bg-hs-accent/10 -z-10"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="tasks"
              className="relative h-7 w-20 rounded-full border border-border/50 bg-hs-card/25 text-[11px] font-medium text-zinc-500 hover:text-foreground hover:border-border transition-all duration-200 data-[state=active]:bg-transparent data-[state=active]:border-transparent data-[state=active]:text-hs-accent data-[state=active]:shadow-none shadow-none cursor-pointer flex items-center justify-center z-10"
            >
              <span>Tasks</span>
              {activeTab === "tasks" && (
                <motion.div 
                  layoutId="activeTeamTabIndicator" 
                  className="absolute inset-0 rounded-full border border-hs-accent bg-hs-accent/10 -z-10"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="channels"
              className="relative h-7 w-20 rounded-full border border-border/50 bg-hs-card/25 text-[11px] font-medium text-zinc-500 hover:text-foreground hover:border-border transition-all duration-200 data-[state=active]:bg-transparent data-[state=active]:border-transparent data-[state=active]:text-hs-accent data-[state=active]:shadow-none shadow-none cursor-pointer flex items-center justify-center z-10"
            >
              <span>Channels</span>
              {activeTab === "channels" && (
                <motion.div 
                  layoutId="activeTeamTabIndicator" 
                  className="absolute inset-0 rounded-full border border-hs-accent bg-hs-accent/10 -z-10"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <TabsContent key={activeTab} value={activeTab} className="m-0 border-none p-0 outline-none" forceMount>
              <motion.div
                key={`${activeTab}-tab`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
              >
                {activeTab === "overview" && <OverviewTab />}
                {activeTab === "members" && <MembersTab />}
                {activeTab === "tasks" && <TasksTab />}
                {activeTab === "channels" && <ChannelsTab />}
              </motion.div>
            </TabsContent>
          </AnimatePresence>
        </div>
        </Tabs>
      </div>
    </div>
  );
}
