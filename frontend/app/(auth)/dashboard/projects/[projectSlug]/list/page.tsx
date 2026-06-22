"use client"

import { useState, useEffect, useRef } from "react"
import { LayoutList, Calendar, Search, CheckSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useParams } from "next/navigation"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { getProjectMembers, ProjectMemberResponse } from "@/lib/api/projects"

import { cn, getAvatarColorClass } from "@/lib/utils"
import { useTasks } from "@/hooks/useTasks"
import { useProjects } from "@/hooks/useProjects"
import { PROJECT_COLOR_MAP } from "@/lib/constants/colors"
import { deleteTask } from "@/lib/api/tasks"
import { gooeyToast as toast } from "@/components/ui/goey-toaster"
import { useTaskStore } from "@/store/taskStore"
import { TaskDetailSheet } from "../board/components/TaskDetailSheet"

const STATUS_FILTER_OPTIONS = ["All", "Todo", "In Progress", "Review", "Done"]
const PRIORITY_FILTER_OPTIONS = ["All", "Urgent", "High", "Medium", "Low"]

const STATUS_BADGE_CLASSES: Record<string, string> = {
  TODO: "text-zinc-400 bg-zinc-400/10 border-zinc-500/20",
  IN_PROGRESS: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  IN_REVIEW: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  DONE: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  CANCELLED: "text-red-400 bg-red-500/10 border-red-500/20",
}

const PRIORITY_BADGE_CLASSES: Record<string, string> = {
  URGENT: "text-red-400 bg-red-500/10 border-red-500/20",
  HIGH: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  MEDIUM: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  LOW: "text-zinc-400 bg-zinc-500/10 border-zinc-500/20",
}

export default function ProjectListPage() {
  const params = useParams()
  const { projects } = useProjects()
  const projectId = (params?.projectSlug as string) || ""

  const currentProject = projects.find((p) => p.id === projectId)
  const themeColor = PROJECT_COLOR_MAP[currentProject?.color || ""] || "#7C5CFC"
  const displayTitle = currentProject?.name || "Project"

  const { tasks, refresh } = useTasks(projectId)
  const updateTaskInStore = useTaskStore((state) => state.updateTask)
  const removeTaskFromStore = useTaskStore((state) => state.removeTask)

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const selectedTask = tasks.find((t) => t.id === selectedTaskId) || null

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("All")
  const [priorityFilter, setPriorityFilter] = useState("All")

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  const searchInputRef = useRef<HTMLInputElement>(null)

  // Keyboard shortcut listener to focus search bar (Cmd+K, Ctrl+K, or '/')
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        searchInputRef.current?.focus()
      } else if (e.key === "/") {
        const active = document.activeElement
        if (
          active &&
          (active.tagName === "INPUT" || active.tagName === "TEXTAREA")
        ) {
          return
        }
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  // Query Project Members
  const { data: projectMembers = [] } = useQuery<
    ProjectMemberResponse[],
    Error
  >({
    queryKey: ["projectMembers", projectId],
    queryFn: () => getProjectMembers(projectId),
    enabled:
      !!projectId &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        projectId
      ),
    staleTime: 30_000,
  })

  const startDateStr = currentProject?.startDate
    ? new Date(currentProject.startDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : ""
  const endDateStr = currentProject?.endDate
    ? new Date(currentProject.endDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : ""
  const dateRangeStr =
    startDateStr && endDateStr
      ? `${startDateStr} – ${endDateStr}`
      : "No dates set"

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(taskId)
      toast.success("Task deleted successfully")
      removeTaskFromStore(taskId)
      if (selectedTaskId === taskId) {
        setSelectedTaskId(null)
      }
      refresh()
    } catch (err) {
      toast.error("Failed to delete task")
    }
  }

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.taskIdentifier &&
        task.taskIdentifier.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesStatus =
      statusFilter === "All" ||
      task.status.toLowerCase().replace("_", "") ===
        statusFilter.toLowerCase().replace(" ", "")

    const matchesPriority =
      priorityFilter === "All" ||
      task.priority.toLowerCase() === priorityFilter.toLowerCase()

    return matchesSearch && matchesStatus && matchesPriority
  })

  // Calculate pagination details
  const totalRecords = filteredTasks.length
  const totalPages = Math.ceil(totalRecords / pageSize) || 1
  const startIndex = (currentPage - 1) * pageSize
  const paginatedTasks = filteredTasks.slice(startIndex, startIndex + pageSize)

  const getInitials = (name?: string) => {
    if (!name) return "--"
    return name
      .trim()
      .split(/\s+/)
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background font-sans text-foreground">
      {/* --- TOP BREADCRUMB BAR --- */}
      <header className="sticky top-0 z-30 flex h-[44px] shrink-0 items-center justify-between border-b border-border/50 bg-[#161210]/90 px-6 backdrop-blur-md">
        <div className="flex flex-1 items-center gap-2">
          <span className="text-xs text-muted-foreground">Hivespace</span>
          <span className="text-border">/</span>
          <span className="text-xs text-muted-foreground">Engineering</span>
          <span className="text-border">/</span>
          <span className="text-xs font-medium text-foreground">
            {displayTitle}
          </span>

          <div className="ml-3 flex items-center rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            {displayTitle} · {dateRangeStr}
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex h-full items-center gap-6">
          <Link
            href={`/dashboard/projects/${projectId}`}
            className="flex h-full items-center px-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Overview
          </Link>
          <Link
            href={`/dashboard/projects/${projectId}/board`}
            className="flex h-full items-center px-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Board
          </Link>
          <button className="relative flex h-full items-center px-1 text-sm font-medium text-foreground">
            List
            <div
              className="absolute bottom-0 left-0 h-[2px] w-full"
              style={{ backgroundColor: themeColor }}
            />
          </button>
          <Link
            href={`/dashboard/projects/${projectId}/timeline`}
            className="flex h-full items-center px-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Timeline
          </Link>
          <Link
            href={`/dashboard/projects/${projectId}/backlog`}
            className="flex h-full items-center px-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Backlog
          </Link>
        </nav>

        {/* Project members */}
        <div className="flex flex-1 items-center justify-end gap-2">
          <div className="mr-2 ml-2 flex items-center">
            {projectMembers.slice(0, 5).map((member) => {
              const name = member.fullName || member.username
              const initials = getInitials(name)
              return (
                <Avatar
                  key={member.id}
                  className="-ml-1.5 h-6 w-6 border border-border/50 ring-2 ring-background first:ml-0"
                  username={name}
                  email={
                    member.email ||
                    `${member.username.toLowerCase()}@hivespace.io`
                  }
                >
                  <AvatarFallback
                    className={cn(
                      "text-[9px] font-semibold",
                      getAvatarColorClass(initials)
                    )}
                  >
                    {initials}
                  </AvatarFallback>
                </Avatar>
              )
            })}
            {projectMembers.length > 5 && (
              <div className="z-30 -ml-1.5 flex h-6 w-6 items-center justify-center rounded-full border border-border/50 bg-zinc-900 text-[9px] font-extrabold text-zinc-400 ring-2 ring-background">
                +{projectMembers.length - 5}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* --- STICKY PAGE HEADER & CONTROLS --- */}
      <div className="sticky top-[44px] z-20 flex shrink-0 flex-col items-stretch justify-between gap-4 border-b border-border/40 bg-[#161210] px-6 py-3.5 md:flex-row md:items-center">
        <div className="flex items-center gap-3">
          <LayoutList className="h-5 w-5" style={{ color: themeColor }} />
          <div>
            <h1 className="text-sm leading-none font-bold text-[#E5E1E4]">
              Task List View
            </h1>
            <p className="mt-1 text-[10px] text-zinc-500">
              Manage and filter project tasks in a structured list.
            </p>
          </div>
        </div>

        {/* Filters & Search - Search is dominant */}
        <div className="ml-auto flex max-w-xl flex-1 items-center gap-3 md:justify-end">
          <div className="relative max-w-xs flex-1 md:max-w-sm">
            <Search className="absolute top-2.5 left-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search tasks... (⌘K or /)"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1)
              }}
              className="h-8 w-full rounded-md border border-border/40 bg-muted/50 pr-3 pl-8 text-xs text-foreground transition-colors outline-none placeholder:text-muted-foreground/60 focus:border-border"
            />
          </div>

          <div className="flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-border/40 bg-[#1C1B1F] px-2.5">
            <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
              Status
            </span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="cursor-pointer border-none bg-transparent text-xs font-semibold text-foreground outline-none"
            >
              {STATUS_FILTER_OPTIONS.map((opt) => (
                <option key={opt} value={opt} className="bg-zinc-900">
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div className="flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-border/40 bg-[#1C1B1F] px-2.5">
            <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
              Priority
            </span>
            <select
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="cursor-pointer border-none bg-transparent text-xs font-semibold text-foreground outline-none"
            >
              {PRIORITY_FILTER_OPTIONS.map((opt) => (
                <option key={opt} value={opt} className="bg-zinc-900">
                  {opt}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* --- CONTENT AREA (CONTAINING TABLE & PAGINATION) --- */}
      <div className="relative flex min-h-0 flex-1 flex-col bg-[#191511]">
        {/* Table rows scrollable area */}
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full table-fixed border-collapse text-left">
            <thead className="sticky top-0 z-10 bg-[#191511] shadow-[0_1px_0_rgba(255,255,255,0.06)]">
              <tr className="border-b border-white/[0.06] bg-[#1C1B1F]/30 text-[10px] font-bold tracking-wider text-zinc-500 uppercase">
                <th className="w-24 px-6 py-3 font-semibold">ID</th>
                <th className="px-6 py-3 font-semibold">Task Title</th>
                <th className="w-40 px-6 py-3 font-semibold">Status</th>
                <th className="w-32 px-6 py-3 font-semibold">Priority</th>
                <th className="w-48 px-6 py-3 font-semibold">Assignee</th>
                <th className="w-24 px-6 py-3 text-center font-semibold">
                  Points
                </th>
                <th className="w-40 px-6 py-3 font-semibold">Due Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {paginatedTasks.length > 0 ? (
                paginatedTasks.map((task) => {
                  const statusClass =
                    STATUS_BADGE_CLASSES[task.status] ||
                    "text-zinc-400 bg-zinc-400/10 border-zinc-500/20"
                  const priorityClass =
                    PRIORITY_BADGE_CLASSES[task.priority] ||
                    "text-zinc-400 bg-zinc-400/10 border-zinc-500/20"

                  return (
                    <tr
                      key={task.id}
                      onClick={() => setSelectedTaskId(task.id)}
                      className="group cursor-pointer transition-colors hover:bg-white/[0.02] active:bg-white/[0.04]"
                    >
                      {/* ID Column */}
                      <td className="truncate px-6 py-3 font-mono text-xs font-semibold text-zinc-500 group-hover:text-zinc-400">
                        {task.taskIdentifier || `HS-${task.id.substring(0, 4)}`}
                      </td>
                      {/* Title Column */}
                      <td className="truncate px-6 py-3">
                        <span className="block truncate text-xs font-semibold text-zinc-200 transition-colors group-hover:text-white">
                          {task.title}
                        </span>
                      </td>
                      {/* Status Column */}
                      <td className="px-6 py-3">
                        <span
                          className={cn(
                            "inline-block whitespace-nowrap rounded border px-2 py-0.5 text-[9px] leading-none font-extrabold tracking-wider uppercase",
                            statusClass
                          )}
                        >
                          {task.status.replace("_", " ")}
                        </span>
                      </td>
                      {/* Priority Column */}
                      <td className="px-6 py-3">
                        <span
                          className={cn(
                            "inline-block whitespace-nowrap rounded border px-2 py-0.5 text-[9px] leading-none font-extrabold tracking-wider uppercase",
                            priorityClass
                          )}
                        >
                          {task.priority}
                        </span>
                      </td>
                      {/* Assignee Column */}
                      <td className="truncate px-6 py-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <Avatar
                            className="h-6 w-6 shrink-0 border border-zinc-800"
                            username={task.assigneeName || "Unassigned"}
                            email={
                              task.assigneeName
                                ? `${task.assigneeName.toLowerCase().replace(/\s+/g, "")}@hivespace.io`
                                : ""
                            }
                          >
                            <AvatarFallback className="bg-zinc-800 text-[9px] font-extrabold text-zinc-400">
                              {task.assigneeInitials || "--"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="truncate text-xs font-medium text-zinc-400 transition-colors group-hover:text-zinc-200">
                            {task.assigneeName || "Unassigned"}
                          </span>
                        </div>
                      </td>
                      {/* Points Column */}
                      <td className="px-6 py-3 text-center">
                        {task.points !== undefined ? (
                          <span className="rounded border border-border/30 bg-[#1C1B1F] px-2 py-0.5 font-mono text-xs font-bold text-zinc-400">
                            {task.points}
                          </span>
                        ) : (
                          <span className="font-mono text-xs text-zinc-600">
                            -
                          </span>
                        )}
                      </td>
                      {/* Due Date Column */}
                      <td className="px-6 py-3">
                        {task.dueDate ? (
                          <div className="flex items-center gap-1.5 font-mono text-xs text-zinc-400">
                            <Calendar className="h-3.5 w-3.5 text-zinc-500" />
                            <span>
                              {new Date(task.dueDate).toLocaleDateString()}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-zinc-600 italic">
                            No date
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center text-center">
                      <CheckSquare
                        className="mb-2.5 h-10 w-10 text-zinc-600"
                        strokeWidth={1}
                      />
                      <p className="text-xs font-semibold text-zinc-400">
                        No matching tasks found
                      </p>
                      <p className="mt-1 text-[11px] text-zinc-500">
                        Try modifying your search query or filters.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls fixed at the bottom */}
        <div className="flex shrink-0 items-center justify-between border-t border-border/40 bg-[#161210] px-6 py-2.5 text-xs text-zinc-400 select-none">
          <div className="flex items-center gap-1.5 font-medium">
            <span>Showing</span>
            <span className="font-mono text-zinc-200">
              {totalRecords === 0 ? 0 : startIndex + 1}-
              {Math.min(totalRecords, startIndex + pageSize)}
            </span>
            <span>of</span>
            <span className="font-mono text-zinc-200">{totalRecords}</span>
            <span>tasks</span>
          </div>

          <div className="flex items-center gap-6">
            {/* Configurable page size */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                Per Page:
              </span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value))
                  setCurrentPage(1)
                }}
                className="cursor-pointer rounded-md border border-border/30 bg-[#1C1B1F] px-2 py-0.5 text-xs font-semibold text-foreground outline-none"
              >
                {[10, 25, 50, 100].map((size) => (
                  <option key={size} value={size} className="bg-zinc-900">
                    {size}
                  </option>
                ))}
              </select>
            </div>

            {/* Prev/Next buttons */}
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="h-7 rounded-lg border-border/40 bg-zinc-950/20 px-2.5 text-[11px] font-bold hover:bg-muted"
              >
                Prev
              </Button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <Button
                      key={page}
                      size="sm"
                      variant={currentPage === page ? "default" : "ghost"}
                      onClick={() => setCurrentPage(page)}
                      className={cn(
                        "h-7 w-7 rounded-lg font-mono text-xs font-bold",
                        currentPage === page
                          ? "bg-primary font-black text-primary-foreground"
                          : "text-zinc-500 hover:text-white"
                      )}
                      style={
                        currentPage === page
                          ? { backgroundColor: themeColor }
                          : {}
                      }
                    >
                      {page}
                    </Button>
                  )
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                }
                disabled={currentPage === totalPages}
                className="h-7 rounded-lg border-border/40 bg-zinc-950/20 px-2.5 text-[11px] font-bold hover:bg-muted"
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* --- TASK DETAIL SHEET OVERLAY --- */}
      <TaskDetailSheet
        selectedTask={selectedTask}
        onClose={() => setSelectedTaskId(null)}
        projectId={projectId}
        themeColor={themeColor}
        displayTitle={displayTitle}
        onUpdateTask={updateTaskInStore}
        onDeleteTask={handleDeleteTask}
      />
    </div>
  )
}
