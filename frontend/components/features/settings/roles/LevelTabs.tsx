import { cn } from "@/lib/utils";
import { LevelType, LevelDetail } from "./types";

interface LevelTabsProps {
  activeLevel: LevelType;
  setActiveLevel: (level: LevelType) => void;
  levelsData: Record<LevelType, LevelDetail>;
}

export default function LevelTabs({ activeLevel, setActiveLevel, levelsData }: LevelTabsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-8">
      {(Object.keys(levelsData) as LevelType[]).map((levelKey) => {
        const detail = levelsData[levelKey];
        const Icon = detail.icon;
        const isActive = activeLevel === levelKey;
        return (
          <button
            key={levelKey}
            onClick={() => setActiveLevel(levelKey)}
            className={cn(
              "flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-all duration-300 group cursor-pointer relative overflow-hidden",
              isActive
                ? "bg-[#252427] border-[#7C5CFC]/50 text-white shadow-lg shadow-[#7C5CFC]/5"
                : "bg-[#1C1B1E]/60 border-zinc-800/80 text-zinc-400 hover:border-zinc-700/60 hover:bg-[#252427]/40 hover:text-zinc-200"
            )}
          >
            {isActive && (
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#7C5CFC] to-blue-400" />
            )}
            <Icon 
              className={cn(
                "h-5 w-5 mb-2 transition-transform duration-300 group-hover:scale-110",
                isActive ? "text-[#7C5CFC]" : "text-zinc-550 group-hover:text-zinc-300"
              )} 
            />
            <span className="text-xs font-semibold tracking-wide uppercase">
              {levelKey}
            </span>
            <span className="text-[9px] text-zinc-500 mt-0.5 font-mono">
              {detail.tableName}
            </span>
          </button>
        );
      })}
    </div>
  );
}
