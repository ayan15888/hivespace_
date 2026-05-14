"use client";

import React, { useState } from "react";
import { 
  GitGraph, 
  GitBranch, 
  CheckCircle, 
  GitFork, 
  GitPullRequest, 
  GitCommit, 
  Circle, 
  Plus, 
  GitMerge, 
  GitPullRequestClosed,
  ChevronRight,
  Activity,
  Settings2,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

// Mock Data
const REPOS = [
  { id: 1, name: "acme-corp/backend", branch: "main", linkedProject: "Sprint 3", prs: 4, commits: 23, issues: 2, lastPush: "2 hours ago" },
  { id: 2, name: "acme-corp/frontend", branch: "main", linkedProject: "Frontend Redesign", prs: 2, commits: 11, issues: 0, lastPush: "5 hours ago" },
  { id: 3, name: "acme-corp/infra", branch: "main", linkedProject: "Tech Debt", prs: 0, commits: 3, issues: 1, lastPush: "Yesterday" },
];

const PRs = [
  { id: 82, status: "open", title: "Add STOMP WebSocket broadcast with Redis fallback", task: "HS-044", author: "MV", time: "2h ago", repo: "acme-corp/backend", branch: "feat/stomp-broadcast" },
  { id: 79, status: "open", title: "Implement Tiptap editor with auto-save", task: "HS-042", author: "RS", time: "5h ago", repo: "acme-corp/frontend", branch: "feat/tiptap-editor" },
  { id: 76, status: "merged", title: "Setup Supabase Auth and JWT middleware", task: "HS-033", author: "DK", time: "Yesterday", repo: "acme-corp/backend", branch: "feat/supabase-auth" },
  { id: 74, status: "open", title: "GitHub webhook HMAC validation", task: "HS-039", author: "SA", time: "2 days ago", repo: "acme-corp/backend", branch: "feat/webhook-hmac" },
  { id: 71, status: "merged", title: "Org and workspace CRUD REST APIs", task: "HS-031", author: "RK", time: "3 days ago", repo: "acme-corp/backend", branch: "feat/org-crud" },
];

const COMMITS = [
  { hash: "a4f2e91", message: "Add STOMP broker config for WebSocket", task: "HS-044", author: "MV", time: "2h ago" },
  { hash: "b3c1d82", message: "Fix JWT token refresh on expiry", task: "HS-041", author: "RK", time: "4h ago" },
  { hash: "c2e9f71", message: "Add Tiptap extensions for code blocks", task: "HS-042", author: "RS", time: "6h ago" },
  { hash: "d1f8e60", message: "Configure Cloudflare R2 upload flow", task: null, author: "DK", time: "Yesterday" },
  { hash: "e0g7d59", message: "Setup Spring @Async thread pool", task: null, author: "SA", time: "Yesterday" },
];

const ACTIVITY = [
  { type: "user", author: "MV", action: "opened PR #82 in acme-corp/backend", time: "2h ago" },
  { type: "system", action: "PR #82 linked to HS-044 automatically", time: "2h ago" },
  { type: "user", author: "DK", action: "merged PR #76 — HS-033 auto-closed", time: "Yesterday" },
  { type: "user", author: "RK", action: "pushed 3 commits to feat/org-crud", time: "Yesterday" },
  { type: "user", author: "SA", action: "opened issue #44 — Rate limiting spike", time: "2d ago" },
  { type: "system", action: "Issue #44 created as HS-038 in Sprint 3", time: "2d ago" },
];

const ISSUES = [
  { number: 44, title: "Rate limiting spike on API gateway", task: "HS-038", status: "Backlog" },
  { number: 41, title: "Webhook delivery retry logic missing", task: null },
  { number: 38, title: "Memory leak in STOMP connection pool", task: null },
];

const RULES = [
  { id: 1, desc: "Close task when linked PR is merged", scope: "All repos", active: true },
  { id: 2, desc: "Create task when GitHub issue opened", scope: "acme-corp/backend only", active: true },
  { id: 3, desc: "Link commit to task when HS-XXX in message", scope: "All repos", active: true },
  { id: 4, desc: "Add timeline entry when PR review submitted", scope: "All repos", active: true },
];

export default function GitHubPage() {
  const [isConnected, setIsConnected] = useState(true);

  if (!isConnected) {
    return <EmptyState onConnect={() => setIsConnected(true)} />;
  }

  return (
    <div className="flex flex-col h-full bg-[#201F21] overflow-hidden">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 h-11 flex items-center justify-between px-4 bg-[#0E0E10]/80 backdrop-blur-sm border-b border-zinc-800/50 flex-shrink-0">
        <div className="flex items-center gap-3">
          <GitGraph className="h-4 w-4 text-zinc-400" strokeWidth={1.5} />
          <span className="text-sm font-medium text-[#E5E1E4]">GitHub</span>
          <div className="h-4 w-px bg-zinc-700 mx-1" />
          <span className="text-xs text-zinc-400">Engineering workspace</span>
        </div>
        <button className="h-7 px-3 flex items-center gap-2 rounded-md bg-[linear-gradient(145deg,#CABEFF,#947DFF)] text-black text-[10px] font-bold uppercase tracking-wider hover:opacity-90 transition-opacity">
          <GitBranch className="h-3 w-3" strokeWidth={2} />
          Connect Repository
        </button>
      </header>

      <div className="flex-1 overflow-y-auto scrollbar-none">
        {/* Connection Success Banner */}
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg mx-6 mt-4 px-4 py-2 flex items-center gap-3">
          <CheckCircle className="h-3.5 w-3.5 text-green-400" strokeWidth={2} />
          <div className="text-sm text-zinc-300">
            Connected to <span className="font-medium text-[#E5E1E4]">acme-corp</span> GitHub organisation
          </div>
          <div className="ml-auto flex items-center gap-4">
            <span className="text-[10px] text-zinc-500">Synced 2 minutes ago</span>
            <button className="text-xs text-red-400 hover:text-red-300 transition-colors" onClick={() => setIsConnected(false)}>
              Disconnect
            </button>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-6 p-6">
          {/* Left Column */}
          <div className="space-y-6">
            
            {/* Linked Repositories */}
            <section>
              <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Linked Repositories</h2>
              <div className="grid grid-cols-1 gap-3">
                {REPOS.map(repo => (
                  <div key={repo.id} className="bg-[#272629] border border-zinc-800/50 rounded-lg p-4 hover:border-zinc-700 transition-colors group">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <GitFork className="h-3.5 w-3.5 text-zinc-400" strokeWidth={1.5} />
                        <span className="text-sm font-medium text-[#E5E1E4] font-mono">{repo.name}</span>
                        <span className="bg-zinc-800 rounded-sm text-[10px] text-zinc-400 px-1.5 py-0.5 ml-1">
                          {repo.branch}
                        </span>
                      </div>
                      <Badge variant="outline" className="bg-[#7C5CFC]/10 border-[#7C5CFC]/20 text-[#7C5CFC] text-[10px] font-medium rounded-sm px-2 py-0">
                        {repo.linkedProject}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 text-[11px] text-zinc-500">
                      <div className="flex items-center gap-1.5">
                        <GitPullRequest className="h-3.5 w-3.5" strokeWidth={1.5} />
                        {repo.prs} open PRs
                      </div>
                      <div className="flex items-center gap-1.5">
                        <GitCommit className="h-3.5 w-3.5" strokeWidth={1.5} />
                        {repo.commits} commits this week
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Circle className="h-3 w-3" strokeWidth={1.5} />
                        {repo.issues} open issues
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-zinc-800/50 flex items-center justify-between">
                      <span className="text-[10px] text-zinc-500 italic">Last push: {repo.lastPush}</span>
                      <button className="text-[10px] font-medium text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        Unlink
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button className="mt-3 w-full h-10 flex items-center justify-center gap-2 border border-dashed border-zinc-700/50 rounded-lg text-xs text-zinc-500 hover:border-zinc-600 hover:text-zinc-400 transition-all">
                <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
                Link another repository
              </button>
            </section>

            {/* Pull Requests */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Pull Requests</h2>
                <div className="flex items-center gap-1">
                  {['All', 'Open', 'Merged', 'Closed'].map((filter, i) => (
                    <button 
                      key={filter}
                      className={cn(
                        "px-2.5 py-1 text-[10px] font-medium rounded-md transition-colors",
                        i === 1 ? "bg-zinc-700 text-[#E5E1E4]" : "text-zinc-500 hover:text-zinc-300"
                      )}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                {PRs.map(pr => (
                  <div key={pr.id} className="bg-[#272629] border border-zinc-800/50 rounded-md p-3 hover:border-zinc-700 transition-colors cursor-pointer group">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {pr.status === 'open' ? (
                          <GitPullRequest className="h-4 w-4 text-green-400" strokeWidth={1.5} />
                        ) : pr.status === 'merged' ? (
                          <GitMerge className="h-4 w-4 text-[#7C5CFC]" strokeWidth={1.5} />
                        ) : (
                          <GitPullRequestClosed className="h-4 w-4 text-red-400" strokeWidth={1.5} />
                        )}
                        <span className="text-[10px] font-mono text-zinc-500 shrink-0">PR #{pr.id}</span>
                        <h3 className="text-sm text-[#E5E1E4] font-medium truncate max-w-[400px]">{pr.title}</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="bg-zinc-800 text-[10px] font-mono text-zinc-400 px-1.5 py-0.5 rounded-sm border border-zinc-700/50">
                          {pr.task}
                        </div>
                        <Avatar className="h-6 w-6 rounded-md">
                          <AvatarFallback className="bg-zinc-800 text-[10px] text-zinc-400 rounded-md">{pr.author}</AvatarFallback>
                        </Avatar>
                        <span className="text-[10px] text-zinc-500 ml-1">{pr.time}</span>
                      </div>
                    </div>
                    <div className="pl-[28px] mt-1 flex items-center gap-2 text-[10px] text-zinc-500">
                      <span className="font-mono">{pr.repo}</span>
                      <span className="h-0.5 w-0.5 rounded-full bg-zinc-700" />
                      <span className="text-zinc-400">{pr.branch}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Recent Commits */}
            <section>
              <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Recent Commits</h2>
              <div className="space-y-0.5">
                {COMMITS.map(commit => (
                  <div key={commit.hash} className="group h-10 flex items-center gap-4 px-2 hover:bg-zinc-800/40 rounded-md transition-colors cursor-default">
                    <GitCommit className="h-3.5 w-3.5 text-zinc-600 group-hover:text-zinc-500" strokeWidth={1.5} />
                    <span className="w-14 shrink-0 font-mono text-[10px] text-zinc-600">{commit.hash}</span>
                    <span className="flex-1 text-sm text-zinc-400 truncate group-hover:text-zinc-200">{commit.message}</span>
                    {commit.task && (
                      <span className="font-mono text-[10px] text-zinc-600 group-hover:text-zinc-500">{commit.task}</span>
                    )}
                    <Avatar className="h-5 w-5 rounded-md">
                      <AvatarFallback className="bg-zinc-800 text-[9px] text-zinc-500 rounded-md">{commit.author}</AvatarFallback>
                    </Avatar>
                    <span className="text-[10px] text-zinc-600 w-12 text-right">{commit.time}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Right Column */}
          <div className="space-y-8 border-l border-zinc-800/50 pl-6 h-fit sticky top-[60px]">
            
            {/* Activity Feed */}
            <section>
              <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Activity className="h-3 w-3" /> GitHub Activity
              </h2>
              <div className="relative space-y-6 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-px before:bg-zinc-800/50">
                {ACTIVITY.map((item, i) => (
                  <div key={i} className="relative flex items-start gap-4">
                    {item.type === 'user' ? (
                      <Avatar className="h-6 w-6 rounded-md z-10">
                        <AvatarFallback className="bg-zinc-800 text-[10px] text-zinc-400 rounded-md">{item.author}</AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="h-6 w-6 flex items-center justify-center z-10">
                        <div className="h-1.5 w-1.5 rounded-full bg-[#7C5CFC]" />
                      </div>
                    )}
                    <div className="flex flex-col gap-0.5 pt-0.5 flex-1 min-w-0">
                      <p className={cn("text-xs leading-tight min-w-0 break-words", item.type === 'system' ? "text-zinc-500 italic" : "text-zinc-300")}>
                        {item.action}
                      </p>
                      <span className="text-[10px] text-zinc-600">{item.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Open Issues */}
            <section>
              <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Open Issues</h2>
              <div className="space-y-2">
                {ISSUES.map(issue => (
                  <div key={issue.number} className="bg-[#272629] border border-zinc-800/50 rounded-md p-3 hover:border-zinc-700 transition-colors">
                    <div className="flex items-start gap-3">
                      <Circle className="h-3.5 w-3.5 text-green-400 mt-0.5" strokeWidth={2} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-[10px] text-zinc-500 shrink-0">#{issue.number}</span>
                          <h4 className="text-xs text-zinc-300 truncate">{issue.title}</h4>
                        </div>
                        <div className="flex items-center justify-between">
                          {issue.task ? (
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[10px] text-zinc-500">{issue.task}</span>
                              <span className="text-[9px] text-zinc-600 uppercase font-bold tracking-tighter bg-zinc-800 px-1 rounded-sm">{issue.status}</span>
                            </div>
                          ) : (
                            <button className="text-[10px] font-medium text-[#7C5CFC] hover:text-[#947DFF] transition-colors">
                              Create task
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Automation Rules */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                  <Settings2 className="h-3 w-3" /> Automation
                </h2>
                <button className="text-[10px] text-zinc-500 hover:text-zinc-300">+ Add rule</button>
              </div>
              <div className="space-y-1">
                {RULES.map(rule => (
                  <div key={rule.id} className="group flex items-center gap-3 p-2 rounded-md hover:bg-zinc-800/30 transition-colors">
                    <Switch 
                      defaultChecked={rule.active} 
                      className="data-checked:bg-[#7C5CFC] data-unchecked:bg-zinc-700 border-none"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-zinc-300 truncate">{rule.desc}</p>
                      <span className="text-[9px] text-zinc-600 uppercase font-medium">{rule.scope}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onConnect }: { onConnect: () => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center p-8 bg-[#201F21]">
      <div className="flex flex-col items-center max-w-sm text-center">
        <div className="w-16 h-16 rounded-2xl bg-zinc-800/50 flex items-center justify-center mb-6 border border-zinc-700/30 shadow-2xl shadow-black/20">
          <GitGraph className="h-8 w-8 text-zinc-600" strokeWidth={1} />
        </div>
        <h1 className="text-lg font-medium text-[#E5E1E4] mb-2 tracking-tight">Connect your GitHub organisation</h1>
        <p className="text-sm text-zinc-500 mb-8 leading-relaxed">
          Link repositories to projects, sync issues and PRs, and automate task workflows with the Hivespace engine.
        </p>
        
        <button 
          onClick={onConnect}
          className="w-full h-11 flex items-center justify-center gap-3 rounded-lg bg-[linear-gradient(145deg,#CABEFF,#947DFF)] text-black text-sm font-bold shadow-xl shadow-violet-500/10 hover:opacity-95 transition-all group"
        >
          <GitGraph className="h-5 w-5" strokeWidth={2} />
          Connect GitHub Organisation
        </button>
        
        <div className="mt-6 flex items-center gap-1.5 text-[10px] text-zinc-600">
          <AlertCircle className="h-3 w-3" />
          Requires Organisation Admin permission
        </div>
      </div>
    </div>
  );
}
