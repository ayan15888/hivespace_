import { HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { LevelType, LevelDetail } from "./types";

interface LevelTabsProps {
  activeLevel: LevelType;
  setActiveLevel: (level: LevelType) => void;
  levelsData: Record<LevelType, LevelDetail>;
  onOpenHelp: (level: LevelType) => void; // Modal trigger callback
}

export default function LevelTabs({ 
  activeLevel, 
  setActiveLevel, 
  levelsData,
  onOpenHelp
}: LevelTabsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-8">
      {(Object.keys(levelsData) as LevelType[]).map((levelKey) => {
        const detail = levelsData[levelKey];
        const Icon = detail.icon;
        const isActive = activeLevel === levelKey;
        return (
          <div
            key={levelKey}
            onClick={() => setActiveLevel(levelKey)}
            className={cn(
              "flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-all duration-300 group cursor-pointer relative overflow-hidden h-20 select-none",
              isActive
                ? "bg-[#252427] border-[#7C5CFC]/50 text-white shadow-lg shadow-[#7C5CFC]/5"
                : "bg-[#1C1B1E]/60 border-zinc-800/80 text-zinc-400 hover:border-zinc-700/60 hover:bg-[#252427]/40 hover:text-zinc-200"
            )}
          >
            {isActive && (
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#7C5CFC] to-blue-400" />
            )}
            
            {/* COMPACT HELP BUTTON OVERLAY */}
            <button
              onClick={(e) => {
                e.stopPropagation(); // Block changing the active tab
                onOpenHelp(levelKey);
              }}
              type="button"
              title={`View ${levelKey} roles guide`}
              className="absolute top-1.5 right-1.5 p-1 rounded-full text-zinc-550 hover:text-[#7C5CFC] hover:bg-zinc-800/50 transition-all cursor-pointer z-10"
            >
              <HelpCircle className="h-3.5 w-3.5" />
            </button>

            <Icon 
              className={cn(
                "h-5 w-5 mb-1.5 transition-transform duration-300 group-hover:scale-110",
                isActive ? "text-[#7C5CFC]" : "text-zinc-550 group-hover:text-zinc-300"
              )} 
            />
            <span className="text-xs font-semibold tracking-wide uppercase">
              {levelKey}
            </span>
            <span className="text-[9px] text-zinc-500 mt-0.5 font-mono">
              {detail.tableName}
            </span>
          </div>
        );
      })}
    </div>
  );
}
