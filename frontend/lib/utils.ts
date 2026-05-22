import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const AVATAR_COLOR_MAP: Record<string, string> = {
  red: "bg-red-500/10 text-red-500 dark:text-red-400 border-red-500/20",
  orange: "bg-orange-500/10 text-orange-500 dark:text-orange-400 border-orange-500/20",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  teal: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20",
  cyan: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
  sky: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
  blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  indigo: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
  violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
  purple: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  fuchsia: "bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-500/20",
  pink: "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20",
  rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
};

const COLOR_KEYS = Object.keys(AVATAR_COLOR_MAP);

export function getAvatarColorClass(nameOrColor: string = "?") {
  const cleanInput = (nameOrColor || "?").trim().toLowerCase();
  
  // If the input is a direct registered database color, return its classes immediately
  if (cleanInput in AVATAR_COLOR_MAP) {
    return AVATAR_COLOR_MAP[cleanInput];
  }
  
  // Otherwise, deterministically hash the text string to select a color index
  let hash = 0;
  for (let i = 0; i < cleanInput.length; i++) {
    hash = cleanInput.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % COLOR_KEYS.length;
  return AVATAR_COLOR_MAP[COLOR_KEYS[index]];
}
