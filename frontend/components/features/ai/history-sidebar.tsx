"use client"

import { useMemo } from "react"
import { PanelRightClose, MessageSquare, Trash2, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import type { AiConversationResponse } from "@/lib/api/ai-conversations"

type HistorySidebarProps = {
  collapsed: boolean
  onToggle: () => void
  conversations: AiConversationResponse[]
  activeId: string | null
  onSelect: (id: string) => void
  onDelete: (id: string, event: React.MouseEvent) => void
  onNewChat: () => void
}

export function HistorySidebar({
  collapsed,
  onToggle,
  conversations,
  activeId,
  onSelect,
  onDelete,
  onNewChat,
}: HistorySidebarProps) {
  // Group conversations by Date
  const groupedConversations = useMemo(() => {
    const today: AiConversationResponse[] = []
    const yesterday: AiConversationResponse[] = []
    const last7Days: AiConversationResponse[] = []
    const older: AiConversationResponse[] = []

    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfYesterday = new Date(startOfToday)
    startOfYesterday.setDate(startOfYesterday.getDate() - 1)
    const startOfLast7Days = new Date(startOfToday)
    startOfLast7Days.setDate(startOfLast7Days.getDate() - 7)

    conversations.forEach((c) => {
      const date = new Date(c.updatedAt)
      if (date >= startOfToday) {
        today.push(c)
      } else if (date >= startOfYesterday) {
        yesterday.push(c)
      } else if (date >= startOfLast7Days) {
        last7Days.push(c)
      } else {
        older.push(c)
      }
    })

    return { today, yesterday, last7Days, older }
  }, [conversations])

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {!collapsed && (
        <div
          onClick={onToggle}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-250 md:hidden"
        />
      )}

      {/* Main Sidebar Wrapper (Right aligned) */}
      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex h-full flex-col border-l border-[#2e2720] bg-[#161210] text-[#EDE8E3] transition-all duration-250 ease-in-out md:static",
          collapsed ? "w-0 translate-x-full border-l-0 overflow-hidden" : "w-[260px] translate-x-0"
        )}
      >
        {/* Expanded Content Panel */}
        <div className="flex h-full w-[260px] flex-col shrink-0">
          {/* Header */}
          <div className="flex h-14 items-center justify-between px-4 border-b border-[#2e2720]">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8C7B6E]">
              Hex AI History
            </span>
            <button
              onClick={onToggle}
              className="rounded-md p-1.5 hover:bg-[#221e1a] text-[#8C7B6E] hover:text-[#EDE8E3]"
              title="Collapse sidebar"
            >
              <PanelRightClose className="h-4.5 w-4.5" />
            </button>
          </div>

          {/* New Chat Action */}
          <div className="p-3">
            <button
              onClick={onNewChat}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#2e2720] bg-[#221e1a] hover:bg-[#1f1b17] px-4 py-2.5 text-xs font-medium text-[#EDE8E3] transition-colors"
            >
              <Plus className="h-4 w-4 text-[#D97757]" />
              New chat
            </button>
          </div>

          {/* Scrollable list of Chats */}
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
            {conversations.length === 0 ? (
              <p className="px-3 text-[11px] leading-5 text-[#8C7B6E]">
                No past conversations. Your chats will appear here.
              </p>
            ) : (
              <>
                {/* Today */}
                {groupedConversations.today.length > 0 && (
                  <div className="space-y-1">
                    <h4 className="px-3 text-[10px] font-semibold text-[#8C7B6E] uppercase tracking-wider">
                      Today
                    </h4>
                    {groupedConversations.today.map((c) => (
                      <HistoryItem
                        key={c.id}
                        conversation={c}
                        active={c.id === activeId}
                        onClick={() => onSelect(c.id)}
                        onDelete={(e) => onDelete(c.id, e)}
                      />
                    ))}
                  </div>
                )}

                {/* Yesterday */}
                {groupedConversations.yesterday.length > 0 && (
                  <div className="space-y-1">
                    <h4 className="px-3 text-[10px] font-semibold text-[#8C7B6E] uppercase tracking-wider">
                      Yesterday
                    </h4>
                    {groupedConversations.yesterday.map((c) => (
                      <HistoryItem
                        key={c.id}
                        conversation={c}
                        active={c.id === activeId}
                        onClick={() => onSelect(c.id)}
                        onDelete={(e) => onDelete(c.id, e)}
                      />
                    ))}
                  </div>
                )}

                {/* Last 7 Days */}
                {groupedConversations.last7Days.length > 0 && (
                  <div className="space-y-1">
                    <h4 className="px-3 text-[10px] font-semibold text-[#8C7B6E] uppercase tracking-wider">
                      Last 7 Days
                    </h4>
                    {groupedConversations.last7Days.map((c) => (
                      <HistoryItem
                        key={c.id}
                        conversation={c}
                        active={c.id === activeId}
                        onClick={() => onSelect(c.id)}
                        onDelete={(e) => onDelete(c.id, e)}
                      />
                    ))}
                  </div>
                )}

                {/* Older */}
                {groupedConversations.older.length > 0 && (
                  <div className="space-y-1">
                    <h4 className="px-3 text-[10px] font-semibold text-[#8C7B6E] uppercase tracking-wider">
                      Older
                    </h4>
                    {groupedConversations.older.map((c) => (
                      <HistoryItem
                        key={c.id}
                        conversation={c}
                        active={c.id === activeId}
                        onClick={() => onSelect(c.id)}
                        onDelete={(e) => onDelete(c.id, e)}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}

function HistoryItem({
  conversation,
  active,
  onClick,
  onDelete,
}: {
  conversation: AiConversationResponse
  active: boolean
  onClick: () => void
  onDelete: (event: React.MouseEvent) => void
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "group flex items-center justify-between rounded-xl px-3 py-2 text-xs cursor-pointer transition-all hover:bg-[#221e1a]",
        active ? "bg-[#1f1b17] text-[#EDE8E3]" : "text-[#8C7B6E] hover:text-[#EDE8E3]"
      )}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <MessageSquare className={cn("h-3.5 w-3.5 shrink-0", active ? "text-[#D97757]" : "text-[#8C7B6E]")} />
        <span className="truncate pr-1 font-medium">{conversation.title || "Untitled Chat"}</span>
      </div>
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[#1f1b17] hover:text-red-400 rounded-md transition-opacity"
        title="Delete conversation"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  )
}
