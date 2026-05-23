import { create } from "zustand"
import { persist } from "zustand/middleware"
import { TaskResponse, getAllTasks, getTasksByProject } from "@/lib/api/tasks"

interface TaskState {
  tasks: TaskResponse[]
  loading: boolean
  error: string | null
  fetchTasks: (projectId?: string) => Promise<void>
  addTask: (task: TaskResponse) => void
  updateTask: (task: TaskResponse) => void
  removeTask: (taskId: string) => void
  setTasks: (tasks: TaskResponse[]) => void
}

export const useTaskStore = create<TaskState>()(
  persist(
    (set) => ({
      tasks: [],
      loading: false,
      error: null,

      fetchTasks: async (projectId?: string) => {
        set({ loading: true, error: null })
        try {
          const data = projectId
            ? await getTasksByProject(projectId)
            : await getAllTasks()
          set({ tasks: data, loading: false })
        } catch (err: any) {
          set({ error: err.message || "Failed to fetch tasks", loading: false })
        }
      },

      addTask: (task) => {
        set((state) => ({ tasks: [task, ...state.tasks] }))
      },

      updateTask: (updatedTask) => {
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === updatedTask.id ? updatedTask : t
          ),
        }))
      },

      removeTask: (taskId) => {
        set((state) => ({
          tasks: state.tasks.filter((t) => t.id !== taskId),
        }))
      },

      setTasks: (tasks) => set({ tasks }),
    }),
    {
      name: "hivespace-tasks", // key in localStorage
      version: 2, // bump version to clear old cache
    }
  )
)
