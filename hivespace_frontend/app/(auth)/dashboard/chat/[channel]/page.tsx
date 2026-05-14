"use client";

import { useState, useRef, useEffect, use } from "react";
import { 
  Users, 
  Search, 
  Pin, 
  Settings, 
  SmilePlus, 
  MessageSquare, 
  AtSign, 
  MoreHorizontal,
  GitPullRequest,
  Hash,
  Smile,
  PlusCircle,
  ArrowUp,
  X,
  Bold,
  Italic,
  Code as CodeIcon,
  Link as LinkIcon,
  List as ListIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useProjects } from "@/hooks/useProjects";
import { PROJECT_COLOR_MAP } from "@/lib/constants/colors";

// --- TYPES & MOCK DATA ---

interface Message {
  id: string;
  sender: {
    name: string;
    initials: string;
    color: string;
  };
  timestamp: string;
  unixTime: number; // For grouping logic
  content: string;
  type?: "text" | "ai" | "task" | "pr";
  metadata?: {
    prNumber?: string;
    taskId?: string;
    title?: string;
    status?: string;
    source?: string;
    link?: string;
    priority?: string;
    assignee?: { initials: string };
  };
  reactions?: { emoji: string; count: number; reacted?: boolean }[];
  threadId?: string;
  replyCount?: number;
}

const MOCK_MESSAGES: Message[] = [
  {
    id: "m1",
    sender: { name: "Meera V.", initials: "MV", color: "bg-emerald-500" },
    timestamp: "Yesterday 4:52 PM",
    unixTime: 1712614320,
    content: "PR #82 is up for STOMP broadcast. Added Redis fallback for unstable connections too. Needs review before sprint end.",
    type: "pr",
    metadata: { prNumber: "82", title: "feat/stomp-broadcast", status: "OPEN" },
    reactions: [{ emoji: "👍", count: 3 }, { emoji: "🚀", count: 2 }]
  },
  {
    id: "m2",
    sender: { name: "Rahul S.", initials: "RS", color: "bg-blue-500" },
    timestamp: "Yesterday 4:55 PM",
    unixTime: 1712614500,
    content: "On it. Also quick question — should we track unread counts per channel in Redis or just rely on last_read_at in the DB?"
  },
  {
    id: "m3",
    sender: { name: "David K.", initials: "DK", color: "bg-violet-500" },
    timestamp: "Yesterday 4:57 PM",
    unixTime: 1712614620,
    content: "/ai should we use Redis or last_read_at for unread counts?"
  },
  {
    id: "ai1",
    sender: { name: "AI Assistant", initials: "✦", color: "bg-violet-600" },
    timestamp: "Yesterday 4:58 PM",
    unixTime: 1712614680,
    type: "ai",
    content: "Both approaches work together. Use Redis with a short TTL for the live unread badge count (fast reads, no DB hit per page load). Use last_read_at in the DB as the source of truth for recovery after reconnects. This is already in the blueprint — see §5.3 Chat System.",
    metadata: { source: "Hivespace Technical Blueprint", link: "#" }
  },
  {
    id: "m4",
    sender: { name: "Meera V.", initials: "MV", color: "bg-emerald-500" },
    timestamp: "Yesterday 5:02 PM",
    unixTime: 1712614920,
    content: "That makes sense. Redis for speed, DB for durability."
  },
  {
    id: "m5",
    sender: { name: "Rahul S.", initials: "RS", color: "bg-blue-500" },
    timestamp: "Yesterday 5:03 PM",
    unixTime: 1712614980,
    type: "task",
    content: "[[HS-044]] is blocked on this decision, assigning to you Meera.",
    metadata: { taskId: "HS-044", title: "STOMP WebSocket chat broadcast", priority: "high", status: "In Progress", assignee: { initials: "MV" } }
  },
  {
    id: "m6",
    sender: { name: "Priya L.", initials: "PL", color: "bg-orange-500" },
    timestamp: "Today 10:24 AM",
    unixTime: 1712648640,
    content: "Are we deploying today? Sprint ends in 3 days and we still have 2 items in Review.",
    reactions: [{ emoji: "👀", count: 4 }]
  },
  {
    id: "m7",
    sender: { name: "David K.", initials: "DK", color: "bg-violet-500" },
    timestamp: "Today 10:26 AM",
    unixTime: 1712648760,
    content: "Not yet. Waiting on the HMAC validation PR to merge."
  },
  {
    id: "m8",
    sender: { name: "David K.", initials: "DK", color: "bg-violet-500" },
    timestamp: "Today 10:26 AM",
    unixTime: 1712648790, // Follow-up message (within 5 mins)
    content: "Once that's done we can cut the release branch."
  }
];

export default function ChatPage({ params }: { params: Promise<{ channel: string }> }) {
  const { channel } = use(params);
  const { projects } = useProjects();
  
  // Find project associated with this channel
  // For now, we'll mock this by checking a hypothetical channel-to-project mapping or just using a default
  // In a real app, the channel object would have a projectId
  const currentProject = projects.find(p => p.id === "sprint-3" || p.slug === "sprint-3"); // Mock association
  const themeColor = PROJECT_COLOR_MAP[currentProject?.color || ""] || "#7C5CFC";

  const [messages] = useState<Message[]>(MOCK_MESSAGES);
  const [activeThread, setActiveThread] = useState<Message | null>(null);
  const [isTyping] = useState(true); // Mock typing state
  const [inputFocused, setInputFocused] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-expand textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "40px";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [inputValue]);

  // Grouping logic: messages from same sender within 5 mins
  type GroupedItem = 
    | { type: "date"; data: string } 
    | { type: "message"; data: Message & { isGrouped: boolean } };

  const groupedMessages: GroupedItem[] = [];
  let lastDay = "";
  let lastMessage: Message | null = null;

  messages.forEach((msg) => {
    const msgDay = msg.timestamp.split(" ")[0]; // "Today", "Yesterday" or "Apr"
    let dayChanged = false;
    
    if (msgDay !== lastDay) {
      groupedMessages.push({ type: "date", data: msgDay });
      lastDay = msgDay;
      dayChanged = true;
    }

    const isGrouped = !dayChanged && 
                     !!lastMessage && 
                     lastMessage.sender.name === msg.sender.name && 
                     (msg.unixTime - lastMessage.unixTime) < 300 &&
                     msg.type !== "ai" && 
                     msg.type !== "task" && 
                     msg.type !== "pr" &&
                     lastMessage.type !== "ai" &&
                     lastMessage.type !== "task" &&
                     lastMessage.type !== "pr";

    groupedMessages.push({ 
      type: "message", 
      data: { ...msg, isGrouped: !!isGrouped } 
    });
    lastMessage = msg;
  });

  return (
    <div className="flex h-screen bg-[#000000] text-[#E5E1E4] overflow-hidden">
      
      {/* --- MAIN CHAT AREA --- */}
      <div className="flex flex-1 flex-col overflow-hidden relative">
        
        {/* CHANNEL TOP BAR */}
        <header className="sticky top-0 z-20 flex h-[48px] shrink-0 items-center justify-between bg-[#000000]/80 backdrop-blur-md px-4 border-b border-zinc-800/50">
          <div className="flex items-center">
            <Hash className="h-4 w-4 text-zinc-500 mr-1" strokeWidth={1.5} />
            <span className="text-sm font-medium text-[#E5E1E4]">{channel}</span>
            <div className="w-px h-4 bg-zinc-700 mx-3" />
            <span className="text-xs text-zinc-400 truncate max-w-[400px]">
              Engineering team — backend discussion, PRs, deployments
            </span>
          </div>

          <div className="flex items-center gap-1">
            <IconButton icon={Users} label="Members" count={24} />
            <IconButton icon={Search} label="Search" />
            <IconButton icon={Pin} label="Pinned" />
            <IconButton icon={Settings} label="Settings" />
          </div>
        </header>

        {/* PINNED MESSAGES BAR */}
        <div className="h-8 bg-zinc-800/50 border-b border-zinc-800 flex items-center px-4 shrink-0 transition-all hover:bg-zinc-800/70 cursor-pointer">
          <Pin className="h-3 w-3 text-zinc-400 mr-2" />
          <span className="text-xs text-zinc-400">1 pinned message</span>
          <button className="text-[10px] font-bold ml-auto uppercase tracking-wider transition-opacity hover:opacity-80" style={{ color: themeColor }}>View</button>
        </div>

        {/* MESSAGE LIST */}
        <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-1">
          {groupedMessages.map((item, i) => (
            item.type === "date" ? (
              <DateSeparator key={`date-${i}`} date={item.data} />
            ) : (
              <MessageItem 
                key={item.data.id} 
                message={item.data} 
                onReply={() => setActiveThread(item.data)}
                themeColor={themeColor}
              />
            )
          ))}

          {/* TYPING INDICATOR */}
          {isTyping && (
            <div className="flex items-center gap-2 mt-2 group animate-in slide-in-from-left-2 duration-300">
              <Avatar className="h-5 w-5">
                <AvatarFallback className="text-[8px] bg-zinc-800 text-zinc-400">SA</AvatarFallback>
              </Avatar>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-zinc-500 italic">Sanjay is typing</span>
                <div className="flex gap-1 items-center h-2">
                  <div className="h-1 w-1 bg-zinc-600 rounded-full animate-pulse" />
                  <div className="h-1 w-1 bg-zinc-600 rounded-full animate-pulse [animation-delay:200ms]" />
                  <div className="h-1 w-1 bg-zinc-600 rounded-full animate-pulse [animation-delay:400ms]" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* COMPOSE BAR */}
        <div className="p-4 pt-0 shrink-0">
          <div className={cn(
             "relative flex flex-col bg-zinc-800/80 backdrop-blur-sm border rounded-xl transition-all duration-200",
             inputFocused ? "shadow-[0_0_15px_rgba(124,92,252,0.1)]" : "border-zinc-700"
          )} style={inputFocused ? { borderColor: `${themeColor}80` } : undefined}>
            {/* Formatting Toolbar (shown on focus) */}
            {inputFocused && (
              <div className="flex items-center h-9 px-3 border-b border-zinc-700/50 gap-1 animate-in fade-in slide-in-from-top-1">
                <ToolbarButton icon={Bold} />
                <ToolbarButton icon={Italic} />
                <ToolbarButton icon={CodeIcon} />
                <div className="w-px h-3.5 bg-zinc-700/50 mx-1" />
                <ToolbarButton icon={LinkIcon} />
                <ToolbarButton icon={ListIcon} />
              </div>
            )}

            <div className="flex flex-col p-2">
              <textarea 
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                placeholder={`Message #${channel}`}
                className="w-full bg-transparent border-none text-sm text-zinc-200 outline-none placeholder:text-zinc-500 resize-none min-h-[40px] px-2 py-1"
              />

              <div className="flex items-center justify-between mt-1 px-1">
                <div className="flex items-center gap-3">
                  <IconButtonSmall icon={PlusCircle} />
                  <IconButtonSmall icon={AtSign} />
                  <IconButtonSmall icon={Hash} />
                  <IconButtonSmall icon={Smile} />
                  <div className="flex items-center gap-1.5 ml-1">
                    <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-tighter">/</span>
                    <span className="text-[10px] text-zinc-500">for AI</span>
                  </div>
                </div>

                <Button 
                  size="icon" 
                  disabled={!inputValue.trim()}
                  className={cn(
                    "h-7 w-7 rounded-md transition-all",
                    inputValue.trim() ? "text-white hover:opacity-90" : "bg-zinc-700 text-zinc-500"
                  )}
                  style={inputValue.trim() ? { backgroundColor: themeColor } : undefined}
                >
                  <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- THREAD PANEL --- */}
      {activeThread && (
        <aside className="w-[320px] shrink-0 bg-[#0E0E10] border-l border-zinc-800 flex flex-col animate-in slide-in-from-right duration-300">
          <header className="flex h-[48px] items-center justify-between px-4 border-b border-zinc-800/50">
            <div className="flex flex-col">
              <span className="text-sm font-medium text-[#E5E1E4]">Thread</span>
              <span className="text-[10px] text-zinc-500"># {channel}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setActiveThread(null)} className="h-8 w-8 text-zinc-500 hover:text-white">
              <X className="h-4 w-4" />
            </Button>
          </header>

          <div className="flex flex-col flex-1 overflow-y-auto p-4 gap-6">
             {/* Original message */}
             <div className="opacity-80 scale-[0.98] origin-top-left">
                <MessageItem message={{...activeThread, isGrouped: false}} isThreadParent themeColor={themeColor} />
             </div>

             <div className="relative flex items-center gap-3">
                <div className="flex-1 h-px bg-zinc-800" />
                <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest whitespace-nowrap">3 Replies</span>
                <div className="flex-1 h-px bg-zinc-800" />
             </div>

             {/* Mock replies */}
             <MessageItem message={{
               id: "r1",
               sender: { name: "David K.", initials: "DK", color: "bg-violet-500" },
               timestamp: "Today 11:30 AM",
               unixTime: 0,
               content: "Checking the docs now. We definitely need durable recovery.",
               isGrouped: false
             }} themeColor={themeColor} />
          </div>

          <div className="p-4 border-t border-zinc-800">
             <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-2 min-h-[40px] flex items-center">
                <span className="text-xs text-zinc-600 ml-1">Reply...</span>
             </div>
          </div>
        </aside>
      )}

    </div>
  );
}

// --- SUB-COMPONENTS ---

function MessageItem({ 
  message, 
  onReply, 
  isThreadParent,
  themeColor = "#7C5CFC"
}: { 
  message: Message & { isGrouped?: boolean }; 
  onReply?: () => void; 
  isThreadParent?: boolean;
  themeColor?: string;
}) {
  const isAI = message.type === "ai";

  return (
    <div className={cn(
      "group relative flex gap-3 px-2 py-1 rounded-sm transition-colors hover:bg-zinc-800/20",
      isAI ? "p-3 rounded-r-md mt-2" : "",
      message.isGrouped ? "mt-0" : "mt-4"
    )} style={isAI ? { borderLeft: `2px solid ${themeColor}`, backgroundColor: `${themeColor}10` } : undefined}>
      
      {/* LEFT SIDE: AVATAR OR TIMESTAMP */}
      {!message.isGrouped ? (
        <Avatar className="h-8 w-8 shrink-0 mt-0.5 shadow-lg shadow-black/20">
          <AvatarFallback className={cn("text-xs font-bold text-white", message.sender.color)}>
            {message.sender.initials}
          </AvatarFallback>
        </Avatar>
      ) : (
        <div className="w-8 shrink-0 flex justify-center">
          <span className="text-[10px] text-zinc-700 font-medium invisible group-hover:visible absolute left-0 mt-1 pl-3">
            {message.timestamp.split(" ").slice(-2).join(" ")}
          </span>
        </div>
      )}

      {/* CONTENT SIDE */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {!message.isGrouped && (
          <div className="flex items-center mb-0.5">
            <span className="text-sm font-semibold text-[#E5E1E4] hover:underline cursor-pointer">
              {message.sender.name}
            </span>
            <span className="text-[10px] text-zinc-500 ml-2 font-medium">{message.timestamp}</span>
          </div>
        )}

        {isAI && <span className="text-[10px] font-bold text-zinc-500 tracking-widest uppercase mb-1">✦ AI Assistant</span>}

        <div className={cn(
          "text-sm leading-relaxed",
          isAI ? "text-zinc-300" : "text-zinc-300"
        )}>
          {message.content.replace(/\[\[.*?\]\]/g, "").trim() || message.content}
        </div>

        {/* METADATA CARDS */}
        {message.type === "pr" && message.metadata && <PRCard data={message.metadata} />}
        {message.type === "task" && message.metadata && <TaskCard data={message.metadata} />}
        {isAI && message.metadata?.source && (
          <div className="mt-3 text-[10px] text-zinc-500 border-t border-zinc-700/50 pt-2 flex items-center gap-1">
            <span>Source:</span>
            <a href="#" className="hover:underline" style={{ color: themeColor }}>{message.metadata.source}</a>
          </div>
        )}

        {/* REACTIONS */}
        {message.reactions && (
          <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1">
            {message.reactions.map((r, idx: number) => (
              <div 
                key={idx} 
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded-full border text-[11px] font-medium transition-all cursor-pointer",
                  r.reacted 
                    ? "border-transparent" 
                    : "bg-zinc-800 border-zinc-700 text-zinc-500 hover:bg-zinc-700"
                )}
                style={r.reacted ? { backgroundColor: `${themeColor}30`, color: themeColor, borderColor: `${themeColor}50` } : undefined}
              >
                <span>{r.emoji}</span>
                <span>{r.count}</span>
              </div>
            ))}
            <button className="h-6 w-6 flex items-center justify-center rounded-full bg-zinc-800 border border-zinc-700 text-zinc-500 opacity-0 group-hover:opacity-100 hover:text-white transition-opacity">
               <SmilePlus className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* HOVER ACTION BAR */}
      {!isThreadParent && (
        <div className="absolute -top-4 right-4 hidden group-hover:flex items-center bg-zinc-900 border border-zinc-700 rounded-md p-1 shadow-xl z-10 scale-95 animate-in fade-in zoom-in-95 duration-100">
          <ActionIcon icon={SmilePlus} />
          <ActionIcon icon={MessageSquare} onClick={onReply} />
          <ActionIcon icon={AtSign} />
          <div className="w-px h-3 bg-zinc-700 mx-1" />
          <ActionIcon icon={MoreHorizontal} />
        </div>
      )}
    </div>
  );
}

function PRCard({ data }: { data: NonNullable<Message["metadata"]> }) {
  return (
    <div className="mt-2 flex flex-col bg-zinc-800/80 border border-zinc-700 rounded-lg p-3 max-w-sm group/card cursor-pointer hover:border-zinc-500 transition-colors">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <GitPullRequest className="h-4 w-4 text-emerald-500" strokeWidth={2} />
          <span className="font-mono text-[11px] text-zinc-400">PR #{data.prNumber}</span>
        </div>
        <Badge className="h-5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[10px] font-bold px-1.5">
          {data.status}
        </Badge>
      </div>
      <span className="text-xs font-medium text-zinc-300">{data.title}</span>
    </div>
  );
}

function TaskCard({ data }: { data: NonNullable<Message["metadata"]> }) {
  return (
    <div className="mt-2 flex flex-col bg-zinc-800/80 border border-zinc-700 rounded-lg p-3 max-w-sm cursor-pointer hover:border-zinc-500 transition-colors">
      <div className="flex items-center gap-2 mb-2">
        <div className={cn(
          "h-1.5 w-1.5 rounded-full shrink-0",
          data.priority === "high" ? "bg-[#EF9F27]" : "bg-zinc-500"
        )} />
        <span className="font-mono text-[11px] text-zinc-400 underline decoration-dotted decoration-zinc-600">{data.taskId}</span>
        <span className="text-xs font-semibold text-zinc-300 truncate ml-1">{data.title}</span>
      </div>
      <div className="flex items-center justify-between">
        <Badge className="bg-zinc-900/50 text-zinc-500 border-zinc-700/50 font-normal h-5 px-1.5 rounded-sm text-[10px]">
          {data.status}
        </Badge>
        <Avatar className="h-5 w-5 border border-zinc-700">
           <AvatarFallback className="text-[8px] bg-zinc-800 text-zinc-400">
             {data.assignee?.initials || "??"}
           </AvatarFallback>
        </Avatar>
      </div>
    </div>
  );
}

function DateSeparator({ date }: { date: string }) {
  return (
    <div className="relative flex items-center justify-center my-6 h-px">
      <div className="absolute inset-x-0 h-px bg-zinc-800 opacity-30" />
      <span className="relative z-10 bg-[#0E0E10] px-3 text-[11px] font-bold text-zinc-600 uppercase tracking-[2px]">{date}</span>
    </div>
  );
}

function IconButton({ icon: Icon, label: _label, count }: { icon: React.ElementType; label: string; count?: number }) {
  return (
    <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-white relative group">
      <Icon className="h-[18px] w-[18px]" strokeWidth={1.5} />
      {count && (
        <span className="absolute -top-1 -right-1 flex h-3.5 min-w-[14px] items-center justify-center rounded-full px-1 text-[8px] font-bold text-white shadow shadow-black bg-violet-600">
          {count}
        </span>
      )}
    </Button>
  );
}

function IconButtonSmall({ icon: Icon }: { icon: React.ElementType }) {
  return (
    <button className="text-zinc-500 hover:text-zinc-300 transition-colors">
      <Icon className="h-[18px] w-[18px]" strokeWidth={1.5} />
    </button>
  );
}

function ToolbarButton({ icon: Icon }: { icon: React.ElementType }) {
  return (
    <button className="h-6 w-6 flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700/50 rounded transition-colors">
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

function ActionIcon({ icon: Icon, onClick }: { icon: React.ElementType; onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="h-7 w-7 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
    >
      <Icon className="h-4 w-4" strokeWidth={1.5} />
    </button>
  );
}
