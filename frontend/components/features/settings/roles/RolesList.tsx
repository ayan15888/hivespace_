import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { RoleDetail } from "./types";

interface RolesListProps {
  roles: RoleDetail[];
}

export default function RolesList({ roles }: RolesListProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest px-1">
        Roles defined at this level
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {roles.map((role) => (
          <div
            key={role.name}
            className="bg-[#1C1B1E] border border-zinc-800/80 rounded-xl p-5 hover:border-zinc-700/60 transition-all duration-300 group"
          >
            <div className="flex items-center justify-between mb-3">
              <Badge className={cn("text-[10px] px-2.5 py-0.5 font-bold uppercase tracking-wider rounded-sm border", role.colorClass)}>
                {role.label}
              </Badge>
              <span className="text-[10px] font-mono text-zinc-600 font-semibold group-hover:text-zinc-500 transition-colors">
                {role.name}
              </span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed mb-4">
              {role.description}
            </p>
            <div className="space-y-1.5">
              {role.capabilities.map((cap, i) => (
                <div key={i} className="flex items-center gap-2 text-[11px] text-zinc-300">
                  <Check className="h-3 w-3 text-emerald-400 shrink-0" />
                  <span className="truncate">{cap}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
