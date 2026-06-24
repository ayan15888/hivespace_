"use client";

import React, { useState, useEffect } from "react";
import {
  Sheet as ShadcnSheet,
  SheetContent as ShadcnSheetContent,
  SheetHeader as ShadcnSheetHeader,
  SheetTitle as ShadcnSheetTitle,
  SheetDescription as ShadcnSheetDescription,
  SheetFooter as ShadcnSheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Sparkles, 
  Loader2, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw 
} from "lucide-react";
import { getTriageSuggestions, applyTriageSuggestions, TriageSuggestion } from "@/lib/api/tasks";
import { gooeyToast as toast } from "@/components/ui/goey-toaster";
import { Badge } from "@/components/ui/badge";

interface TriageDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  onSuccess: () => void;
}

export function TriageDrawer({ isOpen, onClose, projectId, onSuccess }: TriageDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [suggestions, setSuggestions] = useState<TriageSuggestion[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const fetchSuggestions = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const data = await getTriageSuggestions(projectId);
      setSuggestions(data);
      // Auto-select all suggestions by default
      setSelectedIds(new Set(data.map((s) => s.taskId)));
    } catch (err) {
      console.error(err);
      toast.error("Failed to load triage suggestions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSuggestions();
    } else {
      setSuggestions([]);
      setSelectedIds(new Set());
    }
  }, [isOpen, projectId]);

  const handleToggleSelect = (taskId: string) => {
    const next = new Set(selectedIds);
    if (next.has(taskId)) {
      next.delete(taskId);
    } else {
      next.add(taskId);
    }
    setSelectedIds(next);
  };

  const handleToggleAll = () => {
    if (selectedIds.size === suggestions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(suggestions.map((s) => s.taskId)));
    }
  };

  const handleApply = async () => {
    if (selectedIds.size === 0) return;
    setApplying(true);
    const toApply = suggestions.filter((s) => selectedIds.has(s.taskId));
    try {
      await applyTriageSuggestions(projectId, toApply);
      toast.success(`Successfully applied ${selectedIds.size} triage updates`);
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Failed to apply triage updates");
    } finally {
      setApplying(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toUpperCase()) {
      case "URGENT": return "bg-red-500/10 text-red-500 border-red-500/20";
      case "HIGH": return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "MEDIUM": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      default: return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase().replace("_", " ")) {
      case "TODO": return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
      case "IN PROGRESS": return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
      case "IN REVIEW": return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      case "DONE": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      default: return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
    }
  };

  return (
    <ShadcnSheet open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <ShadcnSheetContent side="right" className="w-[500px] sm:max-w-[500px] bg-hs-nav border-l border-border/50 text-foreground flex flex-col h-full p-0">
        <ShadcnSheetHeader className="p-6 pb-4 border-b border-border/10">
          <div className="flex items-center gap-2 text-hs-accent">
            <Sparkles className="h-5 w-5 animate-pulse" />
            <ShadcnSheetTitle className="text-lg font-bold text-foreground">Smart Triage</ShadcnSheetTitle>
          </div>
          <ShadcnSheetDescription className="text-xs text-muted-foreground mt-1">
            Let AI analyze your project tasks for outdated priorities, stale progress, or timeline delays.
          </ShadcnSheetDescription>
        </ShadcnSheetHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-hs-accent" />
              <p className="text-xs text-muted-foreground animate-pulse">Running AI triage scan...</p>
            </div>
          ) : suggestions.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center gap-3 text-center px-4">
              <CheckCircle2 className="h-10 w-10 text-emerald-500" />
              <h3 className="text-sm font-semibold text-foreground">Your board looks healthy!</h3>
              <p className="text-xs text-muted-foreground max-w-xs">
                No tasks need priority or status adjustment at the moment. All systems normal.
              </p>
              <Button variant="outline" size="sm" onClick={fetchSuggestions} className="mt-2 text-xs gap-1.5 border-zinc-800 bg-[#1C1B1F] hover:bg-muted">
                <RefreshCw className="h-3.5 w-3.5" /> Scan Again
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-border/10">
                <div className="flex items-center gap-2">
                  <Checkbox 
                    id="select-all" 
                    checked={selectedIds.size === suggestions.length} 
                    onCheckedChange={handleToggleAll} 
                  />
                  <label htmlFor="select-all" className="text-xs font-medium text-muted-foreground select-none cursor-pointer">
                    Select all suggestions ({suggestions.length})
                  </label>
                </div>
                <Button variant="ghost" size="sm" onClick={fetchSuggestions} className="h-8 px-2 text-[10px] text-hs-accent hover:text-hs-accent/80 hover:bg-hs-accent/5 gap-1">
                  <RefreshCw className="h-3 w-3" /> Rescan
                </Button>
              </div>

              <div className="space-y-3.5">
                {suggestions.map((suggestion) => {
                  const isChecked = selectedIds.has(suggestion.taskId);
                  const isPriorityChanged = suggestion.suggestedPriority !== suggestion.currentPriority;
                  const isStatusChanged = suggestion.suggestedStatus !== suggestion.currentStatus;

                  return (
                    <div 
                      key={suggestion.taskId}
                      onClick={() => handleToggleSelect(suggestion.taskId)}
                      className={`flex gap-3 p-4 rounded-xl border transition-all duration-200 cursor-pointer select-none ${
                        isChecked 
                          ? "bg-[#1E1B2A] border-indigo-500/30" 
                          : "bg-muted/10 border-border/40 hover:border-border/80"
                      }`}
                    >
                      <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
                        <Checkbox 
                          checked={isChecked} 
                          onCheckedChange={() => handleToggleSelect(suggestion.taskId)} 
                        />
                      </div>

                      <div className="flex-1 space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-mono bg-zinc-900 border border-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded mr-2">
                              {suggestion.taskIdentifier}
                            </span>
                            <span className="text-xs font-semibold text-foreground line-clamp-1">{suggestion.title}</span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          {isPriorityChanged && (
                            <div className="flex items-center gap-1.5 text-[10px]">
                              <span className="text-muted-foreground w-12 shrink-0">Priority:</span>
                              <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${getPriorityColor(suggestion.currentPriority)}`}>
                                {suggestion.currentPriority}
                              </Badge>
                              <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                              <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${getPriorityColor(suggestion.suggestedPriority)}`}>
                                {suggestion.suggestedPriority}
                              </Badge>
                            </div>
                          )}

                          {isStatusChanged && (
                            <div className="flex items-center gap-1.5 text-[10px]">
                              <span className="text-muted-foreground w-12 shrink-0">Status:</span>
                              <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${getStatusColor(suggestion.currentStatus)}`}>
                                {suggestion.currentStatus}
                              </Badge>
                              <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                              <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${getStatusColor(suggestion.suggestedStatus)}`}>
                                {suggestion.suggestedStatus}
                              </Badge>
                            </div>
                          )}
                        </div>

                        <div className="text-[11px] text-muted-foreground flex gap-1.5 bg-zinc-900/50 p-2 rounded-lg border border-border/5">
                          <AlertCircle className="h-3.5 w-3.5 text-hs-accent shrink-0 mt-0.5" />
                          <span>{suggestion.reason}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <ShadcnSheetFooter className="p-6 border-t border-border/10 bg-hs-nav shrink-0">
          <Button variant="outline" onClick={onClose} className="text-xs text-muted-foreground border border-border/20 bg-transparent hover:bg-muted hover:text-foreground">
            Cancel
          </Button>
          <Button 
            disabled={selectedIds.size === 0 || applying} 
            onClick={handleApply}
            className="text-xs bg-hs-accent text-white hover:opacity-90 transition-opacity px-6 gap-2"
          >
            {applying ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            Apply Selected Updates ({selectedIds.size})
          </Button>
        </ShadcnSheetFooter>
      </ShadcnSheetContent>
    </ShadcnSheet>
  );
}
