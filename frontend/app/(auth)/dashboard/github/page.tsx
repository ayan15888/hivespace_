"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  GitGraph as Github, 
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
  AlertCircle,
  Loader2,
  RefreshCw,
  ExternalLink,
  Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useOrgStore } from "@/store/orgStore";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { useProjectStore } from "@/store/projectStore";
import { gooeyToast as toast } from "@/components/ui/goey-toaster";
import { 
  getConnectedOrgs, 
  getLinkedRepos, 
  unlinkRepository, 
  getRepoPRs, 
  getRepoCommits, 
  getRepoIssues,
  GithubConnectionResponse,
  GithubRepoLinkResponse 
} from "@/lib/api/github";

interface UnifiedPR {
  id: number;
  number: number;
  status: "open" | "merged" | "closed";
  title: string;
  task: string | null;
  author: string;
  time: string;
  repo: string;
  branch: string;
  url: string;
  dateObj: Date;
}

interface UnifiedCommit {
  hash: string;
  message: string;
  task: string | null;
  author: string;
  time: string;
  repo: string;
  url: string;
  dateObj: Date;
}

interface UnifiedIssue {
  number: number;
  title: string;
  task: string | null;
  status: string;
  repo: string;
  url: string;
  dateObj: Date;
}

interface UnifiedActivity {
  type: "user" | "system";
  author?: string;
  action: string;
  time: string;
  dateObj: Date;
}

export default function GitHubPage() {
  const router = useRouter();
  const activeOrg = useOrgStore((state) => state.activeOrg);
  const activeWorkspace = useWorkspaceStore((state) => state.activeWorkspace);
  const projects = useProjectStore((state) => state.projects);
  const fetchProjects = useProjectStore((state) => state.fetchProjects);

  const [connections, setConnections] = useState<GithubConnectionResponse[]>([]);
  const [linkedRepos, setLinkedRepos] = useState<GithubRepoLinkResponse[]>([]);
  const [prs, setPrs] = useState<UnifiedPR[]>([]);
  const [commits, setCommits] = useState<UnifiedCommit[]>([]);
  const [issues, setIssues] = useState<UnifiedIssue[]>([]);
  const [activities, setActivities] = useState<UnifiedActivity[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [prFilter, setPrFilter] = useState<"All" | "Open" | "Merged" | "Closed">("All");

  // Fetch workspaces & projects on mount
  useEffect(() => {
    if (activeWorkspace?.id) {
      fetchProjects(activeWorkspace.id);
    }
  }, [activeWorkspace, fetchProjects]);

  const loadData = async (showBackgroundLoader = false) => {
    if (!activeOrg?.id) return;
    if (showBackgroundLoader) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      // 1. Fetch connected orgs
      const orgConns = await getConnectedOrgs(activeOrg.id);
      setConnections(orgConns);

      if (orgConns.length === 0) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // 2. Fetch repo links across projects
      const allLinks: GithubRepoLinkResponse[] = [];
      for (const proj of projects) {
        try {
          const links = await getLinkedRepos(proj.id);
          allLinks.push(...links);
        } catch (e) {
          console.error(`Failed to fetch links for project ${proj.id}`, e);
        }
      }
      setLinkedRepos(allLinks);

      // 3. Fetch PRs, Commits, Issues from each linked repo in parallel
      const prList: UnifiedPR[] = [];
      const commitList: UnifiedCommit[] = [];
      const issueList: UnifiedIssue[] = [];

      await Promise.all(
        allLinks.map(async (link) => {
          try {
            const [rawPrs, rawCommits, rawIssues] = await Promise.all([
              getRepoPRs(link.projectId, link.githubRepoFullName),
              getRepoCommits(link.projectId, link.githubRepoFullName),
              getRepoIssues(link.projectId, link.githubRepoFullName),
            ]);

            // Parse PRs
            rawPrs?.forEach((pr: any) => {
              const dateObj = new Date(pr.created_at || pr.updated_at);
              const taskMatch = pr.title.match(/[A-Za-z]+-\d+/) || pr.head?.ref?.match(/[A-Za-z]+-\d+/);
              const task = taskMatch ? taskMatch[0].toUpperCase() : null;

              let status: "open" | "merged" | "closed" = "open";
              if (pr.merged_at) {
                status = "merged";
              } else if (pr.state === "closed") {
                status = "closed";
              }

              prList.push({
                id: pr.number,
                number: pr.number,
                status,
                title: pr.title,
                task,
                author: pr.user?.login || "Unknown",
                time: formatRelativeTime(dateObj),
                repo: link.githubRepoFullName,
                branch: pr.head?.ref || "main",
                url: pr.html_url,
                dateObj,
              });
            });

            // Parse Commits
            rawCommits?.forEach((c: any) => {
              const dateObj = new Date(c.commit?.author?.date);
              const taskMatch = c.commit?.message?.match(/[A-Za-z]+-\d+/);
              const task = taskMatch ? taskMatch[0].toUpperCase() : null;

              commitList.push({
                hash: c.sha ? c.sha.substring(0, 7) : "unknown",
                message: c.commit?.message?.split("\n")[0] || "",
                task,
                author: c.author?.login || c.commit?.author?.name || "Unknown",
                time: formatRelativeTime(dateObj),
                repo: link.githubRepoFullName,
                url: c.html_url || `https://github.com/${link.githubRepoFullName}/commit/${c.sha}`,
                dateObj,
              });
            });

            // Parse Issues
            rawIssues?.forEach((issue: any) => {
              // GitHub issues endpoint returns PRs too; filter them out
              if (issue.pull_request) return;

              const dateObj = new Date(issue.created_at || issue.updated_at);
              const taskMatch = issue.title.match(/[A-Za-z]+-\d+/) || issue.body?.match(/[A-Za-z]+-\d+/);
              const task = taskMatch ? taskMatch[0].toUpperCase() : null;

              issueList.push({
                number: issue.number,
                title: issue.title,
                task,
                status: issue.state === "open" ? "Open" : "Closed",
                repo: link.githubRepoFullName,
                url: issue.html_url,
                dateObj,
              });
            });
          } catch (err) {
            console.error(`Error loading details for ${link.githubRepoFullName}:`, err);
          }
        })
      );

      // Sort outputs descending by date
      prList.sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());
      commitList.sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());
      issueList.sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());

      setPrs(prList);
      setCommits(commitList);
      setIssues(issueList);

      // 4. Generate dynamic activity timeline from combined PRs and Commits
      const actList: UnifiedActivity[] = [];
      
      prList.forEach(pr => {
        actList.push({
          type: "user",
          author: pr.author,
          action: `opened PR #${pr.number} in ${pr.repo}: "${pr.title}"`,
          time: pr.time,
          dateObj: pr.dateObj
        });

        if (pr.task) {
          actList.push({
            type: "system",
            action: `PR #${pr.number} linked to ${pr.task} automatically`,
            time: pr.time,
            dateObj: new Date(pr.dateObj.getTime() + 1000) // slight delay to order below
          });
        }

        if (pr.status === "merged") {
          actList.push({
            type: "user",
            author: pr.author,
            action: `merged PR #${pr.number} in ${pr.repo} — ${pr.task || "workflow"} completed`,
            time: pr.time,
            dateObj: pr.dateObj
          });
        }
      });

      commitList.forEach(c => {
        actList.push({
          type: "user",
          author: c.author,
          action: `pushed commit ${c.hash} to ${c.repo}: "${c.message}"`,
          time: c.time,
          dateObj: c.dateObj
        });
      });

      actList.sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());
      setActivities(actList.slice(0, 15)); // top 15 events

    } catch (err: any) {
      toast.error(err.message || "Failed to sync GitHub dashboard data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeOrg, projects]);

  const handleUnlink = async (linkId: string, projectId: string, repoName: string) => {
    if (!confirm(`Are you sure you want to unlink ${repoName}?`)) return;
    try {
      await unlinkRepository(linkId, projectId);
      toast.success(`Unlinked repository: ${repoName}`);
      loadData(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to unlink repository");
    }
  };

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    return `${diffDays} days ago`;
  };

  const filteredPrs = prs.filter(pr => {
    if (prFilter === "All") return true;
    if (prFilter === "Open") return pr.status === "open";
    if (prFilter === "Merged") return pr.status === "merged";
    if (prFilter === "Closed") return pr.status === "closed";
    return true;
  });

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-hs-main text-[#E5E1E4]">
        <Loader2 className="h-10 w-10 animate-spin text-[#7C5CFC] mb-4" />
        <h2 className="text-sm font-medium">Syncing live GitHub data...</h2>
      </div>
    );
  }

  if (connections.length === 0) {
    return <EmptyState onConnect={() => router.push("/settings/github")} />;
  }

  return (
    <div className="flex flex-col h-full bg-hs-main overflow-hidden text-[#E5E1E4]">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 h-11 flex items-center justify-between px-4 bg-background/80 backdrop-blur-sm border-b border-border/50 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Github className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
          <span className="text-sm font-medium text-foreground">GitHub</span>
          <div className="h-4 w-px bg-border/50 mx-1" />
          <span className="text-xs text-muted-foreground">{activeWorkspace?.name || "Workspace"}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="xs"
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="text-zinc-400 hover:text-white h-7 px-2"
          >
            <RefreshCw className={cn("h-3.5 w-3.5 mr-1", refreshing && "animate-spin")} />
            Refresh
          </Button>
          <button 
            onClick={() => router.push("/settings/github")}
            className="h-7 px-3 flex items-center gap-2 rounded-md bg-[linear-gradient(145deg,#CABEFF,#947DFF)] text-black text-[10px] font-bold uppercase tracking-wider hover:opacity-90 transition-opacity"
          >
            <Settings className="h-3 w-3" strokeWidth={2} />
            Configure
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto scrollbar-none">
        {/* Connection Success Banner */}
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg mx-6 mt-4 px-4 py-2.5 flex items-center gap-3">
          <CheckCircle className="h-4 w-4 text-emerald-400" strokeWidth={2} />
          <div className="text-sm text-zinc-300">
            Connected to <span className="font-semibold text-white">{connections[0]?.githubOrgName}</span> GitHub organisation
          </div>
          <div className="ml-auto flex items-center gap-4">
            <span className="text-[10px] text-zinc-500">
              Synced {formatRelativeTime(new Date())}
            </span>
            <button 
              className="text-xs text-zinc-400 hover:text-white transition-colors underline underline-offset-2"
              onClick={() => router.push("/settings/github")}
            >
              Manage Orgs
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
                {linkedRepos.length === 0 ? (
                  <div className="text-center py-6 border border-dashed border-white/5 rounded-lg bg-zinc-900/10">
                    <p className="text-xs text-zinc-500">No repositories linked to projects.</p>
                    <Button 
                      onClick={() => router.push("/settings/github")}
                      variant="link" 
                      className="text-[#7C5CFC] text-xs h-auto p-0 mt-1"
                    >
                      Link a repository
                    </Button>
                  </div>
                ) : (
                  linkedRepos.map(link => {
                    const project = projects.find(p => p.id === link.projectId);
                    // Filter repo stats
                    const repoPrs = prs.filter(p => p.repo === link.githubRepoFullName && p.status === "open").length;
                    const repoCommits = commits.filter(c => c.repo === link.githubRepoFullName).length;
                    const repoIssues = issues.filter(i => i.repo === link.githubRepoFullName && i.status === "Open").length;

                    return (
                      <div key={link.id} className="bg-zinc-950/40 border border-white/5 rounded-lg p-4 hover:border-white/10 transition-colors group">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <GitFork className="h-3.5 w-3.5 text-zinc-400" strokeWidth={1.5} />
                            <a 
                              href={`https://github.com/${link.githubRepoFullName}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sm font-semibold text-white hover:underline flex items-center gap-1"
                            >
                              {link.githubRepoFullName}
                              <ExternalLink className="h-3 w-3 opacity-50" />
                            </a>
                            <span className="bg-zinc-900 rounded-sm text-[10px] text-zinc-500 px-1.5 py-0.5 ml-1">
                              main
                            </span>
                          </div>
                          <Badge variant="outline" className="bg-primary/10 border-primary/20 text-[#7C5CFC] text-[10px] font-semibold rounded-sm px-2 py-0.5">
                            {project ? project.name : "Active Project"}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-4 text-[11px] text-zinc-400 mt-3">
                          <div className="flex items-center gap-1.5">
                            <GitPullRequest className="h-3.5 w-3.5 text-emerald-400" strokeWidth={1.5} />
                            {repoPrs} open PRs
                          </div>
                          <div className="flex items-center gap-1.5">
                            <GitCommit className="h-3.5 w-3.5 text-[#7C5CFC]" strokeWidth={1.5} />
                            {repoCommits} recent commits
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Circle className="h-3 w-3 text-amber-500" strokeWidth={1.5} />
                            {repoIssues} open issues
                          </div>
                        </div>

                        <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                          <span className="text-[10px] text-zinc-500">
                            Linked on {new Date(link.linkedAt).toLocaleDateString()}
                          </span>
                          <button 
                            onClick={() => handleUnlink(link.id, link.projectId, link.githubRepoFullName)}
                            className="text-[10px] font-medium text-red-400 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-300"
                          >
                            Unlink Repository
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            {/* Pull Requests */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Pull Requests</h2>
                <div className="flex items-center gap-1 bg-zinc-900/40 p-0.5 rounded-md border border-white/5">
                  {(["All", "Open", "Merged", "Closed"] as const).map((filter) => (
                    <button 
                      key={filter}
                      onClick={() => setPrFilter(filter)}
                      className={cn(
                        "px-2.5 py-1 text-[10px] font-medium rounded-md transition-colors",
                        prFilter === filter ? "bg-zinc-800 text-white font-semibold" : "text-zinc-400 hover:text-white"
                      )}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                {filteredPrs.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-white/5 rounded-lg bg-zinc-900/10">
                    <p className="text-xs text-zinc-500">No pull requests found matching filter.</p>
                  </div>
                ) : (
                  filteredPrs.map(pr => (
                    <a 
                      key={pr.id} 
                      href={pr.url}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-zinc-950/30 border border-white/5 rounded-md p-3 hover:border-white/10 transition-colors cursor-pointer flex flex-col gap-1.5"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {pr.status === "open" ? (
                            <GitPullRequest className="h-4 w-4 text-emerald-400 shrink-0" strokeWidth={1.5} />
                          ) : pr.status === "merged" ? (
                            <GitMerge className="h-4 w-4 text-[#7C5CFC] shrink-0" strokeWidth={1.5} />
                          ) : (
                            <GitPullRequestClosed className="h-4 w-4 text-red-400 shrink-0" strokeWidth={1.5} />
                          )}
                          <span className="text-[10px] text-zinc-500 shrink-0">#{pr.number}</span>
                          <h3 className="text-sm text-zinc-200 font-medium truncate hover:underline">{pr.title}</h3>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {pr.task && (
                            <div className="bg-[#7C5CFC]/10 text-[#7C5CFC] text-[9px] font-bold px-1.5 py-0.5 rounded-sm border border-[#7C5CFC]/20">
                              {pr.task}
                            </div>
                          )}
                          <Avatar className="h-5 w-5 rounded-md">
                            <AvatarFallback className="bg-zinc-800 text-[9px] text-zinc-400 rounded-md font-semibold">
                              {pr.author.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-[10px] text-zinc-500">{pr.time}</span>
                        </div>
                      </div>
                      <div className="pl-[26px] flex items-center gap-2 text-[10px] text-zinc-500">
                        <span className="font-semibold text-zinc-400">{pr.repo}</span>
                        <span className="h-0.5 w-0.5 rounded-full bg-zinc-700" />
                        <span>branch: {pr.branch}</span>
                      </div>
                    </a>
                  ))
                )}
              </div>
            </section>

            {/* Recent Commits */}
            <section>
              <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Recent Commits</h2>
              <div className="space-y-1">
                {commits.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-white/5 rounded-lg bg-zinc-900/10">
                    <p className="text-xs text-zinc-500">No commits found.</p>
                  </div>
                ) : (
                  commits.map(commit => (
                    <a 
                      key={commit.hash} 
                      href={commit.url}
                      target="_blank"
                      rel="noreferrer"
                      className="group h-10 flex items-center gap-4 px-3 hover:bg-white/[0.02] rounded-md transition-colors cursor-pointer"
                    >
                      <GitCommit className="h-3.5 w-3.5 text-zinc-500 group-hover:text-white transition-colors" strokeWidth={1.5} />
                      <span className="w-14 shrink-0 text-[10px] text-zinc-500 font-mono">{commit.hash}</span>
                      <span className="flex-1 text-sm text-zinc-300 truncate hover:underline">{commit.message}</span>
                      {commit.task && (
                        <span className="text-[10px] text-[#7C5CFC] font-semibold bg-[#7C5CFC]/10 px-1.5 py-0.5 rounded border border-[#7C5CFC]/20 shrink-0">
                          {commit.task}
                        </span>
                      )}
                      <Avatar className="h-5 w-5 rounded-md shrink-0">
                        <AvatarFallback className="bg-zinc-850 text-[9px] text-zinc-500 rounded-md">
                          {commit.author.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-[10px] text-zinc-500 w-12 text-right shrink-0">{commit.time}</span>
                    </a>
                  ))
                )}
              </div>
            </section>
          </div>

          {/* Right Column */}
          <div className="space-y-8 border-l border-white/5 pl-6 h-fit sticky top-[60px]">
            
            {/* Activity Feed */}
            <section>
              <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Activity className="h-3.5 w-3.5 text-[#7C5CFC]" /> GitHub Activity
              </h2>
              <div className="relative space-y-5 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-px before:bg-zinc-800/40">
                {activities.length === 0 ? (
                  <p className="text-xs text-zinc-500 italic pl-3">No activity logged.</p>
                ) : (
                  activities.map((item, i) => (
                    <div key={i} className="relative flex items-start gap-3">
                      {item.type === "user" ? (
                        <Avatar className="h-6 w-6 rounded-md z-10 shrink-0">
                          <AvatarFallback className="bg-zinc-850 text-[9px] text-zinc-400 rounded-md font-semibold">
                            {item.author ? item.author.substring(0, 2).toUpperCase() : "U"}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className="h-6 w-6 flex items-center justify-center z-10 shrink-0">
                          <div className="h-1.5 w-1.5 rounded-full bg-[#7C5CFC] ring-4 ring-[#7C5CFC]/20" />
                        </div>
                      )}
                      <div className="flex flex-col gap-0.5 pt-0.5 flex-1 min-w-0">
                        <p className={cn("text-xs leading-normal", item.type === "system" ? "text-zinc-500 italic" : "text-zinc-300")}>
                          {item.author && <span className="font-semibold text-zinc-200 mr-1">{item.author}</span>}
                          {item.action}
                        </p>
                        <span className="text-[9px] text-zinc-650">{item.time}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Open Issues */}
            <section>
              <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Open Issues</h2>
              <div className="space-y-2">
                {issues.length === 0 ? (
                  <div className="text-center py-4 border border-dashed border-white/5 rounded-md bg-zinc-900/10">
                    <p className="text-xs text-zinc-500">No open issues found.</p>
                  </div>
                ) : (
                  issues.map(issue => (
                    <a 
                      key={issue.number} 
                      href={issue.url}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-zinc-950/30 border border-white/5 rounded-md p-3 hover:border-white/10 transition-colors flex items-start gap-2.5 cursor-pointer"
                    >
                      <Circle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" strokeWidth={2} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-[10px] text-zinc-500 shrink-0">#{issue.number}</span>
                          <h4 className="text-xs text-zinc-300 truncate hover:underline font-medium">{issue.title}</h4>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] text-zinc-500 truncate max-w-[120px]">{issue.repo}</span>
                          {issue.task ? (
                            <span className="text-[9px] text-[#7C5CFC] uppercase font-bold tracking-tight bg-[#7C5CFC]/10 px-1 rounded-sm">
                              {issue.task}
                            </span>
                          ) : (
                            <span className="text-[9px] text-zinc-500">Not linked</span>
                          )}
                        </div>
                      </div>
                    </a>
                  ))
                )}
              </div>
            </section>

            {/* Automation Rules (Static Context) */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                  <Settings2 className="h-3 w-3" /> Automation Rules
                </h2>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-2 rounded-md bg-zinc-950/20 border border-white/5">
                  <Switch defaultChecked className="data-[state=checked]:bg-[#7C5CFC]" disabled />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-zinc-300 truncate">Close task when PR merged</p>
                    <span className="text-[9px] text-zinc-500 uppercase font-medium">All repositories</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-2 rounded-md bg-zinc-950/20 border border-white/5">
                  <Switch defaultChecked className="data-[state=checked]:bg-[#7C5CFC]" disabled />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-zinc-300 truncate">Link commits to tasks</p>
                    <span className="text-[9px] text-zinc-500 uppercase font-medium">All repositories</span>
                  </div>
                </div>
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
    <div className="h-full flex flex-col items-center justify-center p-8 bg-hs-main text-[#E5E1E4]">
      <div className="flex flex-col items-center max-w-sm text-center">
        <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center mb-6 shadow-2xl">
          <Github className="h-8 w-8 text-zinc-400" strokeWidth={1} />
        </div>
        <h1 className="text-lg font-semibold text-white mb-2 tracking-tight">Connect your GitHub organization</h1>
        <p className="text-sm text-zinc-400 mb-8 leading-relaxed">
          Link repositories to projects, sync issues and PRs, and automate task workflows with the HiveSpace engine.
        </p>
        
        <button 
          onClick={onConnect}
          className="w-full h-11 flex items-center justify-center gap-3 rounded-lg bg-[linear-gradient(145deg,#CABEFF,#947DFF)] text-black text-sm font-bold shadow-xl shadow-violet-500/10 hover:opacity-95 transition-all group"
        >
          <Github className="h-5 w-5" strokeWidth={2} />
          Connect GitHub Organization
        </button>
        
        <div className="mt-6 flex items-center gap-1.5 text-[10px] text-zinc-500 justify-center">
          <AlertCircle className="h-3.5 w-3.5" />
          Requires Organization Admin permission
        </div>
      </div>
    </div>
  );
}
