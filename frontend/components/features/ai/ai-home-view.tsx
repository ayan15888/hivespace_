"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { ArrowRight, MessageSquare, Sparkles } from "lucide-react"
import {
  AI_FEATURES,
  AI_QUICK_ACTIONS,
} from "@/app/(auth)/dashboard/ai/ai-dashboard-content"
import type { ChannelResponse } from "@/types/messaging"
import type { DocumentResponse } from "@/lib/api/documents"
import type { TaskResponse } from "@/lib/api/tasks"
import type { ElementType, FormEvent, ReactNode } from "react"

type AiHomeViewProps = {
  workspaceName: string
  projectCount: number
  recentTasks: TaskResponse[]
  recentDocuments: Array<DocumentResponse & { projectName: string }>
  channels: ChannelResponse[]
  primaryChannel: ChannelResponse | null
  loading: boolean
  onStart: (prompt: string) => void
}

export function AiHomeView({
  workspaceName,
  projectCount,
  recentTasks,
  recentDocuments,
  channels,
  primaryChannel,
  loading,
  onStart,
}: AiHomeViewProps) {
  const [prompt, setPrompt] = useState("")

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = prompt.trim()
    if (!trimmed) return
    onStart(trimmed)
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 text-[#EDE8E3]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <HeroSection
          workspaceName={workspaceName}
          projectCount={projectCount}
          prompt={prompt}
          onPromptChange={setPrompt}
          onSubmit={handleSubmit}
        />
        <QuickActions onStart={onStart} />
        <WorkspaceSnapshot
          loading={loading}
          recentTasks={recentTasks}
          recentDocuments={recentDocuments}
          channels={channels}
          primaryChannel={primaryChannel}
        />
        <Capabilities />
      </div>
    </div>
  )
}

function HeroSection({
  workspaceName,
  projectCount,
  prompt,
  onPromptChange,
  onSubmit,
}: {
  workspaceName: string
  projectCount: number
  prompt: string
  onPromptChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  return (
    <motion.section
      className="rounded-3xl border border-[#3a2e26] bg-[#221e1a] p-6 shadow-[0_8px_40px_rgba(0,0,0,0.45)]"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="flex flex-col gap-5">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-[10px] font-semibold tracking-[0.2em] text-[#8C7B6E] uppercase">
            <Sparkles className="h-3.5 w-3.5 text-[#D97757]" />
            AI command center - {workspaceName}
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-[#EDE8E3] sm:text-4xl">
            How can I help today?
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-[#8C7B6E]">
            Start with a prompt, pick a shortcut, or jump straight into the live
            workspace context across {projectCount} projects.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <textarea
            value={prompt}
            onChange={(event) => onPromptChange(event.target.value)}
            placeholder="Ask zap to generate tasks, review work, or draft something useful..."
            className="min-h-[112px] w-full resize-none rounded-2xl border border-[#3a2e26] bg-[#191511] px-4 py-3 text-sm text-[#EDE8E3] transition-colors outline-none placeholder:text-[#6f5d52] focus:border-[#D9775750]"
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {["Reads live tasks", "Sees docs", "Uses channels"].map(
                (item) => (
                  <span
                    key={item}
                    className="rounded-full border border-[#2e2720] bg-[#1f1b17] px-3 py-1 text-[11px] font-medium text-[#6b5a4e]"
                  >
                    {item}
                  </span>
                )
              )}
            </div>
            <button
              type="submit"
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#D97757] px-4 text-xs font-semibold text-white transition-opacity hover:opacity-95 disabled:opacity-50"
              disabled={!prompt.trim()}
            >
              Start conversation
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>
    </motion.section>
  )
}

function QuickActions({ onStart }: { onStart: (prompt: string) => void }) {
  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {AI_QUICK_ACTIONS.map((action, index) => (
        <motion.button
          key={action.title}
          type="button"
          onClick={() => onStart(action.prompt)}
          className="group flex h-[146px] flex-col justify-between rounded-2xl border border-[#2e2720] bg-[#1f1b17] p-4 text-left transition-all hover:-translate-y-0.5 hover:border-[#D9775730]"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.04, duration: 0.25 }}
        >
          <div>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#D9775715] text-[#D97757]">
              <action.icon className="h-4 w-4" strokeWidth={1.8} />
            </div>
            <h2 className="mt-3 text-[13px] font-semibold text-[#EDE8E3]">
              {action.title}
            </h2>
            <p className="mt-1 text-[11px] leading-5 text-[#6b5a4e]">
              {action.description}
            </p>
          </div>
          <span className="text-[10px] font-semibold tracking-[0.18em] text-[#D97757] uppercase opacity-0 transition-opacity group-hover:opacity-100">
            Use prompt
          </span>
        </motion.button>
      ))}
    </section>
  )
}

function WorkspaceSnapshot({
  loading,
  recentTasks,
  recentDocuments,
  channels,
  primaryChannel,
}: {
  loading: boolean
  recentTasks: TaskResponse[]
  recentDocuments: Array<DocumentResponse & { projectName: string }>
  channels: ChannelResponse[]
  primaryChannel: ChannelResponse | null
}) {
  return (
    <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
      <SnapshotPanel title="Recent tasks" icon={MessageSquare}>
        <SnapshotList
          loading={loading}
          items={recentTasks}
          emptyLabel="Tasks will appear here once the workspace data loads."
          renderItem={(task) => (
            <div
              key={task.id}
              className="flex items-center justify-between rounded-xl border border-[#2e2720] bg-[#191511] px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-[#EDE8E3]">
                  {task.title}
                </p>
                <p className="text-[10px] text-[#6b5a4e]">{task.projectName}</p>
              </div>
              <span className="ml-3 shrink-0 text-[10px] text-[#4e3e34]">
                {task.taskIdentifier ?? task.id.slice(0, 8)}
              </span>
            </div>
          )}
        />
      </SnapshotPanel>
      <SnapshotPanel title="Live context" icon={Sparkles}>
        <div className="space-y-3">
          <div className="rounded-xl border border-[#2e2720] bg-[#191511] px-3 py-2">
            <p className="text-[10px] tracking-[0.18em] text-[#4e3e34] uppercase">
              Primary channel
            </p>
            <p className="mt-1 truncate text-xs text-[#EDE8E3]">
              {primaryChannel?.name ?? "No channel selected"}
            </p>
          </div>
          <SnapshotList
            loading={loading}
            items={recentDocuments}
            emptyLabel="Use the command center to work against live channels and documents."
            renderItem={(document) => (
              <div
                key={document.id}
                className="flex items-center justify-between rounded-xl border border-[#2e2720] bg-[#191511] px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-[#EDE8E3]">
                    {document.title}
                  </p>
                  <p className="text-[10px] text-[#6b5a4e]">
                    {document.projectName}
                  </p>
                </div>
                <span className="shrink-0 text-[10px] text-[#4e3e34]">
                  {channels.length} channels
                </span>
              </div>
            )}
          />
        </div>
      </SnapshotPanel>
    </section>
  )
}

function Capabilities() {
  return (
    <section className="flex flex-wrap gap-2 pt-1">
      {AI_FEATURES.map((feature) => (
        <span
          key={feature}
          className="rounded-full border border-[#2e2720] bg-[#1f1b17] px-4 py-2 text-[11px] font-medium text-[#6b5a4e]"
        >
          {feature}
        </span>
      ))}
    </section>
  )
}

function SnapshotPanel({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: ElementType
  children: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-[#2e2720] bg-[#191511] p-4">
      <div className="mb-4 flex items-center gap-2 text-[10px] font-semibold tracking-[0.2em] text-[#4e3e34] uppercase">
        <Icon className="h-3.5 w-3.5 text-[#D97757]" />
        {title}
      </div>
      {children}
    </div>
  )
}

function SnapshotList<T>({
  loading,
  items,
  emptyLabel,
  renderItem,
}: {
  loading: boolean
  items: T[]
  emptyLabel: string
  renderItem: (item: T) => React.ReactNode
}) {
  if (loading) {
    return (
      <p className="text-xs leading-6 text-[#6b5a4e]">
        Loading workspace data...
      </p>
    )
  }

  if (items.length === 0) {
    return <p className="text-xs leading-6 text-[#6b5a4e]">{emptyLabel}</p>
  }

  return (
    <div className="space-y-2">{items.map((item) => renderItem(item))}</div>
  )
}
