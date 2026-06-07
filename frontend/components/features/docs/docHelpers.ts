function isProseMirrorDoc(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as Record<string, unknown>).type === "doc" &&
    Array.isArray((value as Record<string, unknown>).content)
  )
}

/** Parse content from DB (ProseMirror JSON string) or legacy HTML for Tiptap. */
export function parseStoredContent(
  raw: string | Record<string, unknown> | null | undefined
): string | Record<string, unknown> {
  if (!raw) return ""
  if (typeof raw === "object") {
    return isProseMirrorDoc(raw) ? raw : ""
  }
  const trimmed = raw.trim()
  if (!trimmed) return ""

  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as unknown
      return isProseMirrorDoc(parsed) ? parsed : ""
    } catch {
      return ""
    }
  }

  // Legacy rows saved as HTML before JSONB fix
  if (trimmed.startsWith("<")) return trimmed
  return ""
}

export function formatTimeAgo(dateStr: string): string {
  if (!dateStr) return ""
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) return "just now"
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHour < 24) return `${diffHour}h ago`
  if (diffDay < 7) return `${diffDay}d ago`
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return ""
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export function getInitials(name: string | null | undefined): string {
  if (!name) return "?"
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}
