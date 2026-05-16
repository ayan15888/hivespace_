"use client";

import { useState } from "react";
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
import { createWorkspace } from "@/lib/api/workspaces";
import { useOrgStore } from "@/store/orgStore";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { toast } from "sonner";

interface CreateWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateWorkspaceModal({ isOpen, onClose, onSuccess }: CreateWorkspaceModalProps) {
  const { activeOrg } = useOrgStore();
  const { setActiveWorkspace } = useWorkspaceStore();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [loading, setLoading] = useState(false);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    setSlug(val.toLowerCase().replace(/ /g, "-").replace(/[^\w-]+/g, ""));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrg) return;

    setLoading(true);
    try {
      const response = await createWorkspace({
        name,
        slug,
        tenantId: activeOrg.id,
        plan: "FREE", // Required by backend
      });
      
      setActiveWorkspace(response);
      toast.success("Workspace created successfully");
      if (onSuccess) onSuccess();
      onClose();
      // Optionally refresh page or let hooks handle it
      window.location.reload(); 
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to create workspace");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-[#201F21] border-zinc-800 text-[#E5E1E4]">
        <DialogHeader>
          <DialogTitle>Create Workspace</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Add a new workspace to {activeOrg?.name}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="ws-name">Name</Label>
            <Input 
              id="ws-name" 
              placeholder="Engineering, Design, etc." 
              value={name}
              onChange={handleNameChange}
              required
              className="bg-zinc-900 border-zinc-800"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ws-slug">Slug</Label>
            <Input 
              id="ws-slug" 
              placeholder="engineering" 
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              required
              className="bg-zinc-900 border-zinc-800"
            />
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading || !name} className="bg-[#7C5CFC] hover:bg-[#6D4EE0]">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
