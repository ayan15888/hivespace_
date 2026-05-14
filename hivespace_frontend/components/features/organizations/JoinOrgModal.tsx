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
import { Loader2, Ticket } from "lucide-react";
import { joinOrganization } from "@/lib/api/orgs";


interface JoinOrgModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function JoinOrgModal({ isOpen, onClose }: JoinOrgModalProps) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await joinOrganization(code);
      
      // Refresh to update hasTenants state and redirect to dashboard
      window.location.href = "/dashboard";
    } catch (err: unknown) {
      setError((err as Error).message || "Invalid or expired invitation code");
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[420px] bg-[#201F21] border-zinc-800 text-[#E5E1E4]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Ticket className="h-6 w-6 text-[#7C5CFC]" />
            Join an Organization
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Enter the invitation code provided by your administrator.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="code">Invitation Code</Label>
            <Input 
              id="code" 
              placeholder="e.g. HS-XXXX-XXXX" 
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              required
              className="bg-zinc-900 border-zinc-800 focus:ring-[#7C5CFC]/50 text-center font-mono tracking-widest uppercase"
            />
          </div>

          {error && <p className="text-sm text-red-500 text-center">{error}</p>}

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
              disabled={loading || !code}
              className="bg-[#7C5CFC] hover:bg-[#6D4EE0] text-white px-8"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Join Organization"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
