'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Play, Pause, SkipForward, RotateCcw, Timer, Settings,
  Target, Coffee, Moon, Bell, Cpu, Music2, VolumeX, ChevronDown, Circle,
} from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { usePomodoroStore, SoundType } from '@/store/pomodoro-store'
import { useTimerStore } from '@/store/timer-store'
import { Task, Status } from '@/lib/types'
import { cn } from '@/lib/utils'

// ─── Audio ───────────────────────────────────────────────────────────────────

function playSound(type: SoundType, variant: 'warning' | 'urgent' | 'tick' | 'end') {
  if (type === 'none') return
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new Ctx()
    const gain = ctx.createGain()
    gain.connect(ctx.destination)

    const configs: Record<SoundType, Record<typeof variant, { freq: number; dur: number; vol: number; wave: OscillatorType }>> = {
      bell: {
        warning: { freq: 660, dur: 0.4, vol: 0.25, wave: 'sine' },
        urgent:  { freq: 880, dur: 0.5, vol: 0.3,  wave: 'sine' },
        tick:    { freq: 1100, dur: 0.1, vol: 0.2, wave: 'sine' },
        end:     { freq: 784, dur: 0.8, vol: 0.35, wave: 'sine' },
      },
      digital: {
        warning: { freq: 600, dur: 0.3, vol: 0.2, wave: 'square' },
        urgent:  { freq: 800, dur: 0.4, vol: 0.25, wave: 'square' },
        tick:    { freq: 900, dur: 0.08, vol: 0.15, wave: 'square' },
        end:     { freq: 700, dur: 0.6, vol: 0.25, wave: 'square' },
      },
      soft: {
        warning: { freq: 440, dur: 0.6, vol: 0.2, wave: 'sine' },
        urgent:  { freq: 520, dur: 0.7, vol: 0.22, wave: 'sine' },
        tick:    { freq: 480, dur: 0.15, vol: 0.15, wave: 'sine' },
        end:     { freq: 392, dur: 1.0, vol: 0.25, wave: 'sine' },
      },
      none: {
        warning: { freq: 0, dur: 0, vol: 0, wave: 'sine' },
        urgent:  { freq: 0, dur: 0, vol: 0, wave: 'sine' },
        tick:    { freq: 0, dur: 0, vol: 0, wave: 'sine' },
        end:     { freq: 0, dur: 0, vol: 0, wave: 'sine' },
      },
    }

    const { freq, dur, vol, wave } = configs[type][variant]
    if (!freq) return

    const osc = ctx.createOscillator()
    osc.type = wave
    osc.frequency.value = freq
    osc.connect(gain)
    gain.gain.setValueAtTime(vol, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur)
    osc.start()
    osc.stop(ctx.currentTime + dur)
  } catch { /* silent */ }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(s: number) {
  return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`
}

const DEFAULT_APP_TITLE = 'Task Tracker'

// ─── StyledSelect ─────────────────────────────────────────────────────────────

interface SelectOption<T extends string> {
  value: T
  label: string
  icon?: React.ComponentType<{ className?: string }>
}

function StyledSelect<T extends string>({
  value,
  onChange,
  options,
  placeholder,
  className,
}: {
  value: T | null
  onChange: (v: T | null) => void
  options: SelectOption<T>[]
  placeholder?: string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const selected = options.find((o) => o.value === value)

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-1.5 px-2.5 py-1.5 text-sm border border-border rounded-lg bg-background hover:bg-muted transition-colors"
      >
        <span className="flex items-center gap-2 truncate min-w-0">
          {selected ? (
            <>
              {selected.icon && <selected.icon className="size-3.5 shrink-0 text-muted-foreground" />}
              <span className="truncate">{selected.label}</span>
            </>
          ) : (
            <span className="text-muted-foreground truncate">{placeholder}</span>
          )}
        </span>
        <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 z-[100] bg-popover border border-border rounded-lg shadow-md p-2 flex flex-col gap-2">
          {options.map((opt) => {
            const isSelected = opt.value === value
            const Icon = opt.icon
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false) }}
                className={cn(
                  'w-full flex items-center gap-2 p-2 text-sm text-left rounded-[0.25rem] transition-colors',
                  isSelected
                    ? 'bg-[#E0E8F8] text-[#2A6FF3]'
                    : 'text-foreground hover:bg-[#E0E8F8] hover:text-[#2A6FF3]'
                )}
              >
                {Icon && <Icon className="size-3.5 shrink-0 opacity-70" />}
                <span className="truncate">{opt.label}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── TaskSelect ───────────────────────────────────────────────────────────────

function TaskSelect({
  value,
  onChange,
  tasks,
  statuses,
  className,
}: {
  value: string | null
  onChange: (taskId: string | null) => void
  tasks: Task[]
  statuses: Status[]
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const statusMap = new Map(statuses.map((s) => [s.id, s]))
  const activeStatuses = statuses.filter((s) => !s.isDone).sort((a, b) => a.order - b.order)
  const filteredTasks = tasks.filter((t) => !statusMap.get(t.statusId)?.isDone)

  const groups = activeStatuses
    .map((status) => ({ status, tasks: filteredTasks.filter((t) => t.statusId === status.id) }))
    .filter((g) => g.tasks.length > 0)

  const selectedTask = filteredTasks.find((t) => t.id === value)

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-1.5 px-2.5 py-1.5 text-sm border border-border rounded-lg bg-background hover:bg-muted transition-colors"
      >
        <span className="truncate min-w-0">
          {selectedTask
            ? <span className="truncate">{selectedTask.title || 'Без назви'}</span>
            : <span className="text-muted-foreground">Оберіть задачу...</span>
          }
        </span>
        <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 z-[100] bg-popover border border-border rounded-lg shadow-md overflow-hidden">
          <div className="p-2 flex flex-col gap-2 max-h-[15rem] overflow-y-auto">
            <button
              type="button"
              onClick={() => { onChange(null); setOpen(false) }}
              className={cn(
                'w-full flex items-center p-2 text-sm text-left rounded-[0.25rem] transition-colors',
                !value ? 'bg-[#E0E8F8] text-[#2A6FF3]' : 'text-foreground hover:bg-[#E0E8F8] hover:text-[#2A6FF3]'
              )}
            >
              <span className="truncate">Без задачі</span>
            </button>

            {groups.map(({ status, tasks: groupTasks }) => (
              <div key={status.id} className="flex flex-col gap-2">
                <div className="flex items-center gap-1.5 px-0.5">
                  <div className="h-px flex-1" style={{ backgroundColor: status.color }} />
                  <span className="text-[10px] font-medium shrink-0" style={{ color: status.color }}>
                    {status.name}
                  </span>
                  <div className="h-px flex-1" style={{ backgroundColor: status.color }} />
                </div>
                {groupTasks.map((task) => {
                  const isSelected = task.id === value
                  return (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => { onChange(task.id); setOpen(false) }}
                      className={cn(
                        'w-full flex items-center p-2 text-sm text-left rounded-[0.25rem] transition-colors',
                        isSelected
                          ? 'bg-[#E0E8F8] text-[#2A6FF3]'
                          : 'text-foreground hover:bg-[#E0E8F8] hover:text-[#2A6FF3]'
                      )}
                    >
                      <span className="truncate">{task.title || 'Без назви'}</span>
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Component ───────────────────────────────────────────────────────────────

interface Props {
  projectId: string
  tasks: Task[]
  statuses: Status[]
}

const SOUND_OPTIONS: SelectOption<SoundType>[] = [
  { value: 'bell',    label: 'Дзвін',      icon: Bell    },
  { value: 'digital', label: 'Цифровий',   icon: Cpu     },
  { value: 'soft',    label: "М'який",     icon: Music2  },
  { value: 'none',    label: 'Без звуку',  icon: VolumeX },
]

export default function PomodoroTimer({ projectId, tasks, statuses }: Props) {
  const store = usePomodoroStore()
  const timerStore = useTimerStore()
const [settingsOpen, setSettingsOpen] = useState(false)
  const [startMode, setStartMode] = useState<'work' | 'break' | 'long_break'>('work')

  // Reset when switching projects
  useEffect(() => {
    if (store.projectId && store.projectId !== projectId) store.reset()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  // ── Tab title ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const { mode, isRunning, secondsLeft, activeTaskTitle, isLongBreak } = store
    if (mode !== 'idle' && isRunning) {
      const prefix = mode === 'break' ? (isLongBreak ? '[Відпочинок]' : '[Перерва]') : '[Фокус]'
      const task = activeTaskTitle ? ` — ${activeTaskTitle}` : ''
      document.title = `${prefix} ${fmt(secondsLeft)}${task}`
    } else {
      document.title = DEFAULT_APP_TITLE
    }
    return () => { document.title = DEFAULT_APP_TITLE }
  }, [store.secondsLeft, store.isRunning, store.mode, store.activeTaskTitle, store.isLongBreak]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Task timer API helpers ─────────────────────────────────────────────────
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

  // ── Main tick loop ─────────────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      const s = usePomodoroStore.getState()

      if (!s.isRunning) return

      if (s.secondsLeft <= 0) {
        if (s.mode === 'work') {
          s.switchToBreak()
          playSound(s.soundType, 'end')
          if (s.activeTaskId) stopTaskTimer(s.activeTaskId)
        } else if (s.mode === 'break') {
          s.switchToWork()
          playSound(s.soundType, 'end')
          if (s.activeTaskId) startTaskTimer(s.activeTaskId)
        }
        return
      }

      const next = s.secondsLeft - 1
      if (s.mode === 'work') {
        if (next === 5 * 60)        playSound(s.soundType, 'warning')
        if (next === 30)            playSound(s.soundType, 'urgent')
        if (next <= 5 && next > 0)  playSound(s.soundType, 'tick')
      }

      s.tick()
    }, 1000)

    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Controls ───────────────────────────────────────────────────────────────
  const handleStart = async () => {
    if (store.mode === 'idle') {
      if (startMode === 'work') {
        store.startWork(projectId)
        if (store.activeTaskId) await startTaskTimer(store.activeTaskId)
      } else {
        store.startBreak(projectId, startMode === 'long_break')
      }
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

  // ── Derived values ─────────────────────────────────────────────────────────
  const { mode, secondsLeft, isRunning, activeTaskId, pomodoroCount,
          workDuration, breakDuration, longBreakDuration, longBreakInterval,
          soundType, isLongBreak } = store
  const isIdle = mode === 'idle'
  const isWork = mode === 'work'
  const isBreak = mode === 'break'

  const total = isWork ? workDuration : isLongBreak ? longBreakDuration : breakDuration
  const progress = isIdle ? 0 : 1 - secondsLeft / total

  const R = 36
  const circ = 2 * Math.PI * R
  const dash = circ * (1 - progress)
  const accentColor = isBreak ? (isLongBreak ? '#3b82f6' : '#22c55e') : '#ef4444'

  const modeLabel = isIdle
    ? 'Готово до старту'
    : isWork
    ? `Фокус #${pomodoroCount + 1}`
    : isLongBreak ? 'Довга перерва' : 'Перерва'

  const nextLongBreakIn = longBreakInterval - (pomodoroCount % longBreakInterval)

  const dotCount = Math.min(pomodoroCount % longBreakInterval || longBreakInterval, 4)

  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors',
          isWork && isRunning  ? 'bg-red-50 border-red-200 text-red-700' :
          isBreak && isLongBreak ? 'bg-blue-50 border-blue-200 text-blue-700' :
          isBreak              ? 'bg-green-50 border-green-200 text-green-700' :
          isWork && !isRunning ? 'bg-muted border-border text-foreground' :
                                 'bg-muted border-border text-muted-foreground hover:text-foreground'
        )}
      >
        <Timer className="size-3.5 shrink-0" />
        <span className="font-mono">{isIdle ? 'Помодоро' : fmt(secondsLeft)}</span>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-64 p-4">

        {/* Mode selector (idle) / Mode badge (running) */}
        {isIdle ? (
          <div className="flex gap-1 bg-muted rounded-lg p-0.5 mb-3">
            {([
              { key: 'work',       label: 'Фокус',   Icon: Target, active: 'bg-red-100 text-red-700' },
              { key: 'break',      label: 'Перерва', Icon: Coffee, active: 'bg-green-100 text-green-700' },
              { key: 'long_break', label: 'Довга',   Icon: Moon,   active: 'bg-blue-100 text-blue-700' },
            ] as const).map(({ key, label, Icon, active }) => (
              <button
                key={key}
                onClick={() => setStartMode(key)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1 text-[11px] font-medium py-1 rounded-md transition-colors',
                  startMode === key ? active : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="size-3" />
                {label}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex justify-center mb-3">
            <span className={cn(
              'text-xs font-semibold uppercase tracking-wide px-2.5 py-0.5 rounded-full',
              isWork      ? 'bg-red-100 text-red-700' :
              isLongBreak ? 'bg-blue-100 text-blue-700' :
                            'bg-green-100 text-green-700'
            )}>
              {modeLabel}
            </span>
          </div>
        )}

        {/* Circle timer */}
        <div className="flex justify-center mb-1">
          <div className="relative w-24 h-24">
            <svg viewBox="0 0 84 84" className="w-full h-full -rotate-90">
              <circle cx="42" cy="42" r={R} fill="none" strokeWidth="5"
                className="text-muted/40" stroke="currentColor" />
              <circle cx="42" cy="42" r={R} fill="none" strokeWidth="5"
                stroke={accentColor} strokeLinecap="round"
                strokeDasharray={circ} strokeDashoffset={dash}
                className="transition-all duration-700"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-mono font-bold leading-none">{fmt(secondsLeft)}</span>
              {pomodoroCount > 0 && (
                <span className="flex items-center gap-0.5 mt-1">
                  {Array.from({ length: dotCount }).map((_, i) => (
                    <Circle key={i} className="size-1.5 fill-red-400 text-red-400" />
                  ))}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Next long break hint */}
        {isWork && pomodoroCount > 0 && (
          <p className="text-center text-[10px] text-muted-foreground mb-3">
            Довга перерва через {nextLongBreakIn} {nextLongBreakIn === 1 ? 'помодоро' : 'помодоро'}
          </p>
        )}
        {(!isWork || pomodoroCount === 0) && <div className="mb-3" />}

        {/* Task selector */}
        <TaskSelect
          value={activeTaskId}
          onChange={(taskId) => {
            if (!taskId) return store.setTask(null, null)
            const t = tasks.find((t) => t.id === taskId)
            store.setTask(taskId, t?.title ?? null)
          }}
          tasks={tasks}
          statuses={statuses}
          className="mb-3"
        />

        {/* Controls */}
        <div className="flex items-center justify-center gap-2 mb-2">
          <button onClick={handleReset} title="Скинути"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <RotateCcw className="size-4" />
          </button>

          {isRunning ? (
            <button onClick={handlePause}
              className="w-12 h-12 flex items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm">
              <Pause className="size-5" />
            </button>
          ) : (
            <button onClick={handleStart}
              className="w-12 h-12 flex items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm">
              <Play className="size-5 ml-0.5" />
            </button>
          )}

          <button
            onClick={isBreak ? handleSkipBreak : undefined}
            disabled={!isBreak}
            title={isBreak ? 'Пропустити перерву' : undefined}
            className={cn(
              'w-8 h-8 flex items-center justify-center rounded-lg transition-colors',
              isBreak ? 'text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer'
                      : 'text-muted/30 cursor-default'
            )}>
            <SkipForward className="size-4" />
          </button>
        </div>

        {isBreak && (
          <p className="text-center text-xs text-muted-foreground mb-2 leading-snug">
            {isLongBreak ? 'Добре попрацював! Відпочинь 15 хвилин.' : 'Відпочинь! Трекінг задачі на паузі.'}
          </p>
        )}

        {/* Settings toggle */}
        <button
          onClick={() => setSettingsOpen((v) => !v)}
          className="w-full flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mt-1"
        >
          <Settings className="size-3" />
          {settingsOpen ? 'Сховати налаштування' : 'Налаштування'}
        </button>

        {/* Settings panel */}
        {settingsOpen && (
          <div className="mt-3 pt-3 border-t border-border flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
              <label className="flex flex-col gap-1">
                <span className="text-muted-foreground">Фокус (хв)</span>
                <input type="number" min={1} max={90}
                  defaultValue={workDuration / 60}
                  onChange={(e) => store.setSettings({ workDuration: Math.max(1, +e.target.value) * 60 })}
                  className="w-full border border-border rounded-md px-2 py-1 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-muted-foreground">Перерва (хв)</span>
                <input type="number" min={1} max={30}
                  defaultValue={breakDuration / 60}
                  onChange={(e) => store.setSettings({ breakDuration: Math.max(1, +e.target.value) * 60 })}
                  className="w-full border border-border rounded-md px-2 py-1 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-muted-foreground">Довга перерва (хв)</span>
                <input type="number" min={1} max={60}
                  defaultValue={longBreakDuration / 60}
                  onChange={(e) => store.setSettings({ longBreakDuration: Math.max(1, +e.target.value) * 60 })}
                  className="w-full border border-border rounded-md px-2 py-1 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-muted-foreground">Довга через (шт)</span>
                <input type="number" min={1} max={10}
                  defaultValue={longBreakInterval}
                  onChange={(e) => store.setSettings({ longBreakInterval: Math.max(1, +e.target.value) })}
                  className="w-full border border-border rounded-md px-2 py-1 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </label>
            </div>

            <label className="flex flex-col gap-1 text-xs">
              <span className="text-muted-foreground">Звук сигналу</span>
              <StyledSelect
                value={soundType}
                onChange={(v) => { if (v) store.setSettings({ soundType: v as SoundType }) }}
                options={SOUND_OPTIONS}
              />
            </label>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
