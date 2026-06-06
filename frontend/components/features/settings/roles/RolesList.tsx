import { useState } from "react";
import { HelpCircle, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { RoleDetail } from "./types";

interface RolesListProps {
  roles: RoleDetail[];
}

interface RoleCardProps {
  role: RoleDetail;
}

function RoleCard({ role }: RoleCardProps) {
  const [showClearances, setShowClearances] = useState(false);

  return (
    <div className="bg-[#1C1B1E] border border-zinc-850/80 rounded-xl p-4.5 hover:border-zinc-700/60 transition-all duration-300 group flex flex-col justify-between relative min-h-[125px]">
      <div>
        <div className="flex items-center justify-between mb-3">
          <Badge className={cn("text-[10px] px-2.5 py-0.5 font-bold uppercase tracking-wider rounded border shrink-0", role.colorClass)}>
            {role.label}
          </Badge>
          
          {/* HELP CLEARANCES ICON TOGGLE */}
          <button
            onClick={() => setShowClearances(!showClearances)}
            type="button"
            title={showClearances ? "Hide permissions details" : "Show permissions details"}
            className={cn(
              "py-1 px-2.5 rounded border border-zinc-800 text-[10px] font-bold uppercase tracking-wider text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all cursor-pointer flex items-center gap-1.5",
              showClearances && "bg-[#7C5CFC]/10 border-[#7C5CFC]/30 text-[#7C5CFC] hover:bg-[#7C5CFC]/20"
            )}
          >
            <HelpCircle className="h-3.5 w-3.5 shrink-0" />
            <span>Clearances</span>
          </button>
        </div>

        <p className="text-xs text-zinc-350 leading-relaxed mb-1 pr-2">
          {role.description}
        </p>
      </div>

      {/* COLLAPSIBLE SYSTEM CLEARANCES ACCORDION */}
      {showClearances && (
        <div className="mt-3.5 pt-3.5 border-t border-zinc-850/60 animate-in fade-in slide-in-from-top-1.5 duration-250">
          <span className="text-[9px] font-bold text-[#7C5CFC] uppercase tracking-widest block mb-2 font-mono">
            System Clearances Granted
          </span>
          <div className="grid grid-cols-1 gap-2">
            {role.capabilities.map((cap, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-zinc-200">
                <Check className="h-4 w-4 text-emerald-450 shrink-0 stroke-[2.5]" />
                <span className="truncate">{cap}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function RolesList({ roles }: RolesListProps) {
  const cols = roles.length;

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-bold text-zinc-450 uppercase tracking-widest px-1">
        Defined Roles & Clearances
      </h3>
      <div 
        className={cn(
          "grid grid-cols-1 gap-4 w-full",
          cols === 2 && "md:grid-cols-2",
          cols === 3 && "md:grid-cols-3",
          cols === 4 && "md:grid-cols-4"
        )}
      >
        {roles.map((role) => (
          <RoleCard key={role.name} role={role} />
        ))}
      </div>
    </div>
  );
}
