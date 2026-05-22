import { Users2 } from "lucide-react";
import { LevelType, LevelDetail } from "./types";

interface ActiveRolesDirectoryProps {
  activeDetail: LevelDetail;
  activeLevel: LevelType;
  membersList: any[];
  handlePromoteMember: (userId: string, targetRole: string) => void;
  getMappedRole: (role: string, level: LevelType) => string;
  canManage: boolean; // Dynamic security check
  currentUserRole: string; // Logged-in user's role
}

export default function ActiveRolesDirectory({
  activeDetail,
  activeLevel,
  membersList,
  handlePromoteMember,
  getMappedRole,
  canManage,
  currentUserRole,
}: ActiveRolesDirectoryProps) {
  return (
    <div className="bg-[#1C1B1E] border border-zinc-800/80 rounded-xl p-6 mb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-850 pb-4 mb-5">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Users2 className="h-4 w-4 text-[#7C5CFC]" />
            Active Roles Allocation ({activeDetail.id})
          </h3>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            {canManage 
              ? "Directly promote roles for existing organization members."
              : "View all active role allocations and security clearances for this level."
            }
          </p>
        </div>
      </div>

      {/* COMPACT MINIMALIST LIST */}
      <div className="space-y-2">
        {membersList.length === 0 ? (
          <div className="text-center text-xs text-zinc-500 py-6 border border-dashed border-zinc-800/40 rounded-lg bg-zinc-950/10">
            No allocations recorded for this level.
          </div>
        ) : (
          membersList.map((member) => {
            const currentMappedRole = getMappedRole(member.role, activeLevel);
            const isOwnerRow = member.role === "OWNER";
            const isAdminRow = member.role === "ADMIN";
            
            // Disable dropdown for OWNER row, and for ADMIN rows if logged-in user is an ADMIN
            const isDisabled = !canManage || isOwnerRow || (currentUserRole === "ADMIN" && isAdminRow);

            // Filter selectable roles: Owner option is never assignable, and Admins cannot promote to Admin
            const allowedRoles = activeDetail.roles.filter((r) => {
              if (r.name === member.role) return true; // Always include the current role for display
              if (r.name === "OWNER") return false;
              if (currentUserRole === "ADMIN" && r.name === "ADMIN") return false;
              return true;
            });

            return (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 rounded-lg border border-zinc-850/40 bg-zinc-950/10 hover:bg-[#252427]/10 transition-colors group h-12"
              >
                {/* Left: Identity Details */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-7 w-7 rounded-full bg-zinc-850 flex items-center justify-center font-bold text-[10px] text-[#7C5CFC] border border-[#7C5CFC]/10">
                    {member.fullName.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-zinc-200 block truncate leading-tight">
                      {member.fullName}
                    </span>
                    <span className="text-[10px] text-zinc-500 block truncate leading-none mt-0.5">
                      {member.email}
                    </span>
                  </div>
                </div>

                {/* Right: Controls */}
                <div className="flex items-center gap-4 shrink-0">
                  {/* Promote Role Select */}
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono text-zinc-550 uppercase">Role:</span>
                    <select
                      value={currentMappedRole}
                      disabled={isDisabled}
                      onChange={(e) => handlePromoteMember(member.id, e.target.value)}
                      className="bg-zinc-900 border border-zinc-800/80 rounded px-2 py-0.5 text-[10.5px] text-zinc-300 font-semibold focus:outline-none focus:border-[#7C5CFC]/45 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {allowedRoles.map((r) => (
                        <option key={r.name} value={r.name} className="bg-[#1C1B1E]">
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
