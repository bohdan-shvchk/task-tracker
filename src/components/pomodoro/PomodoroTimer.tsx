'use client'

import { useEffect, useRef } from 'react'
import { Play, Pause, SkipForward, RotateCcw, Timer } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { usePomodoroStore } from '@/store/pomodoro-store'
import { useTimerStore } from '@/store/timer-store'
import { Task } from '@/lib/types'
import { cn } from '@/lib/utils'

function playBeep(frequency: number, duration: number, volume = 0.25) {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new Ctx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = frequency
    gain.gain.setValueAtTime(volume, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000)
    osc.start()
    osc.stop(ctx.currentTime + duration / 1000)
  } catch { /* ignore if AudioContext not available */ }
}

function fmt(s: number) {
  return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`
}

interface Props {
  projectId: string
  tasks: Task[]
}

export default function PomodoroTimer({ projectId, tasks }: Props) {
  const store = usePomodoroStore()
  const timerStore = useTimerStore()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Reset when switching projects
  useEffect(() => {
    if (store.projectId && store.projectId !== projectId) {
      store.reset()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  // ─── Start/stop task timer helpers ───────────────────────────────────────
  const stopTaskTimer = async (taskId: string) => {
    try {
      await fetch('/api/timer/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId }),
      })
      timerStore.reset()
    } catch { /* silent */ }
  }

  const startTaskTimer = async (taskId: string) => {
    try {
      const res = await fetch('/api/timer/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId }),
      })
      if (res.ok) {
        const tl = await res.json()
        timerStore.setActiveTimeLog(tl)
        timerStore.setActiveTask(tl.task)
        timerStore.setIsRunning(true)
      }
    } catch { /* silent */ }
  }

  // ─── Main tick loop ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!store.isRunning) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      return
    }

    intervalRef.current = setInterval(() => {
      const s = usePomodoroStore.getState()

      // ── Time's up ──
      if (s.secondsLeft <= 0) {
        if (s.mode === 'work') {
          s.switchToBreak()          // resets secondsLeft to breakDuration
          playBeep(523, 700)
          if (s.activeTaskId) stopTaskTimer(s.activeTaskId)
        } else if (s.mode === 'break') {
          s.switchToWork()           // resets secondsLeft to workDuration
          playBeep(440, 500)
          if (s.activeTaskId) startTaskTimer(s.activeTaskId)
        }
        return
      }

      const next = s.secondsLeft - 1

      // ── Warnings (work mode only) ──
      if (s.mode === 'work') {
        if (next === 5 * 60)  playBeep(600, 350)          // 5 min left
        if (next === 30)      playBeep(800, 450)           // 30 sec left
        if (next <= 5 && next > 0) playBeep(1100, 120)    // last 5 sec
      }

      s.tick()
    }, 1000)

    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.isRunning])

  // ─── Controls ────────────────────────────────────────────────────────────
  const handleStart = async () => {
    if (store.mode === 'idle') {
      store.startWork(projectId)
      if (store.activeTaskId) await startTaskTimer(store.activeTaskId)
    } else {
      store.resume()
      if (store.mode === 'work' && store.activeTaskId) await startTaskTimer(store.activeTaskId)
    }
  }

  const handlePause = async () => {
    store.pause()
    if (store.mode === 'work' && store.activeTaskId) await stopTaskTimer(store.activeTaskId)
  }

  const handleSkipBreak = async () => {
    store.skipBreak()
    if (store.activeTaskId) await startTaskTimer(store.activeTaskId)
  }

  const handleReset = async () => {
    if (store.mode === 'work' && store.isRunning && store.activeTaskId) {
      await stopTaskTimer(store.activeTaskId)
    }
    store.reset()
  }

  // ─── Derived UI values ────────────────────────────────────────────────────
  const { mode, secondsLeft, isRunning, activeTaskId, pomodoroCount, workDuration, breakDuration } = store
  const isIdle = mode === 'idle'
  const isWork = mode === 'work'
  const isBreak = mode === 'break'

  const total = isWork ? workDuration : isBreak ? breakDuration : workDuration
  const progress = isIdle ? 0 : 1 - secondsLeft / total

  const R = 36
  const circ = 2 * Math.PI * R
  const dash = circ * (1 - progress)

  const accentColor = isBreak ? '#22c55e' : '#ef4444'

  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors',
          isWork && isRunning
            ? 'bg-red-50 border-red-200 text-red-700'
            : isBreak
            ? 'bg-green-50 border-green-200 text-green-700'
            : isWork && !isRunning
            ? 'bg-muted border-border text-foreground'
            : 'bg-muted border-border text-muted-foreground hover:text-foreground'
        )}
      >
        <Timer className="size-3.5 shrink-0" />
        <span className="font-mono">{isIdle ? 'Помодоро' : fmt(secondsLeft)}</span>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-64 p-4">
        {/* Mode badge */}
        <div className="flex justify-center mb-3">
          <span
            className={cn(
              'text-xs font-semibold uppercase tracking-wide px-2.5 py-0.5 rounded-full',
              isWork ? 'bg-red-100 text-red-700' :
              isBreak ? 'bg-green-100 text-green-700' :
              'bg-muted text-muted-foreground'
            )}
          >
            {isIdle ? 'Готово до старту' : isWork ? `Фокус #${pomodoroCount + 1}` : 'Перерва ☕'}
          </span>
        </div>

        {/* Circle timer */}
        <div className="flex justify-center mb-4">
          <div className="relative w-24 h-24">
            <svg viewBox="0 0 84 84" className="w-full h-full -rotate-90">
              <circle cx="42" cy="42" r={R} fill="none" strokeWidth="5"
                className="text-muted/50" stroke="currentColor" />
              <circle
                cx="42" cy="42" r={R} fill="none" strokeWidth="5"
                stroke={accentColor} strokeLinecap="round"
                strokeDasharray={circ}
                strokeDashoffset={dash}
                className="transition-all duration-700"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-0">
              <span className="text-xl font-mono font-bold leading-none">{fmt(secondsLeft)}</span>
              {pomodoroCount > 0 && (
                <span className="text-[10px] text-muted-foreground mt-0.5">
                  {'🍅'.repeat(Math.min(pomodoroCount, 4))}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Task selector */}
        <Select
          value={activeTaskId ?? '__none__'}
          onValueChange={(v) => {
            if (v === '__none__') return store.setTask(null, null)
            const t = tasks.find((t) => t.id === v)
            store.setTask(v, t?.title ?? null)
          }}
        >
          <SelectTrigger className="w-full text-sm mb-3">
            <SelectValue placeholder="Оберіть задачу..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Без задачі</SelectItem>
            {tasks.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                <span className="truncate max-w-[180px] block">
                  {t.title || 'Без назви'}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Controls */}
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={handleReset}
            title="Скинути"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <RotateCcw className="size-4" />
          </button>

          {isRunning ? (
            <button
              onClick={handlePause}
              className="w-12 h-12 flex items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
            >
              <Pause className="size-5" />
            </button>
          ) : (
            <button
              onClick={handleStart}
              className="w-12 h-12 flex items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
            >
              <Play className="size-5 ml-0.5" />
            </button>
          )}

          <button
            onClick={isBreak ? handleSkipBreak : undefined}
            title={isBreak ? 'Пропустити перерву' : undefined}
            disabled={!isBreak}
            className={cn(
              'w-8 h-8 flex items-center justify-center rounded-lg transition-colors',
              isBreak
                ? 'text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer'
                : 'text-muted/30 cursor-default'
            )}
          >
            <SkipForward className="size-4" />
          </button>
        </div>

        {/* Break hint */}
        {isBreak && (
          <p className="text-center text-xs text-muted-foreground mt-3 leading-snug">
            Відпочинь! Трекінг задачі<br />поставлено на паузу.
          </p>
        )}
      </PopoverContent>
    </Popover>
  )
}
