'use client'

import { useState, useMemo } from 'react'
import {
  addDays, addWeeks, addMonths, subDays, subWeeks, subMonths,
  startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  eachDayOfInterval, isSameDay, isToday, isWithinInterval,
  format, startOfDay, endOfDay,
} from 'date-fns'
import { uk } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Task, Status } from '@/lib/types'
import { cn } from '@/lib/utils'

interface Props {
  tasks: Task[]
  statuses: Status[]
  onTaskClick: (id: string) => void
}

type SubView = 'day' | 'week' | 'month'

// ─── helpers ─────────────────────────────────────────────────────────────────

function taskDateRange(task: Task): { start: Date; end: Date } | null {
  if (!task.startDate && !task.deadline) return null
  const start = task.startDate ? startOfDay(new Date(task.startDate)) : startOfDay(new Date(task.deadline!))
  const end   = task.deadline  ? endOfDay(new Date(task.deadline))   : endOfDay(new Date(task.startDate!))
  return { start, end }
}

function taskIsOnDay(task: Task, day: Date): boolean {
  const range = taskDateRange(task)
  if (!range) return false
  return isWithinInterval(day, { start: range.start, end: range.end })
}

// Calendar-layout algorithm: assign rows to tasks so they don't overlap
function assignRows(tasksList: Array<{ task: Task; colStart: number; colEnd: number }>) {
  const rows: number[] = []
  const result: Array<{ task: Task; colStart: number; colEnd: number; row: number }> = []
  for (const item of tasksList) {
    let row = 0
    while (true) {
      const conflict = result.find(
        (r) => r.row === row && r.colStart <= item.colEnd && r.colEnd >= item.colStart
      )
      if (!conflict) break
      row++
    }
    rows[row] = row
    result.push({ ...item, row })
  }
  return result
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TaskChip({
  task,
  onClick,
  compact = false,
}: {
  task: Task
  onClick: () => void
  compact?: boolean
}) {
  const color = task.status?.color ?? task.project?.color ?? '#6366f1'
  return (
    <div
      onClick={(e) => { e.stopPropagation(); onClick() }}
      className={cn(
        'bg-white border border-border rounded-lg cursor-pointer hover:shadow-sm transition-shadow overflow-hidden',
        compact ? 'px-2 py-1' : 'px-3 py-2'
      )}
    >
      <div className="h-0.5 rounded-full mb-1.5 w-8" style={{ backgroundColor: color }} />
      <p className={cn('font-medium truncate text-foreground', compact ? 'text-xs' : 'text-sm')}>
        {task.title}
      </p>
      {!compact && task.project && (
        <p className="text-xs text-muted-foreground truncate mt-0.5">{task.project.name}</p>
      )}
    </div>
  )
}

// ─── Day view ─────────────────────────────────────────────────────────────────

function DayView({ date, tasks, onTaskClick }: { date: Date; tasks: Task[]; onTaskClick: (id: string) => void }) {
  const dayTasks = tasks.filter((t) => taskIsOnDay(t, date))
  return (
    <div className="flex-1 overflow-y-auto px-6 py-4">
      <p className="text-sm font-semibold text-muted-foreground mb-4">
        {format(date, 'EEEE, d MMMM yyyy', { locale: uk })}
      </p>
      {dayTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-muted-foreground text-sm">Немає завдань на цей день</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2 max-w-xl">
          {dayTasks.map((t) => (
            <TaskChip key={t.id} task={t} onClick={() => onTaskClick(t.id)} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Week view ────────────────────────────────────────────────────────────────

function WeekView({ weekStart, tasks, onTaskClick }: { weekStart: Date; tasks: Task[]; onTaskClick: (id: string) => void }) {
  const days = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) })

  // For each task, compute which columns it spans within this week
  const positioned = useMemo(() => {
    const items: Array<{ task: Task; colStart: number; colEnd: number }> = []
    for (const task of tasks) {
      const range = taskDateRange(task)
      if (!range) continue
      // Find overlap with this week
      const weekEnd = endOfDay(addDays(weekStart, 6))
      if (range.end < weekStart || range.start > weekEnd) continue
      const colStart = Math.max(0, days.findIndex((d) => !isSameDay(d, range.start) ? d >= startOfDay(range.start) : true))
      const colEndIdx = days.findLastIndex((d) => d <= endOfDay(range.end))
      if (colEndIdx < 0) continue
      items.push({ task, colStart, colEnd: colEndIdx })
    }
    // Sort by start, then duration desc
    items.sort((a, b) => a.colStart - b.colStart || (b.colEnd - b.colStart) - (a.colEnd - a.colStart))
    return assignRows(items)
  }, [tasks, weekStart, days])

  const maxRow = positioned.length ? Math.max(...positioned.map((p) => p.row)) : -1
  const rowHeight = 52 // px per row
  const contentHeight = (maxRow + 1) * rowHeight + 8

  // Also build per-day "no date" tasks
  const noDateByDay = days.map((day) =>
    tasks.filter((t) => !taskDateRange(t) && isSameDay(day, new Date(t.createdAt)))
  )

  return (
    <div className="flex-1 overflow-auto">
      {/* Day header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border grid grid-cols-7">
        {days.map((day) => (
          <div
            key={day.toISOString()}
            className="flex flex-col items-center py-2 border-r border-border last:border-r-0"
          >
            <span className="text-xs text-muted-foreground uppercase tracking-wide">
              {format(day, 'EEE', { locale: uk })}
            </span>
            <span
              className={cn(
                'text-sm font-semibold mt-0.5 w-7 h-7 flex items-center justify-center rounded-full',
                isToday(day) ? 'bg-[var(--aqua-blue)] text-white' : 'text-foreground'
              )}
            >
              {format(day, 'd')}
            </span>
          </div>
        ))}
      </div>

      {/* Task grid */}
      <div className="relative" style={{ minHeight: `${Math.max(contentHeight, 200)}px` }}>
        {/* Column dividers */}
        <div className="absolute inset-0 grid grid-cols-7 pointer-events-none">
          {days.map((day) => (
            <div
              key={day.toISOString()}
              className={cn(
                'border-r border-border last:border-r-0',
                isToday(day) && 'bg-blue-50/40'
              )}
            />
          ))}
        </div>

        {/* Positioned task bars */}
        {positioned.map(({ task, colStart, colEnd, row }) => {
          const left = `calc(${(colStart / 7) * 100}% + 4px)`
          const width = `calc(${((colEnd - colStart + 1) / 7) * 100}% - 8px)`
          const top = row * rowHeight + 8
          const color = task.status?.color ?? task.project?.color ?? '#6366f1'

          return (
            <div
              key={task.id}
              className="absolute cursor-pointer"
              style={{ left, width, top, height: rowHeight - 8 }}
              onClick={() => onTaskClick(task.id)}
            >
              <div
                className="h-full bg-white border border-border rounded-lg px-3 flex flex-col justify-center hover:shadow-sm transition-shadow overflow-hidden"
              >
                <div className="flex items-center gap-2">
                  <div className="w-1 self-stretch rounded-full shrink-0" style={{ backgroundColor: color }} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{task.title}</p>
                    {task.project && (
                      <p className="text-xs text-muted-foreground truncate">{task.project.name}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Month view ───────────────────────────────────────────────────────────────

function MonthView({ monthDate, tasks, onTaskClick }: { monthDate: Date; tasks: Task[]; onTaskClick: (id: string) => void }) {
  const monthStart = startOfMonth(monthDate)
  const monthEnd   = endOfMonth(monthDate)
  const gridStart  = startOfWeek(monthStart, { weekStartsOn: 1 })
  const gridEnd    = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days       = eachDayOfInterval({ start: gridStart, end: gridEnd })

  const DAY_HEADERS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд']

  return (
    <div className="flex-1 overflow-auto px-4 py-3">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_HEADERS.map((d) => (
          <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 border-l border-t border-border">
        {days.map((day) => {
          const inMonth = day >= monthStart && day <= monthEnd
          const dayTasks = tasks.filter((t) => taskIsOnDay(t, day))
          return (
            <div
              key={day.toISOString()}
              className={cn(
                'border-r border-b border-border min-h-[100px] p-1.5',
                !inMonth && 'bg-muted/20',
                isToday(day) && 'bg-blue-50/40'
              )}
            >
              <div className={cn(
                'text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full',
                isToday(day) ? 'bg-[var(--aqua-blue)] text-white' : inMonth ? 'text-foreground' : 'text-muted-foreground'
              )}>
                {format(day, 'd')}
              </div>
              <div className="flex flex-col gap-0.5">
                {dayTasks.slice(0, 3).map((t) => (
                  <TaskChip key={t.id} task={t} onClick={() => onTaskClick(t.id)} compact />
                ))}
                {dayTasks.length > 3 && (
                  <p className="text-xs text-muted-foreground pl-1">+{dayTasks.length - 3} ще</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function TimelineView({ tasks, statuses, onTaskClick }: Props) {
  const [subView, setSubView] = useState<SubView>('week')
  const [anchor, setAnchor] = useState(() => new Date())

  // Navigation
  const handlePrev = () => {
    if (subView === 'day')   setAnchor((d) => subDays(d, 1))
    if (subView === 'week')  setAnchor((d) => subWeeks(d, 1))
    if (subView === 'month') setAnchor((d) => subMonths(d, 1))
  }
  const handleNext = () => {
    if (subView === 'day')   setAnchor((d) => addDays(d, 1))
    if (subView === 'week')  setAnchor((d) => addWeeks(d, 1))
    if (subView === 'month') setAnchor((d) => addMonths(d, 1))
  }
  const handleToday = () => setAnchor(new Date())

  // Computed values
  const weekStart = startOfWeek(anchor, { weekStartsOn: 1 })
  const weekEnd   = endOfWeek(anchor, { weekStartsOn: 1 })

  const rangeLabel = useMemo(() => {
    if (subView === 'day')   return format(anchor, 'd MMMM yyyy', { locale: uk })
    if (subView === 'week') {
      const s = format(weekStart, 'd MMM', { locale: uk })
      const e = format(weekEnd,   'd MMM yyyy', { locale: uk })
      return `${s} – ${e}`
    }
    return format(anchor, 'MMMM yyyy', { locale: uk })
  }, [subView, anchor, weekStart, weekEnd])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Controls bar ── */}
      <div className="shrink-0 flex items-center gap-3 px-6 py-3 border-b border-border bg-background">
        <Button
          size="sm"
          variant="outline"
          className="h-8 px-3 text-sm font-medium"
          onClick={handleToday}
        >
          Сьогодні
        </Button>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handlePrev}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleNext}>
            <ChevronRight className="size-4" />
          </Button>
        </div>

        <span className="text-sm font-medium capitalize">{rangeLabel}</span>

        {/* Sub-view toggle */}
        <div className="ml-auto flex items-center border border-border rounded-lg overflow-hidden">
          {(['day', 'week', 'month'] as SubView[]).map((v) => {
            const labels: Record<SubView, string> = { day: 'День', week: 'Тиждень', month: 'Місяць' }
            return (
              <button
                key={v}
                onClick={() => setSubView(v)}
                className={cn(
                  'px-3 py-1.5 text-sm transition-colors',
                  subView === v
                    ? 'bg-[var(--aqua-blue)] text-white font-medium'
                    : 'text-muted-foreground hover:bg-muted'
                )}
              >
                {labels[v]}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {subView === 'day'   && <DayView   date={anchor}     tasks={tasks} onTaskClick={onTaskClick} />}
        {subView === 'week'  && <WeekView  weekStart={weekStart} tasks={tasks} onTaskClick={onTaskClick} />}
        {subView === 'month' && <MonthView monthDate={anchor}   tasks={tasks} onTaskClick={onTaskClick} />}
      </div>
    </div>
  )
}
