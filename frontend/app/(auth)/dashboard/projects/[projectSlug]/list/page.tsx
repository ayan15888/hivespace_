"use client"

import { useState, useEffect, useRef } from "react"
import { LayoutList, Calendar, Search, CheckSquare, Layers, CircleDot, Clock, Sparkles } from "lucide-react"
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
import { useWorkspaceStore } from "@/store/workspaceStore"

const STATUS_FILTER_OPTIONS = ["All", "Todo", "In Progress", "Review", "Done"]
const PRIORITY_FILTER_OPTIONS = ["All", "Urgent", "High", "Medium", "Low"]

const STATUS_BADGE_CLASSES: Record<string, string> = {
  TODO: "text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700",
  IN_PROGRESS: "text-blue-800 dark:text-blue-350 bg-blue-50 dark:bg-blue-950/45 border-blue-200 dark:border-blue-800/40",
  IN_REVIEW: "text-amber-800 dark:text-amber-350 bg-amber-50 dark:bg-amber-950/45 border-amber-200 dark:border-amber-800/40",
  DONE: "text-emerald-800 dark:text-emerald-350 bg-emerald-50 dark:bg-emerald-950/45 border-emerald-200 dark:border-emerald-800/40",
  CANCELLED: "text-red-800 dark:text-red-350 bg-red-50 dark:bg-red-950/45 border-red-200 dark:border-red-800/40",
}

const PRIORITY_BADGE_CLASSES: Record<string, string> = {
  URGENT: "text-red-800 dark:text-red-350 bg-white dark:bg-red-950/40 border-red-200 dark:border-red-900/40",
  HIGH: "text-amber-800 dark:text-amber-350 bg-white dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/40",
  MEDIUM: "text-blue-800 dark:text-blue-350 bg-white dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/40",
  LOW: "text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700",
}

export default function ProjectListPage() {
  const params = useParams()
  const { projects } = useProjects()
  const { activeWorkspace } = useWorkspaceStore()
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

  // KPI calculations for task statistics dashboard
  const todoCount = tasks.filter((t) => t.status === "TODO").length
  const inProgressCount = tasks.filter((t) => t.status === "IN_PROGRESS").length
  const inReviewCount = tasks.filter((t) => t.status === "IN_REVIEW").length
  const doneCount = tasks.filter((t) => t.status === "DONE").length
  const totalCount = tasks.length

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
      <header className="sticky top-0 z-30 flex h-[44px] shrink-0 items-center justify-between border-b border-border/50 bg-background/80 px-6 backdrop-blur-sm">
        <div className="flex flex-1 items-center gap-2">
          <span className="text-xs text-muted-foreground">Hivespace</span>
          <span className="text-border">/</span>
          <span className="text-xs text-muted-foreground">
            {activeWorkspace?.name || "Workspace"}
          </span>
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
              <div className="z-30 -ml-1.5 flex h-6 w-6 items-center justify-center rounded-full border border-border/50 bg-hs-nav text-[9px] font-extrabold text-muted-foreground ring-2 ring-background">
                +{projectMembers.length - 5}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* --- STICKY PAGE HEADER & CONTROLS --- */}
      <div className="sticky top-[44px] z-20 flex shrink-0 flex-col items-stretch justify-between gap-4 border-b border-border/40 bg-background px-6 py-3.5 md:flex-row md:items-center">
        <div className="flex items-center gap-3.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary shadow-inner transition-colors">
            <LayoutList className="h-5.5 w-5.5" />
          </div>
          <div>
            <h1 className="text-base leading-none font-extrabold tracking-tight text-foreground flex items-center gap-2">
              {displayTitle} Task List
              <span className="inline-flex items-center rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
                Active
              </span>
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Manage, filter, and track tasks for the project.
            </p>
          </div>
        </div>

        {/* Filters & Search - Styled in Claude White Background and Claude Orange Text */}
        <div className="ml-auto flex max-w-xl flex-1 items-center gap-3.5 md:justify-end">
          <div className="relative max-w-xs flex-1 md:max-w-sm group">
            <Search className="absolute top-3 left-3 h-4 w-4 text-primary/70 transition-colors" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search tasks... (⌘K or /)"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1)
              }}
              className="h-10 w-full rounded-xl border border-primary/30 bg-card pr-3 pl-10 text-sm text-primary font-bold transition-all outline-none placeholder:text-primary/60 focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-sm"
            />
          </div>

          <div className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-primary/30 bg-card px-3.5 shadow-sm transition-all hover:border-primary/50 hover:bg-primary/[0.02]">
            <span className="text-xs font-bold tracking-wider text-primary/80 uppercase">
              Status
            </span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="cursor-pointer border-none bg-transparent text-sm font-extrabold text-primary outline-none pr-1"
            >
              {STATUS_FILTER_OPTIONS.map((opt) => (
                <option key={opt} value={opt} className="bg-background text-foreground font-semibold">
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-primary/30 bg-card px-3.5 shadow-sm transition-all hover:border-primary/50 hover:bg-primary/[0.02]">
            <span className="text-xs font-bold tracking-wider text-primary/80 uppercase">
              Priority
            </span>
            <select
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="cursor-pointer border-none bg-transparent text-sm font-extrabold text-primary outline-none pr-1"
            >
              {PRIORITY_FILTER_OPTIONS.map((opt) => (
                <option key={opt} value={opt} className="bg-background text-foreground font-semibold">
                  {opt}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* --- CONTENT AREA (CONTAINING TABLE CARD) --- */}
      <div className="relative flex min-h-0 flex-1 flex-col bg-hs-main">
        {/* Table floating panel container */}
        <div className="relative flex min-h-0 flex-1 flex-col m-6 rounded-2xl border border-primary/20 bg-background/80 shadow-xl backdrop-blur-md hover:border-primary/30 transition-colors duration-300">
          {/* Table rows scrollable area */}
          <div className="min-h-0 flex-1 overflow-auto rounded-t-2xl">
            <table className="w-full table-fixed border-collapse text-left">
              <thead className="sticky top-0 z-10 bg-background shadow-[0_1px_0_var(--border)]">
                <tr className="border-b border-border bg-muted/20 text-xs font-bold tracking-wider text-muted-foreground uppercase">
                  <th className="w-24 px-6 py-3.5 font-semibold">ID</th>
                  <th className="px-6 py-3.5 font-semibold">Task Title</th>
                  <th className="w-40 px-6 py-3.5 font-semibold">Status</th>
                  <th className="w-32 px-6 py-3.5 font-semibold">Priority</th>
                  <th className="w-48 px-6 py-3.5 font-semibold">Assignee</th>
                  <th className="w-24 px-6 py-3.5 text-center font-semibold">Points</th>
                  <th className="w-40 px-6 py-3.5 font-semibold">Due Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {paginatedTasks.length > 0 ? (
                  paginatedTasks.map((task) => {
                    const statusClass =
                      STATUS_BADGE_CLASSES[task.status] ||
                      "text-muted-foreground bg-muted border-border"
                    const priorityClass =
                      PRIORITY_BADGE_CLASSES[task.priority] ||
                      "text-muted-foreground bg-muted border-border"

                    return (
                      <tr
                        key={task.id}
                        onClick={() => setSelectedTaskId(task.id)}
                        className="group cursor-pointer border-b border-border/20 transition-all duration-300 hover:bg-primary/5 dark:hover:bg-primary/10"
                      >
                        {/* ID Column */}
                        <td className="truncate px-6 py-3.5 font-mono text-sm font-semibold text-muted-foreground group-hover:text-foreground/80">
                          {task.taskIdentifier || `HS-${task.id.substring(0, 4)}`}
                        </td>
                        {/* Title Column */}
                        <td className="truncate px-6 py-3.5">
                          <span className="block truncate text-sm font-semibold text-foreground/90 transition-colors group-hover:text-foreground">
                            {task.title}
                          </span>
                        </td>
                        {/* Status Column */}
                        <td className="px-6 py-3.5">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] leading-none font-extrabold tracking-wider uppercase transition-all duration-200",
                              statusClass
                            )}
                          >
                            <span className={cn("h-1.5 w-1.5 rounded-full",
                              task.status === "DONE" ? "bg-emerald-500" :
                              task.status === "IN_PROGRESS" ? "bg-blue-500 animate-pulse" :
                              task.status === "IN_REVIEW" ? "bg-amber-500" :
                              "bg-muted-foreground"
                            )} />
                            {task.status.replace("_", " ")}
                          </span>
                        </td>
                        {/* Priority Column */}
                        <td className="px-6 py-3.5">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] leading-none font-extrabold tracking-wider uppercase transition-all duration-200",
                              priorityClass
                            )}
                          >
                            <span className={cn("h-1.5 w-1.5 rounded-full",
                              task.priority === "URGENT" ? "bg-red-500 animate-pulse" :
                              task.priority === "HIGH" ? "bg-amber-500" :
                              task.priority === "MEDIUM" ? "bg-blue-500" :
                              "bg-muted-foreground"
                            )} />
                            {task.priority}
                          </span>
                        </td>
                        {/* Assignee Column */}
                        <td className="truncate px-6 py-3.5">
                          <div className="flex min-w-0 items-center gap-2.5">
                            <Avatar
                              className="h-7 w-7 shrink-0 border border-border/40 transition-all duration-300 group-hover:ring-2 group-hover:ring-primary/45"
                              username={task.assigneeName || "Unassigned"}
                              email={
                                task.assigneeName
                                  ? `${task.assigneeName.toLowerCase().replace(/\s+/g, "")}@hivespace.io`
                                  : ""
                              }
                            >
                              <AvatarFallback className="bg-muted text-[10px] font-extrabold text-muted-foreground">
                                {task.assigneeInitials || "--"}
                              </AvatarFallback>
                            </Avatar>
                            <span className="truncate text-sm font-medium text-muted-foreground transition-colors group-hover:text-foreground/80">
                              {task.assigneeName || "Unassigned"}
                            </span>
                          </div>
                        </td>
                        {/* Points Column */}
                        <td className="px-6 py-3.5 text-center">
                          {task.points !== undefined ? (
                            <span className="inline-block rounded-full border border-border bg-muted/60 px-2.5 py-0.5 font-mono text-xs font-bold text-foreground/80">
                              {task.points} pts
                            </span>
                          ) : (
                            <span className="font-mono text-sm text-muted-foreground/30">
                              -
                            </span>
                          )}
                        </td>
                        {/* Due Date Column */}
                        <td className="px-6 py-3.5">
                          {task.dueDate ? (
                            <div className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground transition-colors group-hover:text-foreground/95">
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground/50 transition-colors group-hover:text-primary" />
                              <span>
                                {new Date(task.dueDate).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric"
                                })}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground/45 italic">
                              No due date
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
                      <p className="text-sm font-semibold text-zinc-400">
                        No matching tasks found
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
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
        <div className="flex shrink-0 items-center justify-between border-t border-border/40 bg-background px-6 py-2.5 text-sm text-muted-foreground select-none">
          <div className="flex items-center gap-1.5 font-medium">
            <span>Showing</span>
            <span className="font-mono text-foreground">
              {totalRecords === 0 ? 0 : startIndex + 1}-
              {Math.min(totalRecords, startIndex + pageSize)}
            </span>
            <span>of</span>
            <span className="font-mono text-foreground">{totalRecords}</span>
            <span>tasks</span>
          </div>

          <div className="flex items-center gap-6">
            {/* Configurable page size */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                Per Page:
              </span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value))
                  setCurrentPage(1)
                }}
                className="cursor-pointer rounded-md border border-border bg-muted px-2.5 py-1 text-sm font-semibold text-foreground outline-none"
              >
                {[10, 25, 50, 100].map((size) => (
                  <option key={size} value={size} className="bg-background text-foreground">
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
                className="h-8 rounded-lg border-border/40 bg-muted/30 px-2.5 text-xs font-bold hover:bg-muted"
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
                        "h-8 w-8 rounded-lg font-mono text-sm font-bold",
                        currentPage === page
                          ? "bg-primary font-black text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground"
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
                className="h-8 rounded-lg border-border/40 bg-muted/30 px-2.5 text-xs font-bold hover:bg-muted"
              >
                Next
              </Button>
            </div>
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
