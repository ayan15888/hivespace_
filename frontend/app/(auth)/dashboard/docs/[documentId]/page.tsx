"use client"

import { use } from "react"
import { DocEditorView } from "@/components/features/docs/DocEditorView"

export default function DocPage({
  params,
}: {
  params: Promise<{ documentId: string }>
}) {
  const { documentId } = use(params)
  return <DocEditorView documentId={documentId} />
}
