"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  ArrowUp,
  Sparkles,
  Hexagon,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  ChevronDown,
  Copy,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MarkdownRenderer } from "@/components/common/MarkdownRenderer";
import { useUiStore } from "@/store/uiStore";
import { useChatStore } from "@/store/chatStore";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { sendAiCommand } from "@/lib/api/ai";
import type { AiCommandResponse } from "@/lib/api/ai";

// ── Types ─────────────────────────────────────────────────────────────────────

type MessageRole = "user" | "assistant" | "error" | "success";

interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  taskCreated?: {
    identifier: string;
    title: string;
    assigneeName?: string;
  };
}

// ── Suggested prompts shown in the empty state ────────────────────────────────

const SUGGESTED_PROMPTS = [
  "Create a task to fix the login bug and assign to @john by Friday",
  "Summarize the last 50 messages in this channel",
  "Create a HIGH priority task: Review PR #82 by tomorrow",
  "Ask: What are the open action items from today?",
];

const AI_COMMAND_SUGGESTIONS = [
  { command: "/todo ", description: "Create a new task / todo" },
  { command: "/update ", description: "Update an existing task" },
  { command: "/ai summarize", description: "Summarize the last 50 messages in this channel" },
  { command: "/ai summarize from ", description: "Summarize messages in a specific date range" },
  { command: "/ai ask ", description: "Answer questions using the channel history" },
  { command: "/ai draft a reply to ", description: "Draft a response to a channel member" }
];

const FANCY_LOADING_PHRASES = [
  "Deepening thoughts...",
  "Synthesizing workspace history...",
  "Formulating logical constructs...",
  "Consulting logic matrices...",
  "Assembling response blocks...",
  "Weaving semantic relations...",
  "Refining task parameters...",
  "Navigating algorithmic pathways...",
  "Analyzing context vectors...",
  "Executing instruction schema..."
];

// ── Main Component ─────────────────────────────────────────────────────────────

export function AiSidebarChat() {
  const { isAiSidebarOpen, setAiSidebarOpen } = useUiStore();
  const { activeWorkspace } = useWorkspaceStore();
  const { channels } = useChatStore();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [aiSuggestIndex, setAiSuggestIndex] = useState(0);
  const [dismissedSuggestions, setDismissedSuggestions] = useState(false);
  const [fancyLoadingText, setFancyLoadingText] = useState(FANCY_LOADING_PHRASES[0]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastPromptRef = useRef("");

  useEffect(() => {
    if (!isLoading) return;
    
    // Pick a random starting phrase
    const randomStart = FANCY_LOADING_PHRASES[Math.floor(Math.random() * FANCY_LOADING_PHRASES.length)];
    setFancyLoadingText(randomStart);

    const interval = setInterval(() => {
      setFancyLoadingText((prev) => {
        const available = FANCY_LOADING_PHRASES.filter((p) => p !== prev);
        return available[Math.floor(Math.random() * available.length)];
      });
    }, 2500);

    return () => clearInterval(interval);
  }, [isLoading]);

  // Pick first available channel to use for AI commands
  const workspaceChannels = activeWorkspace ? (channels[activeWorkspace.id] ?? []) : [];
  const nonDmChannels = workspaceChannels.filter((c) => c.type === "PUBLIC" || c.type === "PRIVATE");

  // Prefer a project-linked channel so that /todo and task creation commands work.
  // Falls back to the first available non-DM channel.
  const activeChannel =
    nonDmChannels.find((c) => c.projectId !== null) ?? nonDmChannels[0] ?? null;

  const hasProjectContext = activeChannel?.projectId != null;

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;  
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, [inputValue]);

  // Auto-focus when sidebar opens
  useEffect(() => {
    if (isAiSidebarOpen) {
      setTimeout(() => textareaRef.current?.focus(), 150);
    }
  }, [isAiSidebarOpen]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBtn(distFromBottom > 120);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const canSend = !!activeChannel && inputValue.trim().length > 0 && !isLoading;

  const abortControllerRef = useRef<AbortController | null>(null);

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    const prompt = inputValue.trim();
    if (!prompt || !activeChannel) return;

    lastPromptRef.current = prompt;

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: prompt,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setIsLoading(true);

    try {
      const response: AiCommandResponse = await sendAiCommand(activeChannel.id, prompt, { signal: controller.signal });

      let content: string;
      let taskCreated: ChatMessage["taskCreated"] | undefined;

      if ("isDraft" in response) {
        content = response.draftContent;
      } else {
        content = response.content ?? "Done.";
        // Check if backend response contains a task identifier pattern like HS-042
        const taskMatch = content.match(/\[?(HS-\d+)\]?/);
        if (taskMatch) {
          const titleMatch = content.match(/\*\*(.*?)\*\*/);
          const assigneeMatch = content.match(/assigned to ([^.!\n]+)/i);
          taskCreated = {
            identifier: taskMatch[1],
            title: titleMatch?.[1] ?? "",
            assigneeName: assigneeMatch?.[1]?.trim(),
          };
        }
      }

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "success",
        content,
        timestamp: new Date(),
        taskCreated,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      if (err.name === "AbortError" || (err instanceof Error && err.message === "The user aborted a request.")) {
        console.log("Request aborted");
        if (lastPromptRef.current) {
          setInputValue(lastPromptRef.current);
        }
        const cancelMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: "error",
          content: "⚠️ **Generation Interrupted.** Your input has been restored so you can edit and retry.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, cancelMsg]);
      } else {
        const errorMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: "error",
          content:
            err instanceof Error
              ? err.message
              : "Something went wrong. Please try again.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } finally {
      if (abortControllerRef.current === controller) {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    }
  };

  useEffect(() => {
    if (inputValue === "") {
      setDismissedSuggestions(false);
    }
  }, [inputValue]);

  const filteredSuggestions = AI_COMMAND_SUGGESTIONS.filter((s) =>
    s.command.toLowerCase().startsWith(inputValue.toLowerCase()) ||
    (inputValue.toLowerCase().startsWith(s.command.toLowerCase()) && inputValue.length <= s.command.length)
  );

  const showAiSuggestions =
    !dismissedSuggestions &&
    inputValue.startsWith("/") &&
    filteredSuggestions.length > 0;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showAiSuggestions) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setAiSuggestIndex((aiSuggestIndex + 1) % filteredSuggestions.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setAiSuggestIndex((aiSuggestIndex - 1 + filteredSuggestions.length) % filteredSuggestions.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        const suggestion = filteredSuggestions[aiSuggestIndex];
        if (suggestion) {
          setInputValue(suggestion.command);
          setTimeout(() => textareaRef.current?.focus(), 50);
        }
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setDismissedSuggestions(true);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (canSend) handleSend();
    }
  };

  const handleClear = () => {
    setMessages([]);
    setInputValue("");
  };

  return (
    <AnimatePresence>
      {isAiSidebarOpen && (
        <>
          {/* Backdrop (mobile / tablet only) */}
          <motion.div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setAiSidebarOpen(false)}
          />

          {/* Sidebar panel */}
          <motion.aside
            className={cn(
              "fixed right-0 top-0 z-50 flex h-screen w-[380px] flex-col",
              "border-l border-white/[0.06]",
              "bg-[#0f0d0b]/95 backdrop-blur-2xl",
              "shadow-[-20px_0_60px_rgba(0,0,0,0.5)]"
            )}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
          >
            {/* ── Header ── */}
            <header className="flex h-[48px] shrink-0 items-center justify-between border-b border-white/[0.06] px-4">
              <div className="flex items-center gap-2.5">
                {/* Hex logo */}
                <div className="relative flex h-7 w-7 items-center justify-center">
                  <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-violet-600/30 to-fuchsia-600/20 blur-[6px]" />
                  <div className="relative flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600 shadow-lg">
                    <Hexagon className="h-4 w-4 fill-white/20 text-white" strokeWidth={1.5} />
                  </div>
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-white leading-tight">Hex AI</p>
                  <p className="text-[10px] leading-tight">
                    {activeChannel ? (
                      hasProjectContext ? (
                        <span className="text-emerald-500">● #{activeChannel.name} · task-ready</span>
                      ) : (
                        <span className="text-amber-500">● #{activeChannel.name} · no project</span>
                      )
                    ) : (
                      <span className="text-zinc-500">No channel</span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {messages.length > 0 && (
                  <button
                    onClick={handleClear}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-white/5 hover:text-zinc-300"
                    title="Clear conversation"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  onClick={() => setAiSidebarOpen(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-white/5 hover:text-zinc-300"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </header>

            {/* ── Message Thread ── */}
            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="relative flex-1 overflow-y-auto px-4 py-4"
            >
              {messages.length === 0 ? (
                <EmptyState
                  channelName={activeChannel?.name ?? null}
                  hasProjectContext={hasProjectContext}
                  onSelectPrompt={(p) => {
                    setInputValue(p);
                    setTimeout(() => textareaRef.current?.focus(), 50);
                  }}
                />
              ) : (
                <div className="flex flex-col gap-3">
                  <AnimatePresence initial={false}>
                    {messages.map((msg) => (
                      <MessageBubble key={msg.id} message={msg} />
                    ))}
                  </AnimatePresence>

                  {/* Loading bubble */}
                  {isLoading && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-end gap-2"
                    >
                      <HexAvatar pulsing />
                      <div className="flex flex-col gap-2 rounded-2xl rounded-bl-sm border border-white/[0.06] bg-white/[0.03] px-4 py-3 min-w-[220px]">
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-[10px] text-zinc-400 font-mono italic animate-pulse tracking-wide select-none">
                            {fancyLoadingText}
                          </span>
                          <button
                            onClick={handleStop}
                            className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/5 border border-white/10 hover:border-rose-500/50 hover:bg-rose-500/10 text-[9px] text-rose-400 font-semibold cursor-pointer transition-colors"
                          >
                            <span className="h-1 w-1 rounded-sm bg-rose-500 animate-pulse" />
                            Stop
                          </button>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="h-1 w-1 animate-bounce rounded-full bg-violet-400 [animation-delay:0ms]" />
                          <span className="h-1 w-1 animate-bounce rounded-full bg-violet-400 [animation-delay:150ms]" />
                          <span className="h-1 w-1 animate-bounce rounded-full bg-violet-400 [animation-delay:300ms]" />
                        </div>
                      </div>
                    </motion.div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}

              {/* Scroll to bottom button */}
              <AnimatePresence>
                {showScrollBtn && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    onClick={scrollToBottom}
                    className="absolute bottom-4 right-4 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-zinc-800 text-zinc-300 shadow-lg transition hover:bg-zinc-700"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

            {/* ── Compose Bar ── */}
            <div className="shrink-0 border-t border-white/[0.06] p-3 relative">
              <div className="relative rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3 transition-colors focus-within:border-violet-500/40 focus-within:bg-white/[0.05]">
                {showAiSuggestions && (
                  <div className="absolute bottom-full left-0 z-50 mb-2 w-full overflow-hidden rounded-xl border border-purple-500/30 bg-zinc-950/95 backdrop-blur-md shadow-2xl p-1 animate-in slide-in-from-bottom-1 duration-150">
                    <div className="px-3 py-1.5 text-[10px] font-bold text-purple-400 tracking-wider uppercase border-b border-white/[0.06]">
                      AI Commands
                    </div>
                    <div className="scrollbar-thin scrollbar-thumb-white/10 max-h-48 overflow-y-auto py-1">
                      {filteredSuggestions.map((suggestion, index) => (
                        <div
                          key={suggestion.command}
                          onClick={() => {
                            setInputValue(suggestion.command);
                            setTimeout(() => textareaRef.current?.focus(), 50);
                          }}
                          onMouseEnter={() => setAiSuggestIndex(index)}
                          className={cn(
                            "flex flex-col cursor-pointer px-3 py-1.5 transition-colors rounded-lg",
                            index === aiSuggestIndex
                              ? "bg-purple-500/20 border border-purple-500/30"
                              : "hover:bg-white/5 border border-transparent"
                          )}
                        >
                          <span className="text-xs font-semibold text-purple-200">
                            {suggestion.command}
                          </span>
                          <span className="text-[10px] text-zinc-500">
                            {suggestion.description}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-2.5">
                  <Sparkles className="mt-1.5 h-4 w-4 shrink-0 text-violet-500/60" />
                  <textarea
                    ref={textareaRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={
                      activeChannel
                        ? 'Try "Create a task to..." or "/ai ask ..."'
                        : "No channel available"
                    }
                    disabled={!activeChannel || isLoading}
                    rows={1}
                    className={cn(
                      "flex-1 resize-none bg-transparent text-sm text-zinc-200 outline-none",
                      "placeholder:text-zinc-600",
                      "disabled:cursor-not-allowed disabled:opacity-50",
                      "min-h-[24px] max-h-[160px] leading-relaxed"
                    )}
                    style={{ overflow: "hidden" }}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!canSend}
                    className={cn(
                      "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl transition-colors duration-200",
                      canSend
                        ? "bg-[#b05730] text-white cursor-pointer"
                        : "bg-white/5 text-zinc-600 cursor-not-allowed"
                    )}
                  >
                    {isLoading ? (
                      <Sparkles className="h-3.5 w-3.5 animate-pulse text-white" />
                    ) : (
                      <ArrowUp className="h-3.5 w-3.5 stroke-[2.5]" />
                    )}
                  </button>
                </div>

                <p className="mt-2 text-center text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-700">
                  Hex has access to tasks, docs & channels
                </p>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function HexAvatar({ pulsing = false }: { pulsing?: boolean }) {
  return (
    <div className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600 shadow-md">
      <Hexagon
        className={cn("h-3.5 w-3.5 fill-white/20 text-white", pulsing && "animate-pulse")}
        strokeWidth={1.5}
      />
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.2 }}
      className={cn("flex items-end gap-2", isUser ? "justify-end" : "justify-start")}
    >
      {!isUser && <HexAvatar />}

      <div className="flex max-w-[82%] flex-col gap-1.5">
        <div
          className={cn(
            "rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed",
            isUser
              ? "rounded-br-sm bg-[#b05730] text-white border border-[#b05730]/90"
              : message.role === "error"
              ? "rounded-bl-sm border border-rose-500/20 bg-rose-500/10 text-rose-200"
              : "rounded-bl-sm border border-white/[0.06] bg-white/[0.03] text-zinc-200"
          )}
        >
          <MarkdownRenderer content={message.content} themeColor="#8b5cf6" />
        </div>

        {/* Assistant Actions: Copy button */}
        {!isUser && message.role !== "error" && (
          <div className="flex items-center gap-2 pl-1">
            <CopyButton textToCopy={message.content} />
          </div>
        )}

        {/* Task Created Card */}
        {message.taskCreated && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-emerald-300">
                {message.taskCreated.identifier} Created
              </p>
              {message.taskCreated.assigneeName && (
                <p className="truncate text-[10px] text-emerald-500">
                  Assigned → {message.taskCreated.assigneeName}
                </p>
              )}
            </div>
          </motion.div>
        )}

        {/* Error badge */}
        {message.role === "error" && (
          <div className="flex items-center gap-1.5 text-[10px] text-rose-500">
            <AlertCircle className="h-3 w-3" />
            Failed to process
          </div>
        )}

        <span className="px-1 text-[10px] text-zinc-700">
          {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </motion.div>
  );
}

function EmptyState({
  channelName,
  hasProjectContext,
  onSelectPrompt,
}: {
  channelName: string | null;
  hasProjectContext: boolean;
  onSelectPrompt: (prompt: string) => void;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 py-8">
      {/* Glowing hex icon */}
      <div className="relative">
        <div className="absolute inset-0 scale-150 rounded-full bg-violet-600/20 blur-2xl" />
        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 shadow-xl">
          <Hexagon className="h-8 w-8 fill-white/20 text-white" strokeWidth={1.5} />
        </div>
      </div>

      <div className="text-center">
        <h3 className="text-[15px] font-semibold text-white">Ask Hex anything</h3>
        {!channelName ? (
          <p className="mt-1 text-[12px] leading-relaxed text-zinc-500">
            Select a channel to begin using Hex AI commands.
          </p>
        ) : !hasProjectContext ? (
          <p className="mt-1 text-[12px] leading-relaxed text-amber-500/80">
            Connected to <strong className="text-amber-400">#{channelName}</strong> — this channel has no project.
            <br />
            <span className="text-zinc-500">Task creation requires a project channel. Other AI commands still work.</span>
          </p>
        ) : (
          <p className="mt-1 text-[12px] leading-relaxed text-zinc-500">
            Connected to <strong className="text-emerald-400">#{channelName}</strong>. Create tasks, ask questions, or summarize.
          </p>
        )}
      </div>

      {channelName && (
        <div className="w-full space-y-2">
          <p className="text-center text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-600">
            Try asking
          </p>
          {SUGGESTED_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              onClick={() => onSelectPrompt(prompt)}
              className={cn(
                "w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5",
                "text-left text-[12px] text-zinc-400 leading-snug",
                "transition-all hover:border-violet-500/30 hover:bg-violet-500/5 hover:text-zinc-200",
                "active:scale-[0.98]"
              )}
            >
              {prompt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CopyButton({ textToCopy }: { textToCopy: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] text-zinc-500 hover:text-zinc-300 hover:bg-white/5 border border-transparent hover:border-white/10 transition-all cursor-pointer"
      title="Copy to clipboard"
    >
      {copied ? (
        <>
          <Check className="h-3 w-3 text-emerald-400" />
          <span className="text-emerald-400">Copied!</span>
        </>
      ) : (
        <>
          <Copy className="h-3 w-3" />
          <span>Copy</span>
        </>
      )}
    </button>
  );
}
