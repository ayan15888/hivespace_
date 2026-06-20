"use client";

import { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { createTask, TaskRequest } from "@/lib/api/tasks";
import { getProjectMembers, getProjectTeamMembers, ProjectMemberResponse, getProjectTeams, addProjectMember } from "@/lib/api/projects";
import { getTeamMembers, TeamResponse, TeamMemberResponse } from "@/lib/api/teams";
import { columnNameToStatus, priorityToBackend } from "@/lib/taskUtils";
import { gooeyToast as toast } from "@/components/ui/goey-toaster";
import { motion, AnimatePresence } from "framer-motion";

import { useProjects } from "@/hooks/useProjects";
import { useTaskStore } from "@/store/taskStore";
import { useAuthStore } from "@/store/authStore";

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string; // Optional now
  onSuccess?: () => void;
  defaultStatus?: string;
}

export function CreateTaskModal({ isOpen, onClose, projectId: initialProjectId, onSuccess, defaultStatus }: CreateTaskModalProps) {
  const { projects } = useProjects();
  const addTask = useTaskStore(state => state.addTask);
  const [loading, setLoading] = useState(false);
  const [projectId, setProjectId] = useState(initialProjectId || "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("Todo");
  const [priority, setPriority] = useState("normal");
  const [dueDate, setDueDate] = useState("");
  const [labels, setLabels] = useState("");
  const [points, setPoints] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [projectMembers, setProjectMembers] = useState<ProjectMemberResponse[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState(false);

  // Teams-related state
  const [projectTeams, setProjectTeams] = useState<TeamResponse[]>([]);
  const [teamId, setTeamId] = useState("");
  const [teamMembers, setTeamMembers] = useState<TeamMemberResponse[]>([]);
  const [addingTeamMembers, setAddingTeamMembers] = useState(false);

  useEffect(() => {
    if (!isOpen || !projectId) {
      setProjectMembers([]);
      setMembersLoading(false);
      setMembersError(false);
      return;
    }
    setMembersLoading(true);
    setMembersError(false);
    Promise.all([
      getProjectMembers(projectId),
      getProjectTeamMembers(projectId).catch(() => [])
    ])
      .then(([directMembers, teamMembers]) => {
        const merged = [...directMembers];
        teamMembers.forEach((tm) => {
          if (!merged.some((dm) => dm.userId === tm.userId)) {
            merged.push(tm);
          }
        });
        setProjectMembers(merged);
        setMembersLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load project members:", err);
        setProjectMembers([]);
        setMembersLoading(false);
        setMembersError(true);
      });
  }, [isOpen, projectId]);

  useEffect(() => {
    if (!isOpen || !projectId) {
      setProjectTeams([]);
      setTeamId("");
      setTeamMembers([]);
      return;
    }
    getProjectTeams(projectId)
      .then((data) => {
        setProjectTeams(data);
      })
      .catch((err) => {
        console.error("Failed to load project teams:", err);
        setProjectTeams([]);
      });
  }, [isOpen, projectId]);

  useEffect(() => {
    if (!teamId) {
      setTeamMembers([]);
      return;
    }
    getTeamMembers(teamId)
      .then((data) => {
        setTeamMembers(data);
      })
      .catch((err) => {
        console.error("Failed to load team members:", err);
        setTeamMembers([]);
      });
  }, [teamId]);

  const nonProjectTeamMembers = teamMembers.filter(
    (tm) => !projectMembers.some((pm) => pm.userId === tm.userId)
  );

  const handleAddTeamMembersToProject = async () => {
    if (nonProjectTeamMembers.length === 0) return;
    setAddingTeamMembers(true);
    try {
      await Promise.all(
        nonProjectTeamMembers.map((tm) =>
          addProjectMember(projectId, tm.userId, "MEMBER")
        )
      );
      toast.success("Added team members to project");
      const updatedMembers = await getProjectMembers(projectId);
      setProjectMembers(updatedMembers);
    } catch (err) {
      console.error(err);
      toast.error("Failed to add some team members to project");
    } finally {
      setAddingTeamMembers(false);
    }
  };

  const { user } = useAuthStore();
  const currentUserProjectMember = projectMembers.find(m => m.userId === user?.id);
  const projectRole = currentUserProjectMember?.role || null;

  // Resolve dynamic task creation permission configured by admin
  let allowedRoles = ["MEMBER", "LEAD"];
  if (typeof window !== "undefined") {
    try {
      const saved = window.localStorage.getItem("hivespace_roles_permissions");
      if (saved) {
        const parsed = JSON.parse(saved);
        const projectMatrix = parsed?.project?.matrix;
        if (projectMatrix) {
          const createRow = projectMatrix.find((row: { action: string; rolesGranted: string[] }) => row.action === "Create & Dispatch Tasks");
          if (createRow) {
            allowedRoles = createRow.rolesGranted;
          }
        }
      }
    } catch (e) {
      console.error("Failed to parse roles permissions in CreateTaskModal", e);
    }
  }

  const canCreate = !projectId || membersLoading || 
                    (!membersError && projectMembers.length === 0) || 
                    (projectRole ? allowedRoles.includes(projectRole) : false);

  // Reset fields when modal opens or initialProjectId/defaultStatus changes
  useEffect(() => {
    if (isOpen) {
      setTitle("");
      setDescription("");
      setStatus(defaultStatus || "Todo");
      setPriority("normal");
      setDueDate("");
      setLabels("");
      setPoints("");
      setAssigneeId("");
      setTeamId("");
      setTeamMembers([]);
      
      if (initialProjectId) {
        setProjectId(initialProjectId);
      } else if (projects.length > 0) {
        setProjectId(projects[0].id);
      }
    }
  }, [isOpen, initialProjectId, projects, defaultStatus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Please enter a task title");
      return;
    }

    setLoading(true);
    try {
      const taskData: TaskRequest = {
        title: title.trim(),
        description: description.trim() || undefined,
        status: columnNameToStatus(status),
        priority: priorityToBackend(priority),
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        labels: labels.trim() || undefined,
        points: points ? Number(points) : undefined,
        assigneeId: assigneeId || undefined,
        teamId: teamId || undefined,
      };

      const newTask = await createTask(projectId, taskData);
      toast.success("Task created successfully");
      
      // Update global store
      addTask(newTask);
      
      setTitle("");
      setDescription("");
      setStatus(defaultStatus || "Todo");
      setPriority("normal");
      setDueDate("");
      setLabels("");
      setPoints("");
      setAssigneeId("");
      setTeamId("");
      setTeamMembers([]);
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error("Failed to create task:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create task. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <AnimatePresence>
        {isOpen && (
          <DialogContent className="sm:max-w-[620px] w-full max-h-[90vh] bg-hs-main border-border/50 text-foreground rounded-[28px] overflow-hidden p-0 flex flex-col">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="flex flex-col h-full"
            >
              <form onSubmit={handleSubmit} className="flex flex-col h-full">
                <DialogHeader className="p-6 pb-2">
                  <DialogTitle className="text-xl font-semibold tracking-tight text-foreground">New Task</DialogTitle>
                  <DialogDescription className="text-muted-foreground text-xs">
                    Create a new task for this project.
                  </DialogDescription>
                </DialogHeader>

                {/* Two-Column Scrollable Field Area */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 p-6 overflow-y-auto max-h-[58vh]">
                  {/* Left Column: Context, Title, Description */}
                  <div className="flex flex-col gap-4">
                    {!canCreate && (
                      <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl flex items-center gap-2 animate-pulse">
                        <span>⚠️ You do not have permission to create tasks in this project.</span>
                      </div>
                    )}
                    {!initialProjectId && (
                      <div className="grid gap-2">
                        <Label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Project</Label>
                        <Select value={projectId} onValueChange={setProjectId} disabled={loading}>
                          <SelectTrigger className="bg-[#000000]/30 border-zinc-800/50 focus:ring-0 rounded-xl text-white">
                            <SelectValue placeholder="Select a project" />
                          </SelectTrigger>
                          <SelectContent className="bg-[#1C1B1F] border-zinc-800 text-[#E5E1E4]">
                            {projects.map(p => (
                              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="grid gap-2">
                      <Label htmlFor="title" className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Title</Label>
                      <Input
                         id="title"
                         value={title}
                         onChange={(e) => setTitle(e.target.value)}
                         placeholder="What needs to be done?"
                         className="bg-muted/30 border-border/50 focus:border-primary/50 focus:ring-0 rounded-xl text-foreground"
                         disabled={loading}
                      />
                    </div>
                    <div className="grid gap-2 flex-1">
                      <Label htmlFor="description" className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Description</Label>
                      <Textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Add more details..."
                        className="bg-muted/30 border-border/50 focus:border-primary/50 focus:ring-0 rounded-xl min-h-[140px] md:min-h-[160px] h-full resize-none text-foreground"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  {/* Right Column: Status, Priority, Due Date, Points, Team, Owner, Labels */}
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Status</Label>
                        <Select value={status} onValueChange={setStatus} disabled={loading}>
                          <SelectTrigger className="bg-muted/30 border-border/50 focus:ring-0 rounded-xl text-foreground">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent className="bg-hs-main border-border text-foreground">
                            <SelectItem value="Backlog">Backlog</SelectItem>
                            <SelectItem value="Todo">Todo</SelectItem>
                            <SelectItem value="In Progress">In Progress</SelectItem>
                            <SelectItem value="Review">Review</SelectItem>
                            <SelectItem value="Done">Done</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Priority</Label>
                        <Select value={priority} onValueChange={setPriority} disabled={loading}>
                          <SelectTrigger className="bg-muted/30 border-border/50 focus:ring-0 rounded-xl text-foreground">
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                          <SelectContent className="bg-hs-main border-border text-foreground">
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="dueDate" className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Due Date</Label>
                        <Input
                          id="dueDate"
                          type="date"
                          value={dueDate}
                          onChange={(e) => setDueDate(e.target.value)}
                          className="bg-muted/30 border-border/50 focus:border-primary/50 focus:ring-0 rounded-xl text-foreground [color-scheme:dark]"
                          disabled={loading}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="points" className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Points</Label>
                        <Input
                          id="points"
                          type="number"
                          min={0}
                          value={points}
                          onChange={(e) => setPoints(e.target.value)}
                          placeholder="3"
                          className="bg-muted/30 border-border/50 focus:ring-0 rounded-xl text-foreground"
                          disabled={loading}
                        />
                      </div>
                    </div>

                    {projectId && projectTeams.length > 0 && (
                      <div className="grid gap-2">
                        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Team (optional)</Label>
                        <Select value={teamId || "default"} onValueChange={(v) => setTeamId(v === "default" ? "" : v)} disabled={loading}>
                          <SelectTrigger className="bg-muted/30 border-border/50 focus:ring-0 rounded-xl text-foreground">
                            <SelectValue placeholder="Select team label" />
                          </SelectTrigger>
                          <SelectContent className="bg-hs-main border-border text-foreground">
                            <SelectItem value="default">No team</SelectItem>
                            {projectTeams.map((t) => (
                              <SelectItem key={t.id} value={t.id}>
                                {t.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {projectId && projectMembers.length > 0 && (
                      <div className="grid gap-2">
                        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Owner (optional)</Label>
                        <Select value={assigneeId || "default"} onValueChange={(v) => setAssigneeId(v === "default" ? "" : v)} disabled={loading}>
                          <SelectTrigger className="bg-muted/30 border-border/50 focus:ring-0 rounded-xl text-foreground">
                            <SelectValue placeholder="Assign to yourself" />
                          </SelectTrigger>
                          <SelectContent className="bg-hs-main border-border text-foreground">
                            <SelectItem value="default">Me (creator)</SelectItem>
                            {[...projectMembers]
                              .sort((a, b) => a.belongsToAssignedTeam === b.belongsToAssignedTeam ? 0 : a.belongsToAssignedTeam ? -1 : 1)
                              .map((m) => (
                                <SelectItem key={m.userId} value={m.userId}>
                                  <div className="flex items-center justify-between w-full gap-2">
                                    <span>{m.fullName}</span>
                                    {m.belongsToAssignedTeam && (
                                      <span className="text-[8px] bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider ml-2">Team</span>
                                    )}
                                  </div>
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="grid gap-2">
                      <Label htmlFor="labels" className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Labels</Label>
                      <Input
                        id="labels"
                        value={labels}
                        onChange={(e) => setLabels(e.target.value)}
                        placeholder="frontend, bug"
                        className="bg-muted/30 border-border/50 focus:ring-0 rounded-xl text-foreground"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  {/* Non-project team members alert (if any) */}
                  {teamId && nonProjectTeamMembers.length > 0 && (
                    <div className="col-span-1 md:col-span-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs p-3 rounded-xl flex flex-col gap-2 animate-fade-in mt-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium font-semibold text-amber-400">
                          {projectTeams.find(t => t.id === teamId)?.name} is assigned to this project.
                        </span>
                      </div>
                      <span className="text-[11px] text-amber-500/80">
                        Team members not yet added to this project:{" "}
                        <span className="font-semibold text-amber-400">
                          {nonProjectTeamMembers.map(tm => tm.fullName || tm.username).join(", ")}
                        </span>
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddTeamMembersToProject}
                        disabled={addingTeamMembers}
                        className="bg-amber-500/20 hover:bg-amber-500/30 border-amber-500/40 text-amber-300 font-semibold self-start text-[10px] h-7 px-3 rounded-lg"
                      >
                        {addingTeamMembers ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        ) : null}
                        Add all to project
                      </Button>
                    </div>
                  )}
                </div>

                <DialogFooter className="p-6 pt-2 border-t border-border/10">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={onClose}
                    className="rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted"
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    className="bg-primary hover:opacity-90 text-primary-foreground rounded-xl px-8"
                    disabled={loading || !canCreate}
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Task"}
                  </Button>
                </DialogFooter>
              </form>
            </motion.div>
          </DialogContent>
        )}
      </AnimatePresence>
    </Dialog>
  );
}
