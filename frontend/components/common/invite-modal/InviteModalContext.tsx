"use client"

import * as React from "react"
import type { UseInviteModalReturn } from "@/hooks/useInviteModal"

const InviteModalContext = React.createContext<UseInviteModalReturn | null>(null)

export function InviteModalProvider({
  value,
  children,
}: {
  value: UseInviteModalReturn
  children: React.ReactNode
}) {
  return <InviteModalContext.Provider value={value}>{children}</InviteModalContext.Provider>
}

export function useInviteModalContext() {
  const ctx = React.useContext(InviteModalContext)
  if (!ctx) throw new Error("useInviteModalContext must be used within InviteModalProvider")
  return ctx
}

