"use client";

import React, { useState, useEffect, useRef, useCallback, useTransition } from "react";
import { 
  Sparkles, 
  Search, 
  GitPullRequest, 
  Zap, 
  Filter, 
  FileText, 
  MessageSquare, 
  ArrowLeft, 
  Share2, 
  KanbanSquare, 
  RefreshCw, 
  ArrowUp, 
  CheckCircle, 
  ChevronRight,
  MoreVertical,
  Activity,
  ImageIcon,
  MonitorIcon,
  Paperclip,
  XIcon,
  LoaderIcon,
  Command,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const Figma = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 38 57" className={props.className} fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: "1em", height: "1.5em" }}>
    <path d="M19 28.5c0-4.7 3.8-8.5 8.5-8.5S36 23.8 36 28.5s-3.8 8.5-8.5 8.5S19 33.2 19 28.5z" fill="#18A0FB"/>
    <path d="M9.5 0C14.2 0 18 3.8 18 8.5S14.2 17 9.5 17 1 13.2 1 8.5 4.8 0 9.5 0z" fill="#F24E1E"/>
    <path d="M19 8.5C19 3.8 22.8 0 27.5 0S36 3.8 36 8.5 32.2 17 27.5 17 19 13.2 19 8.5z" fill="#FF7262"/>
    <path d="M1 28.5c0-4.7 3.8-8.5 8.5-8.5h9.5v17H9.5C4.8 37 1 33.2 1 28.5z" fill="#A259FF"/>
    <path d="M9.5 38c4.7 0 8.5 3.8 8.5 8.5v8.5c0 4.7-3.8 8.5-8.5 8.5S1 49.8 1 45.1v-8.5C1 41.8 4.8 38 9.5 38z" fill="#1ABC9C"/>
  </svg>
);

// --- HOOKS & HELPERS FOR ANIMATED CHAT ---

interface UseAutoResizeTextareaProps {
    minHeight: number;
    maxHeight?: number;
}

function useAutoResizeTextarea({
    minHeight,
    maxHeight,
}: UseAutoResizeTextareaProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const adjustHeight = useCallback(
        (reset?: boolean) => {
            const textarea = textareaRef.current;
            if (!textarea) return;

            if (reset) {
                textarea.style.height = `${minHeight}px`;
                return;
            }

            textarea.style.height = `${minHeight}px`;
            const newHeight = Math.max(
                minHeight,
                Math.min(
                    textarea.scrollHeight,
                    maxHeight ?? Number.POSITIVE_INFINITY
                )
            );

            textarea.style.height = `${newHeight}px`;
        },
        [minHeight, maxHeight]
    );

    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = `${minHeight}px`;
        }
    }, [minHeight]);

    useEffect(() => {
        const handleResize = () => adjustHeight();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [adjustHeight]);

    return { textareaRef, adjustHeight };
}

interface CommandSuggestion {
    icon: React.ReactNode;
    label: string;
    description: string;
    prefix: string;
}

interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  containerClassName?: string;
  showRing?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, containerClassName, showRing = true, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false);
    
    return (
      <div className={cn("relative", containerClassName)}>
        <textarea
          className={cn(
            "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
            "transition-all duration-200 ease-in-out",
            "placeholder:text-muted-foreground",
            "disabled:cursor-not-allowed disabled:opacity-50",
            showRing ? "focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0" : "",
            className
          )}
          ref={ref}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
        
        {showRing && isFocused && (
          <motion.span 
            className="absolute inset-0 rounded-md pointer-events-none ring-2 ring-offset-0 ring-violet-500/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </div>
    )
  }
)
Textarea.displayName = "Textarea";

// --- MOCK DATA FOR CONVERSATION ---

const GENERATED_TASKS = [
  { priority: "High", color: "bg-red-500", title: "Setup Tiptap editor with ProseMirror config", assignee: "RS", points: 3 },
  { priority: "High", color: "bg-red-500", title: "Implement auto-save with 30s debounce", assignee: "RS", points: 2 },
  { priority: "Normal", color: "bg-blue-500", title: "Add slash command menu for block types", assignee: "RK", points: 5 },
  { priority: "Normal", color: "bg-blue-500", title: "Build inline task embed [[HS-XXX]] syntax", assignee: "MV", points: 3 },
  { priority: "Normal", color: "bg-blue-500", title: "Implement page linking [[page name]]", assignee: "DK", points: 3 },
  { priority: "Low", color: "bg-zinc-500", title: "Add version history with restore capability", assignee: "SA", points: 5 },
];

const QUICK_ACTIONS = [
  {
    icon: Sparkles,
    title: "Generate Tasks",
    desc: "Paste a feature spec or description and AI will break it into structured subtasks.",
    prompt: "I need to implement a new feature. Can you break it into structured tasks?"
  },
  {
    icon: Search,
    title: "Semantic Search",
    desc: "Search across tasks, docs, and messages in natural language.",
    prompt: "Search all tasks and docs for references to the backend WebSocket connection."
  },
  {
    icon: GitPullRequest,
    title: "Review PR",
    desc: "Get an AI summary of any pull request, key changes, and potential issues.",
    prompt: "Review the latest pull request and summarize the key changes and checklist."
  },
  {
    icon: Zap,
    title: "Sprint Retrospective",
    desc: "Generate a complete sprint retrospective doc with velocity trends.",
    prompt: "Generate a sprint retrospective document for Sprint 2 with velocity trends."
  },
  {
    icon: Filter,
    title: "Smart Triage",
    desc: "Auto-classify and prioritize a list of issues or tickets.",
    prompt: "Please classify and prioritize the current list of untriaged issues."
  },
  {
    icon: FileText,
    title: "Draft Document",
    desc: "Generate a first draft for RFCs, runbooks, or meeting notes.",
    prompt: "Draft an RFC document for our new database migration strategy."
  },
];

const RECENT_CONVS = [
  { title: "Generate tasks for Tiptap editor feature", time: "2h ago" },
  { title: "Summarize #backend-ops last 50 messages", time: "Yesterday" },
  { title: "PR #76 review summary", time: "2 days ago" },
  { title: "Sprint 2 retrospective", time: "Last week" },
];

// --- MAIN AI ASSISTANT PAGE ---

export default function AIAssistantPage() {
  const [state, setState] = useState<"home" | "conversation">("home");

  return (
    <div className="flex h-full w-full bg-hs-main overflow-hidden">
      {state === "home" ? (
        <AnimatedAIChat onStart={() => setState("conversation")} />
      ) : (
        <AIConversation onBack={() => setState("home")} />
      )}
    </div>
  );
}

// --- ANIMATED CHAT ENTRY COMPONENT ---

interface AnimatedAIChatProps {
  onStart: () => void;
}

export function AnimatedAIChat({ onStart }: AnimatedAIChatProps) {
    const [value, setValue] = useState("");
    const [attachments, setAttachments] = useState<string[]>([]);
    const [isTyping, setIsTyping] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [activeSuggestion, setActiveSuggestion] = useState<number>(-1);
    const [showCommandPalette, setShowCommandPalette] = useState(false);
    const [recentCommand, setRecentCommand] = useState<string | null>(null);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const { textareaRef, adjustHeight } = useAutoResizeTextarea({
        minHeight: 60,
        maxHeight: 200,
    });
    const [inputFocused, setInputFocused] = useState(false);
    const commandPaletteRef = useRef<HTMLDivElement>(null);

    const commandSuggestions: CommandSuggestion[] = [
        { 
            icon: <ImageIcon className="w-4 h-4" />, 
            label: "Clone UI", 
            description: "Generate a UI from a screenshot", 
            prefix: "/clone" 
        },
        { 
            icon: <Figma className="w-4 h-4" />, 
            label: "Import Figma", 
            description: "Import a design from Figma", 
            prefix: "/figma" 
        },
        { 
            icon: <MonitorIcon className="w-4 h-4" />, 
            label: "Create Page", 
            description: "Generate a new web page", 
            prefix: "/page" 
        },
        { 
            icon: <Sparkles className="w-4 h-4" />, 
            label: "Improve", 
            description: "Improve existing UI design", 
            prefix: "/improve" 
        },
    ];

    useEffect(() => {
        if (value.startsWith('/') && !value.includes(' ')) {
            setShowCommandPalette(true);
            const matchingSuggestionIndex = commandSuggestions.findIndex(
                (cmd) => cmd.prefix.startsWith(value)
            );
            if (matchingSuggestionIndex >= 0) {
                setActiveSuggestion(matchingSuggestionIndex);
            } else {
                setActiveSuggestion(-1);
            }
        } else {
            setShowCommandPalette(false);
        }
    }, [value]);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            setMousePosition({ x: e.clientX, y: e.clientY });
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            const commandButton = document.querySelector('[data-command-button]');
            if (commandPaletteRef.current && 
                !commandPaletteRef.current.contains(target) && 
                !commandButton?.contains(target)) {
                setShowCommandPalette(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (showCommandPalette) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveSuggestion(prev => 
                    prev < commandSuggestions.length - 1 ? prev + 1 : 0
                );
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveSuggestion(prev => 
                    prev > 0 ? prev - 1 : commandSuggestions.length - 1
                );
            } else if (e.key === 'Tab' || e.key === 'Enter') {
                e.preventDefault();
                if (activeSuggestion >= 0) {
                    const selectedCommand = commandSuggestions[activeSuggestion];
                    setValue(selectedCommand.prefix + ' ');
                    setShowCommandPalette(false);
                    setRecentCommand(selectedCommand.label);
                    setTimeout(() => setRecentCommand(null), 3500);
                }
            } else if (e.key === 'Escape') {
                e.preventDefault();
                setShowCommandPalette(false);
            }
        } else if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (value.trim()) {
                handleSendMessage();
            }
        }
    };

    const handleSendMessage = () => {
        if (value.trim()) {
            startTransition(() => {
                setIsTyping(true);
                setTimeout(() => {
                    setIsTyping(false);
                    setValue("");
                    adjustHeight(true);
                    onStart();
                }, 1500);
            });
        }
    };

    const handleAttachFile = () => {
        const mockFileName = `file-${Math.floor(Math.random() * 1000)}.pdf`;
        setAttachments(prev => [...prev, mockFileName]);
    };

    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };
    
    const selectCommandSuggestion = (index: number) => {
        const selectedCommand = commandSuggestions[index];
        setValue(selectedCommand.prefix + ' ');
        setShowCommandPalette(false);
        setRecentCommand(selectedCommand.label);
        setTimeout(() => {
            setRecentCommand(null);
            onStart();
        }, 1000);
    };

    return (
        <div className="flex-1 flex flex-col w-full items-center p-6 relative overflow-y-auto scrollbar-none text-[#EDE8E3]" style={{ background: 'linear-gradient(160deg, #1a1612 0%, #191511 60%, #1c1410 100%)' }}>
            <div className="w-full max-w-3xl mx-auto relative z-10 py-8">
                <motion.div 
                    className="space-y-12"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                >
                    {/* Header */}
                    <div className="text-center space-y-3">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2, duration: 0.5 }}
                            className="inline-block"
                        >
                            <h1 className="text-[2.1rem] font-semibold tracking-tight pb-1" style={{ color: '#EDE8E3', letterSpacing: '-0.03em' }}>
                                How can I help today?
                            </h1>
                            <motion.div 
                                className="h-px"
                                style={{ background: 'linear-gradient(90deg, transparent, #D97757 50%, transparent)' }}
                                initial={{ width: 0, opacity: 0 }}
                                animate={{ width: "100%", opacity: 1 }}
                                transition={{ delay: 0.5, duration: 0.8 }}
                            />
                        </motion.div>
                        <motion.p 
                            className="text-sm font-sans"
                            style={{ color: '#8C7B6E' }}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3 }}
                        >
                            Type a command, generate tasks, or triage issues
                        </motion.p>
                    </div>

                    {/* Input Bar */}
                    <motion.div 
                        className="relative rounded-2xl overflow-hidden"
                        style={{ background: '#221e1a', border: '1px solid #3a2e26', boxShadow: '0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(217,119,87,0.08)' }}
                        initial={{ scale: 0.98 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.1 }}
                    >
                        <AnimatePresence>
                            {showCommandPalette && (
                                <motion.div 
                                    ref={commandPaletteRef}
                                    className="absolute left-4 right-4 bottom-full mb-2 backdrop-blur-xl bg-black/90 rounded-lg z-50 shadow-lg border border-white/10 overflow-hidden"
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 5 }}
                                    transition={{ duration: 0.15 }}
                                >
                                    <div className="py-1 bg-black/95">
                                        {commandSuggestions.map((suggestion, index) => (
                                            <motion.div
                                                key={suggestion.prefix}
                                                className={cn(
                                                    "flex items-center gap-2 px-3 py-2 text-xs transition-colors cursor-pointer",
                                                    activeSuggestion === index 
                                                        ? "bg-[#7C5CFC]/20 text-white" 
                                                        : "text-white/70 hover:bg-white/5"
                                                )}
                                                onClick={() => selectCommandSuggestion(index)}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                transition={{ delay: index * 0.03 }}
                                            >
                                                <div className="w-5 h-5 flex items-center justify-center text-white/60">
                                                    {suggestion.icon}
                                                </div>
                                                <div className="font-medium">{suggestion.label}</div>
                                                <div className="text-white/40 text-xs ml-1">
                                                    {suggestion.prefix}
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="p-4">
                            <Textarea
                                ref={textareaRef}
                                value={value}
                                onChange={(e) => {
                                    setValue(e.target.value);
                                    adjustHeight();
                                }}
                                onKeyDown={handleKeyDown}
                                onFocus={() => setInputFocused(true)}
                                onBlur={() => setInputFocused(false)}
                                placeholder="Ask zap a question..."
                                containerClassName="w-full"
                                className={cn(
                                    "w-full px-4 py-3",
                                    "resize-none",
                                    "bg-transparent",
                                    "border-none",
                                    "text-sm focus:outline-none focus:ring-0",
                                    "min-h-[60px]"
                                )}
                                style={{ color: '#EDE8E3', overflow: "hidden" }}
                                showRing={false}
                            />
                        </div>

                        <AnimatePresence>
                            {attachments.length > 0 && (
                                <motion.div 
                                    className="px-4 pb-3 flex gap-2 flex-wrap"
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                >
                                    {attachments.map((file, index) => (
                                        <motion.div
                                            key={index}
                                            className="flex items-center gap-2 text-xs bg-white/[0.03] py-1.5 px-3 rounded-lg text-white/70"
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                        >
                                            <span>{file}</span>
                                            <button 
                                                onClick={() => removeAttachment(index)}
                                                className="text-white/40 hover:text-white transition-colors"
                                            >
                                                <XIcon className="w-3 h-3" />
                                            </button>
                                        </motion.div>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="p-4 flex items-center justify-between gap-4" style={{ borderTop: '1px solid #2e2720' }}>
                            <div className="flex items-center gap-3">
                                <motion.button
                                    type="button"
                                    onClick={handleAttachFile}
                                    whileTap={{ scale: 0.94 }}
                                    className="p-2 text-white/40 hover:text-white/90 rounded-lg transition-colors relative group"
                                >
                                    <Paperclip className="w-4 h-4" />
                                    <motion.span
                                        className="absolute inset-0 bg-white/[0.05] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                        layoutId="button-highlight"
                                    />
                                </motion.button>
                                <motion.button
                                    type="button"
                                    data-command-button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowCommandPalette(prev => !prev);
                                    }}
                                    whileTap={{ scale: 0.94 }}
                                    className={cn(
                                        "p-2 text-white/40 hover:text-white/90 rounded-lg transition-colors relative group",
                                        showCommandPalette && "bg-white/10 text-white/90"
                                    )}
                                >
                                    <Command className="w-4 h-4" />
                                    <motion.span
                                        className="absolute inset-0 bg-white/[0.05] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                        layoutId="button-highlight"
                                    />
                                </motion.button>
                            </div>
                            
                            <motion.button
                                type="button"
                                onClick={handleSendMessage}
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.98 }}
                                disabled={isTyping || !value.trim()}
                                className={cn(
                                    "px-4 py-2 rounded-xl text-sm font-semibold transition-all",
                                    "flex items-center gap-2"
                                )}
                                style={value.trim() ? { background: '#D97757', color: '#fff', boxShadow: '0 4px 16px rgba(217,119,87,0.35)' } : { background: '#2e2720', color: '#5a4a3e' }}
                            >
                                {isTyping ? (
                                    <LoaderIcon className="w-4 h-4 animate-[spin_2s_linear_infinite]" />
                                ) : (
                                    <ArrowUp className="w-4 h-4" />
                                )}
                                <span>Send</span>
                            </motion.button>
                        </div>
                    </motion.div>

                    {/* Quick Command Suggestions */}
                    <div className="flex flex-wrap items-center justify-center gap-2">
                        {commandSuggestions.map((suggestion, index) => (
                            <motion.button
                                key={suggestion.prefix}
                                onClick={() => selectCommandSuggestion(index)}
                                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all"
                                style={{ background: '#221e1a', border: '1px solid #3a2e26', color: '#8C7B6E' }}
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#EDE8E3'; (e.currentTarget as HTMLElement).style.borderColor = '#D9775740'; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#8C7B6E'; (e.currentTarget as HTMLElement).style.borderColor = '#3a2e26'; }}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.08 }}
                            >
                                {suggestion.icon}
                                <span>{suggestion.label}</span>
                            </motion.button>
                        ))}
                    </div>

                    {/* Quick Action Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full mt-8">
                        {QUICK_ACTIONS.map((action, i) => (
                            <motion.div
                                key={i}
                                onClick={() => {
                                    setValue(action.prompt);
                                    if (textareaRef.current) {
                                        textareaRef.current.focus();
                                        adjustHeight();
                                    }
                                }}
                                whileHover={{ scale: 1.015, y: -2 }}
                                whileTap={{ scale: 0.98 }}
                                className="cursor-pointer rounded-xl p-4 flex flex-col justify-between h-[140px] transition-all duration-200 group"
                                style={{ background: '#1f1b17', border: '1px solid #2e2720' }}
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#D9775730'; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#2e2720'; }}
                            >
                                <div>
                                    <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: '#D9775715', color: '#D97757' }}>
                                        <action.icon className="h-4 w-4" strokeWidth={1.8} />
                                    </div>
                                    <h3 className="text-[13px] font-semibold mt-3" style={{ color: '#EDE8E3' }}>{action.title}</h3>
                                    <p className="text-[11px] mt-1 leading-normal" style={{ color: '#6b5a4e' }}>{action.desc}</p>
                                </div>
                                <span className="text-[10px] font-semibold tracking-wide mt-2 block opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: '#D97757' }}>
                                    Use prompt →
                                </span>
                            </motion.div>
                        ))}
                    </div>

                    {/* Recent Conversations */}
                    <div className="mt-8 w-full pt-6" style={{ borderTop: '1px solid #2e2720' }}>
                        <h4 className="text-[11px] font-semibold uppercase tracking-widest mb-4 flex items-center gap-2" style={{ color: '#4e3e34', letterSpacing: '0.1em' }}>
                            <MessageSquare className="w-3.5 h-3.5" style={{ color: '#D97757' }} /> Recent Conversations
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {RECENT_CONVS.map((conv, i) => (
                                <div 
                                    key={i} 
                                    onClick={onStart}
                                    className="group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-200"
                                    style={{ background: '#1f1b17', border: '1px solid #2e2720' }}
                                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#D9775730'; }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#2e2720'; }}
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <MessageSquare className="h-3.5 w-3.5 shrink-0 transition-colors" style={{ color: '#4e3e34' }} />
                                        <span className="text-xs truncate transition-colors" style={{ color: '#8C7B6E' }}>{conv.title}</span>
                                    </div>
                                    <span className="text-[10px] shrink-0 ml-2" style={{ color: '#4e3e34' }}>{conv.time}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Capabilities Footer */}
                    <div className="mt-10 flex flex-wrap justify-center gap-2 pt-4">
                        {['Reads your tasks','Searches your docs','Understands your projects'].map(cap => (
                          <div key={cap} className="rounded-full px-4 py-1.5 text-[11px] font-medium" style={{ background: '#1f1b17', border: '1px solid #2e2720', color: '#4e3e34' }}>{cap}</div>
                        ))}
                    </div>
                </motion.div>
            </div>

            <AnimatePresence>
                {isTyping && (
                    <motion.div 
                        className="fixed bottom-8 left-1/2 transform -translate-x-1/2 backdrop-blur-2xl rounded-full px-5 py-2.5 z-50"
                        style={{ background: '#221e1a', border: '1px solid #3a2e26', boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 20px rgba(217,119,87,0.12)' }}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-full flex items-center justify-center shadow-lg" style={{ background: '#D97757', boxShadow: '0 0 12px rgba(217,119,87,0.4)' }}>
                                <span className="text-[10px] font-bold text-white">Z</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs" style={{ color: '#EDE8E3' }}>
                                <span>Thinking</span>
                                <TypingDots />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
}

function TypingDots() {
    return (
        <div className="flex items-center ml-1">
            {[1, 2, 3].map((dot) => (
                <motion.div
                    key={dot}
                    className="w-1 h-1 bg-white rounded-full mx-0.5"
                    initial={{ opacity: 0.3 }}
                    animate={{ 
                        opacity: [0.3, 0.9, 0.3],
                        scale: [0.85, 1.1, 0.85]
                    }}
                    transition={{
                        duration: 1.2,
                        repeat: Infinity,
                        delay: dot * 0.15,
                        ease: "easeInOut",
                    }}
                    style={{
                        boxShadow: "0 0 4px rgba(255, 255, 255, 0.3)"
                    }}
                />
            ))}
        </div>
    );
}

// --- CONVERSATION VIEW COMPONENT ---

function AIConversation({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Thread */}
      <div className="flex-1 flex flex-col min-w-0 bg-hs-main">
        {/* Header */}
        <header className="h-12 border-b border-border/50 flex items-center justify-between px-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-1 hover:bg-muted rounded transition-colors text-muted-foreground">
               <ArrowLeft className="h-4 w-4" />
            </button>
            <h2 className="text-sm font-medium text-foreground">Generate tasks for Tiptap editor</h2>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onBack} className="text-xs text-[#7C5CFC] hover:text-[#7C5CFC]/80 font-medium px-2 py-1">New conversation</button>
            <button className="p-1.5 text-zinc-500 hover:text-zinc-300">
               <Share2 className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto px-6 py-8 space-y-8 scrollbar-none">
          {/* User Message */}
          <div className="flex flex-col items-end gap-2 max-w-2xl ml-auto">
            <div className="bg-muted border border-border rounded-xl rounded-tr-sm px-4 py-3 shadow-lg shadow-black/5">
              <p className="text-sm text-foreground leading-relaxed">
                I need to implement the Tiptap rich text editor for the docs module. Can you break this into tasks?
              </p>
            </div>
            <Avatar className="h-5 w-5 rounded-sm">
               <AvatarFallback className="bg-zinc-700 text-[8px] text-zinc-400 rounded-sm">JD</AvatarFallback>
            </Avatar>
          </div>

          {/* AI Message */}
          <div className="flex flex-col gap-2 max-w-3xl">
            <div className="flex items-center gap-1.5 mb-1 px-1">
               <Sparkles className="h-3 w-3 text-[#7C5CFC]" />
               <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Hivespace AI</span>
            </div>
            <div className="bg-[#7C5CFC]/5 border-l-2 border-[#7C5CFC] rounded-r-xl px-5 py-4 space-y-4">
              <p className="text-sm text-zinc-300 leading-relaxed">
                Here are the structured tasks I&apos;ve generated for the Tiptap editor implementation. I&apos;ve broken this into 6 tasks across 2 phases:
              </p>

              {/* Task Cards */}
              <div className="space-y-2">
                 {GENERATED_TASKS.map((task, i) => (
                   <div key={i} className="bg-[#272629] border border-zinc-800/80 rounded-lg p-3 group hover:border-[#7C5CFC]/30 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={cn("h-1.5 w-1.5 rounded-full", task.color)} />
                          <span className="text-[10px] font-medium text-zinc-500">{task.priority}</span>
                          <span className="bg-[#7C5CFC]/10 border border-[#7C5CFC]/20 text-[#7C5CFC] text-[9px] font-bold px-1 py-0 rounded-sm ml-1">NEW TASK</span>
                        </div>
                        <MoreVertical className="h-3 w-3 text-zinc-700" />
                      </div>
                      <p className="text-sm font-medium text-[#E5E1E4] mb-3">{task.title}</p>
                      <div className="flex items-center justify-between">
                         <div className="flex items-center gap-2">
                           <Avatar className="h-5 w-5 rounded-md">
                              <AvatarFallback className="bg-zinc-800 text-[9px] text-zinc-500 rounded-md">{task.assignee}</AvatarFallback>
                           </Avatar>
                           <span className="text-[10px] text-zinc-400">{task.assignee === 'RS' ? 'Rahul S.' : task.assignee}</span>
                         </div>
                         <span className="text-[10px] text-zinc-600">{task.points} points</span>
                      </div>
                   </div>
                 ))}
              </div>

              <div className="pt-2 text-sm text-foreground/70">
                 <p className="mb-4">
                   Total estimate: <span className="text-foreground font-medium">21 story points</span>. Suggested sprint: <span className="text-[#7C5CFC] font-medium">Sprint 3</span> (has capacity). Suggested assignees based on past ownership.
                 </p>
                 <p className="text-zinc-500 italic">Ready to add these to Sprint 3?</p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                 <button className="h-8 px-4 flex items-center gap-2 rounded-md bg-[#7C5CFC] text-white text-[10px] font-bold uppercase tracking-wider hover:opacity-90 transition-opacity">
                   <KanbanSquare className="h-3.5 w-3.5" />
                   Add all to Sprint 3
                 </button>
                 <button className="h-8 px-3 text-[10px] font-bold text-zinc-500 hover:text-zinc-300 uppercase tracking-wider">
                   Edit tasks first
                 </button>
                 <button className="h-8 px-3 flex items-center gap-2 text-[10px] font-bold text-zinc-600 hover:text-zinc-400 uppercase tracking-wider">
                   <RefreshCw className="h-3 w-3" />
                   Regenerate
                 </button>
              </div>

              {/* Source Tags */}
              <div className="pt-4 flex items-center gap-2 border-t border-[#7C5CFC]/10 text-[10px] text-zinc-600">
                 <span>Based on:</span>
                 <span className="hover:text-[#7C5CFC] cursor-pointer">Tiptap docs</span>
                 <span className="h-1 w-1 rounded-full bg-zinc-800" />
                 <span className="hover:text-[#7C5CFC] cursor-pointer">Sprint 3 board</span>
                 <span className="h-1 w-1 rounded-full bg-zinc-800" />
                 <span className="hover:text-[#7C5CFC] cursor-pointer">Team velocity data</span>
              </div>
            </div>
          </div>

          {/* User Success Reply */}
          <div className="flex flex-col items-end gap-2 max-w-2xl ml-auto">
            <div className="bg-muted border border-border rounded-xl rounded-tr-sm px-4 py-3 shadow-lg shadow-black/5">
              <p className="text-sm text-foreground">Add all to Sprint 3 and assign to the suggested people</p>
            </div>
          </div>

          {/* AI Success Message */}
          <div className="flex flex-col gap-2 max-w-3xl pb-10">
             <div className="flex items-center gap-1.5 mb-1 px-1">
               <Sparkles className="h-3 w-3 text-[#7C5CFC]" />
               <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Hivespace AI</span>
            </div>
            <div className="bg-[#7C5CFC]/5 border-l-2 border-[#7C5CFC] rounded-r-xl px-5 py-4 space-y-4">
               <p className="text-sm text-zinc-300">
                 Done! I&apos;ve created 6 tasks in Sprint 3. <span className=" text-xs text-zinc-400">HS-046</span> through <span className=" text-xs text-zinc-400">HS-051</span> are now in your Backlog with suggested assignees.
               </p>
               
               <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 flex items-start gap-3 max-w-sm shadow-lg shadow-green-950/10">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-green-400">6 tasks created successfully</p>
                    <button className="text-[10px] text-[#7C5CFC] mt-1 font-medium hover:underline">View in board →</button>
                  </div>
               </div>

               <div className="pt-2 flex items-center gap-2 text-[10px] text-zinc-600 italic">
                 Total: 21 points added to Sprint 3 capacity.
               </div>
            </div>
          </div>
        </div>

        {/* Compose Bar */}
        <div className="p-5" style={{ background: '#191511', borderTop: '1px solid #2e2720' }}>
          <div className="max-w-3xl mx-auto w-full">
            <div className="rounded-2xl px-4 py-2.5 flex items-center gap-3 transition-all" style={{ background: '#221e1a', border: '1px solid #3a2e26' }}>
              <Sparkles className="h-4 w-4 shrink-0" style={{ color: '#D9775750' }} />
              <input 
                type="text" 
                placeholder="Follow up, ask for changes..." 
                className="bg-transparent border-none outline-none text-sm flex-1 py-1"
                style={{ color: '#EDE8E3' }}
              />
              <button className="h-8 w-8 rounded-xl flex items-center justify-center text-white transition-all hover:brightness-110" style={{ background: '#D97757', boxShadow: '0 2px 10px rgba(217,119,87,0.3)' }}>
                 <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
              </button>
            </div>
            <p className="text-[10px] text-center mt-3 font-medium tracking-wider uppercase" style={{ color: '#3d3028' }}>
              AI has access to tasks, docs, and channels in Engineering workspace
            </p>
          </div>
        </div>
      </div>

      {/* Context Panel (Right) */}
      <aside className="w-[280px] p-5 flex flex-col gap-6 overflow-y-auto scrollbar-none" style={{ background: '#161210', borderLeft: '1px solid #2e2720' }}>
        <section>
          <h4 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-4 flex items-center gap-2">
             <Activity className="h-3 w-3" /> Context
          </h4>
          
          <div className="space-y-6">
            <div>
              <p className="text-[10px] font-bold text-zinc-700 uppercase tracking-tight mb-2">Tasks Referenced</p>
              <div className="flex items-center gap-2 py-1 px-1.5 hover:bg-zinc-800/50 rounded transition-colors group cursor-pointer border border-transparent hover:border-zinc-800">
                <div className="h-1 w-1 rounded-full bg-red-500" />
                <span className=" text-[10px] text-zinc-600">HS-044</span>
                <span className="text-[10px] text-zinc-400 truncate flex-1">STOMP WebSocket chat...</span>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold text-zinc-700 uppercase tracking-tight mb-2">Docs Referenced</p>
              <div className="flex items-center gap-2 py-1 px-1.5 hover:bg-zinc-800/50 rounded transition-colors group cursor-pointer">
                <FileText className="h-3 w-3 text-zinc-600" />
                <span className="text-[10px] text-zinc-400 truncate">Tiptap specs v2.pdf</span>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold text-zinc-700 uppercase tracking-tight mb-2">Tasks Created</p>
              <div className="bg-green-500/5 border border-green-500/10 rounded-md p-3">
                 <p className="text-xs font-semibold text-green-500 mb-1">6 tasks added</p>
                 <p className=" text-[9px] text-zinc-600 leading-relaxed">
                   HS-046, HS-047, HS-048, HS-049, HS-050, HS-051
                 </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-auto pt-6 border-t border-zinc-800/50">
           <h4 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-3">Scope</h4>
           <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-zinc-400">Engineering workspace</span>
              <Badge variant="outline" className="text-[9px] border-zinc-800 text-zinc-600 rounded-sm">Active</Badge>
           </div>
           <div className="flex items-center justify-between group">
              <span className="text-[11px] text-zinc-500 group-hover:text-zinc-400 transition-colors">Include all workspaces</span>
              <Switch className="data-[state=checked]:bg-[#7C5CFC]" />
           </div>
        </section>
      </aside>
    </div>
  );
}
