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
import { createProject } from "@/lib/api/projects";
// import { useWorkspace } from "@/store/workspaceStore";
import { gooeyToast as toast } from "@/components/ui/goey-toaster";

import { motion, AnimatePresence } from "framer-motion";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { PROJECT_COLORS } from "@/lib/constants/colors";

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}


export function CreateProjectModal({ isOpen, onClose, onSuccess }: CreateProjectModalProps) {
  const { activeWorkspace } = useWorkspaceStore();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [selectedColor, setSelectedColor] = useState(PROJECT_COLORS[1]);
  const [loading, setLoading] = useState(false);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    setSlug(val.toLowerCase().replace(/ /g, "-").replace(/[^\w-]+/g, ""));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace) return;

    setLoading(true);
    try {
      await createProject(activeWorkspace.id, {
        name,
        description: "", 
        status: "ACTIVE",
        workspaceId: activeWorkspace.id,
        slug,
        color: selectedColor.value,
      });
      
      toast.success("Project created successfully");
      if (onSuccess) onSuccess();
      onClose();
      window.location.reload();
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to create project");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <AnimatePresence>
        {isOpen && (
          <DialogContent className="sm:max-w-[425px] bg-[#201F21] border-zinc-800 text-[#E5E1E4] overflow-hidden p-0">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <div 
                className="h-2 w-full transition-colors duration-500" 
                style={{ backgroundColor: selectedColor.hex }} 
              />
              
              <div className="p-6">
                <DialogHeader className="mb-4">
                  <DialogTitle className="text-xl">Create Project</DialogTitle>
                  <DialogDescription className="text-zinc-400">
                    Add a new project to <span className="text-zinc-300 font-medium">{activeWorkspace?.name}</span>.
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="p-name">Name</Label>
                    <Input 
                      id="p-name" 
                      placeholder="Mobile App, Website Redesign, etc." 
                      value={name}
                      onChange={handleNameChange}
                      required
                      className="bg-zinc-900 border-zinc-800 focus:ring-1 focus:ring-offset-0 focus:ring-zinc-700"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="p-slug">Slug</Label>
                    <Input 
                      id="p-slug" 
                      placeholder="mobile-app" 
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      required
                      className="bg-zinc-900 border-zinc-800 focus:ring-1 focus:ring-offset-0 focus:ring-zinc-700"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Theme Color</Label>
                    <div className="flex gap-2.5 pt-1">
                      {PROJECT_COLORS.map((c) => (
                        <motion.div 
                          key={c.value}
                          onClick={() => setSelectedColor(c)}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          className={`h-7 w-7 rounded-full cursor-pointer border-2 transition-all flex items-center justify-center ${c.value} ${selectedColor.value === c.value ? "border-white" : "border-transparent opacity-60 hover:opacity-100"}`}
                        >
                          {selectedColor.value === c.value && (
                            <motion.div 
                              layoutId="activeColor" 
                              className="h-1.5 w-1.5 bg-white rounded-full"
                            />
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  <DialogFooter className="pt-6">
                    <Button type="button" variant="ghost" onClick={onClose} className="text-zinc-400 hover:text-white">
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={loading || !name} 
                      className="text-white font-semibold transition-all"
                      style={{ backgroundColor: selectedColor.hex }}
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Project"}
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
