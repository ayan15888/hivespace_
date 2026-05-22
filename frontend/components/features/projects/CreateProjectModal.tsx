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
import { useProjectStore } from "@/store/projectStore";
import { PROJECT_COLORS } from "@/lib/constants/colors";

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}


export function CreateProjectModal({ isOpen, onClose, onSuccess }: CreateProjectModalProps) {
  const { workspaces, activeWorkspace } = useWorkspaceStore();
  const addProject = useProjectStore(state => state.addProject);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedColor, setSelectedColor] = useState(PROJECT_COLORS[1]);
  const [loading, setLoading] = useState(false);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace) return;

    setLoading(true);
    try {
      const newProject = await createProject(activeWorkspace.id, {
        name,
        description, 
        status: "ACTIVE",
        workspaceId: activeWorkspace.id,
        color: selectedColor.value,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
      });
      
      toast.success("Project created successfully");
      
      // Update global store
      addProject(newProject);
      
      // Reset form fields
      setName("");
      setDescription("");
      setStartDate("");
      setEndDate("");
      
      if (onSuccess) onSuccess();
      onClose();
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
          <DialogContent className="sm:max-w-[425px] bg-hs-main border-border/50 text-foreground overflow-hidden p-0 rounded-[28px]">
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
                {workspaces.length === 0 ? (
                  <div className="text-center py-6 px-4 space-y-4">
                    <DialogHeader className="mb-4">
                      <DialogTitle className="text-xl font-semibold tracking-tight text-foreground">Create Project</DialogTitle>
                    </DialogHeader>
                    <div className="mx-auto w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 text-lg">
                      ⚠️
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold text-foreground">Workspace Required</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        You must create at least one workspace before you can create a project. Projects belong to workspaces.
                      </p>
                    </div>
                    <div className="pt-4">
                      <Button type="button" onClick={onClose} className="w-full rounded-xl bg-muted text-muted-foreground hover:bg-muted/80">
                        Close
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <DialogHeader className="mb-4">
                      <DialogTitle className="text-xl font-semibold tracking-tight text-foreground">Create Project</DialogTitle>
                      <DialogDescription className="text-muted-foreground text-xs">
                        Add a new project to <span className="text-foreground font-medium">{activeWorkspace?.name}</span>.
                      </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="p-name" className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Name</Label>
                        <Input 
                          id="p-name" 
                          placeholder="Mobile App, Website Redesign, etc." 
                          value={name}
                          onChange={handleNameChange}
                          required
                          className="bg-muted/30 border-border/50 focus:border-primary/50 focus:ring-0 rounded-xl text-foreground text-sm"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="p-desc" className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Description</Label>
                        <textarea 
                          id="p-desc" 
                          placeholder="Provide a brief project description..." 
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          className="w-full bg-muted/30 border border-border/50 focus:border-primary/50 focus:ring-0 rounded-xl text-foreground text-sm p-3 h-20 resize-none outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="p-start" className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Start Date</Label>
                          <Input 
                            id="p-start" 
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="bg-muted/30 border-border/50 focus:border-primary/50 focus:ring-0 rounded-xl text-foreground text-xs block w-full cursor-pointer"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="p-end" className="text-xs font-bold text-muted-foreground uppercase tracking-widest">End Date</Label>
                          <Input 
                            id="p-end" 
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="bg-muted/30 border-border/50 focus:border-primary/50 focus:ring-0 rounded-xl text-foreground text-xs block w-full cursor-pointer"
                          />
                        </div>
                      </div>
    
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Theme Color</Label>
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
                        <Button type="button" variant="ghost" onClick={onClose} className="rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted">
                          Cancel
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={loading || !name} 
                          className="text-white font-semibold transition-all rounded-xl px-8"
                          style={{ backgroundColor: selectedColor.hex }}
                        >
                          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Project"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </>
                )}
              </div>
            </motion.div>
          </DialogContent>
        )}
      </AnimatePresence>
    </Dialog>
  );
}
