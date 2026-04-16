'use client'

import { useState } from 'react'
import { Paperclip, ChevronDown, ChevronUp, CalendarIcon, Tag, MoreVertical, Trash2, ListPlus, Plus, Check, MessageSquare } from 'lucide-react'
import { Task, Label } from '@/lib/types'
import { useTimerStore } from '@/store/timer-store'
import { formatDuration } from '@/lib/format-time'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/app-store'
import { Button } from '@/components/ui/button'
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

const PRIORITY_BADGE: Record<string, string> = {
  LOW: 'P4',
  MEDIUM: 'P3',
  HIGH: 'P2',
  URGENT: 'P1',
}

interface Props {
  task: Task
  onClick: () => void
  onUpdate?: (updates: Partial<Task>) => void
  onDelete?: () => void
}

export default function KanbanCard({ task, onClick, onUpdate, onDelete }: Props) {
  const [subtasksOpen, setSubtasksOpen] = useState(false)
  const [subtasksState, setSubtasksState] = useState<Task[]>(task.subtasks ?? [])
  const [addingSubtask, setAddingSubtask] = useState(false)
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')
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
  const commentCount = task._count?.comments ?? task.comments?.length ?? 0

  const doneSubtasks = subtasksState.filter((s) => s.status?.isDone === true).length
  const subtaskCount = subtasksState.length
  const progressPercent = subtaskCount > 0 ? Math.round((doneSubtasks / subtaskCount) * 100) : 0

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

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deletedAt: new Date().toISOString() }),
    })
    onDelete?.()
  }

  const handleToggleDone = async (subtask: Task) => {
    const res = await fetch(`/api/tasks/${subtask.id}/toggle-done`, { method: 'POST' })
    if (res.ok) {
      const updated = await res.json()
      setSubtasksState((prev) =>
        prev.map((st) => (st.id === subtask.id ? { ...st, status: updated.status } : st))
      )
    }
  }

  const handleAddSubtask = async () => {
    const title = newSubtaskTitle.trim()
    if (!title) return
    setNewSubtaskTitle('')
    setAddingSubtask(false)

    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        projectId: task.projectId,
        statusId: task.statusId,
        parentId: task.id,
        order: subtasksState.length,
      }),
    })
    if (res.ok) {
      const newTask: Task = await res.json()
      setSubtasksState((prev) => [...prev, newTask])
    }
  }

  const openSubtasks = () => {
    setSubtasksOpen(true)
    setAddingSubtask(true)
  }

  return (
    <div
      className="bg-white rounded-2xl shadow-sm border border-border cursor-pointer hover:shadow-md transition-shadow relative overflow-hidden group"
      onClick={onClick}
    >
      {/* 3-dots context menu */}
      <div
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenu>
          <DropdownMenuTrigger className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <MoreVertical className="size-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent side="bottom" align="end">
            <DropdownMenuItem
              className="text-destructive focus:text-destructive flex items-center gap-2"
              onClick={handleDelete}
            >
              <Trash2 className="size-3.5" />
              Видалити
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

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

      <div className="p-3">
        {/* Title */}
        <p className="text-sm font-medium leading-snug mb-2.5 pr-5">{task.title}</p>

        {/* Progress bar */}
        {subtaskCount > 0 && (
          <div className="mb-2.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-muted-foreground font-medium">{progressPercent}%</span>
              <span className="text-[10px] text-muted-foreground">{doneSubtasks}/{subtaskCount}</span>
            </div>
            <div className="h-1 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${progressPercent}%`,
                  backgroundColor: '#2a6ff3',
                }}
              />
            </div>
          </div>
        )}

        {/* Badges: priority + labels */}
        {(priority || taskLabels.length > 0) && (
          <div className="flex flex-wrap items-center gap-1 mb-2.5" onClick={(e) => e.stopPropagation()}>
            {priority && (
              <DropdownMenu>
                <DropdownMenuTrigger className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded text-white leading-none cursor-pointer" style={{ backgroundColor: PRIORITY_COLORS[priority] }}>
                    {PRIORITY_BADGE[priority]}
                </DropdownMenuTrigger>
                <DropdownMenuContent side="bottom" align="start">
                  {Object.entries(PRIORITY_BADGE).map(([key, label]) => (
                    <DropdownMenuItem
                      key={key}
                      onClick={() => handleSetPriority(key)}
                      className="flex items-center gap-2"
                    >
                      <span
                        className="inline-flex text-[10px] font-bold px-1.5 py-0.5 rounded text-white"
                        style={{ backgroundColor: PRIORITY_COLORS[key] }}
                      >
                        {label}
                      </span>
                      {key === 'URGENT' ? 'Критичний' : key === 'HIGH' ? 'Високий' : key === 'MEDIUM' ? 'Середній' : 'Низький'}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleSetPriority(null)} className="text-muted-foreground">
                    Очистити
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {taskLabels.map((tl) => (
              <button
                key={tl.label.id}
                className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-full font-medium text-white leading-none cursor-pointer hover:opacity-80 transition-opacity"
                style={{ backgroundColor: tl.label.color }}
                onClick={() => toggleLabel(tl.label)}
                title="Прибрати мітку"
              >
                {tl.label.name}
              </button>
            ))}
          </div>
        )}

        {/* Bottom row */}
        <div
          className="flex items-center gap-1 text-xs text-muted-foreground"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Deadline */}
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
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive w-full justify-start h-auto py-1 text-xs" onClick={() => handleSetDeadline(undefined)}>
                    Очистити дату
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>

          {/* Comments */}
          {commentCount > 0 && (
            <span className="flex items-center gap-0.5 px-1 py-0.5">
              <MessageSquare className="size-3 shrink-0" />
              <span className="text-[10px]">{commentCount}</span>
            </span>
          )}

          {/* Attachments */}
          {attachCount > 0 && (
            <span className="flex items-center gap-0.5 px-1 py-0.5">
              <Paperclip className="size-3 shrink-0" />
              <span className="text-[10px]">{attachCount}</span>
            </span>
          )}

          {/* Pomodoros */}
          {task.estimatedPomodoros != null && task.estimatedPomodoros > 0 && (
            <span className="flex items-center gap-0.5 px-1 py-0.5">
              <span className="text-[10px]">🍅 {task.estimatedPomodoros}</span>
            </span>
          )}

          <span className="flex-1" />

          {/* Add label — only when no labels */}
          {taskLabels.length === 0 && (
            <Popover onOpenChange={(open) => open && loadLabels()}>
              <PopoverTrigger className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full leading-none border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-muted-foreground hover:text-foreground transition-colors">
                <Tag className="size-2.5 shrink-0" />
              </PopoverTrigger>
              <PopoverContent side="bottom" align="end" className="w-44 p-2">
                <p className="text-xs font-medium text-muted-foreground mb-2">Мітки</p>
                {allLabels.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Немає міток</p>
                ) : (
                  <div className="flex flex-col gap-0.5">
                    {allLabels.map((label) => (
                      <Button
                        key={label.id}
                        variant="ghost"
                        className="flex items-center gap-2 text-xs h-auto py-1 px-1.5 w-full justify-start"
                        onClick={() => toggleLabel(label)}
                      >
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: label.color }} />
                        <span className="flex-1 truncate">{label.name}</span>
                      </Button>
                    ))}
                  </div>
                )}
              </PopoverContent>
            </Popover>
          )}

          {/* Subtasks */}
          {subtaskCount > 0 || addingSubtask ? (
            <Button
              variant="ghost"
              className="flex items-center gap-1 h-auto px-1 py-0.5 text-xs"
              onClick={(e) => { e.stopPropagation(); setSubtasksOpen(!subtasksOpen) }}
            >
              {subtasksOpen ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="h-auto w-auto px-1 py-0.5"
              title="Додати підзадачу"
              onClick={(e) => { e.stopPropagation(); openSubtasks() }}
            >
              <ListPlus className="size-3.5" />
            </Button>
          )}
        </div>

        {/* Inline subtask list */}
        {subtasksOpen && (
          <div
            className="mt-2 flex flex-col gap-0.5 border-t border-border pt-2"
            onClick={(e) => e.stopPropagation()}
          >
            {subtasksState.map((st) => (
              <div key={st.id} className="flex items-center gap-1.5 group/subtask py-0.5">
                <Button variant="ghost" size="icon" className="shrink-0 h-auto w-auto p-0" onClick={() => handleToggleDone(st)}>
                  <div className={cn('w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors', st.status?.isDone ? 'bg-primary border-primary' : 'border-border hover:border-primary')}>
                    {st.status?.isDone && <Check className="size-2.5 text-white" />}
                  </div>
                </Button>
                <Button
                  variant="ghost"
                  className={cn('flex-1 text-xs truncate text-muted-foreground text-left hover:text-foreground h-auto p-0 justify-start', st.status?.isDone && 'line-through opacity-50')}
                  onClick={() => setOpenTaskId(st.id)}
                >
                  {st.title}
                </Button>
              </div>
            ))}

            {addingSubtask ? (
              <div className="flex items-center gap-1 mt-1 pt-1 border-t border-border">
                <input
                  autoFocus
                  className="flex-1 text-xs bg-transparent border-b border-primary outline-none placeholder:text-muted-foreground/60 py-0.5"
                  placeholder="Назва підзадачі..."
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddSubtask()
                    if (e.key === 'Escape') { setAddingSubtask(false); setNewSubtaskTitle('') }
                  }}
                  onBlur={() => { if (!newSubtaskTitle.trim()) setAddingSubtask(false) }}
                />
                <Button variant="ghost" size="icon" className="h-auto w-auto p-0 text-primary hover:text-primary/80" onMouseDown={(e) => { e.preventDefault(); handleAddSubtask() }}>
                  <Check className="size-3.5" />
                </Button>
              </div>
            ) : (
              <Button variant="ghost" className="flex items-center gap-1 text-xs text-muted-foreground mt-1 h-auto py-0.5 px-0 justify-start" onClick={() => setAddingSubtask(true)}>
                <Plus className="size-3" />
                Додати
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
