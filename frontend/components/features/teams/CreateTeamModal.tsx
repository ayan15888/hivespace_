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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { createTeam } from "@/lib/api/teams";
import { gooeyToast as toast } from "@/components/ui/goey-toaster";
import { motion, AnimatePresence } from "framer-motion";

interface CreateTeamModalProps {
  isOpen: boolean;
  workspaceId: string;
  themeColor?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateTeamModal({ isOpen, workspaceId, themeColor = "#7C5CFC", onClose, onSuccess }: CreateTeamModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      await createTeam(workspaceId, {
        name: name.trim(),
        description: description.trim(),
        workspaceId
      });
      
      toast.success("Team created successfully");
      setName("");
      setDescription("");
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
      <AnimatePresence>
        {isOpen && (
          <DialogContent className="sm:max-w-[425px] bg-[#1B1B1D] border-zinc-800 text-[#E5E1E4] overflow-hidden p-0 rounded-[28px] shadow-2xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <div 
                className="h-2 w-full transition-colors duration-500" 
                style={{ backgroundColor: themeColor }} 
              />
              
              <div className="p-6">
                <DialogHeader className="mb-4">
                  <DialogTitle className="text-xl font-semibold tracking-tight text-[#E5E1E4]">Create Team</DialogTitle>
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
                      className="bg-[#0E0E10] border-zinc-800 focus:border-violet-500/50 focus:ring-0 rounded-xl text-[#E5E1E4] placeholder-zinc-700"
                    />
                  </div>
 
                  <div className="space-y-2">
                    <Label htmlFor="t-desc" className="text-xs font-bold text-zinc-600 uppercase tracking-widest">Description</Label>
                    <Textarea 
                      id="t-desc" 
                      placeholder="Describe the responsibilities of this team..." 
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="bg-[#0E0E10] border-zinc-800 focus:border-violet-500/50 focus:ring-0 rounded-xl text-[#E5E1E4] placeholder-zinc-700 min-h-[100px] resize-none"
                    />
                  </div>

                  <DialogFooter className="pt-6">
                    <Button type="button" variant="ghost" onClick={onClose} className="rounded-xl text-zinc-500 hover:text-[#E5E1E4] hover:bg-zinc-900/50">
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
            </motion.div>
          </DialogContent>
        )}
      </AnimatePresence>
    </Dialog>
  );
}
