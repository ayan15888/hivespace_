"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useOrgStore } from "@/store/orgStore";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { useProjectStore } from "@/store/projectStore";
import { 
  getConnectedOrgs, 
  connectOrg, 
  disconnectOrg, 
  getLinkedRepos, 
  linkRepository, 
  unlinkRepository,
  GithubConnectionResponse,
  GithubRepoLinkResponse 
} from "@/lib/api/github";
import { gooeyToast as toast } from "@/components/ui/goey-toaster";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  GitGraph as Github, 
  Plus, 
  Trash2, 
  Link as LinkIcon, 
  Loader2, 
  ExternalLink, 
  CheckCircle2, 
  AlertTriangle,
  GitFork,
  ArrowRight,
  RefreshCw,
  GitPullRequest
} from "lucide-react";

export default function GithubPage() {
  const searchParams = useSearchParams();
  const activeOrg = useOrgStore((state) => state.activeOrg);
  const activeWorkspace = useWorkspaceStore((state) => state.activeWorkspace);
  const projects = useProjectStore((state) => state.projects);
  const fetchProjects = useProjectStore((state) => state.fetchProjects);

  const [connections, setConnections] = useState<GithubConnectionResponse[]>([]);
  const [linkedRepos, setLinkedRepos] = useState<GithubRepoLinkResponse[]>([]);
  
  const [loadingConnections, setLoadingConnections] = useState(true);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Connection Dialog State
  const [isConnectDialogOpen, setIsConnectDialogOpen] = useState(false);
  const [orgNameInput, setOrgNameInput] = useState("");

  // Linking Form State
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [repoFullNameInput, setRepoFullNameInput] = useState("");

  const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID || "";
  const isClientIdConfigured = clientId && clientId !== "[your-client-id]";

  // 1. Fetch connected orgs
  const fetchConnections = async () => {
    if (!activeOrg?.id) return;
    setLoadingConnections(true);
    try {
      const data = await getConnectedOrgs(activeOrg.id);
      setConnections(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to load GitHub connections");
    } finally {
      setLoadingConnections(false);
    }
  };

  // 2. Fetch linked repos across all projects
  const fetchAllLinkedRepos = async () => {
    if (projects.length === 0) {
      setLinkedRepos([]);
      return;
    }
    setLoadingRepos(true);
    try {
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
    } catch (err: any) {
      toast.error(err.message || "Failed to load linked repositories");
    } finally {
      setLoadingRepos(false);
    }
  };

  // Fetch workspaces & projects on mount / change
  useEffect(() => {
    if (activeWorkspace?.id) {
      fetchProjects(activeWorkspace.id);
    }
  }, [activeWorkspace, fetchProjects]);

  useEffect(() => {
    fetchConnections();
  }, [activeOrg]);

  useEffect(() => {
    fetchAllLinkedRepos();
  }, [projects]);

  // Redirect to GitHub OAuth
  const startOAuthFlow = () => {
    if (!orgNameInput.trim()) {
      toast.error("Please enter a valid organization name");
      return;
    }
    if (!isClientIdConfigured) {
      toast.error("GitHub Client ID is not configured in .env");
      return;
    }

    localStorage.setItem("hivespace_github_connecting_org", orgNameInput.trim());
    setIsConnectDialogOpen(false);

    const redirectUri = `${window.location.origin}/auth/github/callback`;
    const oauthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=admin:repo_hook,repo,user&redirect_uri=${encodeURIComponent(redirectUri)}&state=${activeOrg?.id}`;
    
    window.location.href = oauthUrl;
  };

  const handleDisconnect = async (connectionId: string, orgName: string) => {
    if (!activeOrg?.id) return;
    setActionLoading(`disconnect-${connectionId}`);
    try {
      await disconnectOrg(connectionId, activeOrg.id);
      toast.success(`Disconnected GitHub organization: ${orgName}`);
      fetchConnections();
    } catch (err: any) {
      toast.error(err.message || "Failed to disconnect organization");
    } finally {
      setActionLoading(null);
    }
  };

  const handleLinkRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) {
      toast.error("Please select a project");
      return;
    }
    if (!repoFullNameInput.trim() || !repoFullNameInput.includes("/")) {
      toast.error("Please enter the full repository name (e.g. org/repo)");
      return;
    }

    setActionLoading("linking");
    try {
      await linkRepository(selectedProjectId, repoFullNameInput.trim());
      toast.success("Repository linked successfully!");
      setRepoFullNameInput("");
      fetchAllLinkedRepos();
    } catch (err: any) {
      toast.error(err.message || "Failed to link repository");
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnlink = async (linkId: string, projectId: string, repoName: string) => {
    setActionLoading(`unlink-${linkId}`);
    try {
      await unlinkRepository(linkId, projectId);
      toast.success(`Unlinked repository: ${repoName}`);
      fetchAllLinkedRepos();
    } catch (err: any) {
      toast.error(err.message || "Failed to unlink repository");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="container max-w-5xl py-8 px-6 space-y-8 text-[#E5E1E4]">
      {/* Page Header */}
      <div className="flex flex-col gap-2 border-b border-white/5 pb-6">
        <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white via-[#E5E1E4] to-zinc-400 bg-clip-text text-transparent flex items-center gap-2">
          <Github className="h-7 w-7 text-white" />
          GitHub Integration
        </h1>
        <p className="text-sm text-zinc-400">
          Connect your GitHub Organizations and link repositories to projects to sync branch activities, pull requests, issues, and deployments.
        </p>
      </div>

      {/* Warning if Client ID is not configured */}
      {!isClientIdConfigured && (
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-3">
            <AlertTriangle className="h-6 w-6 text-amber-400" />
            <div>
              <CardTitle className="text-base text-amber-300 font-semibold">Configuration Required</CardTitle>
              <CardDescription className="text-zinc-400 text-xs">
                To connect to GitHub, please configure `NEXT_PUBLIC_GITHUB_CLIENT_ID` in your frontend `.env` and matching client keys in your backend `.env`.
              </CardDescription>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Left/Middle Columns: Connected Orgs & Linked Repos */}
        <div className="md:col-span-2 space-y-8">
          
          {/* Card 1: Connected Organizations */}
          <Card className="border-white/5 bg-zinc-950/40 backdrop-blur-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Github className="h-5 w-5" />
                  Connected Organizations
                </CardTitle>
                <CardDescription className="text-xs text-zinc-400 mt-1">
                  GitHub Organizations connected to this organization account.
                </CardDescription>
              </div>
              <Button 
                onClick={() => setIsConnectDialogOpen(true)}
                disabled={!isClientIdConfigured || actionLoading !== null}
                className="bg-[#7C5CFC] hover:bg-[#6849E2] text-white flex items-center gap-1 h-8 text-xs font-semibold px-3"
              >
                {actionLoading === "connecting" ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
                Connect Org
              </Button>
            </CardHeader>

            <CardContent>
              {loadingConnections ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-[#7C5CFC]" />
                </div>
              ) : connections.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-white/5 rounded-lg bg-zinc-900/10">
                  <Github className="h-10 w-10 text-zinc-600 mx-auto mb-2" />
                  <h3 className="text-sm font-medium text-zinc-400">No Connected Organizations</h3>
                  <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1">
                    Connect a GitHub organization or user account to start linking repositories.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {connections.map((conn) => (
                    <div 
                      key={conn.id} 
                      className="flex items-center justify-between p-4 rounded-lg bg-zinc-900/40 border border-white/5 hover:border-[#7C5CFC]/20 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-md bg-zinc-800 border border-white/5">
                          <Github className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">{conn.githubOrgName}</span>
                            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                              <CheckCircle2 className="h-2.5 w-2.5" /> Connected
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-500 mt-0.5">
                            Connected by {conn.connectedByUsername || "Unknown"} on {new Date(conn.connectedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={actionLoading !== null}
                        onClick={() => handleDisconnect(conn.id, conn.githubOrgName)}
                        className="h-8 text-xs font-medium px-2.5"
                      >
                        {actionLoading === `disconnect-${conn.id}` ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card 2: Linked Repositories */}
          <Card className="border-white/5 bg-zinc-950/40 backdrop-blur-md">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <LinkIcon className="h-5 w-5 text-[#7C5CFC]" />
                  Linked Repositories
                </CardTitle>
                <CardDescription className="text-xs text-zinc-400 mt-1">
                  Repositories linked to specific Hivespace projects under this workspace.
                </CardDescription>
              </div>
              {linkedRepos.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="icon-xs"
                  onClick={fetchAllLinkedRepos}
                  disabled={loadingRepos}
                  className="text-zinc-400 hover:text-white"
                >
                  <RefreshCw className={`h-3 w-3 ${loadingRepos ? 'animate-spin' : ''}`} />
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {loadingRepos ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-[#7C5CFC]" />
                </div>
              ) : linkedRepos.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-white/5 rounded-lg bg-zinc-900/10">
                  <LinkIcon className="h-10 w-10 text-zinc-600 mx-auto mb-2" />
                  <h3 className="text-sm font-medium text-zinc-400">No Linked Repositories</h3>
                  <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1">
                    Link repositories on the right to start syncing repository activities.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-white/5 text-zinc-500 font-medium">
                        <th className="py-2 px-3">GitHub Repository</th>
                        <th className="py-2 px-3">Hivespace Project</th>
                        <th className="py-2 px-3">Linked By</th>
                        <th className="py-2 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {linkedRepos.map((link) => {
                        const project = projects.find((p) => p.id === link.projectId);
                        return (
                          <tr 
                            key={link.id} 
                            className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                          >
                            <td className="py-3 px-3 font-semibold text-zinc-200 flex items-center gap-1.5">
                              <GitFork className="h-3.5 w-3.5 text-zinc-500" />
                              <a 
                                href={`https://github.com/${link.githubRepoFullName}`} 
                                target="_blank" 
                                rel="noreferrer"
                                className="hover:underline flex items-center gap-1"
                              >
                                {link.githubRepoFullName}
                                <ExternalLink className="h-3 w-3 opacity-50" />
                              </a>
                            </td>
                            <td className="py-3 px-3">
                              <span className="bg-zinc-800 border border-white/5 text-zinc-300 px-2 py-0.5 rounded font-medium">
                                {project ? project.name : "Unknown Project"}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-zinc-400">
                              {link.linkedByUsername || "System"}
                            </td>
                            <td className="py-3 px-3 text-right">
                              <Button
                                variant="destructive"
                                size="xs"
                                disabled={actionLoading !== null}
                                onClick={() => handleUnlink(link.id, link.projectId, link.githubRepoFullName)}
                                className="h-7 text-[11px] font-medium"
                              >
                                {actionLoading === `unlink-${link.id}` ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  "Unlink"
                                )}
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Repository Linker Panel */}
        <div className="space-y-8">
          
          {/* Link Repository Form */}
          <Card className="border-white/5 bg-zinc-950/40 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Plus className="h-4.5 w-4.5 text-[#7C5CFC]" />
                Link New Repository
              </CardTitle>
              <CardDescription className="text-xs text-zinc-400 mt-1">
                Establish a webhook mapping to sync PRs and issues for a project.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {connections.length === 0 ? (
                <div className="p-4 border border-amber-500/20 bg-amber-500/5 rounded-lg text-center space-y-3">
                  <AlertTriangle className="h-8 w-8 text-amber-400 mx-auto" />
                  <p className="text-xs text-zinc-400">
                    You must connect a GitHub organization before you can link repositories.
                  </p>
                  <Button 
                    onClick={() => setIsConnectDialogOpen(true)}
                    className="w-full bg-amber-500/10 text-amber-300 border border-amber-500/20 hover:bg-amber-500/20 text-xs font-semibold h-8"
                  >
                    Connect Organization
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleLinkRepo} className="space-y-4">
                  
                  {/* Select Hivespace Project */}
                  <div className="space-y-2">
                    <label className="text-xs text-zinc-400 font-semibold block">1. Select Project</label>
                    <Select 
                      value={selectedProjectId} 
                      onValueChange={setSelectedProjectId}
                    >
                      <SelectTrigger className="w-full bg-zinc-900 border-white/10 text-xs text-zinc-300 focus:ring-[#7C5CFC]">
                        <SelectValue placeholder="Choose a project" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-950 border-white/10 text-zinc-200">
                        {projects.map((proj) => (
                          <SelectItem key={proj.id} value={proj.id} className="text-xs hover:bg-zinc-900">
                            {proj.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Repository Name */}
                  <div className="space-y-2">
                    <label className="text-xs text-zinc-400 font-semibold block">2. GitHub Repository Name</label>
                    <Input 
                      placeholder="e.g. my-org/my-repository"
                      value={repoFullNameInput}
                      onChange={(e) => setRepoFullNameInput(e.target.value)}
                      className="bg-zinc-900 border-white/10 text-xs text-zinc-200 focus:ring-[#7C5CFC]"
                      required
                    />
                    <p className="text-[10px] text-zinc-500">
                      Must correspond to one of your connected GitHub Organizations.
                    </p>
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={actionLoading !== null || !selectedProjectId}
                    className="w-full bg-[#7C5CFC] hover:bg-[#6849E2] text-white flex items-center justify-center gap-1.5 text-xs font-semibold h-8 mt-2"
                  >
                    {actionLoading === "linking" ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <>
                        <LinkIcon className="h-3 w-3" />
                        Link Repository
                      </>
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          {/* Help / Informational Card */}
          <Card className="border-white/5 bg-zinc-950/40 backdrop-blur-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-zinc-500">How webhook sync works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-[11px] text-zinc-400">
              <div className="flex gap-2.5">
                <span className="text-[#7C5CFC] font-bold">01.</span>
                <p>When linked, HiveSpace registers a repository webhook on GitHub automatically.</p>
              </div>
              <div className="flex gap-2.5">
                <span className="text-[#7C5CFC] font-bold">02.</span>
                <p>Pushing to branches or opening PRs with issue keys (e.g. <code>#PROJ-123</code>) automatically updates Hivespace tasks.</p>
              </div>
              <div className="flex gap-2.5">
                <span className="text-[#7C5CFC] font-bold">03.</span>
                <p>Incoming webhook signatures are verified using the secure webhook secret generated for your org.</p>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>

      {/* Connect Organization Dialog */}
      <Dialog open={isConnectDialogOpen} onOpenChange={setIsConnectDialogOpen}>
        <DialogContent className="bg-zinc-950 border border-white/10 text-white max-w-sm p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              <Github className="h-5 w-5" />
              Connect GitHub Organization
            </DialogTitle>
            <DialogDescription className="text-zinc-400 text-xs mt-1">
              Enter the name of your GitHub Organization. This must match your organization slug on GitHub.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-2">
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-zinc-400">GitHub Organization Name</label>
              <Input 
                placeholder="e.g. google-deepmind"
                value={orgNameInput}
                onChange={(e) => setOrgNameInput(e.target.value)}
                className="bg-zinc-900 border-white/10 text-xs text-zinc-200"
              />
            </div>
          </div>

          <DialogFooter className="flex sm:flex-row gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setIsConnectDialogOpen(false)}
              className="text-xs h-8"
            >
              Cancel
            </Button>
            <Button
              onClick={startOAuthFlow}
              disabled={!orgNameInput.trim()}
              className="bg-[#7C5CFC] hover:bg-[#6849E2] text-white text-xs h-8"
            >
              Authorize & Connect
              <ArrowRight className="h-3 w-3 ml-1.5" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
