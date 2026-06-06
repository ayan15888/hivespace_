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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { createTeam } from "@/lib/api/teams";
import { gooeyToast as toast } from "@/components/ui/goey-toaster";
import { getWorkspaceMembers, WorkspaceMemberResponse } from "@/lib/api/workspaces";
import { motion } from "framer-motion";
import { useProjectStore } from "@/store/projectStore";
import { useTeamStore } from "@/store/teamStore";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

interface CreateTeamModalProps {
  isOpen: boolean;
  workspaceId: string;
  themeColor?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateTeamModal({ isOpen, workspaceId, themeColor = "var(--hs-accent)", onClose, onSuccess }: CreateTeamModalProps) {
  const { projects } = useProjectStore();
  const addTeam = useTeamStore((state) => state.addTeam);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState("");
  const [loading, setLoading] = useState(false);
  const [leadUserId, setLeadUserId] = useState("");
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMemberResponse[]>([]);

  useEffect(() => {
    if (isOpen && workspaceId) {
      getWorkspaceMembers(workspaceId)
        .then(setWorkspaceMembers)
        .catch((err) => console.error("Failed to load workspace members", err));
    }
  }, [isOpen, workspaceId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const newTeam = await createTeam(workspaceId, {
        name: name.trim(),
        description: description.trim(),
        workspaceId,
        projectId: (projectId && projectId !== "none") ? projectId : undefined,
        leadUserId: (leadUserId && leadUserId !== "me") ? leadUserId : undefined
      });
      
      // Sync to Zustand store immediately
      addTeam(newTeam);

      toast.success("Team created successfully");
      setName("");
      setDescription("");
      setProjectId("");
      setLeadUserId("");
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to create team");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-hs-card border-border/50 text-foreground overflow-hidden p-0 rounded-[28px] shadow-2xl">
        <div 
          className="h-2 w-full transition-colors duration-500" 
          style={{ backgroundColor: themeColor }} 
        />
        
        <div className="p-6">
                <DialogHeader className="mb-4">
                  <DialogTitle className="text-xl font-semibold tracking-tight text-foreground">Create Team</DialogTitle>
                  <DialogDescription className="text-zinc-500 text-xs">
                    Create a specialized group within this workspace. Teams allow you to bundle members and tasks.
                  </DialogDescription>
                </DialogHeader>
 
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="t-name" className="text-xs font-bold text-zinc-600 uppercase tracking-widest">Team Name</Label>
                    <Input 
                      id="t-name" 
                      placeholder="e.g. Backend Team, Design Guild" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="bg-hs-main border-border/50 focus:border-hs-accent/50 focus:ring-0 rounded-xl text-foreground placeholder-zinc-700"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="t-project" className="text-xs font-bold text-zinc-600 uppercase tracking-widest">Associate with Project</Label>
                    <Select
                      value={projectId || "none"}
                      onValueChange={setProjectId}
                    >
                      <SelectTrigger className="w-full h-10 bg-hs-main border border-border/50 focus:border-hs-accent/50 focus:ring-0 rounded-xl text-foreground text-xs cursor-pointer px-3 flex items-center justify-between">
                        <SelectValue placeholder="None (Workspace-wide Team)" />
                      </SelectTrigger>
                      <SelectContent className="bg-hs-card border border-border/50 text-foreground">
                        <SelectItem value="none" className="text-zinc-400">None (Workspace-wide Team)</SelectItem>
                        {projects.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="t-lead" className="text-xs font-bold text-zinc-600 uppercase tracking-widest">Team Lead (optional)</Label>
                    <Select
                      value={leadUserId || "me"}
                      onValueChange={setLeadUserId}
                    >
                      <SelectTrigger className="w-full h-10 bg-hs-main border border-border/50 focus:border-hs-accent/50 focus:ring-0 rounded-xl text-foreground text-xs cursor-pointer px-3 flex items-center justify-between">
                        <SelectValue placeholder="Defaults to you" />
                      </SelectTrigger>
                      <SelectContent className="bg-hs-card border border-border/50 text-foreground">
                        <SelectItem value="me" className="text-zinc-400">Defaults to you</SelectItem>
                        {workspaceMembers.map((m) => (
                          <SelectItem key={m.userId} value={m.userId}>
                            {m.fullName || m.username}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
 
                  <div className="space-y-2">
                    <Label htmlFor="t-desc" className="text-xs font-bold text-zinc-600 uppercase tracking-widest">Description</Label>
                    <Textarea 
                      id="t-desc" 
                      placeholder="Describe the responsibilities of this team..." 
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="bg-hs-main border-border/50 focus:border-hs-accent/50 focus:ring-0 rounded-xl text-foreground placeholder-zinc-700 min-h-[100px] resize-none"
                    />
                  </div>

                  <DialogFooter className="pt-6">
                    <Button type="button" variant="ghost" onClick={onClose} className="rounded-xl text-zinc-500 hover:text-foreground hover:bg-muted/50">
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={loading || !name.trim()} 
                      className="text-white font-semibold transition-all rounded-xl px-8"
                      style={{ backgroundColor: themeColor }}
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Team"}
                    </Button>
                  </DialogFooter>
                </form>
              </div>
      </DialogContent>
    </Dialog>
  );
}
