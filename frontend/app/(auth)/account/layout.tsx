import { NavRail } from "@/components/layout/NavRail"
import { AccountSidebar } from "@/components/layout/AccountSidebar"

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#0E0E10] text-[#E5E1E4]">
      <NavRail />
      <AccountSidebar />
      <main className="flex-1 transition-all duration-300 min-w-0 overflow-hidden pl-[296px] bg-[#201F21]">
        <div className="h-full overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
