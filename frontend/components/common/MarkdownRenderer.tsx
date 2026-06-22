"use client"

import * as React from "react"
import { Users } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ChannelMemberInfo } from "@/lib/api/channels"
import Link from "next/link"

interface MarkdownRendererProps {
  content: string
  themeColor?: string
  channelMembers?: ChannelMemberInfo[]
}

type Block =
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "bullet"; text: string }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "empty" }
  | { type: "paragraph"; text: string }

export function MarkdownRenderer({
  content,
  themeColor = "#7C5CFC",
  channelMembers = [],
}: MarkdownRendererProps) {
  const renderLineContent = (lineText: string) => {
    if (!lineText) return null

    const regex = /(@\w+|`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g
    const parts = lineText.split(regex)

    return parts.map((part, index) => {
      if (part.startsWith("[") && part.includes("](") && part.endsWith(")")) {
        const closeBracketIndex = part.indexOf("](")
        const linkText = part.slice(1, closeBracketIndex)
        const linkUrl = part.slice(closeBracketIndex + 2, -1)
        const isExternal = linkUrl.startsWith("http://") || linkUrl.startsWith("https://")

        if (isExternal) {
          return (
            <a
              key={index}
              href={linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold hover:opacity-85 transition-opacity"
              style={{ color: themeColor }}
            >
              {linkText}
            </a>
          )
        } else {
          return (
            <Link
              key={index}
              href={linkUrl}
              className="underline font-semibold hover:opacity-85 transition-opacity"
              style={{ color: themeColor }}
            >
              {linkText}
            </Link>
          )
        }
      }

      if (part.startsWith("@") && part.length > 1) {
        const username = part.slice(1)
        if (
          username.toLowerCase() === "all" ||
          username.toLowerCase() === "everyone"
        ) {
          return (
            <span
              key={index}
              className="mx-1 inline-flex items-center gap-1.5 rounded-full bg-zinc-850 px-2 py-0.5 align-middle border border-zinc-700/50"
            >
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-zinc-300">
                <Users className="h-[10px] w-[10px]" />
              </span>
              <span
                className="font-bold tracking-tight text-white"
                style={{ color: themeColor }}
              >
                {part}
              </span>
            </span>
          )
        }

        const member = channelMembers.find(
          (item) => item.username.toLowerCase() === username.toLowerCase()
        )
        const displayUsername =
          member?.fullName || member?.username || username
        const initial = displayUsername.charAt(0).toUpperCase()
        const colors = [
          "bg-emerald-500",
          "bg-blue-500",
          "bg-violet-500",
          "bg-orange-500",
          "bg-pink-500",
        ]
        const colorIndex =
          Math.abs(
            displayUsername
              .split("")
              .reduce((acc, char) => acc + char.charCodeAt(0), 0)
          ) % colors.length
        const avatarContent = member?.avatarUrl ? (
          <img
            src={member.avatarUrl}
            alt=""
            className="h-full w-full rounded-full object-cover"
          />
        ) : (
          <span
            className={cn(
              "flex h-full w-full items-center justify-center rounded-full text-[9px] font-bold text-white",
              member?.avatarColor ? "" : colors[colorIndex]
            )}
            style={
              member?.avatarColor
                ? { backgroundColor: member.avatarColor }
                : undefined
            }
          >
            {initial}
          </span>
        )

        return (
          <span
            key={index}
            className="mx-1 inline-flex items-center gap-1.5 rounded-full bg-zinc-850 px-2 py-0.5 align-middle border border-zinc-700/50"
          >
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full">
              {avatarContent}
            </span>
            <span
              className="font-bold tracking-tight text-white"
              style={{ color: themeColor }}
            >
              {part}
            </span>
          </span>
        )
      }

      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code
            key={index}
            className="mx-1 rounded border border-zinc-700/50 bg-zinc-850 px-1.5 py-0.5 font-mono text-[12px] text-pink-400"
          >
            {part.slice(1, -1)}
          </code>
        )
      }

      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={index} className="font-extrabold text-white">
            {part.slice(2, -2)}
          </strong>
        )
      }

      if (part.startsWith("*") && part.endsWith("*")) {
        return (
          <span key={index} className="font-semibold italic text-white/95">
            {part.slice(1, -1)}
          </span>
        )
      }

      return (
        <span key={index} className="whitespace-pre-wrap">
          {part}
        </span>
      )
    })
  }

  const parseBlocks = (rawContent: string): Block[] => {
    const lines = (rawContent || "").split("\n")
    const parsedBlocks: Block[] = []
    let currentTableRows: string[] = []

    const flushTable = () => {
      if (currentTableRows.length > 0) {
        const tableLines = currentTableRows
          .map((l) => l.trim())
          .filter((l) => l.startsWith("|") && l.endsWith("|"))

        if (tableLines.length >= 2) {
          const rawHeaders = tableLines[0]
            .slice(1, -1)
            .split("|")
            .map((s) => s.trim())

          let startIndex = 1
          // Skip the separator row if present
          if (tableLines[1].replace(/[\s\-|:|]/g, "") === "") {
            startIndex = 2
          }

          const rows: string[][] = []
          for (let i = startIndex; i < tableLines.length; i++) {
            const cells = tableLines[i]
              .slice(1, -1)
              .split("|")
              .map((s) => s.trim())
            rows.push(cells)
          }

          parsedBlocks.push({
            type: "table",
            headers: rawHeaders,
            rows,
          })
        } else {
          currentTableRows.forEach((l) => {
            parsedBlocks.push({ type: "paragraph", text: l })
          })
        }
        currentTableRows = []
      }
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const trimmed = line.trim()

      const isTableRow = trimmed.startsWith("|") && trimmed.endsWith("|")

      if (isTableRow) {
        currentTableRows.push(line)
      } else {
        flushTable()
        if (trimmed === "") {
          parsedBlocks.push({ type: "empty" })
        } else if (trimmed.startsWith("### ")) {
          parsedBlocks.push({
            type: "heading",
            level: 3,
            text: trimmed.replace(/^###\s+/, ""),
          })
        } else if (trimmed.startsWith("## ")) {
          parsedBlocks.push({
            type: "heading",
            level: 2,
            text: trimmed.replace(/^##\s+/, ""),
          })
        } else if (trimmed.startsWith("# ")) {
          parsedBlocks.push({
            type: "heading",
            level: 1,
            text: trimmed.replace(/^#\s+/, ""),
          })
        } else if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
          parsedBlocks.push({
            type: "bullet",
            text: trimmed.replace(/^(\*|-)\s+/, ""),
          })
        } else {
          parsedBlocks.push({ type: "paragraph", text: line })
        }
      }
    }

    flushTable()
    return parsedBlocks
  }

  const blocks = parseBlocks(content)

  return (
    <>
      {blocks.map((block, blockIndex) => {
        switch (block.type) {
          case "empty":
            return <div key={blockIndex} className="min-h-[1.25rem]" />
          case "heading": {
            if (block.level === 3) {
              return (
                <h2
                  key={blockIndex}
                  className="text-base font-extrabold text-white mt-3 mb-1.5 leading-snug"
                >
                  {renderLineContent(block.text)}
                </h2>
              )
            }
            if (block.level === 2) {
              return (
                <h1
                  key={blockIndex}
                  className="text-lg font-extrabold text-white mt-4 mb-2 leading-snug"
                >
                  {renderLineContent(block.text)}
                </h1>
              )
            }
            return (
              <h1
                key={blockIndex}
                className="text-xl font-extrabold text-white mt-5 mb-2.5 leading-tight"
              >
                {renderLineContent(block.text)}
              </h1>
            )
          }
          case "bullet":
            return (
              <div key={blockIndex} className="my-1 flex items-start gap-2 pl-4">
                <span className="mt-1 select-none font-bold text-zinc-500">•</span>
                <div className="flex-1 text-sm text-foreground">
                  {renderLineContent(block.text)}
                </div>
              </div>
            )
          case "table":
            return (
              <div
                key={blockIndex}
                className="my-3 overflow-x-auto rounded-lg border border-[#2e2720]/45 bg-[#16120e] max-w-full"
              >
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#2e2720] bg-[#221e1a]/55">
                      {block.headers.map((hdr, hIdx) => (
                        <th
                          key={hIdx}
                          className="px-3.5 py-2.5 font-bold text-white uppercase tracking-wider border-r border-[#2e2720]/45 last:border-r-0"
                        >
                          {renderLineContent(hdr)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, rIdx) => (
                      <tr
                        key={rIdx}
                        className="border-b border-[#2e2720]/45 last:border-b-0 hover:bg-[#221e1a]/30 transition-colors"
                      >
                        {row.map((cell, cIdx) => (
                          <td
                            key={cIdx}
                            className="px-3.5 py-2.5 text-zinc-300 border-r border-[#2e2720]/45 last:border-r-0"
                          >
                            {renderLineContent(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          case "paragraph":
            return (
              <div
                key={blockIndex}
                className="min-h-[1.25rem] text-sm text-foreground"
              >
                {renderLineContent(block.text)}
              </div>
            )
          default:
            return null
        }
      })}
    </>
  )
}