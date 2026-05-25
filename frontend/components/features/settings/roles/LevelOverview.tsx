import { LevelDetail } from "./types";

interface LevelOverviewProps {
  activeDetail: LevelDetail;
}

export default function LevelOverview({ activeDetail }: LevelOverviewProps) {
  const LevelIcon = activeDetail.icon;

  return (
    <div className="bg-[#1C1B1E] border border-zinc-800/80 rounded-xl p-5 relative overflow-hidden">
      {/* Ambient Background Glow */}
      <div className="absolute -right-24 -top-24 w-48 h-48 rounded-full bg-[#7C5CFC]/5 blur-3xl" />
      
      <div className="flex items-start gap-4">
        <div className="p-3 bg-zinc-800/80 border border-zinc-700/30 rounded-lg shrink-0">
          <LevelIcon className="h-6 w-6 text-[#7C5CFC]" />
        </div>
        <div>
          <span className="text-[10px] font-bold text-[#7C5CFC] uppercase tracking-widest font-mono">
            {activeDetail.tableName} level
          </span>
          <h2 className="text-lg font-bold text-white mt-1">
            {activeDetail.name}
          </h2>
          <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
            {activeDetail.description}
          </p>
        </div>
      </div>

      {activeDetail.id !== "tenant" && (
        <div className="mt-4 flex items-start gap-2.5 p-3.5 rounded-lg bg-amber-500/5 border border-amber-500/10 text-amber-200/90 text-xs leading-relaxed">
          <span className="font-bold shrink-0 uppercase tracking-wider bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded text-[9px] font-mono leading-none">
            Playground Model
          </span>
          <span>
            This tier uses HiveSpace's localized capability mapping schema for RBAC simulation. Roles here serve as visual guides to preview permissions across workspace teams and task boards. Only organization-level (Tenant) assignments are saved to the persistent database.
          </span>
        </div>
      )}
    </div>
  );
}
