import { create } from 'zustand'

export type PomodoroMode = 'idle' | 'work' | 'break'

export const WORK_DURATION = 25 * 60
export const BREAK_DURATION = 5 * 60

interface PomodoroState {
  projectId: string | null
  mode: PomodoroMode
  secondsLeft: number
  isRunning: boolean
  activeTaskId: string | null
  activeTaskTitle: string | null
  pomodoroCount: number
  workDuration: number
  breakDuration: number

  startWork: (projectId: string) => void
  pause: () => void
  resume: () => void
  skipBreak: () => void
  reset: () => void
  tick: () => void
  setTask: (taskId: string | null, title: string | null) => void
  switchToBreak: () => void
  switchToWork: () => void
}

export const usePomodoroStore = create<PomodoroState>((set, get) => ({
  projectId: null,
  mode: 'idle',
  secondsLeft: WORK_DURATION,
  isRunning: false,
  activeTaskId: null,
  activeTaskTitle: null,
  pomodoroCount: 0,
  workDuration: WORK_DURATION,
  breakDuration: BREAK_DURATION,

  startWork: (projectId) =>
    set({ projectId, mode: 'work', secondsLeft: get().workDuration, isRunning: true }),

  pause: () => set({ isRunning: false }),
  resume: () => set({ isRunning: true }),

  skipBreak: () =>
    set((s) => ({ mode: 'work', secondsLeft: s.workDuration, isRunning: true })),

  reset: () =>
    set((s) => ({
      mode: 'idle',
      secondsLeft: s.workDuration,
      isRunning: false,
      pomodoroCount: 0,
    })),

  tick: () =>
    set((s) => ({ secondsLeft: Math.max(0, s.secondsLeft - 1) })),

  setTask: (taskId, title) => set({ activeTaskId: taskId, activeTaskTitle: title }),

  switchToBreak: () =>
    set((s) => ({
      mode: 'break',
      secondsLeft: s.breakDuration,
      isRunning: true,
      pomodoroCount: s.pomodoroCount + 1,
    })),

  switchToWork: () =>
    set((s) => ({ mode: 'work', secondsLeft: s.workDuration, isRunning: true })),
}))
