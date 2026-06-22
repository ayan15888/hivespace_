"use client"

import { useEffect, useRef } from "react"
import { ArrowUp, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

type InputBarProps = {
  value: string
  onChange: (val: string) => void
  onSend: () => void
  disabled: boolean
  isActive: boolean // if true: positioned at bottom. if false: positioned in center empty state.
}

export function InputBar({
  value,
  onChange,
  onSend,
  disabled,
  isActive,
}: InputBarProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-focus on mount
  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  // Auto-grow logic
  useEffect(() => {
    const tx = textareaRef.current
    if (!tx) return
    tx.style.height = "auto"
    tx.style.height = `${Math.min(tx.scrollHeight, 128)}px` // Max height ~5 lines (128px)
  }, [value])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (!disabled && value.trim()) {
        onSend()
      }
    }
  }

  return (
    <div
      className={cn(
        "w-full transition-all duration-300 px-4",
        isActive
          ? "border-t border-[#2e2720] bg-[#191511]/80 backdrop-blur-md py-4"
          : "max-w-[800px] mx-auto mt-4"
      )}
    >
      <div className="relative flex items-end rounded-2xl border border-[#2e2720] bg-[#221e1a] p-3 shadow-lg focus-within:border-[#D97757]/50 transition-colors max-w-[800px] mx-auto w-full">
        <Sparkles className="mb-2 h-4 w-4 shrink-0 text-[#D97757]/40 mr-2.5" />
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything across your workspace..."
          disabled={disabled}
          rows={1}
          className="flex-1 max-h-[128px] resize-none bg-transparent py-0.5 text-xs text-[#EDE8E3] outline-none placeholder:text-[#6b5a4e] disabled:cursor-not-allowed leading-5"
        />
        <button
          onClick={onSend}
          disabled={disabled || !value.trim()}
          className={cn(
            "ml-2.5 h-8 w-8 shrink-0 rounded-xl flex items-center justify-center transition-colors duration-200",
            value.trim()
              ? "bg-[#b05730] hover:bg-[#964724] text-white cursor-pointer"
              : "bg-[#2e2720]/40 text-[#6b5a4e]/50 cursor-not-allowed"
          )}
        >
          <ArrowUp className="h-4 w-4 stroke-[2.5]" />
        </button>
      </div>
      {!isActive && (
        <p className="mt-3 text-center text-[10px] uppercase tracking-[0.2em] text-[#8C7B6E]">
          AI accesses workspace tasks, documents, and chat transcripts
        </p>
      )}
    </div>
  )
}
