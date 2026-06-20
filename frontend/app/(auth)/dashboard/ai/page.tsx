"use client"

import { useState } from "react"
import { AiHomeView } from "@/components/features/ai/ai-home-view"
import { AiConversationView } from "@/components/features/ai/ai-conversation-view"
import { useAiDashboardData } from "@/hooks/use-ai-dashboard-data"

export default function AIAssistantPage() {
  const [view, setView] = useState<"home" | "conversation">("home")
  const [seedPrompt, setSeedPrompt] = useState("")
  const dashboard = useAiDashboardData()

  return (
    <div className="flex h-full w-full overflow-hidden bg-hs-main">
      {view === "home" ? (
        <AiHomeView
          workspaceName={dashboard.workspaceName}
          projectCount={dashboard.projectCount}
          recentTasks={dashboard.recentTasks}
          recentDocuments={dashboard.recentDocuments}
          channels={dashboard.channels}
          primaryChannel={dashboard.primaryChannel}
          loading={
            dashboard.projectsLoading ||
            dashboard.tasksLoading ||
            dashboard.documentsLoading ||
            dashboard.channelsLoading
          }
          onStart={(prompt) => {
            setSeedPrompt(prompt)
            setView("conversation")
          }}
        />
      ) : (
        <AiConversationView
          initialPrompt={seedPrompt}
          workspaceName={dashboard.workspaceName}
          channels={dashboard.channels}
          primaryChannel={dashboard.primaryChannel}
          recentTasks={dashboard.recentTasks}
          recentDocuments={dashboard.recentDocuments}
          onBack={() => setView("home")}
        />
      )}
    </div>
  )
}
