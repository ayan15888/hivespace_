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
import { Loader2, AlertTriangle, MessageSquare, Send, Check } from "lucide-react";
import { getStaleTasks, nudgeStaleTask, StaleTask } from "@/lib/api/tasks";
import { gooeyToast as toast } from "@/components/ui/goey-toaster";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";

interface StaleTasksModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

export function StaleTasksModal({ isOpen, onClose, projectId }: StaleTasksModalProps) {
  const [loading, setLoading] = useState(false);
  const [staleTasks, setStaleTasks] = useState<StaleTask[]>([]);
  const [nudgedIds, setNudgedIds] = useState<Set<string>>(new Set());

  const fetchStaleTasks = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const data = await getStaleTasks(projectId);
      setStaleTasks(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load stale tasks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStaleTasks();
      setNudgedIds(new Set());
    } else {
      setStaleTasks([]);
    }
  }, [isOpen, projectId]);

  const handleNudge = async (taskId: string, assigneeName: string) => {
    try {
      await nudgeStaleTask(taskId);
      toast.success(`Nudge alert sent to ${assigneeName}!`);
      setNudgedIds((prev) => new Set([...prev, taskId]));
    } catch (err) {
      console.error(err);
      toast.error("Failed to send nudge alert");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px] w-full max-h-[85vh] bg-hs-main border-border/50 text-foreground rounded-[28px] overflow-hidden p-0 flex flex-col">
        <DialogHeader className="p-6 pb-2 shrink-0">
          <div className="flex items-center gap-2 text-amber-400">
            <AlertTriangle className="h-5 w-5 animate-pulse" />
            <DialogTitle className="text-lg font-bold text-foreground">Stale Task Nudger</DialogTitle>
          </div>
          <DialogDescription className="text-muted-foreground text-xs">
            The AI scans for tasks stuck in progress for over 3 days, correlates their status with recent developer chat activity, and allows you to dispatch direct system notifications.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 pt-2">
          {loading ? (
            <div className="h-48 flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
              <p className="text-xs text-muted-foreground animate-pulse">Scanning for stale tasks...</p>
            </div>
          ) : staleTasks.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center gap-3 text-center px-4">
              <Check className="h-10 w-10 text-emerald-500 bg-emerald-500/10 p-2 rounded-full border border-emerald-500/20" />
              <h3 className="text-sm font-semibold text-foreground">All tasks look fresh!</h3>
              <p className="text-xs text-muted-foreground max-w-xs">
                No active tasks are currently stuck in progress without recent updates. Keep it up!
              </p>
            </div>
          ) : (
            <ScrollArea className="h-full pr-1">
              <div className="space-y-4">
                {staleTasks.map((task) => {
                  const isNudged = nudgedIds.has(task.taskId);
                  return (
                    <div 
                      key={task.taskId}
                      className="p-4 rounded-xl border border-border/40 bg-muted/5 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono bg-zinc-900 border border-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">
                              {task.taskIdentifier}
                            </span>
                            <span className="text-xs font-semibold text-foreground">{task.title}</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            Assignee: <span className="text-foreground font-medium">{task.assigneeName}</span> · Stuck for <span className="text-amber-400 font-semibold">{task.daysStale} days</span>
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          {task.activeInChat ? (
                            <Badge variant="outline" className="text-[9px] font-semibold bg-emerald-500/10 text-emerald-400 border-emerald-500/20 px-2 py-0.5">
                              Active in Chat
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[9px] font-semibold bg-zinc-500/10 text-zinc-400 border-zinc-500/20 px-2 py-0.5">
                              Inactive in Chat
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="text-[11px] text-muted-foreground bg-zinc-900/50 p-2.5 rounded-lg border border-border/5 flex gap-2">
                        <MessageSquare className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                        <span className="italic">“{task.nudgeMessage}”</span>
                      </div>

                      <div className="flex justify-end pt-1">
                        <Button
                          size="sm"
                          disabled={isNudged}
                          onClick={() => handleNudge(task.taskId, task.assigneeName)}
                          className={`text-[10px] h-7 px-3 rounded-lg gap-1.5 ${
                            isNudged 
                              ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" 
                              : "bg-amber-600 hover:bg-amber-500 text-white"
                          }`}
                        >
                          {isNudged ? (
                            <>
                              <Check className="h-3.5 w-3.5" />
                              Nudged
                            </>
                          ) : (
                            <>
                              <Send className="h-3 w-3" />
                              Nudge Assignee
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>

        <DialogFooter className="p-6 border-t border-border/10 shrink-0">
          <Button variant="outline" onClick={onClose} className="text-xs text-muted-foreground border border-border/20 bg-transparent hover:bg-muted hover:text-foreground">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
