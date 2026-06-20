"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowUp,
  CheckCircle,
  ChevronRight,
  MessageSquare,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { sendAiCommand } from "@/lib/api/ai";
import type { ChannelResponse } from "@/types/messaging";
import type { TaskResponse } from "@/lib/api/tasks";
import type { DocumentResponse } from "@/lib/api/documents";
import type { ReactNode } from "react";

type AiConversationViewProps = {
  initialPrompt: string;
  workspaceName: string;
  channels: ChannelResponse[];
  primaryChannel: ChannelResponse | null;
  recentTasks: TaskResponse[];
  recentDocuments: Array<DocumentResponse & { projectName: string }>;
  onBack: () => void;
};

type ChatRole = "user" | "assistant" | "error";

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
};

export function AiConversationView({
  initialPrompt,
  workspaceName,
  channels,
  primaryChannel,
  recentTasks,
  recentDocuments,
  onBack,
}: AiConversationViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState(initialPrompt);

  useEffect(() => {
    setInputValue(initialPrompt);
  }, [initialPrompt]);

  const selectedChannel = primaryChannel ?? channels[0] ?? null;
  const canSend = !!selectedChannel && inputValue.trim().length > 0;

  const sendMutation = useMutation({
    mutationFn: async (prompt: string) => {
      if (!selectedChannel) {
        throw new Error("No channel is available for AI commands.");
      }
      return sendAiCommand(selectedChannel.id, prompt);
    },
  });

  const channelOptions = useMemo(
    () =>
      channels.map((channel) => ({
        id: channel.id,
        label: channel.name ?? "Direct message",
        unreadCount: channel.unreadCount,
      })),
    [channels],
  );

  const handleSend = async () => {
    const prompt = inputValue.trim();
    if (!prompt || !selectedChannel) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: prompt,
      createdAt: new Date().toISOString(),
    };

    setMessages((current) => [...current, userMessage]);
    setInputValue("");

    try {
      const response = await sendMutation.mutateAsync(prompt);
      const content =
        "isDraft" in response ? response.draftContent : response.content;
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: content || "The assistant returned an empty response.",
        createdAt: new Date().toISOString(),
      };
      setMessages((current) => [...current, assistantMessage]);
    } catch (error) {
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "error",
        content:
          error instanceof Error
            ? error.message
            : "The AI command could not be completed.",
        createdAt: new Date().toISOString(),
      };
      setMessages((current) => [...current, assistantMessage]);
    }
  };

  return (
    <div className="flex h-full w-full overflow-hidden text-[#EDE8E3]">
      <main className="flex min-w-0 flex-1 flex-col bg-[#191511]">
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-[#2e2720] px-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onBack}
              className="rounded-md p-1 text-[#8C7B6E] transition-colors hover:bg-white/5 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <h2 className="truncate text-sm font-medium text-[#EDE8E3]">AI command center</h2>
              <p className="truncate text-[10px] uppercase tracking-[0.2em] text-[#6b5a4e]">
                {workspaceName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="rounded-md p-1.5 text-[#6b5a4e] transition-colors hover:bg-white/5 hover:text-white">
              <RefreshCw className="h-4 w-4" />
            </button>
            <button className="rounded-md p-1.5 text-[#6b5a4e] transition-colors hover:bg-white/5 hover:text-white">
              <Sparkles className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col justify-between gap-6">
            <div className="space-y-4">
              {messages.length === 0 ? (
                <EmptyState workspaceName={workspaceName} channelName={selectedChannel?.name ?? "No channel selected"} />
              ) : (
                <MessageThread messages={messages} />
              )}
            </div>

            <ComposeBar
              value={inputValue}
              onChange={setInputValue}
              onSend={() => void handleSend()}
              disabled={!canSend || sendMutation.isPending}
              selectedChannel={selectedChannel}
            />
          </div>
        </div>
      </main>

      <aside className="hidden w-[320px] shrink-0 flex-col overflow-y-auto border-l border-[#2e2720] bg-[#161210] p-4 lg:flex">
        <div className="space-y-6">
          <section>
            <div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#4e3e34]">
              <MessageSquare className="h-3.5 w-3.5 text-[#D97757]" />
              Channel
            </div>
            <div className="space-y-2">
              {channelOptions.length > 0 ? (
                channelOptions.map((channel) => (
                  <div
                    key={channel.id}
                    className={cn(
                      "flex items-center justify-between rounded-xl border px-3 py-2",
                      channel.id === selectedChannel?.id
                        ? "border-[#D9775730] bg-[#1f1b17]"
                        : "border-[#2e2720] bg-[#191511]",
                    )}
                  >
                    <span className="truncate text-xs text-[#EDE8E3]">
                      {channel.label}
                    </span>
                    <Badge className="h-5 border-none bg-[#D9775715] px-2 text-[10px] text-[#D97757]">
                      {channel.unreadCount}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-xs leading-6 text-[#6b5a4e]">
                  No workspace channels are available yet.
                </p>
              )}
            </div>
          </section>

          <SummarySection
            title="Recent tasks"
            items={recentTasks}
            renderItem={(task) => (
              <div
                key={task.id}
                className="flex items-center justify-between rounded-xl border border-[#2e2720] bg-[#191511] px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-[#EDE8E3]">
                    {task.title}
                  </p>
                  <p className="text-[10px] text-[#6b5a4e]">
                    {task.projectName}
                  </p>
                </div>
                <span className="ml-3 shrink-0 text-[10px] text-[#4e3e34]">
                  {task.taskIdentifier ?? task.id.slice(0, 8)}
                </span>
              </div>
            )}
          />

          <SummarySection
            title="Recent docs"
            items={recentDocuments}
            renderItem={(doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between rounded-xl border border-[#2e2720] bg-[#191511] px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-[#EDE8E3]">
                    {doc.title}
                  </p>
                  <p className="text-[10px] text-[#6b5a4e]">{doc.projectName}</p>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-[#4e3e34]" />
              </div>
            )}
          />

          <section className="rounded-2xl border border-[#2e2720] bg-[#191511] p-4">
            <div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#4e3e34]">
              <CheckCircle className="h-3.5 w-3.5 text-[#D97757]" />
              Live summary
            </div>
            <p className="text-xs leading-6 text-[#6b5a4e]">
              This panel is now driven by live workspace data and the backend AI command endpoint.
            </p>
          </section>
        </div>
      </aside>
    </div>
  );
}

function EmptyState({
  workspaceName,
  channelName,
}: {
  workspaceName: string;
  channelName: string;
}) {
  return (
    <motion.section
      className="rounded-2xl border border-[#2e2720] bg-[#221e1a] p-5"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8C7B6E]">
          <Sparkles className="h-3.5 w-3.5 text-[#D97757]" />
          Ready to respond
        </div>
        <h3 className="text-lg font-semibold text-[#EDE8E3]">
          Ask a command in {channelName}
        </h3>
        <p className="max-w-2xl text-sm leading-6 text-[#8C7B6E]">
          {workspaceName} is connected. Send a prompt and the assistant will answer with live backend data.
        </p>
      </div>
    </motion.section>
  );
}

function MessageThread({ messages }: { messages: ChatMessage[] }) {
  return (
    <div className="space-y-3">
      <AnimatePresence initial={false}>
        {messages.map((message) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className={cn(
              "flex items-end gap-3",
              message.role === "user" ? "justify-end" : "justify-start",
            )}
          >
            {message.role !== "user" && (
              <Avatar className="h-7 w-7 rounded-lg">
                <AvatarFallback className="rounded-lg bg-[#D9775715] text-[10px] font-semibold text-[#D97757]">
                  Z
                </AvatarFallback>
              </Avatar>
            )}
            <div
              className={cn(
                "max-w-[85%] rounded-2xl border px-4 py-3 text-sm leading-6",
                message.role === "user"
                  ? "border-[#3a2e26] bg-[#221e1a] text-[#EDE8E3]"
                  : message.role === "error"
                    ? "border-red-500/20 bg-red-500/10 text-red-200"
                    : "border-[#2e2720] bg-[#191511] text-[#EDE8E3]",
              )}
            >
              {message.content}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function ComposeBar({
  value,
  onChange,
  onSend,
  disabled,
  selectedChannel,
}: {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled: boolean;
  selectedChannel: ChannelResponse | null;
}) {
  return (
    <div className="rounded-2xl border border-[#3a2e26] bg-[#221e1a] p-3">
      <div className="flex items-start gap-3">
        <Sparkles className="mt-2 h-4 w-4 shrink-0 text-[#D9775750]" />
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              if (!disabled) onSend();
            }
          }}
          placeholder={
            selectedChannel
              ? "Follow up, ask for changes, or request a summary..."
              : "Select a channel to begin"
          }
          disabled={!selectedChannel}
          className="min-h-[72px] flex-1 resize-none bg-transparent px-1 py-1 text-sm text-[#EDE8E3] outline-none placeholder:text-[#6f5d52] disabled:cursor-not-allowed"
        />
        <Button
          onClick={onSend}
          disabled={disabled}
          className="mt-1 h-9 w-9 rounded-xl bg-[#D97757] p-0 text-white hover:opacity-95"
        >
          <ArrowUp className="h-4 w-4" />
        </Button>
      </div>
      <p className="mt-2 text-center text-[10px] font-medium uppercase tracking-[0.2em] text-[#3d3028]">
        AI has access to tasks, docs, and channels in the workspace
      </p>
    </div>
  );
}

function SummarySection<T>({
  title,
  items,
  renderItem,
}: {
  title: string;
  items: T[];
  renderItem: (item: T) => ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[#2e2720] bg-[#191511] p-4">
      <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#4e3e34]">
        {title}
      </div>
      <div className="space-y-2">
        {items.length > 0 ? items.map(renderItem) : <EmptySummary />}
      </div>
    </section>
  );
}

function EmptySummary() {
  return (
    <div className="rounded-xl border border-dashed border-[#2e2720] px-3 py-4 text-xs leading-6 text-[#6b5a4e]">
      Nothing recent yet. Load workspace data or start a command to populate this panel.
    </div>
  );
}
