"use client"

import { 
  KanbanSquare, 
  AtSign, 
  GitPullRequest, 
  GitMerge, 
  Circle, 
  Zap, 
  Mail,
  Bell
} from "lucide-react"
import { Switch } from "@/components/ui/switch"
import React from "react"

interface NotificationRowProps {
  icon: React.ElementType
  label: string
  description: string
  defaultChecked?: boolean
}

function NotificationRow({ icon: Icon, label, description, defaultChecked = false }: NotificationRowProps) {
  return (
    <div className="h-14 flex items-center justify-between px-4 py-2 bg-[#272629] rounded-lg mb-2 group hover:bg-[#2e2d30] transition-colors">
      <div className="flex items-center gap-4">
        <div className="h-9 w-9 rounded-md bg-zinc-800 flex items-center justify-center">
          <Icon className="h-[18px] w-[18px] text-zinc-400 group-hover:text-hs-accent transition-colors" strokeWidth={1.5} />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-medium text-[#E5E1E4]">{label}</span>
          <span className="text-[10px] text-zinc-500 uppercase tracking-tight">{description}</span>
        </div>
      </div>
      <Switch 
        defaultChecked={defaultChecked}
        className="data-[state=checked]:bg-hs-accent"
      />
    </div>
  )
}

interface SectionProps {
  label: string
  children: React.ReactNode
}

function Section({ label, children }: SectionProps) {
  return (
    <div className="mt-8">
      <h3 className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-3 px-1">
        {label}
      </h3>
      <div className="space-y-1">
        {children}
      </div>
    </div>
  )
}

export default function NotificationsSettings() {
  return (
    <div className="max-w-2xl px-8 py-6">
      <header className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <Bell className="h-5 w-5 text-hs-accent" />
          <h1 className="text-xl font-semibold text-[#E5E1E4]">Notification Preferences</h1>
        </div>
        <p className="text-sm text-zinc-400">Configure how you want to be notified across the workspace</p>
      </header>

      <Section label="TASKS">
        <NotificationRow 
          icon={KanbanSquare} 
          label="Task assigned to me" 
          description="Ping when someone makes you the owner of a task"
          defaultChecked={true}
        />
        <NotificationRow 
          icon={KanbanSquare} 
          label="Task status changed" 
          description="Updates on tasks you are watching or assigned to"
          defaultChecked={true}
        />
        <NotificationRow 
          icon={KanbanSquare} 
          label="Task due date approaching" 
          description="Reminder 24 hours before a deadline"
          defaultChecked={true}
        />
        <NotificationRow 
          icon={KanbanSquare} 
          label="Task commented on" 
          description="New comments on your tasks"
        />
      </Section>

      <Section label="MENTIONS">
        <NotificationRow 
          icon={AtSign} 
          label="Direct mentions (@you)" 
          description="When someone calls you out specifically"
          defaultChecked={true}
        />
        <NotificationRow 
          icon={AtSign} 
          label="Channel mentions (@channel)" 
          description="Announcements in your active channels"
        />
      </Section>

      <Section label="GITHUB">
        <NotificationRow 
          icon={GitPullRequest} 
          label="PR review requested" 
          description="GitHub integration: when you are added as a reviewer"
          defaultChecked={true}
        />
        <NotificationRow 
          icon={GitMerge} 
          label="PR merged" 
          description="When your PR is successfully merged into main"
          defaultChecked={true}
        />
        <NotificationRow 
          icon={Circle} 
          label="Issue assigned" 
          description="New GitHub issues linked to your profile"
        />
      </Section>

      <Section label="SPRINTS">
        <NotificationRow 
          icon={Zap} 
          label="Sprint starting" 
          description="Notification when the team starts a new sprint"
          defaultChecked={true}
        />
        <NotificationRow 
          icon={Zap} 
          label="Sprint ending in 3 days" 
          description="Mid-sprint check-in for outstanding tasks"
          defaultChecked={true}
        />
        <NotificationRow 
          icon={Zap} 
          label="Sprint completed" 
          description="Summary of the completed sprint cycle"
          defaultChecked={true}
        />
      </Section>

      <Section label="EMAIL DIGEST">
        <NotificationRow 
          icon={Mail} 
          label="Daily digest email" 
          description="24-hour summary delivered every morning"
        />
        <NotificationRow 
          icon={Mail} 
          label="Weekly summary email" 
          description="Workspace performance report every Monday"
          defaultChecked={true}
        />
      </Section>
    </div>
  )
}
