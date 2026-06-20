import {
  FileText,
  Filter,
  GitPullRequest,
  ImageIcon,
  Monitor,
  Search,
  Sparkles,
  Zap,
} from "lucide-react";
import type { ElementType } from "react";

export type AiQuickAction = {
  icon: ElementType;
  title: string;
  description: string;
  prompt: string;
};

export const AI_QUICK_ACTIONS: AiQuickAction[] = [
  {
    icon: Sparkles,
    title: "Generate tasks",
    description: "Break a feature brief into a structured task list.",
    prompt: "Break this feature into implementation tasks.",
  },
  {
    icon: Search,
    title: "Semantic search",
    description: "Search across workspace context in natural language.",
    prompt: "Search my workspace for references to the backend WebSocket connection.",
  },
  {
    icon: GitPullRequest,
    title: "Review PR",
    description: "Summarize changes and call out likely issues.",
    prompt: "Review the latest pull request and summarize the key changes.",
  },
  {
    icon: Zap,
    title: "Sprint retrospective",
    description: "Draft a concise retro with trends and action items.",
    prompt: "Draft a sprint retrospective for the current project.",
  },
  {
    icon: Filter,
    title: "Smart triage",
    description: "Classify and prioritize a list of issues or tickets.",
    prompt: "Classify and prioritize the current list of untriaged issues.",
  },
  {
    icon: FileText,
    title: "Draft document",
    description: "Start an RFC, runbook, or meeting note from a prompt.",
    prompt: "Draft an RFC for our new database migration strategy.",
  },
];

export const AI_FEATURES = [
  "Reads live workspace context",
  "Uses project, task, and document data",
  "Drafts and summarizes work on demand",
];

export const AI_COMMAND_SUGGESTIONS = [
  {
    icon: ImageIcon,
    label: "Clone UI",
    description: "Generate a UI from a screenshot",
    prefix: "/clone",
  },
  {
    icon: Monitor,
    label: "Create Page",
    description: "Generate a new web page",
    prefix: "/page",
  },
  {
    icon: Sparkles,
    label: "Improve",
    description: "Refine the current design",
    prefix: "/improve",
  },
];
