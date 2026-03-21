import { create } from 'zustand'
import { TimeLog } from '@/lib/types'

interface TimerState {
  activeTimeLog: TimeLog | null
  currentSeconds: number
  isRunning: boolean
  activeTask: { id: string; title: string; projectId: string } | null
  setActiveTimeLog: (tl: TimeLog | null) => void
  setActiveTask: (task: { id: string; title: string; projectId: string } | null) => void
  setIsRunning: (v: boolean) => void
  tick: () => void
  reset: () => void
}

export const useTimerStore = create<TimerState>((set) => ({
  activeTimeLog: null,
  currentSeconds: 0,
  isRunning: false,
  activeTask: null,
  setActiveTimeLog: (tl) => set({ activeTimeLog: tl }),
  setActiveTask: (task) => set({ activeTask: task }),
  setIsRunning: (v) => set({ isRunning: v }),
  tick: () => set((state) => ({ currentSeconds: state.currentSeconds + 1 })),
  reset: () => set({ activeTimeLog: null, currentSeconds: 0, isRunning: false, activeTask: null }),
}))
