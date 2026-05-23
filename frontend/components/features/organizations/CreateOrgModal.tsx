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
import { Loader2, Globe, Copy, Check } from "lucide-react";
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
  const [copied, setCopied] = useState(false);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    // Auto-generate slug
    setSlug(val.toLowerCase().replace(/ /g, "-").replace(/[^\w-]+/g, ""));
  };

  const handleCopyUrl = () => {
    if (!slug) return;
    const fullUrl = `${window.location.protocol}//${process.env.NEXT_PUBLIC_APP_DOMAIN || window.location.host}/${slug}`;
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
      setError((err as Error).message || "Failed to create Organization");
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px] bg-hs-main border-border/50 text-foreground rounded-[24px] shadow-[0_12px_40px_rgba(0,0,0,0.3)] p-6">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-xl font-bold tracking-tight">Create your Organization</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Organizations are where your team collaborates. You can change this later.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs font-semibold text-zinc-400">Organization Name</Label>
            <Input 
              id="name" 
              placeholder="e.g. Acme Corp" 
              value={name}
              onChange={handleNameChange}
              required
              className="h-10 bg-hs-card/45 border-border/50 text-foreground placeholder:text-zinc-500 rounded-xl focus-visible:ring-hs-accent/50 focus-visible:border-hs-accent transition-all duration-200"
            />
          </div>

          <div className="space-y-1.5 w-full">
            <Label htmlFor="slug" className="text-xs font-semibold text-zinc-400">Organization URL</Label>
            {/* Integrated dynamic URL bar to prevent wrapping into two lines */}
            <div className="flex items-center rounded-xl border border-border/50 bg-black focus-within:ring-2 focus-within:ring-hs-accent/50 focus-within:border-hs-accent transition-all duration-200 overflow-hidden pl-3.5 pr-2.5 h-10 w-full">
              <Globe className="h-4 w-4 text-muted-foreground mr-1.5 shrink-0" />
              <span className="text-xs font-medium text-muted-foreground select-none shrink-0">
                {process.env.NEXT_PUBLIC_APP_DOMAIN || "hivespace.app"}/
              </span>
              <input 
                id="slug" 
                placeholder="acme-corp" 
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/ /g, "-").replace(/[^\w-]+/g, ""))}
                required
                className="w-full bg-transparent border-none outline-none text-foreground text-xs font-semibold focus:ring-0 placeholder:text-zinc-600 px-0.5"
              />
              <button
                type="button"
                onClick={handleCopyUrl}
                disabled={!slug.trim()}
                className="h-7 w-7 rounded-lg hover:bg-zinc-900 text-muted-foreground hover:text-foreground flex items-center justify-center shrink-0 transition-colors duration-150 cursor-pointer disabled:opacity-40"
                title="Copy Organization URL"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-xs font-semibold text-zinc-400">Description (Optional)</Label>
            <Textarea 
              id="description" 
              placeholder="Tell us what your Organization does..." 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-hs-card/45 border-border/50 text-foreground placeholder:text-zinc-500 rounded-xl focus-visible:ring-hs-accent/50 focus-visible:border-hs-accent min-h-[90px] transition-all duration-200"
            />
          </div>

          {error && <p className="text-xs text-red-500 mt-2">{error}</p>}

          <DialogFooter className="pt-4 border-t border-border/20 mt-6 flex items-center justify-end gap-2">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={onClose}
              className="text-zinc-400 hover:text-foreground h-9 rounded-xl hover:bg-hs-card"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !name || !slug}
              className="bg-hs-accent hover:opacity-95 text-white px-6 h-9 rounded-xl transition-all duration-200"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Organization"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
