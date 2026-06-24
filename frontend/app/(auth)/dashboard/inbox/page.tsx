"use client";

import React, { useState } from "react";
import { 
  Inbox, 
  CheckCheck, 
  KanbanSquare, 
  AtSign, 
  GitPullRequest, 
  GitMerge, 
  MessageSquare, 
  Zap, 
  UserPlus, 
  Sparkles, 
  Archive, 
  ExternalLink,
  CheckCircle,
  Settings,
  MoreVertical,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead, NotificationResponse } from "@/lib/api/notifications";

// Mock Data
const NOTIFICATIONS = [
  {
    id: 1,
    type: "task",
    unread: true,
    sender: "Meera V.",
    action: "assigned you a task",
    time: "2m ago",
    content: "STOMP WebSocket chat broadcast",
    project: "Sprint 3",
    workspace: "Engineering",
    icon: KanbanSquare,
    iconColor: "text-blue-400",
    iconBg: "bg-blue-500/20"
  },
  {
    id: 2,
    type: "mention",
    unread: true,
    sender: "David K.",
    action: "mentioned you",
    time: "15m ago",
    content: "@Rahul can you review the HMAC validation PR?",
    project: "#backend-ops",
    workspace: "Engineering",
    icon: AtSign,
    iconColor: "text-violet-400",
    iconBg: "bg-violet-500/20"
  },
  {
    id: 3,
    type: "pr_review",
    unread: true,
    sender: "Meera V.",
    action: "requested your review",
    time: "1h ago",
    content: "Add STOMP WebSocket broadcast with Redis fallback",
    project: "acme-corp/backend",
    workspace: "Sprint 3",
    icon: GitPullRequest,
    iconColor: "text-green-400",
    iconBg: "bg-green-500/20"
  },
  {
    id: 4,
    type: "comment",
    unread: true,
    sender: "Priya L.",
    action: "commented on HS-039",
    time: "2h ago",
    content: "Left some notes on the webhook signature logic",
    project: "Sprint 3",
    workspace: "Engineering",
    icon: MessageSquare,
    iconColor: "text-zinc-400",
    iconBg: "bg-zinc-700"
  },
  {
    id: 5,
    type: "pr_merged",
    unread: false,
    sender: "Git Automation",
    action: "PR #76 was merged",
    time: "Yesterday",
    content: "Setup Supabase Auth and JWT middleware — HS-033 auto-closed",
    project: "acme-corp/backend",
    workspace: null,
    icon: GitMerge,
    iconColor: "text-violet-400",
    iconBg: "bg-violet-500/20"
  },
  {
    id: 6,
    type: "sprint",
    unread: false,
    sender: "Hivespace System",
    action: "Sprint 3 ends in 3 days",
    time: "Yesterday",
    content: "7 tasks remaining — 2 in Review, 5 in Backlog",
    project: "Sprint 3",
    workspace: "Engineering",
    icon: Zap,
    iconColor: "text-amber-400",
    iconBg: "bg-amber-500/20"
  },
  {
    id: 7,
    type: "mention",
    unread: false,
    sender: "Sanjay A.",
    action: "mentioned you",
    time: "2 days ago",
    content: "@Rahul thoughts on the Redis vs last_read_at approach?",
    project: "#backend-ops",
    workspace: "Engineering",
    icon: AtSign,
    iconColor: "text-violet-400",
    iconBg: "bg-violet-500/20"
  },
  {
    id: 8,
    type: "task_update",
    unread: false,
    sender: "Rahul S.",
    action: "HS-044 moved to In Progress",
    time: "2 days ago",
    content: "STOMP WebSocket chat broadcast",
    project: "Sprint 3",
    workspace: "Engineering",
    icon: KanbanSquare,
    iconColor: "text-blue-400",
    iconBg: "bg-blue-500/20"
  },
  {
    id: 9,
    type: "invite",
    unread: false,
    sender: "Priya L.",
    action: "You joined Frontend Redesign",
    time: "3 days ago",
    content: "Priya L. added you to the project",
    project: "Frontend Redesign",
    workspace: "Engineering",
    icon: UserPlus,
    iconColor: "text-teal-400",
    iconBg: "bg-teal-500/20"
  },
  {
    id: 10,
    type: "ai",
    unread: false,
    sender: "Hive AI",
    action: "completed sprint retrospective",
    time: "4 days ago",
    content: "Sprint 2 retrospective doc is ready to review",
    project: "Sprint 3",
    workspace: "Engineering",
    icon: Sparkles,
    iconColor: "text-violet-400",
    iconBg: "bg-violet-500/20"
  }
];

export default function InboxPage() {
  const [realNotifications, setRealNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNotification, setSelectedNotification] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("All");

  React.useEffect(() => {
    getNotifications().then(data => {
      const mapped = data.content.map((n: NotificationResponse) => ({
        id: n.id,
        type: n.type.toLowerCase(),
        unread: !n.isRead,
        sender: n.actor ? (n.actor.fullName || n.actor.id) : "System",
        action: n.type === "MENTION" ? "mentioned you" : "sent a notification",
        time: new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        content: n.content,
        project: "Chat",
        workspace: null,
        icon: AtSign,
        iconColor: "text-violet-400",
        iconBg: "bg-violet-500/20"
      }));
      setRealNotifications(mapped);
      if (mapped.length > 0) {
        setSelectedNotification(mapped[0]);
      } else {
        setSelectedNotification(NOTIFICATIONS[2]);
      }
    }).catch(err => {
      console.error("Failed to load notifications", err);
      setSelectedNotification(NOTIFICATIONS[2]);
    }).finally(() => {
      setLoading(false);
    });
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setRealNotifications(prev => prev.map(n => ({ ...n, unread: false })));
    } catch (e) {
      console.error(e);
    }
  };

  const allNotifications = [...realNotifications, ...NOTIFICATIONS];

  const filteredNotifications = allNotifications.filter(n => {
    if (activeTab === "All") return true;
    if (activeTab === "Unread") return n.unread;
    if (activeTab === "Mentions") return n.type === "mention";
    if (activeTab === "Tasks") return n.type === "task" || n.type === "task_update";
    if (activeTab === "PRs") return n.type === "pr_review" || n.type === "pr_merged";
    return true;
  });

  return (
    <div className="flex h-full overflow-hidden bg-background">
      {/* Inbox Sidebar */}
      <aside className="w-[280px] flex flex-col bg-hs-nav border-r border-border/10 h-full">
        <div className="p-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold text-foreground">Inbox</h1>
            <span className="text-xs text-muted-foreground">{allNotifications.filter(n => n.unread).length} unread</span>
          </div>
          
          <div className="mt-4 flex items-center justify-between border-b border-zinc-800/50 -mx-4 px-4 overflow-x-auto scrollbar-none">
            <div className="flex items-center">
              {["All", "Unread", "Mentions", "Tasks", "PRs"].map(tab => (
                <button 
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "text-[10px] uppercase tracking-wider font-semibold px-3 py-2 transition-colors relative h-8 flex items-center",
                    activeTab === tab ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab}
                  {activeTab === tab && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#7C5CFC]" />
                  )}
                </button>
              ))}
            </div>
            <button onClick={handleMarkAllRead} className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors py-2 whitespace-nowrap ml-2">
              <CheckCheck className="h-3 w-3" />
              Mark all read
            </button>
          </div>
        </div>

        {/* Notification List */}
        <div className="flex-1 overflow-y-auto scrollbar-none">
          {filteredNotifications.length > 0 ? (
            filteredNotifications.map(notification => (
              <div 
                key={notification.id}
                onClick={() => setSelectedNotification(notification)}
                className={cn(
                  "relative flex gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors min-h-[64px]",
                  notification.unread ? "bg-muted/30" : "bg-transparent",
                  selectedNotification?.id === notification.id ? "bg-muted/60" : ""
                )}
              >
                {notification.unread && (
                  <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#7C5CFC]" />
                )}
                
                <div className={cn(
                  "h-8 w-8 rounded-md flex items-center justify-center shrink-0 mt-0.5",
                  notification.iconBg
                )}>
                  <notification.icon className={cn("h-4 w-4", notification.iconColor)} strokeWidth={1.5} />
                </div>

                <div className="flex flex-col flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs font-medium text-foreground truncate">{notification.sender}</span>
                      <span className="text-xs text-muted-foreground truncate whitespace-nowrap">{notification.action}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground/60 shrink-0">{notification.time}</span>
                  </div>
                  <p className="text-xs text-muted-foreground/80 mt-0.5 truncate leading-tight">
                    {notification.content}
                  </p>
                  {notification.project && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      <Badge className="bg-muted border-none text-muted-foreground hover:bg-muted text-[9px] px-1.5 py-0 rounded-sm">
                        {notification.project}
                      </Badge>
                      {notification.workspace && (
                        <span className="text-[9px] text-muted-foreground/60 flex items-center before:content-['·'] before:mr-1 before:text-border">
                          {notification.workspace}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-48 px-10 text-center">
               <CheckCircle className="h-10 w-10 text-green-500/20 mb-3" strokeWidth={1.5} />
               <p className="text-sm font-medium text-foreground">All caught up!</p>
               <p className="text-xs text-muted-foreground mt-1">No unread notifications right now.</p>
            </div>
          )}
        </div>

        {/* Bottom Preferences Link */}
        <div className="p-4 mt-auto border-t border-border/50 bg-hs-nav">
          <button className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors group">
            <Settings className="h-3.5 w-3.5 text-muted-foreground/60 group-hover:text-muted-foreground" strokeWidth={1.5} />
            Notification preferences
          </button>
        </div>
      </aside>

      {/* Notification Detail Panel */}
      <main className="flex-1 flex flex-col bg-hs-main overflow-hidden">
        {selectedNotification ? (
          <>
            {/* Detail Header */}
            <header className="px-6 pt-6 pb-4 border-b border-zinc-800/50 flex-shrink-0">
              <div className="flex items-start justify-between">
                <div className="flex gap-4">
                  <div className={cn(
                    "h-10 w-10 rounded-lg flex items-center justify-center",
                    selectedNotification.iconBg
                  )}>
                    <selectedNotification.icon className={cn("h-5 w-5", selectedNotification.iconColor)} strokeWidth={1.5} />
                  </div>
                  <div>
                    <h2 className="text-lg font-medium text-foreground">
                      {selectedNotification.id === 3 ? "PR #82 needs your review" : selectedNotification.content}
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {selectedNotification.sender} {selectedNotification.action} · {selectedNotification.time}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedNotification.unread && (
                    <button 
                      onClick={async () => {
                        if (typeof selectedNotification.id === 'string') {
                          await markNotificationAsRead(selectedNotification.id);
                          setRealNotifications(prev => prev.map(n => n.id === selectedNotification.id ? { ...n, unread: false } : n));
                          setSelectedNotification({ ...selectedNotification, unread: false });
                        }
                      }}
                      className="text-xs font-medium text-muted-foreground hover:text-foreground px-3 py-1.5 transition-colors"
                    >
                      Mark as read
                    </button>
                  )}
                  <button className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground px-3 py-1.5 transition-colors">
                    <Archive className="h-4 w-4" />
                    Archive
                  </button>
                </div>
              </div>
            </header>

            {/* Detail Body */}
            <div className="flex-1 overflow-y-auto p-6 scrollbar-none">
              {selectedNotification.id === 3 ? (
                <div className="max-w-3xl">
                  {/* PR CARD */}
                  <div className="bg-hs-card border border-border/50 rounded-lg p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <GitPullRequest className="h-4 w-4 text-green-400" strokeWidth={1.5} />
                        <span className=" text-sm text-foreground/80 uppercase">PR #82</span>
                        <Badge className="bg-green-500/10 border-green-500/20 text-green-400 text-[10px] font-bold rounded-sm px-1.5 py-0 border">
                           OPEN
                        </Badge>
                      </div>
                      <MoreVertical className="h-4 w-4 text-zinc-600" />
                    </div>

                    <h3 className="text-base font-medium text-foreground leading-tight">
                      Add STOMP WebSocket broadcast with Redis fallback
                    </h3>
                    
                    <div className="mt-2 flex items-center gap-2 text-xs  text-muted-foreground">
                      <span>acme-corp/backend</span>
                      <ChevronRight className="h-3 w-3" />
                      <span className="text-muted-foreground/80">feat/stomp-broadcast</span>
                    </div>

                    <div className="mt-4 flex items-center gap-4 text-xs">
                      <span className="text-green-400 font-medium">+247 lines</span>
                      <span className="text-red-400 font-medium">-18 lines</span>
                      <span className="text-zinc-500">3 files changed</span>
                    </div>

                    {/* LINKED TASK */}
                    <div className="bg-muted border border-border/50 rounded-md p-3 mt-4 flex items-center gap-3">
                      <div className="h-2 w-2 rounded-full bg-red-500" />
                      <span className=" text-xs text-muted-foreground shrink-0">HS-044</span>
                      <span className="text-sm text-foreground/80 truncate">STOMP WebSocket chat broadcast</span>
                      <Badge className="ml-auto bg-primary/10 border-primary/20 text-primary text-[10px] font-semibold border rounded-sm">
                        In Progress
                      </Badge>
                    </div>

                    {/* ACTION BUTTONS */}
                    <div className="mt-6 flex items-center gap-3">
                      <Button variant="outline" className="h-9 gap-2 text-xs border-border hover:bg-muted transition-colors">
                        <ExternalLink className="h-3.5 w-3.5" />
                        View PR on GitHub
                      </Button>
                      <Button variant="outline" className="h-9 gap-2 text-xs border-border hover:bg-muted text-primary hover:text-primary/80 transition-colors">
                        <KanbanSquare className="h-3.5 w-3.5" />
                        Open linked task HS-044
                      </Button>
                    </div>
                  </div>

                  {/* REVIEWERS */}
                  <div className="mt-8">
                    <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4">Reviewers</h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 rounded-md">
                            <AvatarFallback className="bg-zinc-900 border border-zinc-800 text-xs text-zinc-500 rounded-md">RS</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-xs font-medium text-foreground">Rahul S. <span className="text-muted-foreground font-normal ml-1">(you)</span></p>
                            <p className="text-[10px] text-muted-foreground/60 mt-0.5">Assigned 1h ago</p>
                          </div>
                        </div>
                        <Badge className="bg-amber-500/10 border-amber-500/20 text-amber-500 text-[10px] font-semibold border rounded-sm">
                          Review pending
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 rounded-md">
                            <AvatarFallback className="bg-hs-card border border-border text-xs text-muted-foreground rounded-md">DK</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-xs font-medium text-foreground">David K.</p>
                            <p className="text-[10px] text-muted-foreground/60 mt-0.5">Approved Yesterday</p>
                          </div>
                        </div>
                        <Badge className="bg-green-500/10 border-green-500/20 text-green-500 text-[10px] font-semibold border rounded-sm">
                          Approved
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* DESCRIPTION */}
                  <div className="mt-8">
                    <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4">Description</h4>
                    <div className="text-sm text-zinc-300 leading-relaxed font-light space-y-3">
                      <p>
                        This PR implements the STOMP WebSocket broadcast system for real-time human and bot communication. 
                        It ensures that every message published correctly falls back to Redis if the primary broker fails.
                      </p>
                      <ul className="list-disc pl-5 space-y-1">
                         <li>Added Spring STOMP broker configuration for secure handshakes</li>
                         <li>Implemented Redis fallback for human-to-human broadcast persistence</li>
                         <li>Added channel subscription management with automatic cleanup</li>
                         <li>Exposed new health check endpoints for socket latency tracking</li>
                      </ul>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center max-w-lg mx-auto text-center">
                   <div className={cn("h-16 w-16 rounded-2xl flex items-center justify-center mb-6", selectedNotification.iconBg)}>
                     <selectedNotification.icon className={cn("h-8 w-8", selectedNotification.iconColor)} strokeWidth={1} />
                   </div>
                   <h3 className="text-lg font-medium text-foreground mb-2">{selectedNotification.sender}</h3>
                   <p className="text-sm text-muted-foreground leading-relaxed">
                     {selectedNotification.content}
                   </p>
                   <Button variant="outline" className="mt-8 gap-2 border-border hover:bg-muted">
                      Open in Source
                      <ExternalLink className="h-4 w-4" />
                   </Button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <Inbox className="h-12 w-12 text-border mb-4" strokeWidth={1} />
            <h2 className="text-lg font-medium text-foreground">Select a notification</h2>
            <p className="text-sm text-muted-foreground mt-1">Choose a notification from the list to see more details.</p>
          </div>
        )}
      </main>
    </div>
  );
}
