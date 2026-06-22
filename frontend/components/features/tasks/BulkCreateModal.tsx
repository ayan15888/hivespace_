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
import { Loader2, Sparkles, Plus, Trash2, ArrowLeft} from "lucide-react";
import { generateTasksFromBrief, createTask, GeneratedTaskSuggestion } from "@/lib/api/tasks";
import { getSprintsForProject, SprintResponse } from "@/lib/api/sprints";
// import { columnNameToStatus, priorityToBackend } from "@/lib/taskUtils";
import { gooeyToast as toast } from "@/components/ui/goey-toaster";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
// import { motion, AnimatePresence } from "framer-motion";

interface BulkCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  onSuccess: () => void;
}

export function BulkCreateModal({ isOpen, onClose, projectId, onSuccess }: BulkCreateModalProps) {
  const [step, setStep] = useState<"input" | "preview">("input");
  const [brief, setBrief] = useState("");
  const [drafts, setDrafts] = useState<GeneratedTaskSuggestion[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [importing, setImporting] = useState(false);

  const [sprints, setSprints] = useState<SprintResponse[]>([]);
  const [targetSprintId, setTargetSprintId] = useState<string>("backlog");

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep("input");
      setBrief("");
      setDrafts([]);
      setSelectedIndices(new Set());
      setGenerating(false);
      setImporting(false);
      setTargetSprintId("backlog");
    }
  }, [isOpen]);

  // Fetch project sprints on mount/isOpen
  useEffect(() => {
    if (isOpen && projectId) {
      getSprintsForProject(projectId)
        .then(setSprints)
        .catch(err => console.error("Failed to load sprints:", err));
    }
  }, [isOpen, projectId]);

  const handleGenerate = async () => {
    if (!brief.trim()) {
      toast.error("Please paste or type a specification brief first");
      return;
    }
    setGenerating(true);
    try {
      const data = await generateTasksFromBrief(projectId, brief);
      if (data.length === 0) {
        toast.error("AI couldn't extract any tasks. Try describing it with more details.");
      } else {
        setDrafts(data);
        setSelectedIndices(new Set(data.map((_, i) => i)));
        setStep("preview");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to parse brief into tasks");
    } finally {
      setGenerating(false);
    }
  };

  const handleToggleSelect = (index: number) => {
    const next = new Set(selectedIndices);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    setSelectedIndices(next);
  };

  const handleToggleAll = () => {
    if (selectedIndices.size === drafts.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(drafts.map((_, i) => i)));
    }
  };

  const handleFieldChange = (index: number, field: keyof GeneratedTaskSuggestion, value: any) => {
    setDrafts((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleDeleteDraft = (index: number) => {
    setDrafts((prev) => prev.filter((_, i) => i !== index));
    setSelectedIndices((prev) => {
      const next = new Set<number>();
      prev.forEach((val) => {
        if (val < index) next.add(val);
        else if (val > index) next.add(val - 1);
      });
      return next;
    });
  };

  const handleImport = async () => {
    if (selectedIndices.size === 0) return;
    setImporting(true);
    let count = 0;
    try {
      for (const index of Array.from(selectedIndices)) {
        const draft = drafts[index];
        await createTask(projectId, {
          title: draft.title,
          description: draft.description,
          status: "TODO",
          priority: draft.priority,
          points: draft.points,
          sprintId: targetSprintId === "backlog" ? undefined : targetSprintId,
        });
        count++;
      }
      const destLabel = targetSprintId === "backlog" ? "backlog" : "sprint";
      toast.success(`Successfully imported ${count} tasks to ${destLabel}`);
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(`Import failed after creating ${count} tasks`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`w-full max-h-[90vh] bg-hs-main border-border/50 text-foreground rounded-[28px] overflow-hidden p-0 flex flex-col transition-all duration-300 ${
        step === "preview" ? "sm:max-w-[800px]" : "sm:max-w-[500px]"
      }`}>
        <DialogHeader className="p-6 pb-2 shrink-0">
          <div className="flex items-center gap-2 text-indigo-400">
            <Sparkles className="h-5 w-5 animate-pulse" />
            <DialogTitle className="text-lg font-bold text-foreground">
              {step === "input" ? "AI Task Import" : "Review Generated Tasks"}
            </DialogTitle>
          </div>
          <DialogDescription className="text-muted-foreground text-xs">
            {step === "input" 
              ? "Paste a user story, feature brief, or meeting notes to automatically split them into individual tasks."
              : "Review and edit the generated tasks before adding them to your backlog."}
          </DialogDescription>
        </DialogHeader>

        {step === "input" ? (
          <div className="p-6 pt-2 flex-1 flex flex-col min-h-0 gap-4">
            <div className="flex-1 flex flex-col gap-2 min-h-[250px]">
              <Label htmlFor="brief" className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                Specification Brief
              </Label>
              <Textarea
                id="brief"
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                placeholder="Example: We need to design and implement a new checkout flow. This includes creating the cart UI page, wiring Stripe API webhooks, writing transactional email notifications, and adding integration tests for the checkout router."
                className="flex-1 bg-muted/20 border-border/50 focus:border-primary/50 focus:ring-0 rounded-xl resize-none text-xs text-foreground p-3 min-h-[250px]"
                disabled={generating}
              />
            </div>

            <DialogFooter className="pt-2 border-t border-border/10">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="rounded-xl text-muted-foreground border border-border/20 bg-transparent hover:bg-muted hover:text-foreground"
                disabled={generating}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleGenerate}
                className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-6 gap-2"
                disabled={generating}
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing Brief...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate Draft Tasks
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            <ScrollArea className="flex-1 p-6 pt-2 overflow-y-auto max-h-[55vh]">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-border/10">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="select-all-drafts"
                      checked={selectedIndices.size === drafts.length}
                      onCheckedChange={handleToggleAll}
                    />
                    <label htmlFor="select-all-drafts" className="text-xs font-medium text-muted-foreground select-none cursor-pointer">
                      Select all ({drafts.length})
                    </label>
                  </div>

                  {sprints.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Destination:</Label>
                      <Select 
                        value={targetSprintId} 
                        onValueChange={setTargetSprintId}
                        disabled={importing}
                      >
                        <SelectTrigger className="bg-[#1C1B1F] border-border/50 text-[11px] h-7 px-3 text-foreground w-[160px] rounded-lg">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-hs-main border-border text-foreground text-xs">
                          <SelectItem value="backlog">Backlog (No Sprint)</SelectItem>
                          {sprints.map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {drafts.map((draft, idx) => {
                    const isChecked = selectedIndices.has(idx);
                    return (
                      <div 
                        key={idx}
                        className={`flex gap-3 p-4 rounded-xl border transition-all ${
                          isChecked 
                            ? "bg-[#1E1B2A] border-indigo-500/25" 
                            : "bg-muted/5 border-border/40 hover:border-border/80"
                        }`}
                      >
                        <div className="pt-2">
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => handleToggleSelect(idx)}
                          />
                        </div>

                        <div className="flex-1 space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Title</Label>
                              <Input
                                value={draft.title}
                                onChange={(e) => handleFieldChange(idx, "title", e.target.value)}
                                className="bg-muted/20 border-border/50 text-xs h-8 text-foreground"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <Label className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Priority</Label>
                                <Select 
                                  value={draft.priority.toLowerCase()} 
                                  onValueChange={(val) => handleFieldChange(idx, "priority", val.toUpperCase())}
                                >
                                  <SelectTrigger className="bg-[#1C1B1F] border-border/50 text-[11px] h-8 text-foreground">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="bg-hs-main border-border text-foreground text-xs">
                                    <SelectItem value="low">Low</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="high">High</SelectItem>
                                    <SelectItem value="urgent">Urgent</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-1">
                                <Label className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Points</Label>
                                <Input
                                  type="number"
                                  min={1}
                                  max={8}
                                  value={draft.points}
                                  onChange={(e) => handleFieldChange(idx, "points", Number(e.target.value))}
                                  className="bg-muted/20 border-border/50 text-xs h-8 text-foreground"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Description</Label>
                            <Textarea
                              value={draft.description}
                              onChange={(e) => handleFieldChange(idx, "description", e.target.value)}
                              className="bg-muted/20 border-border/50 text-xs resize-none min-h-[60px] text-foreground"
                            />
                          </div>
                        </div>

                        <div className="pt-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteDraft(idx)}
                            className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </ScrollArea>

            <DialogFooter className="p-6 border-t border-border/10 bg-hs-nav/40 shrink-0">
              <Button
                variant="ghost"
                onClick={() => setStep("input")}
                className="text-xs text-muted-foreground hover:bg-muted gap-1.5"
                disabled={importing}
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </Button>
              <Button 
                disabled={selectedIndices.size === 0 || importing} 
                onClick={handleImport}
                className="text-xs bg-indigo-600 text-white hover:bg-indigo-500 rounded-xl px-6 gap-2"
              >
                {importing ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Importing tasks...
                  </>
                ) : (
                  <>
                    <Plus className="h-3.5 w-3.5" />
                    Create {selectedIndices.size} Tasks
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
