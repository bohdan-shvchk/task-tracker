import { create } from 'zustand'

export type PomodoroMode = 'idle' | 'work' | 'break'
export type SoundType = 'bell' | 'digital' | 'soft' | 'none'

export const DEFAULT_WORK = 25 * 60
export const DEFAULT_SHORT_BREAK = 5 * 60
export const DEFAULT_LONG_BREAK = 15 * 60
export const DEFAULT_LONG_BREAK_INTERVAL = 4

interface PomodoroState {
  projectId: string | null
  mode: PomodoroMode
  secondsLeft: number
  isRunning: boolean
  isLongBreak: boolean
  activeTaskId: string | null
  activeTaskTitle: string | null
  pomodoroCount: number

  // Settings
  workDuration: number
  breakDuration: number
  longBreakDuration: number
  longBreakInterval: number
  soundType: SoundType

  startWork: (projectId: string) => void
  pause: () => void
  resume: () => void
  skipBreak: () => void
  reset: () => void
  tick: () => void
  setTask: (taskId: string | null, title: string | null) => void
  switchToBreak: () => void
  switchToWork: () => void
  setSettings: (s: Partial<Pick<PomodoroState, 'workDuration' | 'breakDuration' | 'longBreakDuration' | 'longBreakInterval' | 'soundType'>>) => void
}

export const usePomodoroStore = create<PomodoroState>((set, get) => ({
  projectId: null,
  mode: 'idle',
  secondsLeft: DEFAULT_WORK,
  isRunning: false,
  isLongBreak: false,
  activeTaskId: null,
  activeTaskTitle: null,
  pomodoroCount: 0,

  workDuration: DEFAULT_WORK,
  breakDuration: DEFAULT_SHORT_BREAK,
  longBreakDuration: DEFAULT_LONG_BREAK,
  longBreakInterval: DEFAULT_LONG_BREAK_INTERVAL,
  soundType: 'bell',

  startWork: (projectId) =>
    set((s) => ({ projectId, mode: 'work', secondsLeft: s.workDuration, isRunning: true, isLongBreak: false })),

  pause: () => set({ isRunning: false }),
  resume: () => set({ isRunning: true }),

  skipBreak: () =>
    set((s) => ({ mode: 'work', secondsLeft: s.workDuration, isRunning: true, isLongBreak: false })),

  reset: () =>
    set((s) => ({
      mode: 'idle',
      secondsLeft: s.workDuration,
      isRunning: false,
      pomodoroCount: 0,
      isLongBreak: false,
    })),

  tick: () => set((s) => ({ secondsLeft: Math.max(0, s.secondsLeft - 1) })),

  setTask: (taskId, title) => set({ activeTaskId: taskId, activeTaskTitle: title }),

  switchToBreak: () =>
    set((s) => {
      const newCount = s.pomodoroCount + 1
      const isLong = newCount % s.longBreakInterval === 0
      return {
        mode: 'break',
        secondsLeft: isLong ? s.longBreakDuration : s.breakDuration,
        isRunning: true,
        pomodoroCount: newCount,
        isLongBreak: isLong,
      }
    }),

  switchToWork: () =>
    set((s) => ({ mode: 'work', secondsLeft: s.workDuration, isRunning: true, isLongBreak: false })),

  setSettings: (s) => set((prev) => {
    const next = { ...prev, ...s }
    // if idle, update secondsLeft to match new work duration
    if (prev.mode === 'idle') next.secondsLeft = next.workDuration
    return next
  }),
}))
