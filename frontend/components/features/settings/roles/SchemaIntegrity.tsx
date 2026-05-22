import { Terminal, Copy, Fingerprint } from "lucide-react";
import { LevelDetail } from "./types";

interface SchemaIntegrityProps {
  activeDetail: LevelDetail;
  showSql: boolean;
  setShowSql: (show: boolean) => void;
  handleCopyDdl: () => void;
}

export default function SchemaIntegrity({
  activeDetail,
  showSql,
  setShowSql,
  handleCopyDdl,
}: SchemaIntegrityProps) {
  return (
    <div className="bg-[#1C1B1E] border border-zinc-800/80 rounded-xl overflow-hidden">
      <div className="border-b border-zinc-850 bg-zinc-950/40 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-emerald-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
            SQL Schema Integrity
          </span>
        </div>
        <button
          onClick={() => setShowSql(!showSql)}
          className="text-[10px] font-bold text-zinc-400 hover:text-white uppercase tracking-wider cursor-pointer"
        >
          {showSql ? "Hide DDL" : "Show DDL"}
        </button>
      </div>
      
      <div className="p-4 space-y-4">
        <p className="text-xs text-zinc-400">
          HiveSpace secures resource hierarchies directly at the database engine level. This guarantees that role configurations cannot be bypassed.
        </p>

        {showSql && (
          <div className="relative">
            <pre className="text-[10px] font-mono bg-zinc-950 p-3 rounded-lg overflow-x-auto border border-zinc-850 text-zinc-300 leading-normal max-h-64 overflow-y-auto">
              {activeDetail.ddl}
            </pre>
            <button
              onClick={handleCopyDdl}
              title="Copy DDL Code"
              className="absolute right-2 top-2 p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded border border-zinc-750 transition-colors"
            >
              <Copy className="h-3 w-3" />
            </button>
          </div>
        )}

        {activeDetail.indexes && activeDetail.indexes.length > 0 && (
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-zinc-550 uppercase tracking-widest">
              Performance Indices
            </span>
            <div className="space-y-1.5">
              {activeDetail.indexes.map((idx: string, i: number) => (
                <div key={i} className="flex items-center gap-2 bg-zinc-950/50 px-2.5 py-1.5 rounded border border-zinc-850 font-mono text-[9px] text-[#7C5CFC]">
                  <Fingerprint className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                  <span className="truncate">{idx}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
