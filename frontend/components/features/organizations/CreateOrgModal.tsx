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
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Globe } from "lucide-react";
import { createOrganization } from "@/lib/api/orgs";
import { useOrgStore } from "@/store/orgStore";
import { useAuthStore } from "@/store/authStore";

interface CreateOrgModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateOrgModal({ isOpen, onClose }: CreateOrgModalProps) {
  const { setActiveOrg } = useOrgStore();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    // Auto-generate slug
    setSlug(val.toLowerCase().replace(/ /g, "-").replace(/[^\w-]+/g, ""));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await createOrganization({
        name,
        slug,
        description,
      });
      
      setActiveOrg(response);

      // Update local hasTenants state to true so Next/Zustand doesn't bounce to onboarding
      const { user, setUser } = useAuthStore.getState();
      if (user) {
        setUser({ ...user, hasTenants: true });
      }

      // Refresh to update hasTenants state and redirect to dashboard
      window.location.href = "/dashboard";
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to create organization");
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px] bg-[#201F21] border-zinc-800 text-[#E5E1E4]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Create your workspace</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Workspaces are where your team collaborates. You can change this later.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Workspace Name</Label>
            <Input 
              id="name" 
              placeholder="e.g. Acme Corp" 
              value={name}
              onChange={handleNameChange}
              required
              className="bg-zinc-900 border-zinc-800 focus:ring-[#7C5CFC]/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Workspace URL</Label>
            <div className="flex items-center">
              <div className="flex h-10 items-center rounded-l-md border border-r-0 border-zinc-800 bg-zinc-950 px-3 text-zinc-500 text-sm">
                <Globe className="mr-2 h-4 w-4" />
                hivespace.app/
              </div>
              <Input 
                id="slug" 
                placeholder="acme-corp" 
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                required
                className="rounded-l-none bg-zinc-900 border-zinc-800 focus:ring-[#7C5CFC]/50"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea 
              id="description" 
              placeholder="Tell us a bit about what your team does..." 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-zinc-900 border-zinc-800 focus:ring-[#7C5CFC]/50 min-h-[100px]"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <DialogFooter className="pt-4">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={onClose}
              className="text-zinc-400 hover:text-white"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !name || !slug}
              className="bg-[#7C5CFC] hover:bg-[#6D4EE0] text-white px-8"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Workspace"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
