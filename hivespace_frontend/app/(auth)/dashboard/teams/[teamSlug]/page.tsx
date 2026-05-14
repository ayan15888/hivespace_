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

// Components
import { TeamBreadcrumbs } from "@/components/features/teams/TeamBreadcrumbs";
import { TeamHeader } from "@/components/features/teams/TeamHeader";
import { OverviewTab } from "@/components/features/teams/OverviewTab";
import { MembersTab } from "@/components/features/teams/MembersTab";
import { TasksTab } from "@/components/features/teams/TasksTab";
import { ChannelsTab } from "@/components/features/teams/ChannelsTab";
import { ManageTeamSheet } from "@/components/features/teams/ManageTeamSheet";
import { useParams } from "next/navigation";

export default function BackendTeamPage() {
  const params = useParams();
  const teamSlug = params?.teamSlug as string || "backend";
  const displayTitle = teamSlug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ") + " Team";

  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="flex h-screen flex-col bg-[#201F21] text-[#E5E1E4] overflow-hidden">
      {/* TOP BREADCRUMB BAR */}
      <TeamBreadcrumbs teamName={displayTitle} />

      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* TEAM HEADER SECTION */}
        <TeamHeader teamName={displayTitle} />

        {/* TAB NAVIGATION */}
        <Tabs defaultValue="overview" className="w-full" onValueChange={setActiveTab}>
          <div className="sticky top-0 z-20 border-b border-zinc-800/50 bg-[#201F21] px-6">
          <TabsList className="h-12 w-full justify-start gap-8 bg-transparent p-0">
            <TabsTrigger 
              value="overview" 
              className="relative h-12 rounded-none border-b-2 border-transparent bg-transparent px-0 pb-3 pt-4 text-sm font-medium text-zinc-500 data-[state=active]:border-violet-500 data-[state=active]:text-white data-[state=active]:bg-transparent data-[state=active]:shadow-none shadow-none"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger 
              value="members"
              className="relative h-12 rounded-none border-b-2 border-transparent bg-transparent px-0 pb-3 pt-4 text-sm font-medium text-zinc-500 data-[state=active]:border-violet-500 data-[state=active]:text-white data-[state=active]:bg-transparent data-[state=active]:shadow-none shadow-none"
            >
              Members
            </TabsTrigger>
            <TabsTrigger 
              value="tasks"
              className="relative h-12 rounded-none border-b-2 border-transparent bg-transparent px-0 pb-3 pt-4 text-sm font-medium text-zinc-500 data-[state=active]:border-violet-500 data-[state=active]:text-white data-[state=active]:bg-transparent data-[state=active]:shadow-none shadow-none"
            >
              Tasks
            </TabsTrigger>
            <TabsTrigger 
              value="channels"
              className="relative h-12 rounded-none border-b-2 border-transparent bg-transparent px-0 pb-3 pt-4 text-sm font-medium text-zinc-500 data-[state=active]:border-violet-500 data-[state=active]:text-white data-[state=active]:bg-transparent data-[state=active]:shadow-none shadow-none"
            >
              Channels
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-y-auto">
          <TabsContent value="overview" className="m-0 border-none p-0 outline-none">
            <OverviewTab />
          </TabsContent>
          <TabsContent value="members" className="m-0 border-none p-0 outline-none">
            <MembersTab />
          </TabsContent>
          <TabsContent value="tasks" className="m-0 border-none p-0 outline-none">
            <TasksTab />
          </TabsContent>
          <TabsContent value="channels" className="m-0 border-none p-0 outline-none">
            <ChannelsTab />
          </TabsContent>
        </div>
        </Tabs>
      </div>
    </div>
  );
}
