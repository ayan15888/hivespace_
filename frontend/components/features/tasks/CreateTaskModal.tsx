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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { createTask, TaskRequest } from "@/lib/api/tasks";
import { gooeyToast as toast } from "@/components/ui/goey-toaster";
import { motion, AnimatePresence } from "framer-motion";

import { useProjects } from "@/hooks/useProjects";
import { useTaskStore } from "@/store/taskStore";

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string; // Optional now
  onSuccess?: () => void;
  defaultStatus?: string;
}

export function CreateTaskModal({ isOpen, onClose, projectId: initialProjectId, onSuccess, defaultStatus }: CreateTaskModalProps) {
  const { projects } = useProjects();
  const addTask = useTaskStore(state => state.addTask);
  const [loading, setLoading] = useState(false);
  const [projectId, setProjectId] = useState(initialProjectId || "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("Todo");
  const [priority, setPriority] = useState("normal");
  const [dueDate, setDueDate] = useState("");

  // Reset fields when modal opens or initialProjectId/defaultStatus changes
  useEffect(() => {
    if (isOpen) {
      setTitle("");
      setDescription("");
      setStatus(defaultStatus || "Todo");
      setPriority("normal");
      setDueDate("");
      
      if (initialProjectId) {
        setProjectId(initialProjectId);
      } else if (projects.length > 0) {
        setProjectId(projects[0].id);
      }
    }
  }, [isOpen, initialProjectId, projects, defaultStatus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Please enter a task title");
      return;
    }

    setLoading(true);
    try {
      // Map status and priority to the correct values expected by the backend enums/database check constraints.
      const mappedStatus = status === "In Progress"
        ? "IN_PROGRESS"
        : status === "Review"
        ? "IN_REVIEW"
        : status === "Backlog"
        ? "BACKLOG"
        : status.toUpperCase();

      const mappedPriority = priority === "normal"
        ? "MEDIUM"
        : priority.toUpperCase();

      const taskData: TaskRequest = {
        title,
        description,
        status: mappedStatus,
        priority: mappedPriority,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
      };

      const newTask = await createTask(projectId, taskData);
      toast.success("Task created successfully");
      
      // Update global store
      addTask(newTask);
      
      setTitle("");
      setDescription("");
      setStatus(defaultStatus || "Todo");
      setPriority("normal");
      setDueDate("");
      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error("Failed to create task:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create task. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <AnimatePresence>
        {isOpen && (
          <DialogContent className="sm:max-w-[425px] bg-hs-main border-border/50 text-foreground rounded-[28px] overflow-hidden p-0">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
            >
              <form onSubmit={handleSubmit}>
                <DialogHeader className="p-6 pb-0">
                  <DialogTitle className="text-xl font-semibold tracking-tight text-foreground">New Task</DialogTitle>
                  <DialogDescription className="text-muted-foreground text-xs">
                    Create a new task for this project.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 p-6">
                  {!initialProjectId && (
                    <div className="grid gap-2">
                      <Label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Project</Label>
                      <Select value={projectId} onValueChange={setProjectId} disabled={loading}>
                        <SelectTrigger className="bg-[#000000]/30 border-zinc-800/50 focus:ring-0 rounded-xl text-white">
                          <SelectValue placeholder="Select a project" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1C1B1F] border-zinc-800 text-[#E5E1E4]">
                          {projects.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="grid gap-2">
                    <Label htmlFor="title" className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Title</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="What needs to be done?"
                      className="bg-muted/30 border-border/50 focus:border-primary/50 focus:ring-0 rounded-xl text-foreground"
                      disabled={loading}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description" className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Description</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Add more details..."
                      className="bg-muted/30 border-border/50 focus:border-primary/50 focus:ring-0 rounded-xl min-h-[100px] resize-none text-foreground"
                      disabled={loading}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Status</Label>
                      <Select value={status} onValueChange={setStatus} disabled={loading}>
                        <SelectTrigger className="bg-muted/30 border-border/50 focus:ring-0 rounded-xl text-foreground">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent className="bg-hs-main border-border text-foreground">
                          <SelectItem value="Backlog">Backlog</SelectItem>
                          <SelectItem value="Todo">Todo</SelectItem>
                          <SelectItem value="In Progress">In Progress</SelectItem>
                          <SelectItem value="Review">Review</SelectItem>
                          <SelectItem value="Done">Done</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Priority</Label>
                      <Select value={priority} onValueChange={setPriority} disabled={loading}>
                        <SelectTrigger className="bg-muted/30 border-border/50 focus:ring-0 rounded-xl text-foreground">
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent className="bg-hs-main border-border text-foreground">
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="dueDate" className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Due Date</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="bg-muted/30 border-border/50 focus:border-primary/50 focus:ring-0 rounded-xl text-foreground [color-scheme:dark]"
                      disabled={loading}
                    />
                  </div>
                </div>

                <DialogFooter className="p-6 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={onClose}
                    className="rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted"
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    className="bg-primary hover:opacity-90 text-primary-foreground rounded-xl px-8"
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Task"}
                  </Button>
                </DialogFooter>
              </form>
            </motion.div>
          </DialogContent>
        )}
      </AnimatePresence>
    </Dialog>
  );
}
