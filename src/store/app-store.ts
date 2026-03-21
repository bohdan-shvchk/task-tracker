import { create } from 'zustand'
import { Project } from '@/lib/types'

interface AppState {
  projects: Project[]
  selectedProjectId: string | null
  openTaskId: string | null
  setProjects: (projects: Project[]) => void
  setSelectedProjectId: (id: string | null) => void
  setOpenTaskId: (id: string | null) => void
}

export const useAppStore = create<AppState>((set) => ({
  projects: [],
  selectedProjectId: null,
  openTaskId: null,
  setProjects: (projects) => set({ projects }),
  setSelectedProjectId: (id) => set({ selectedProjectId: id }),
  setOpenTaskId: (id) => set({ openTaskId: id }),
}))
