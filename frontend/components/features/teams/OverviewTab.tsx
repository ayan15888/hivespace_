"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Calendar, Loader2, Activity } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn, getAvatarColorClass } from "@/lib/utils";
import { getTeamMembers, TeamMemberResponse } from "@/lib/api/teams";
import { useTaskStore } from "@/store/taskStore";
import { useProjects } from "@/hooks/useProjects";
import { getTaskActivities } from "@/lib/api/tasks";
import Link from "next/link";

interface OverviewTabProps {
  teamId?: string;
}

const TEAM_CHANNELS = [
  { name: "backend-ops", lastMsg: "Are we deploying today?", time: "10:24 AM", unread: true },
  { name: "general", lastMsg: "Townhall at 3pm tomorrow.", time: "Monday", unread: false },
  { name: "design-sync", lastMsg: "", time: "", unread: false }
];

export function OverviewTab({ teamId }: OverviewTabProps) {
  const [members, setMembers] = useState<TeamMemberResponse[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [activities, setActivities] = useState<any[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);

  const { tasks, fetchTasks } = useTaskStore();
  const { projects } = useProjects();

  useEffect(() => {
    if (teamId) {
      setLoadingMembers(true);
      getTeamMembers(teamId)
        .then(setMembers)
        .catch(err => console.error("Failed to fetch team members", err))
        .finally(() => setLoadingMembers(false));
    }
  }, [teamId]);

  useEffect(() => {
    fetchTasks(); // fetch all tasks in the workspace
  }, [fetchTasks]);

  useEffect(() => {
    const fetchRecentActivities = async () => {
      if (!teamId || tasks.length === 0) return;
      
      setLoadingActivities(true);
      // Filter tasks belonging to this team
      const teamTasks = tasks.filter(t => t.teamId === teamId);
      
      // Sort by updatedAt desc to find most recently active tasks
      const sortedTasks = [...teamTasks].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      
      const top5 = sortedTasks.slice(0, 5);
      
      try {
        const activitiesLists = await Promise.all(
          top5.map(async (task) => {
            try {
              const acts = await getTaskActivities(task.id);
              return acts.map(act => ({
                ...act,
                taskIdentifier: task.taskIdentifier,
                taskTitle: task.title
              }));
            } catch (err) {
              console.error(`Failed to fetch activities for task ${task.id}`, err);
              return [];
            }
          })
        );
        
        const flattened = activitiesLists
          .flat()
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5);
          
        setActivities(flattened);
      } catch (err) {
        console.error("Failed to fetch recent activities", err);
      } finally {
        setLoadingActivities(false);
      }
    };

    fetchRecentActivities();
  }, [tasks, teamId]);

  if (loadingMembers && members.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 col-span-10">
        <div className="relative">
          <div className="h-10 w-10 rounded-full border border-hs-accent/20 bg-hs-accent/5" />
          <Loader2 className="absolute inset-0 m-auto h-5 w-5 animate-spin text-hs-accent" />
        </div>
        <p className="text-xs text-zinc-500">Loading team overview...</p>
      </div>
    );
  }

  // Filter tasks belonging to this team
  const teamTasks = teamId ? tasks.filter(t => t.teamId === teamId) : [];

  // Workload mapping
  const membersWorkload = members.map(member => {
    const memberTasksCount = teamTasks.filter(t => t.assigneeId === member.userId && t.status !== "DONE").length;
    
    // Deterministic simulation for online status based on username
    const statuses = ["online", "away", "offline"];
    const hash = member.username.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const status = statuses[hash % 3];

    const initials = member.fullName ? member.fullName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "?";

    return {
      name: member.fullName || member.username,
      initials,
      role: member.role === "LEAD" ? "Lead" : "Member",
      tasks: memberTasksCount,
      status,
      color: member.role === "LEAD" ? "bg-amber-500" : "bg-violet-500",
    };
  });

  const overloadedMember = membersWorkload.find(m => m.tasks > 5);

  // Group team tasks by project for active projects section
  const projectStatsMap: Record<string, {
    name: string;
    tasksCount: number;
    completedCount: number;
    color: string;
  }> = {};

  teamTasks.forEach(task => {
    const projId = task.projectId;
    if (!projId) return;
    if (!projectStatsMap[projId]) {
      projectStatsMap[projId] = {
        name: task.projectName || "Unnamed Project",
        tasksCount: 0,
        completedCount: 0,
        color: task.projectColor || "blue",
      };
    }
    projectStatsMap[projId].tasksCount++;
    if (task.status === "DONE") {
      projectStatsMap[projId].completedCount++;
    }
  });

  const activeProjects = Object.entries(projectStatsMap).map(([id, stats]) => ({
    id,
    name: stats.name,
    space: "Engineering",
    tasks: stats.tasksCount,
    progress: stats.tasksCount > 0 ? Math.round((stats.completedCount / stats.tasksCount) * 100) : 0,
    color: stats.color,
  }));

  // Fallback if no projects are active but the team has a designated project
  if (activeProjects.length === 0 && teamId) {
    const teamDetails = teamTasks[0]; // try to get project from any task
    if (teamDetails?.projectId) {
      activeProjects.push({
        id: teamDetails.projectId,
        name: teamDetails.projectName || "Project",
        space: "Engineering",
        tasks: 0,
        progress: 0,
        color: teamDetails.projectColor || "blue",
      });
    }
  }

  // Formatting upcoming deadlines
  const upcomingDeadlines = teamTasks
    .filter(t => t.dueDate && t.status !== "DONE" && t.status !== "CANCELLED")
    .map(t => {
      const priorityColor = t.priority === "URGENT" ? "bg-red-500" : t.priority === "HIGH" ? "bg-amber-500" : "bg-zinc-500";
      const dueLabel = new Date(t.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      return {
        id: t.taskIdentifier || t.id.slice(0, 8),
        title: t.title,
        due: dueLabel,
        priority: priorityColor,
        assignee: t.assigneeInitials || "?",
        color: t.priority === "URGENT" ? "text-red-400" : "text-zinc-400",
      };
    })
    .sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime())
    .slice(0, 5);

  const formatActivityAction = (act: any) => {
    const val = act.newValue || "";
    const cleanVal = val.replace(/_/g, " ").toLowerCase();
    const taskName = act.taskIdentifier || act.taskTitle || "task";
    switch (act.type) {
      case "CREATED":
        return `created task ${taskName}`;
      case "STATUS_CHANGED":
        return `moved ${taskName} to ${cleanVal}`;
      case "PRIORITY_CHANGED":
        return `changed priority of ${taskName} to ${cleanVal}`;
      case "TITLE_CHANGED":
        return `renamed ${taskName} to "${act.newValue}"`;
      case "DESCRIPTION_CHANGED":
        return `updated description of ${taskName}`;
      case "LABELS_CHANGED":
        return `updated labels of ${taskName} to ${act.newValue}`;
      case "POINTS_CHANGED":
        return `changed estimate of ${taskName} to ${act.newValue} points`;
      case "DUE_DATE_CHANGED":
        return `changed due date of ${taskName} to ${act.newValue ? new Date(act.newValue).toLocaleDateString() : 'none'}`;
      case "OWNER_CHANGED":
        return `assigned ${taskName} to ${act.newValue || 'unassigned'}`;
      case "ASSIGNEE_ADDED":
        return `added collaborator to ${taskName}`;
      case "ASSIGNEE_REMOVED":
        return `removed collaborator from ${taskName}`;
      default:
        return `updated task ${taskName}`;
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    
    let interval = Math.floor(seconds / 31536000);
    if (interval >= 1) return `${interval}y ago`;
    interval = Math.floor(seconds / 2592000);
    if (interval >= 1) return `${interval}mo ago`;
    interval = Math.floor(seconds / 86400);
    if (interval >= 1) return `${interval}d ago`;
    interval = Math.floor(seconds / 3600);
    if (interval >= 1) return `${interval}h ago`;
    interval = Math.floor(seconds / 60);
    if (interval >= 1) return `${interval}m ago`;
    return "just now";
  };

  return (
    <div className="grid grid-cols-10 gap-6 p-6">
      {/* LEFT COLUMN: 60% */}
      <div className="col-span-10 lg:col-span-6 space-y-8">
        {/* WORKLOAD SECTION */}
        <section>
          <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Workload</h3>
          <p className="text-xs text-zinc-400 mb-6">Task distribution across team members</p>
          
          <div className="space-y-4">
            {membersWorkload.length > 0 ? (
              membersWorkload.map((member) => (
                <div key={member.name} className="flex items-center gap-3 group h-10">
                  <div className="relative">
                    <Avatar className="h-7 w-7 border border-zinc-800">
                      <AvatarFallback className={cn("text-[10px] font-semibold", getAvatarColorClass(member.initials))}>
                        {member.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className={cn(
                      "absolute bottom-0 right-0 h-2 w-2 rounded-full border border-hs-main",
                      member.status === "online" ? "bg-green-400" : member.status === "away" ? "bg-amber-400" : "bg-zinc-600"
                    )} />
                  </div>
                  <div className="w-24 flex-shrink-0">
                    <span className="text-sm text-foreground truncate block">{member.name}</span>
                  </div>
                  <div className="px-1.5 py-0.5 rounded-sm bg-zinc-800 border border-zinc-700 text-[10px] text-zinc-500">
                    {member.role}
                  </div>
                  <div className="flex-1 px-4">
                    <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                      <div 
                        className={cn("h-full rounded-full transition-all duration-500", member.color)} 
                        style={{ width: `${Math.min((member.tasks / 8) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-14 text-right">
                    <span className="text-xs text-zinc-500">{member.tasks} tasks</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-xs text-zinc-500 italic py-4">No team members assigned yet.</div>
            )}
          </div>

          {overloadedMember && (
            <div className="mt-4 flex items-center gap-2 p-2 px-3 bg-amber-500/5 border border-amber-500/10 rounded-md w-fit">
              <AlertTriangle className="h-3 w-3 text-amber-500" />
              <span className="text-[11px] text-amber-500">{overloadedMember.name} is overloaded — consider reassigning tasks</span>
            </div>
          )}
        </section>

        {/* RECENT ACTIVITY */}
        <section>
          <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4">Recent Activity</h3>
          <div className="relative pl-4 border-l border-zinc-800 ml-3 space-y-6">
            {activities.length > 0 ? (
              activities.map((activity, i) => {
                const initials = activity.fullName ? activity.fullName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) : "??";
                return (
                  <div key={activity.id || i} className="relative flex items-center gap-3">
                    <div className="absolute -left-[20px] h-2.5 w-2.5 rounded-full bg-zinc-800 border-2 border-hs-main" />
                    <Avatar className="h-6 w-6 border border-zinc-800">
                      <AvatarFallback className={cn("text-[9px] font-medium", getAvatarColorClass(initials))}>
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm text-zinc-300">
                        <span className="font-medium text-white">{activity.fullName || activity.username || "User"}</span> {formatActivityAction(activity)}
                      </p>
                    </div>
                    <span className="text-[10px] text-zinc-600 font-mono italic">{formatTimeAgo(activity.createdAt)}</span>
                  </div>
                );
              })
            ) : (
              <div className="flex items-center gap-2 text-xs text-zinc-500 italic py-2">
                <Activity className="h-3.5 w-3.5 text-zinc-600" />
                <span>No recent task activity in this team.</span>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* RIGHT COLUMN: 40% */}
      <div className="col-span-10 lg:col-span-4 space-y-8">
        {/* ACTIVE PROJECTS */}
        <section>
          <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Active Projects</h3>
          <div className="space-y-2">
            {activeProjects.length > 0 ? (
              activeProjects.map((project) => (
                <Link 
                  href={`/dashboard/projects/${project.id}`} 
                  key={project.id} 
                  className="p-3 bg-hs-card border border-border/50 rounded-md hover:border-border transition-colors cursor-pointer group block"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: project.color }} />
                      <div>
                        <h4 className="text-sm font-medium text-foreground leading-none mb-1">{project.name}</h4>
                        <p className="text-[10px] text-zinc-500 leading-none">{project.space}</p>
                      </div>
                    </div>
                    <div className="bg-zinc-800 px-2 py-0.5 rounded-full text-[10px] text-zinc-500">
                      {project.tasks} tasks
                    </div>
                  </div>
                  <div className="space-y-1.5 pt-2">
                    <div className="h-1.5 w-full bg-zinc-800/50 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-hs-accent transition-all duration-500" 
                        style={{ width: `${project.progress}%` }} 
                      />
                    </div>
                    <p className="text-[10px] text-zinc-600 text-right font-mono">{project.progress}% completed</p>
                  </div>
                </Link>
              ))
            ) : (
              <div className="text-xs text-zinc-500 italic py-2">No active projects linked to this team.</div>
            )}
          </div>
        </section>

        {/* CHANNELS */}
        <section>
          <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Channels</h3>
          <div className="space-y-0.5">
            {TEAM_CHANNELS.map((channel) => (
              <Link 
                href={`/dashboard/chat/${channel.name}`}
                key={channel.name} 
                className="flex h-9 items-center justify-between px-2 rounded-md hover:bg-zinc-800/40 cursor-pointer group block"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-zinc-600 font-light text-base leading-none">#</span>
                  <span className="text-sm text-zinc-300 truncate">{channel.name}</span>
                  {channel.unread && <div className="h-1.5 w-1.5 rounded-full bg-[#f95b4e]" />}
                </div>
                {channel.lastMsg && (
                   <div className="flex items-center gap-2 ml-4 min-w-0">
                    <p className="text-xs text-zinc-600 truncate max-w-[100px]">{channel.lastMsg}</p>
                    <span className="text-[10px] text-zinc-700 whitespace-nowrap">{channel.time}</span>
                   </div>
                )}
              </Link>
            ))}
          </div>
        </section>

        {/* UPCOMING DEADLINES */}
        <section>
          <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Upcoming Deadlines</h3>
          <div className="space-y-1">
            {upcomingDeadlines.length > 0 ? (
              upcomingDeadlines.map((task) => (
                <div key={task.id} className="flex h-9 items-center gap-3 px-2 rounded-md hover:bg-zinc-800/40 cursor-pointer group">
                  <div className={cn("h-1.5 w-1.5 rounded-full shrink-0", task.priority)} />
                  <span className="text-[10px] font-mono text-zinc-600 shrink-0">{task.id}</span>
                  <span className="text-sm text-zinc-300 truncate flex-1">{task.title}</span>
                  <div className={cn("px-1.5 py-0.5 rounded-sm bg-zinc-800 text-[10px] font-medium shrink-0", task.color)}>
                    {task.due}
                  </div>
                  <Avatar className="h-5 w-5 border border-zinc-800 shrink-0">
                    <AvatarFallback className="bg-zinc-800 text-zinc-600 text-[8px]">{task.assignee}</AvatarFallback>
                  </Avatar>
                </div>
              ))
            ) : (
              <div className="flex items-center gap-2 text-xs text-zinc-500 italic py-2">
                <Calendar className="h-3.5 w-3.5 text-zinc-600" />
                <span>No upcoming deadlines.</span>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
