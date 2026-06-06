"use client";

import { useState, useEffect, useRef } from "react";
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
import { Loader2, ChevronLeft, ChevronRight, CalendarIcon } from "lucide-react";
import { createProject } from "@/lib/api/projects";
// import { useWorkspace } from "@/store/workspaceStore";
import { gooeyToast as toast } from "@/components/ui/goey-toaster";
import { getWorkspaceMembers, WorkspaceMemberResponse } from "@/lib/api/workspaces";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Calendar as ShadcnCalendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

import { motion } from "framer-motion";
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
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [isStartOpen, setIsStartOpen] = useState(false);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [isEndOpen, setIsEndOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(() => Math.floor(Math.random() * PROJECT_COLORS.length));
  const selectedColor = PROJECT_COLORS[selectedIndex];
  const [loading, setLoading] = useState(false);
  const [leadUserId, setLeadUserId] = useState("");
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMemberResponse[]>([]);
  const [windowStart, setWindowStart] = useState(0);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" || 
        target.tagName === "TEXTAREA" || 
        target.isContentEditable
      ) {
        return;
      }

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + PROJECT_COLORS.length) % PROJECT_COLORS.length);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % PROJECT_COLORS.length);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (selectedIndex < windowStart) {
      setWindowStart(selectedIndex);
    } else if (selectedIndex >= windowStart + 4) {
      setWindowStart(selectedIndex - 3);
    }
  }, [selectedIndex, windowStart]);

  useEffect(() => {
    if (isOpen && activeWorkspace?.id) {
      getWorkspaceMembers(activeWorkspace.id)
        .then(setWorkspaceMembers)
        .catch((err) => console.error("Failed to load workspace members", err));
      
      const randomIndex = Math.floor(Math.random() * PROJECT_COLORS.length);
      setSelectedIndex(randomIndex);
    }
  }, [isOpen, activeWorkspace?.id]);

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
        startDate: startDate ? startDate.toISOString() : undefined,
        endDate: endDate ? endDate.toISOString() : undefined,
        leadUserId: (leadUserId && leadUserId !== "me") ? leadUserId : undefined,
      });
      
      toast.success("Project created successfully");
      
      // Update global store
      addProject(newProject);
      
      // Reset form fields
      setName("");
      setDescription("");
      setStartDate(undefined);
      setEndDate(undefined);
      setLeadUserId("");
      
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
      <DialogContent className="sm:max-w-[425px] bg-hs-main border-border/50 text-foreground overflow-hidden p-0 rounded-[28px]">
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
                        <div className="space-y-2 flex flex-col">
                          <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Start Date</Label>
                          <Popover open={isStartOpen} onOpenChange={setIsStartOpen}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full bg-muted/30 border-border/50 hover:bg-muted/40 rounded-xl text-left font-normal h-10 px-3 text-xs text-foreground justify-start gap-2 focus:ring-0 focus:border-primary/50",
                                  !startDate && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 bg-hs-card border-border/50 text-foreground" align="start">
                              <ShadcnCalendar
                                mode="single"
                                selected={startDate}
                                onSelect={(date) => {
                                  setStartDate(date);
                                  setIsStartOpen(false);
                                }}
                                autoFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div className="space-y-2 flex flex-col">
                          <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">End Date</Label>
                          <Popover open={isEndOpen} onOpenChange={setIsEndOpen}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full bg-muted/30 border-border/50 hover:bg-muted/40 rounded-xl text-left font-normal h-10 px-3 text-xs text-foreground justify-start gap-2 focus:ring-0 focus:border-primary/50",
                                  !endDate && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 bg-hs-card border-border/50 text-foreground" align="start">
                              <ShadcnCalendar
                                mode="single"
                                selected={endDate}
                                onSelect={(date) => {
                                  setEndDate(date);
                                  setIsEndOpen(false);
                                }}
                                autoFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="p-lead" className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Project Lead (optional)</Label>
                        <Select
                          value={leadUserId}
                          onValueChange={setLeadUserId}
                        >
                          <SelectTrigger className="w-full h-10 bg-muted/30 border border-border/50 focus:border-primary/50 focus:ring-0 rounded-xl text-foreground text-sm cursor-pointer px-3 flex items-center justify-between">
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
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Theme Color</Label>
                          <span className="text-[10px] text-muted-foreground/60 font-mono">
                            ← / → keys to navigate
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 pt-1 justify-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full border border-border/30 hover:bg-muted/40 shrink-0 text-muted-foreground hover:text-foreground cursor-pointer"
                            onClick={(e) => {
                              e.preventDefault();
                              setSelectedIndex((prev) => (prev - 1 + PROJECT_COLORS.length) % PROJECT_COLORS.length);
                            }}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>

                          <div 
                            className="w-[144px] overflow-hidden h-10 px-1 rounded-lg bg-muted/10 border border-border/20 shrink-0 relative flex items-center"
                          >
                            <motion.div
                              className="flex gap-2"
                              animate={{ x: -windowStart * 36 }}
                              transition={{
                                type: "spring",
                                stiffness: 220,
                                damping: 25
                              }}
                            >
                              {PROJECT_COLORS.map((c, index) => {
                                const isActive = selectedIndex === index;
                                return (
                                  <motion.button
                                    key={c.value}
                                    type="button"
                                    onClick={() => setSelectedIndex(index)}
                                    whileHover={{ scale: 1.08 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="relative flex items-center justify-center h-7 w-7 rounded-full shrink-0 cursor-pointer focus:outline-none"
                                    title={c.name}
                                  >
                                    {isActive && (
                                      <motion.div
                                        layoutId="activeColorStickyBubble"
                                        className="absolute inset-0 rounded-full border border-white bg-white/20 shadow-md backdrop-blur-sm"
                                        style={{ zIndex: 0 }}
                                        transition={{
                                          type: "spring",
                                          stiffness: 380,
                                          damping: 26,
                                        }}
                                      />
                                    )}
                                    
                                    <div
                                      className={cn(
                                        "h-5 w-5 rounded-full shadow-[inset_0_1px_2px_rgba(255,255,255,0.25)] relative transition-all duration-300",
                                        c.value,
                                        isActive ? "scale-100" : "scale-90 opacity-60 hover:opacity-100"
                                      )}
                                      style={{ zIndex: 1 }}
                                    />
                                  </motion.button>
                                );
                              })}
                            </motion.div>
                          </div>

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full border border-border/30 hover:bg-muted/40 shrink-0 text-muted-foreground hover:text-foreground cursor-pointer"
                            onClick={(e) => {
                              e.preventDefault();
                              setSelectedIndex((prev) => (prev + 1) % PROJECT_COLORS.length);
                            }}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
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
      </DialogContent>
    </Dialog>
  );
}
