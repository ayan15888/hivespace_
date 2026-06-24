"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useOrgStore } from "@/store/orgStore";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { useProjectStore } from "@/store/projectStore";
import { 
  getConnectedOrgs, 
  disconnectOrg, 
  getLinkedRepos, 
  linkRepository, 
  unlinkRepository,
  createAndLinkRepository,
  saveGithubConnection,
  GithubConnectionResponse,
  GithubRepoLinkResponse,
  GithubInitConnectionResponse,
  GithubOrgInfo
} from "@/lib/api/github";
import { gooeyToast as toast } from "@/components/ui/goey-toaster";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  GitGraph as Github,
  GitGraph,
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
  const router = useRouter();
  const activeOrg = useOrgStore((state) => state.activeOrg);
  const activeWorkspace = useWorkspaceStore((state) => state.activeWorkspace);
  const projects = useProjectStore((state) => state.projects);
  const fetchProjects = useProjectStore((state) => state.fetchProjects);

  const [connections, setConnections] = useState<GithubConnectionResponse[]>([]);
  const [linkedRepos, setLinkedRepos] = useState<GithubRepoLinkResponse[]>([]);
  
  const [loadingConnections, setLoadingConnections] = useState(true);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Org Select Dialog State (shown after OAuth returns with ?showOrgSelect=true)
  const [initData, setInitData] = useState<GithubInitConnectionResponse | null>(null);
  const [isOrgSelectOpen, setIsOrgSelectOpen] = useState(false);

  // Linking Form State
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [repoFullNameInput, setRepoFullNameInput] = useState("");

  // Repo Creation State
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newRepoName, setNewRepoName] = useState("");
  const [isPrivateRepo, setIsPrivateRepo] = useState(true);
  const [selectedOrgName, setSelectedOrgName] = useState("");
  const [repoOwnerMode, setRepoOwnerMode] = useState<"personal" | "org">("personal");

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

  // Check on mount if returning from GitHub OAuth with org select data
  useEffect(() => {
    const showOrgSelect = searchParams.get("showOrgSelect");
    if (showOrgSelect === "true") {
      const raw = localStorage.getItem("hivespace_github_init_data");
      if (raw) {
        try {
          const parsed: GithubInitConnectionResponse = JSON.parse(raw);
          setInitData(parsed);
          setIsOrgSelectOpen(true);
          localStorage.removeItem("hivespace_github_init_data");
          // Clean URL without reloading
          router.replace("/settings/github");
        } catch (e) {
          console.error("Failed to parse init data", e);
        }
      }
    }
  }, [searchParams]);

  // Start GitHub OAuth — no org name needed, flow=connect
  const startOAuthFlow = () => {
    if (!isClientIdConfigured) {
      toast.error("GitHub Client ID is not configured in .env");
      return;
    }
    if (!activeOrg?.id) {
      toast.error("No active organization found. Please refresh and try again.");
      return;
    }

    localStorage.setItem("hivespace_github_flow", "connect");
    localStorage.setItem("hivespace_github_connecting_tenant", activeOrg.id);

    const redirectUri = `${window.location.origin}/auth/github/callback`;
    const oauthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=admin:repo_hook,repo,user,read:org&redirect_uri=${encodeURIComponent(redirectUri)}&state=${activeOrg.id}`;
    window.location.href = oauthUrl;
  };

  // After user picks their account/org in the dialog, save the connection
  const handleSelectAndSaveOrg = async (githubOrgName: string) => {
    if (!activeOrg?.id || !initData) return;
    setActionLoading(`save-${githubOrgName}`);
    try {
      await saveGithubConnection(activeOrg.id, githubOrgName, initData.tokenRef);
      toast.success(`Connected GitHub account: ${githubOrgName}`);
      setIsOrgSelectOpen(false);
      setInitData(null);
      fetchConnections();
    } catch (err: any) {
      toast.error(err.message || "Failed to save connection");
    } finally {
      setActionLoading(null);
    }
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

  const handleCreateRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) {
      toast.error("Please select a project");
      return;
    }
    if (!selectedOrgName) {
      toast.error("Please select a connected GitHub organization");
      return;
    }
    if (!newRepoName.trim()) {
      toast.error("Please enter a repository name");
      return;
    }

    setActionLoading("creating-repo");
    try {
      await createAndLinkRepository(
        selectedProjectId,
        selectedOrgName,
        newRepoName.trim(),
        isPrivateRepo
      );
      toast.success(`Repository ${selectedOrgName}/${newRepoName.trim()} created and linked successfully!`);
      setNewRepoName("");
      fetchAllLinkedRepos();
    } catch (err: any) {
      toast.error(err.message || "Failed to create repository");
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
                onClick={startOAuthFlow}
                disabled={!isClientIdConfigured || actionLoading !== null}
                className="bg-[#7C5CFC] hover:bg-[#6849E2] text-white flex items-center gap-1 h-8 text-xs font-semibold px-3"
              >
                <Plus className="h-3.5 w-3.5" />
                Connect Account
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
          
          {/* Link / Create Repository Form */}
          <Card className="border-white/5 bg-zinc-950/40 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Plus className="h-4.5 w-4.5 text-[#7C5CFC]" />
                {isCreatingNew ? "Create GitHub Repository" : "Link New Repository"}
              </CardTitle>
              <CardDescription className="text-xs text-zinc-400 mt-1">
                {isCreatingNew 
                  ? "Create a new repo on GitHub and link it to your project."
                  : "Establish a webhook mapping to sync PRs and issues for a project."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {connections.length === 0 ? (
                <div className="p-4 border border-amber-500/20 bg-amber-500/5 rounded-lg text-center space-y-3">
                  <AlertTriangle className="h-8 w-8 text-amber-400 mx-auto" />
                  <p className="text-xs text-zinc-400">
                    You must connect a GitHub organization before you can link or create repositories.
                  </p>
                  <Button 
                    onClick={startOAuthFlow}
                    className="w-full bg-amber-500/10 text-amber-300 border border-amber-500/20 hover:bg-amber-500/20 text-xs font-semibold h-8"
                  >
                    Connect Account
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Mode Selector Tab */}
                  <div className="flex bg-zinc-900/60 p-0.5 rounded-lg border border-white/5">
                    <button
                      type="button"
                      onClick={() => setIsCreatingNew(false)}
                      className={cn(
                        "flex-1 py-1.5 text-[11px] font-semibold rounded-md transition-colors",
                        !isCreatingNew ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-zinc-200"
                      )}
                    >
                      Link Existing
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCreatingNew(true)}
                      className={cn(
                        "flex-1 py-1.5 text-[11px] font-semibold rounded-md transition-colors",
                        isCreatingNew ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-zinc-200"
                      )}
                    >
                      Create New Repo
                    </button>
                  </div>

                  {!isCreatingNew ? (
                    <form onSubmit={handleLinkRepo} className="space-y-4">
                      
                      {/* Select Hivespace Project */}
                      <div className="space-y-2">
                        <label className="text-xs text-zinc-400 font-semibold block">1. Select Project</label>
                        <Select 
                          value={selectedProjectId} 
                          onValueChange={setSelectedProjectId}
                        >
                          <SelectTrigger className="w-full bg-zinc-900 border-white/10 text-xs text-zinc-300 focus:ring-[#7C5CFC]">
                            <SelectValue placeholder="Choose a Hivespace project" />
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
                  ) : (
                    <form onSubmit={handleCreateRepo} className="space-y-4">
                      
                      {/* Select Hivespace Project */}
                      <div className="space-y-2">
                        <label className="text-xs text-zinc-400 font-semibold block">1. Select Project</label>
                        <Select 
                          value={selectedProjectId} 
                          onValueChange={setSelectedProjectId}
                        >
                          <SelectTrigger className="w-full bg-zinc-900 border-white/10 text-xs text-zinc-300 focus:ring-[#7C5CFC]">
                            <SelectValue placeholder="Choose a Hivespace project" />
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

                      {/* Owner Type Selector */}
                      <div className="space-y-2">
                        <label className="text-xs text-zinc-400 font-semibold block">2. Create under</label>
                        <div className="grid grid-cols-2 gap-1.5 p-1 bg-zinc-900/60 rounded-lg border border-white/5">
                          <button
                            type="button"
                            onClick={() => { setRepoOwnerMode("personal"); setSelectedOrgName(""); }}
                            className={cn(
                              "flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] font-medium transition-all",
                              repoOwnerMode === "personal"
                                ? "bg-[#7C5CFC] text-white shadow"
                                : "text-zinc-400 hover:text-zinc-200"
                            )}
                          >
                            <GitGraph className="h-3 w-3" />
                            My Account
                          </button>
                          <button
                            type="button"
                            onClick={() => { setRepoOwnerMode("org"); setSelectedOrgName(connections[0]?.githubOrgName || ""); }}
                            className={cn(
                              "flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] font-medium transition-all",
                              repoOwnerMode === "org"
                                ? "bg-[#7C5CFC] text-white shadow"
                                : connections.length === 0 ? "text-zinc-600 cursor-not-allowed" : "text-zinc-400 hover:text-zinc-200"
                            )}
                            disabled={connections.length === 0}
                          >
                            <GitFork className="h-3 w-3" />
                            Organization
                            {connections.length === 0 && <span className="text-[9px]">(none connected)</span>}
                          </button>
                        </div>

                        {repoOwnerMode === "personal" ? (
                          <>
                            <Input
                              placeholder="Your GitHub username, e.g. ayan15888"
                              value={selectedOrgName}
                              onChange={(e) => setSelectedOrgName(e.target.value)}
                              className="bg-zinc-900 border-white/10 text-xs text-zinc-200 focus:ring-[#7C5CFC]"
                              required
                            />
                            <p className="text-[10px] text-zinc-500">Repo will be created under your personal GitHub account.</p>
                          </>
                        ) : (
                          <>
                            <Select value={selectedOrgName} onValueChange={setSelectedOrgName}>
                              <SelectTrigger className="w-full bg-zinc-900 border-white/10 text-xs text-zinc-300 focus:ring-[#7C5CFC]">
                                <SelectValue placeholder="Choose a connected organization" />
                              </SelectTrigger>
                              <SelectContent className="bg-zinc-950 border-white/10 text-zinc-200">
                                {connections.map((conn) => (
                                  <SelectItem key={conn.id} value={conn.githubOrgName} className="text-xs hover:bg-zinc-900">
                                    <span className="flex items-center gap-1.5">
                                      <GitFork className="h-3 w-3 text-[#7C5CFC]" />
                                      {conn.githubOrgName}
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <p className="text-[10px] text-zinc-500">Repo will be created under the selected GitHub Organization.</p>
                          </>
                        )}
                      </div>

                      {/* New Repository Name */}
                      <div className="space-y-2">
                        <label className="text-xs text-zinc-400 font-semibold block">3. New Repository Name</label>
                        <Input 
                          placeholder="e.g. new-sprint-repo"
                          value={newRepoName}
                          onChange={(e) => setNewRepoName(e.target.value)}
                          className="bg-zinc-900 border-white/10 text-xs text-zinc-200 focus:ring-[#7C5CFC]"
                          required
                        />
                      </div>

                      {/* Visibility Option */}
                      <div className="flex items-center justify-between p-2.5 rounded-lg border border-white/5 bg-zinc-900/40">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-semibold text-zinc-300">Private Repository</span>
                          <span className="text-[10px] text-zinc-500">Only visible to authorized members</span>
                        </div>
                        <input 
                          type="checkbox"
                          checked={isPrivateRepo}
                          onChange={(e) => setIsPrivateRepo(e.target.checked)}
                          className="h-4 w-4 rounded border-white/10 bg-zinc-900 text-[#7C5CFC] focus:ring-[#7C5CFC]"
                        />
                      </div>

                      {/* Submit Button */}
                      <Button
                        type="submit"
                        disabled={actionLoading !== null || !selectedProjectId || !selectedOrgName || !newRepoName.trim()}
                        className="w-full bg-[#7C5CFC] hover:bg-[#6849E2] text-white flex items-center justify-center gap-1.5 text-xs font-semibold h-8 mt-2"
                      >
                        {actionLoading === "creating-repo" ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <>
                            <Plus className="h-3.5 w-3.5" />
                            Create & Link Repo
                          </>
                        )}
                      </Button>
                    </form>
                  )}
                </div>
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

      {/* Org Select Dialog — shown after GitHub OAuth returns */}
      <Dialog open={isOrgSelectOpen} onOpenChange={setIsOrgSelectOpen}>
        <DialogContent className="bg-zinc-950 border border-white/10 text-white max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              <Github className="h-5 w-5" />
              Select GitHub Account or Organization
            </DialogTitle>
            <DialogDescription className="text-zinc-400 text-xs mt-1">
              Choose which GitHub account or organization you'd like to connect to HiveSpace.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 my-2 max-h-80 overflow-y-auto pr-1">
            {/* Personal Account */}
            {initData?.personalLogin && (
              <button
                type="button"
                onClick={() => handleSelectAndSaveOrg(initData.personalLogin)}
                disabled={actionLoading !== null}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-white/10 bg-zinc-900/60 hover:bg-zinc-900 hover:border-[#7C5CFC]/40 transition-all group"
              >
                {initData.personalAvatarUrl ? (
                  <img src={initData.personalAvatarUrl} alt={initData.personalLogin} className="h-9 w-9 rounded-full ring-1 ring-white/10" />
                ) : (
                  <div className="h-9 w-9 rounded-full bg-zinc-800 flex items-center justify-center">
                    <GitGraph className="h-4 w-4 text-zinc-400" />
                  </div>
                )}
                <div className="flex flex-col items-start">
                  <span className="text-sm font-semibold text-white">{initData.personalLogin}</span>
                  <span className="text-[10px] text-zinc-500">Personal Account</span>
                </div>
                {actionLoading === `save-${initData.personalLogin}` ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin ml-auto text-[#7C5CFC]" />
                ) : (
                  <ArrowRight className="h-3.5 w-3.5 ml-auto text-zinc-600 group-hover:text-[#7C5CFC] transition-colors" />
                )}
              </button>
            )}

            {/* Separator if both personal and orgs exist */}
            {initData?.orgs && initData.orgs.length > 0 && (
              <div className="flex items-center gap-2 py-1">
                <div className="flex-1 h-px bg-white/5" />
                <span className="text-[10px] text-zinc-500">Organizations</span>
                <div className="flex-1 h-px bg-white/5" />
              </div>
            )}

            {/* Org List */}
            {initData?.orgs?.map((org) => (
              <button
                key={org.login}
                type="button"
                onClick={() => handleSelectAndSaveOrg(org.login)}
                disabled={actionLoading !== null}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-white/10 bg-zinc-900/60 hover:bg-zinc-900 hover:border-[#7C5CFC]/40 transition-all group"
              >
                {org.avatarUrl ? (
                  <img src={org.avatarUrl} alt={org.login} className="h-9 w-9 rounded-lg ring-1 ring-white/10" />
                ) : (
                  <div className="h-9 w-9 rounded-lg bg-zinc-800 flex items-center justify-center">
                    <GitFork className="h-4 w-4 text-zinc-400" />
                  </div>
                )}
                <div className="flex flex-col items-start">
                  <span className="text-sm font-semibold text-white">{org.login}</span>
                  {org.description && <span className="text-[10px] text-zinc-500 truncate max-w-[200px]">{org.description}</span>}
                  <span className="text-[10px] text-zinc-600">Organization</span>
                </div>
                {actionLoading === `save-${org.login}` ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin ml-auto text-[#7C5CFC]" />
                ) : (
                  <ArrowRight className="h-3.5 w-3.5 ml-auto text-zinc-600 group-hover:text-[#7C5CFC] transition-colors" />
                )}
              </button>
            ))}

            {!initData?.personalLogin && (!initData?.orgs || initData.orgs.length === 0) && (
              <p className="text-xs text-zinc-500 text-center py-4">No accounts found. Please try again.</p>
            )}
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => { setIsOrgSelectOpen(false); setInitData(null); }} className="text-xs h-8">
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
