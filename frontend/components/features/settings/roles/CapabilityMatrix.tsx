import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { LevelDetail } from "./types";

interface CapabilityMatrixProps {
  activeDetail: LevelDetail;
  handleTogglePermission: (action: string, role: string) => void;
}

export default function CapabilityMatrix({
  activeDetail,
  handleTogglePermission,
}: CapabilityMatrixProps) {
  return (
    <div className="bg-[#1C1B1E] border border-zinc-800/80 rounded-xl overflow-hidden mb-10">
      <div className="px-5 py-4 border-b border-zinc-850 bg-zinc-950/20 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white">
            Granular Capability Matrix
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Review exactly which actions are mapped to which system roles.
          </p>
        </div>
        <span className={cn(
          "text-[9px] font-mono uppercase border px-2 py-0.5 rounded select-none",
          activeDetail.id === "tenant"
            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
            : "bg-amber-500/10 border-amber-500/20 text-amber-400"
        )}>
          {activeDetail.id === "tenant" ? "Enforced by System Engine" : "Simulated Model Playground"}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-850 bg-zinc-950/40 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
              <th className="px-5 py-3 w-1/3">Operation / Capability</th>
              {activeDetail.roles.map((role) => (
                <th key={role.name} className="px-5 py-3 text-center font-bold">
                  {role.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-850 text-xs">
            {activeDetail.matrix.map((row, index) => (
              <tr key={index} className="hover:bg-[#252427]/20 transition-colors">
                <td className="px-5 py-4">
                  <span className="font-semibold text-zinc-200 block">
                    {row.action}
                  </span>
                  <span className="text-[11px] text-zinc-400 mt-0.5 block max-w-xs md:max-w-md">
                    {row.description}
                  </span>
                </td>
                {activeDetail.roles.map((role) => {
                  const isGranted = row.rolesGranted.includes(role.name);
                  return (
                    <td key={role.name} className="px-5 py-4 text-center">
                      <button
                        onClick={() => handleTogglePermission(row.action, role.name)}
                        className={cn(
                          "mx-auto flex items-center h-6 w-11 rounded-full border transition-all duration-300 cursor-pointer relative p-0.5 outline-none focus:ring-1 focus:ring-[#7C5CFC]/30",
                          isGranted 
                            ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/25" 
                            : "bg-zinc-900 border-zinc-800 text-zinc-600 hover:bg-zinc-850/80"
                        )}
                        title={`${role.label}: ${isGranted ? "Granted" : "Blocked"}`}
                      >
                        <div className={cn(
                          "h-4 w-4 rounded-full transition-transform duration-300 flex items-center justify-center transform",
                          isGranted ? "translate-x-5 bg-emerald-400" : "translate-x-0 bg-zinc-600"
                        )}>
                          {isGranted ? (
                            <Check className="h-2.5 w-2.5 text-[#1C1B1E] stroke-[3.5]" />
                          ) : (
                            <X className="h-2.5 w-2.5 text-zinc-300 stroke-[3.5]" />
                          )}
                        </div>
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
