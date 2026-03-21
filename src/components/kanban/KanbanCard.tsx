'use client'

import { useState } from 'react'
import { Paperclip, ChevronDown, ChevronUp, CalendarIcon, Flag, Tag } from 'lucide-react'
import { Task, Label } from '@/lib/types'
import { useTimerStore } from '@/store/timer-store'
import { formatDuration } from '@/lib/format-time'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/app-store'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

const PRIORITY_COLORS: Record<string, string> = {
  LOW: '#22c55e',
  MEDIUM: '#eab308',
  HIGH: '#f97316',
  URGENT: '#ef4444',
}

const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Низький',
  MEDIUM: 'Середній',
  HIGH: 'Високий',
  URGENT: 'Критичний',
}

interface Props {
  task: Task
  onClick: () => void
  onUpdate?: (updates: Partial<Task>) => void
}

export default function KanbanCard({ task, onClick, onUpdate }: Props) {
  const [subtasksOpen, setSubtasksOpen] = useState(false)
  const [deadline, setDeadline] = useState<Date | undefined>(
    task.deadline ? new Date(task.deadline) : undefined
  )
  const [priority, setPriority] = useState(task.priority)
  const [taskLabels, setTaskLabels] = useState(task.labels ?? [])
  const [allLabels, setAllLabels] = useState<Label[]>([])
  const [labelsLoaded, setLabelsLoaded] = useState(false)

  const { isRunning, activeTask, currentSeconds } = useTimerStore()
  const { setOpenTaskId } = useAppStore()

  const isTimingThis = isRunning && activeTask?.id === task.id
  const attachCount = task._count?.attachments ?? task.attachments?.length ?? 0
  const subtaskCount = task._count?.subtasks ?? task.subtasks?.length ?? 0
  const subtasks = task.subtasks ?? []

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const isOverdue = deadline && deadline < todayStart

  const loadLabels = async () => {
    if (labelsLoaded) return
    const res = await fetch('/api/labels')
    if (res.ok) {
      setAllLabels(await res.json())
      setLabelsLoaded(true)
    }
  }

  const handleSetDeadline = async (date: Date | undefined) => {
    setDeadline(date)
    onUpdate?.({ deadline: date?.toISOString() })
    await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deadline: date ? date.toISOString() : null }),
    })
  }

  const handleSetPriority = async (p: string | null) => {
    const newPriority = p as Task['priority'] | undefined
    setPriority(newPriority)
    onUpdate?.({ priority: newPriority })
    await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priority: p }),
    })
  }

  const toggleLabel = async (label: Label) => {
    const has = taskLabels.some((tl) => tl.label.id === label.id)
    if (has) {
      setTaskLabels((prev) => prev.filter((tl) => tl.label.id !== label.id))
      await fetch(`/api/tasks/${task.id}/labels`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ labelId: label.id }),
      })
    } else {
      setTaskLabels((prev) => [...prev, { label }])
      await fetch(`/api/tasks/${task.id}/labels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ labelId: label.id }),
      })
    }
  }

  return (
    <div
      className="bg-white rounded-xl shadow-sm border border-border cursor-pointer hover:shadow-md transition-shadow relative overflow-hidden group"
      onClick={onClick}
    >
      {/* Priority indicator on left border */}
      {priority && (
        <div
          className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
          style={{ backgroundColor: PRIORITY_COLORS[priority] }}
        />
      )}

      {/* Timer banner */}
      {isTimingThis && (
        <div
          className="bg-blue-500 text-white text-xs px-3 py-1.5 flex items-center gap-1.5"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="font-semibold">Йде запис часу •</span>
          <span className="font-mono ml-auto">{formatDuration(currentSeconds)}</span>
        </div>
      )}

      <div className={cn('p-3', priority && 'pl-4')}>
        {/* Title */}
        <p className="text-sm font-medium leading-snug mb-2">{task.title}</p>

        {/* Labels row */}
        {taskLabels.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {taskLabels.map((tl) => (
              <span
                key={tl.label.id}
                className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-full font-medium text-white"
                style={{ backgroundColor: tl.label.color }}
              >
                {tl.label.name}
              </span>
            ))}
          </div>
        )}

        {/* Bottom row — stopPropagation so clicks don't open the modal */}
        <div
          className="flex items-center gap-1 text-xs text-muted-foreground flex-wrap"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Due date */}
          <Popover>
            <PopoverTrigger
              className={cn(
                'flex items-center gap-1 rounded px-1 py-0.5 hover:bg-muted transition-colors',
                deadline
                  ? isOverdue
                    ? 'text-red-500'
                    : 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <CalendarIcon className="size-3 shrink-0" />
              {deadline && (
                <span className="text-[10px]">
                  {deadline.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' })}
                </span>
              )}
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" side="bottom" align="start">
              <Calendar
                mode="single"
                selected={deadline}
                onSelect={(date) => handleSetDeadline(date ?? undefined)}
              />
              {deadline && (
                <div className="px-2 pb-2 border-t border-border pt-2">
                  <button
                    className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                    onClick={() => handleSetDeadline(undefined)}
                  >
                    Очистити дату
                  </button>
                </div>
              )}
            </PopoverContent>
          </Popover>

          {/* Priority */}
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                'flex items-center gap-1 rounded px-1 py-0.5 hover:bg-muted transition-colors',
                priority ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Flag
                className="size-3 shrink-0"
                style={{ color: priority ? PRIORITY_COLORS[priority] : undefined }}
                fill={priority ? PRIORITY_COLORS[priority] : 'none'}
              />
              {priority && <span className="text-[10px]">{PRIORITY_LABELS[priority]}</span>}
            </DropdownMenuTrigger>
            <DropdownMenuContent side="bottom" align="start">
              {Object.entries(PRIORITY_LABELS).map(([key, label]) => (
                <DropdownMenuItem
                  key={key}
                  onClick={() => handleSetPriority(key)}
                  className="flex items-center gap-2"
                >
                  <Flag
                    className="size-3"
                    style={{ color: PRIORITY_COLORS[key] }}
                    fill={PRIORITY_COLORS[key]}
                  />
                  {label}
                </DropdownMenuItem>
              ))}
              {priority && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => handleSetPriority(null)}
                    className="text-muted-foreground"
                  >
                    Очистити
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Labels toggle */}
          <Popover onOpenChange={(open) => open && loadLabels()}>
            <PopoverTrigger
              className={cn(
                'flex items-center gap-1 rounded px-1 py-0.5 hover:bg-muted transition-colors',
                taskLabels.length > 0 ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Tag className="size-3 shrink-0" />
              {taskLabels.length > 0 && <span className="text-[10px]">{taskLabels.length}</span>}
            </PopoverTrigger>
            <PopoverContent side="bottom" align="start" className="w-44 p-2">
              <p className="text-xs font-medium text-muted-foreground mb-2">Мітки</p>
              {allLabels.length === 0 ? (
                <p className="text-xs text-muted-foreground">Немає міток</p>
              ) : (
                <div className="flex flex-col gap-0.5">
                  {allLabels.map((label) => {
                    const isOn = taskLabels.some((tl) => tl.label.id === label.id)
                    return (
                      <button
                        key={label.id}
                        className="flex items-center gap-2 text-xs hover:bg-muted rounded px-1.5 py-1 transition-colors w-full text-left"
                        onClick={() => toggleLabel(label)}
                      >
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: label.color }}
                        />
                        <span className="flex-1 truncate">{label.name}</span>
                        {isOn && <span className="text-primary text-xs">✓</span>}
                      </button>
                    )
                  })}
                </div>
              )}
            </PopoverContent>
          </Popover>

          <span className="flex-1" />

          {/* Attachment count */}
          {attachCount > 0 && (
            <span className="flex items-center gap-0.5">
              <Paperclip className="size-3" />
              {attachCount}
            </span>
          )}

          {/* Subtask toggle */}
          {subtaskCount > 0 && (
            <button
              className="flex items-center gap-0.5 hover:text-foreground transition-colors"
              onClick={(e) => {
                e.stopPropagation()
                setSubtasksOpen(!subtasksOpen)
              }}
            >
              <span className="text-[10px]">☑</span>
              <span>0/{subtaskCount}</span>
              {subtasksOpen ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
            </button>
          )}
        </div>

        {/* Inline subtasks */}
        {subtasksOpen && subtasks.length > 0 && (
          <div
            className="mt-2 flex flex-col gap-1 border-t border-border pt-2"
            onClick={(e) => e.stopPropagation()}
          >
            {subtasks.map((st) => (
              <button
                key={st.id}
                className="flex items-center gap-1.5 text-xs text-left hover:text-foreground text-muted-foreground"
                onClick={(e) => {
                  e.stopPropagation()
                  setOpenTaskId(st.id)
                }}
              >
                <span className="w-3 h-3 border border-border rounded-sm shrink-0" />
                <span className="truncate">{st.title}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
