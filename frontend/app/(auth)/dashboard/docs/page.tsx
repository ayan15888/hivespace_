"use client"

import { useEffect } from "react"
import { DocsHomeView } from "@/components/features/docs/DocsHomeView"
import { useDocSidebarState } from "@/store/docSidebarStore"

export default function DocsHomePage() {
  const { setActiveDoc } = useDocSidebarState()

  useEffect(() => {
    setActiveDoc(null)
  }, [setActiveDoc])

  return <DocsHomeView />
}
