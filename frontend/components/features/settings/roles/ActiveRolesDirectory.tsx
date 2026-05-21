import { Users2, UserPlus, Trash2 } from "lucide-react";
import { LevelType, LevelDetail } from "./types";

interface ActiveRolesDirectoryProps {
  activeDetail: LevelDetail;
  activeLevel: LevelType;
  membersList: any[];
  newEmail: string;
  setNewEmail: (email: string) => void;
  newRole: string;
  setNewRole: (role: string) => void;
  handleAssignUser: (e: React.FormEvent) => void;
  handlePromoteMember: (userId: string, targetRole: string) => void;
  handleRevokeMember: (userId: string) => void;
  getMappedRole: (role: string, level: LevelType) => string;
  canManage: boolean; // Dynamic security check
}

export default function ActiveRolesDirectory({
  activeDetail,
  activeLevel,
  membersList,
  newEmail,
  setNewEmail,
  newRole,
  setNewRole,
  handleAssignUser,
  handlePromoteMember,
  handleRevokeMember,
  getMappedRole,
  canManage,
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
              ? "Directly promote roles, assign new user allocations, or revoke active level credentials."
              : "View all active role allocations and security clearances for this level."
            }
          </p>
        </div>
        
        {/* MINIMALIST ASSIGN FORM - HIDDEN IF USER LACKS PRIVILEGES */}
        {canManage && (
          <form onSubmit={handleAssignUser} className="flex items-center gap-2">
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="user@example.com"
              className="bg-zinc-950/60 border border-zinc-800/80 rounded px-2.5 py-1 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-[#7C5CFC]/60 transition-colors w-40 md:w-48"
            />
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="bg-zinc-950/60 border border-zinc-800/80 rounded px-2 py-1 text-xs text-zinc-300 focus:outline-none focus:border-[#7C5CFC]/60 transition-colors cursor-pointer"
            >
              {activeDetail.roles.map((r) => (
                <option key={r.name} value={r.name} className="bg-[#1C1B1E]">
                  {r.label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="bg-[#7C5CFC]/10 border border-[#7C5CFC]/30 text-white hover:bg-[#7C5CFC] hover:text-white px-2.5 py-1 rounded text-xs transition-all duration-300 flex items-center gap-1 cursor-pointer font-medium"
            >
              <UserPlus className="h-3 w-3" />
              <span>Assign</span>
            </button>
          </form>
        )}
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
                      disabled={!canManage}
                      onChange={(e) => handlePromoteMember(member.id, e.target.value)}
                      className="bg-zinc-900 border border-zinc-800/80 rounded px-2 py-0.5 text-[10.5px] text-zinc-300 font-semibold focus:outline-none focus:border-[#7C5CFC]/45 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {activeDetail.roles.map((r) => (
                        <option key={r.name} value={r.name} className="bg-[#1C1B1E]">
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Revoke Action - HIDE IF USER LACKS PRIVILEGES */}
                  {canManage && (
                    <button
                      onClick={() => handleRevokeMember(member.id)}
                      title="Revoke level credentials"
                      className="text-zinc-650 hover:text-red-400 p-1.5 rounded transition-colors opacity-60 group-hover:opacity-100 cursor-pointer hover:bg-red-500/5 border border-transparent hover:border-red-500/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
