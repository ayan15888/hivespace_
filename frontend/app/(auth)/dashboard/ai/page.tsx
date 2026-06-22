"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { PanelRight, Sparkles, Loader2 } from "lucide-react"
import { useWorkspaceStore } from "@/store/workspaceStore"
import { useAuth } from "@/hooks/useAuth"
import {
  listConversations,
  getConversationMessages,
  startConversation,
  sendConversationMessage,
  deleteConversation,
  type AiConversationResponse,
  type AiMessageResponse,
} from "@/lib/api/ai-conversations"
import { HistorySidebar } from "@/components/features/ai/history-sidebar"
import { InputBar } from "@/components/features/ai/input-bar"
import { toast } from "sonner"

export default function AIAssistantPage() {
  const activeWorkspace = useWorkspaceStore((state) => state.activeWorkspace)
  const workspaceId = activeWorkspace?.id ?? ""
  const { user } = useAuth()

  // Page States
  const [conversations, setConversations] = useState<AiConversationResponse[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<AiMessageResponse[]>([])
  const [inputValue, setInputValue] = useState("")
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Get user's first name for greeting
  const userFirstName = user?.fullName ? user.fullName.split(" ")[0] : ""

  // Fetch Conversation History List
  const fetchHistory = async (selectLatestId?: string) => {
    if (!workspaceId) return
    try {
      setHistoryLoading(true)
      const data = await listConversations(workspaceId)
      setConversations(data)
      if (selectLatestId) {
        setActiveConversationId(selectLatestId)
        const msgs = await getConversationMessages(selectLatestId)
        setMessages(msgs)
      }
    } catch (error) {
      toast.error("Failed to load chat history")
    } finally {
      setHistoryLoading(false)
    }
  }

  // Load history on load
  useEffect(() => {
    if (workspaceId) {
      fetchHistory()
      setActiveConversationId(null)
      setMessages([])
    }
  }, [workspaceId])

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Select a past conversation
  const handleSelectConversation = async (id: string) => {
    try {
      setActiveConversationId(id)
      const msgs = await getConversationMessages(id)
      setMessages(msgs)
      // Close sidebar on mobile
      if (window.innerWidth < 768) {
        setSidebarCollapsed(true)
      }
    } catch (error) {
      toast.error("Failed to load conversation messages")
    }
  }

  // Start new chat
  const handleNewChat = () => {
    setActiveConversationId(null)
    setMessages([])
    setInputValue("")
    if (window.innerWidth < 768) {
      setSidebarCollapsed(true)
    }
  }

  // Delete conversation
  const handleDeleteConversation = async (id: string, event: React.MouseEvent) => {
    event.stopPropagation()
    try {
      await deleteConversation(id)
      toast.success("Conversation deleted")
      if (activeConversationId === id) {
        handleNewChat()
      }
      fetchHistory()
    } catch (error) {
      toast.error("Failed to delete conversation")
    }
  }

  // Submit Prompt
  const handleSend = async () => {
    const text = inputValue.trim()
    if (!text || !workspaceId) return

    // Clear input
    setInputValue("")

    // Optimistically add user message
    const tempUserMsg: AiMessageResponse = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, tempUserMsg])
    setIsLoading(true)

    try {
      if (!activeConversationId) {
        // Start a new conversation
        const res = await startConversation(workspaceId, text)
        // Refresh history list and select the new conversation
        await fetchHistory(res.conversationId)
      } else {
        // Continue existing conversation
        const res = await sendConversationMessage(activeConversationId, text)
        const tempAssistantMsg: AiMessageResponse = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: res.assistantResponse,
          createdAt: new Date().toISOString(),
        }
        setMessages((prev) => [...prev, tempAssistantMsg])
        // Refresh list timestamp
        fetchHistory()
      }
    } catch (error) {
      toast.error("Failed to send message")
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id))
    } finally {
      setIsLoading(false)
    }
  }

  // Quick Action Pills click handler
  const handleQuickAction = (actionText: string) => {
    setInputValue(actionText)
  }

  const hasStarted = activeConversationId !== null || messages.length > 0

  const activeTitle = conversations.find((c) => c.id === activeConversationId)?.title || "Hex AI Assistant"

  return (
    <div className="flex h-full w-full overflow-hidden bg-[#191511] text-[#EDE8E3]">
      {/* Main Chat Content Area (Left aligned) */}
      <main className="relative flex flex-1 flex-col overflow-hidden bg-[#191511]">
        {/* Chat Header */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#2e2720] px-4 bg-[#191511]/90 backdrop-blur-md z-30">
          <div className="flex items-center gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8C7B6E] truncate max-w-[200px] md:max-w-md">
              {hasStarted ? activeTitle : "New Chat"}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {hasStarted && (
              <button
                onClick={handleNewChat}
                className="rounded-xl border border-[#2e2720] bg-[#221e1a] hover:bg-[#1f1b17] px-3 py-1.5 text-[11px] font-medium text-[#EDE8E3] transition-colors"
              >
                New chat
              </button>
            )}
            {sidebarCollapsed && (
              <button
                onClick={() => setSidebarCollapsed(false)}
                className="rounded-md p-1.5 hover:bg-[#221e1a] text-[#8C7B6E] hover:text-[#EDE8E3]"
                title="Expand sidebar"
              >
                <PanelRight className="h-4.5 w-4.5" />
              </button>
            )}
          </div>
        </header>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
          <div className="mx-auto flex min-h-full w-full max-w-[680px] flex-col justify-between">
            <AnimatePresence mode="wait">
              {!hasStarted ? (
                /* STATE 1: Empty / New Conversation Centered UI */
                <motion.div
                  key="empty-state"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-1 flex-col items-center justify-center py-12"
                >
                  <div className="flex flex-col items-center text-center max-w-[500px]">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#D97757]/10 text-[#D97757] mb-6">
                      <Sparkles className="h-6 w-6" />
                    </div>
                    <h1 className="text-xl font-medium tracking-tight text-[#EDE8E3] mb-2">
                      {userFirstName
                        ? `How can Hex AI help you today, ${userFirstName}?`
                        : "How can Hex AI help you today?"}
                    </h1>
                    <p className="text-xs leading-5 text-[#8C7B6E] mb-8">
                      Ask about tasks, query repository documents, summarize channel chat activities, or draft specifications.
                    </p>
                  </div>

                  {/* Input Repositioned wrapper */}
                  <InputBar
                    value={inputValue}
                    onChange={setInputValue}
                    onSend={handleSend}
                    disabled={isLoading || historyLoading}
                    isActive={false}
                  />

                  {/* Quick Action Pills Row */}
                  <div className="mt-6 flex flex-wrap justify-center gap-2 max-w-[600px]">
                    {[
                      { label: "Generate tasks", prompt: "Break this feature brief into implementation tasks:\n" },
                      { label: "Triage backlog", prompt: "Analyze my project backlog and suggest priority upgrades." },
                      { label: "Sprint retro", prompt: "Generate a sprint retrospective report for this project." },
                      { label: "Summarize channel", prompt: "Summarize the recent discussions in this channel." },
                      { label: "Find duplicates", prompt: "Scan our tasks and check for potential duplicates." },
                    ].map((pill) => (
                      <button
                        key={pill.label}
                        type="button"
                        onClick={() => handleQuickAction(pill.prompt)}
                        className="rounded-full border border-[#2e2720] bg-[#221e1a] px-3.5 py-1.5 text-[11px] font-medium text-[#EDE8E3] hover:border-[#D97757]/40 hover:bg-[#1f1b17] transition-all"
                      >
                        {pill.label}
                      </button>
                    ))}
                  </div>
                </motion.div>
              ) : (
                /* STATE 2: Active Chat Messages Scroll View */
                <motion.div
                  key="chat-state"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex-1 space-y-6 pb-24"
                >
                  {messages.map((message) => {
                    const isUser = message.role === "user"
                    return (
                      <div
                        key={message.id}
                        className={`flex gap-4 ${isUser ? "justify-end" : "justify-start"}`}
                      >
                        {!isUser && (
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#D97757]/10 text-[#D97757]">
                            <Sparkles className="h-4.5 w-4.5" />
                          </div>
                        )}
                        <div
                          className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-6 ${
                            isUser
                              ? "bg-[#221e1a] text-[#EDE8E3] border-l-2 border-[#D97757] border-y border-r border-[#3a2e26]"
                              : "bg-[#191511] text-[#EDE8E3] border border-[#2e2720]"
                          }`}
                        >
                          <div className="whitespace-pre-wrap select-text">{message.content}</div>
                        </div>
                      </div>
                    )
                  })}

                  {/* Animated Loader while waiting for AI */}
                  {isLoading && (
                    <div className="flex gap-4 justify-start">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#D97757]/10 text-[#D97757]">
                        <Sparkles className="h-4.5 w-4.5" />
                      </div>
                      <div className="bg-[#191511] text-[#EDE8E3] border border-[#2e2720] rounded-2xl px-4 py-3 text-xs flex items-center gap-1.5">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-[#D97757]" />
                        <span>Hex AI is thinking...</span>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Input Bar at the Bottom in Active State */}
        {hasStarted && (
          <div className="sticky bottom-0 left-0 right-0 z-20">
            <InputBar
              value={inputValue}
              onChange={setInputValue}
              onSend={handleSend}
              disabled={isLoading || historyLoading}
              isActive={true}
            />
          </div>
        )}
      </main>

      {/* Scope-scoped Right History Sidebar */}
      <HistorySidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        conversations={conversations}
        activeId={activeConversationId}
        onSelect={handleSelectConversation}
        onDelete={handleDeleteConversation}
        onNewChat={handleNewChat}
      />
    </div>
  )
}
