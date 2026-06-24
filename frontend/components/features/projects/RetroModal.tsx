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
import { Loader2, Sparkles, Calendar } from "lucide-react";
import { generateSprintRetro } from "@/lib/api/tasks";
import { getSprintsForProject, SprintResponse } from "@/lib/api/sprints";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { gooeyToast as toast } from "@/components/ui/goey-toaster";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

interface RetroModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

export function RetroModal({ isOpen, onClose, projectId }: RetroModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sprintMode, setSprintMode] = useState<"sprint" | "custom">("sprint");
  const [sprints, setSprints] = useState<SprintResponse[]>([]);
  const [selectedSprintId, setSelectedSprintId] = useState<string>("");
  const [sprintsLoading, setSprintsLoading] = useState(false);

  // Fetch project sprints on mount/isOpen
  useEffect(() => {
    if (isOpen && projectId) {
      setSprintsLoading(true);
      getSprintsForProject(projectId)
        .then((data) => {
          setSprints(data);
          const active = data.find(s => s.status === "ACTIVE") || data[0];
          if (active) {
            setSelectedSprintId(active.id);
            setSprintMode("sprint");
            if (active.startDate) setStartDate(active.startDate.split("T")[0]);
            if (active.endDate) setEndDate(active.endDate.split("T")[0]);
          } else {
            setSprintMode("custom");
          }
        })
        .catch((err) => {
          console.error("Failed to load sprints:", err);
          setSprintMode("custom");
        })
        .finally(() => {
          setSprintsLoading(false);
        });
    }
  }, [isOpen, projectId]);

  // Adjust dates when a sprint is selected
  useEffect(() => {
    if (sprintMode === "sprint" && selectedSprintId) {
      const selected = sprints.find((s) => s.id === selectedSprintId);
      if (selected) {
        if (selected.startDate) setStartDate(selected.startDate.split("T")[0]);
        if (selected.endDate) setEndDate(selected.endDate.split("T")[0]);
      }
    }
  }, [selectedSprintId, sprintMode, sprints]);

  // Default date window to last 14 days
  useEffect(() => {
    if (isOpen && sprintMode === "custom") {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 14);

      // Format as YYYY-MM-DD
      const format = (d: Date) => d.toISOString().split("T")[0];
      setStartDate(format(start));
      setEndDate(format(end));
    }
  }, [isOpen, sprintMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    try {
      let response;
      if (sprintMode === "sprint" && selectedSprintId) {
        response = await generateSprintRetro(projectId, undefined, undefined, selectedSprintId);
      } else {
        if (!startDate || !endDate) {
          toast.error("Please enter a valid date range");
          setLoading(false);
          return;
        }
        // Parse as ISO strings
        const startIso = new Date(startDate + "T00:00:00Z").toISOString();
        const endIso = new Date(endDate + "T23:59:59Z").toISOString();
        response = await generateSprintRetro(projectId, startIso, endIso);
      }

      toast.success("Retrospective report generated successfully!");
      onClose();
      // Redirect to the newly created document
      router.push(`/dashboard/docs/${response.documentId}`);
    } catch (error) {
      console.error("Failed to generate retrospective:", error);
      toast.error("Failed to generate retrospective report");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <AnimatePresence>
        {isOpen && (
          <DialogContent className="sm:max-w-[420px] w-full bg-hs-main border-border/50 text-foreground rounded-[28px] overflow-hidden p-0 flex flex-col">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col h-full"
            >
              <form onSubmit={handleSubmit} className="flex flex-col h-full">
                <DialogHeader className="p-6 pb-2">
                  <div className="flex items-center gap-2 text-indigo-400">
                    <Sparkles className="h-5 w-5 animate-pulse" />
                    <DialogTitle className="text-lg font-bold text-foreground">Sprint Retrospective Agent</DialogTitle>
                  </div>
                  <DialogDescription className="text-muted-foreground text-xs">
                    Define the sprint window. The AI agent will analyze task stats, blocker activities, and chat history to draft a retrospective document.
                  </DialogDescription>
                </DialogHeader>

                <div className="p-6 space-y-4">
                  {sprints.length > 0 && (
                    <div className="grid gap-2">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                        Source Option
                      </Label>
                      <Select
                        value={sprintMode}
                        onValueChange={(val: "sprint" | "custom") => setSprintMode(val)}
                        disabled={loading}
                      >
                        <SelectTrigger className="bg-muted/30 border-border/50 focus:ring-0 rounded-xl text-foreground">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-hs-main border-border text-foreground text-xs">
                          <SelectItem value="sprint">By Sprint Tasks</SelectItem>
                          <SelectItem value="custom">By Date Range (Legacy)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {sprintMode === "sprint" && sprints.length > 0 ? (
                    <div className="grid gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                        Select Sprint
                      </Label>
                      <Select
                        value={selectedSprintId}
                        onValueChange={setSelectedSprintId}
                        disabled={loading || sprintsLoading}
                      >
                        <SelectTrigger className="bg-muted/30 border-border/50 focus:ring-0 rounded-xl text-foreground">
                          <SelectValue placeholder="Choose a sprint..." />
                        </SelectTrigger>
                        <SelectContent className="bg-hs-main border-border text-foreground text-xs">
                          {sprints.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name} ({s.status})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedSprintId && sprints.find(s => s.id === selectedSprintId)?.goal && (
                        <p className="text-[11px] text-muted-foreground italic mt-1 px-1 line-clamp-2">
                          Goal: {sprints.find(s => s.id === selectedSprintId)?.goal}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      <div className="grid gap-2">
                        <Label htmlFor="startDate" className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" /> Start Date
                        </Label>
                        <Input
                          id="startDate"
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="bg-muted/30 border-border/50 focus:border-primary/50 focus:ring-0 rounded-xl text-foreground [color-scheme:dark]"
                          disabled={loading}
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="endDate" className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" /> End Date
                        </Label>
                        <Input
                          id="endDate"
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="bg-muted/30 border-border/50 focus:border-primary/50 focus:ring-0 rounded-xl text-foreground [color-scheme:dark]"
                          disabled={loading}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <DialogFooter className="p-6 pt-2 border-t border-border/10">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    className="rounded-xl text-muted-foreground border border-border/20 bg-transparent hover:bg-muted hover:text-foreground"
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-6 gap-2"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Generate Retro
                      </>
                    )}
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
