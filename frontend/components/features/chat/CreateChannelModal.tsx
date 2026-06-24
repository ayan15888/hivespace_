"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { Loader2 } from "lucide-react";
import { createChannel } from "@/lib/api/channels";
import { useChatStore } from "@/store/chatStore";
import { useProjectStore } from "@/store/projectStore";
import { useTeams } from "@/hooks/useTeams";
import { gooeyToast as toast } from "@/components/ui/goey-toaster";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

interface CreateChannelModalProps {
  isOpen: boolean;
  workspaceId: string;
  themeColor?: string;
  onClose: () => void;
}

export function CreateChannelModal({ 
  isOpen, 
  workspaceId, 
  themeColor = "var(--hs-accent)", 
  onClose 
}: CreateChannelModalProps) {
  const router = useRouter();
  const { projects } = useProjectStore();
  const { teams } = useTeams(workspaceId);
  const upsertChannel = useChatStore((state) => state.upsertChannel);

  const [name, setName] = useState("");
  const [type, setType] = useState<"PUBLIC" | "PRIVATE">("PUBLIC");
  const [projectId, setProjectId] = useState("none");
  const [teamId, setTeamId] = useState("none");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Validate channel name format if necessary: typically lowercase, alphanumeric, hyphens
    const formattedName = name.trim().toLowerCase().replace(/\s+/g, "-");

    setLoading(true);
    try {
      const newChannel = await createChannel({
        name: formattedName,
        type,
        workspaceId,
        projectId: projectId !== "none" ? projectId : undefined,
        teamId: teamId !== "none" ? teamId : undefined,
      });

      // Update Zustand chat store
      upsertChannel(newChannel);

      toast.success(`Channel #${newChannel.name} created successfully`);
      
      // Reset form fields
      setName("");
      setType("PUBLIC");
      setProjectId("none");
      setTeamId("none");
      
      // Close modal
      onClose();

      // Navigate to the newly created channel
      router.push(`/dashboard/chat/${newChannel.id}`);
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to create channel");
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
            <DialogTitle className="text-xl font-semibold tracking-tight text-foreground">Create Channel</DialogTitle>
            <DialogDescription className="text-zinc-500 text-xs">
              Channels are where your team communicates. They’re best when organized around a topic or project.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ch-name" className="text-xs font-bold text-zinc-600 uppercase tracking-widest">Channel Name</Label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-zinc-500 text-lg font-light">#</span>
                <Input 
                  id="ch-name" 
                  placeholder="e.g. plan-discussion" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="bg-hs-main border-border/50 focus:border-hs-accent/50 focus:ring-0 rounded-xl text-foreground placeholder-zinc-700 pl-8"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ch-type" className="text-xs font-bold text-zinc-600 uppercase tracking-widest">Privacy Setting</Label>
              <Select
                value={type}
                onValueChange={(val) => setType(val as "PUBLIC" | "PRIVATE")}
              >
                <SelectTrigger className="w-full h-10 bg-hs-main border border-border/50 focus:border-hs-accent/50 focus:ring-0 rounded-xl text-foreground text-xs cursor-pointer px-3 flex items-center justify-between">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-hs-card border border-border/50 text-foreground">
                  <SelectItem value="PUBLIC">
                    <span className="font-medium">Public</span>
                    <span className="block text-[10px] text-zinc-500">Anyone in this workspace can join</span>
                  </SelectItem>
                  <SelectItem value="PRIVATE">
                    <span className="font-medium">Private</span>
                    <span className="block text-[10px] text-zinc-500">Only invited members can view/join</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ch-project" className="text-xs font-bold text-zinc-600 uppercase tracking-widest">Project (Optional)</Label>
                <Select
                  value={projectId}
                  onValueChange={setProjectId}
                >
                  <SelectTrigger className="w-full h-10 bg-hs-main border border-border/50 focus:border-hs-accent/50 focus:ring-0 rounded-xl text-foreground text-xs cursor-pointer px-3 flex items-center justify-between">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent className="bg-hs-card border border-border/50 text-foreground">
                    <SelectItem value="none">None</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ch-team" className="text-xs font-bold text-zinc-600 uppercase tracking-widest">Team (Optional)</Label>
                <Select
                  value={teamId}
                  onValueChange={setTeamId}
                >
                  <SelectTrigger className="w-full h-10 bg-hs-main border border-border/50 focus:border-hs-accent/50 focus:ring-0 rounded-xl text-foreground text-xs cursor-pointer px-3 flex items-center justify-between">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent className="bg-hs-card border border-border/50 text-foreground">
                    <SelectItem value="none">None</SelectItem>
                    {teams.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Channel"}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
