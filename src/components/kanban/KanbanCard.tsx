'use client'

import { useState } from 'react'
import { Paperclip, ChevronDown, ChevronUp } from 'lucide-react'
import { Task } from '@/lib/types'
import { useTimerStore } from '@/store/timer-store'
import { formatDuration } from '@/lib/format-time'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/app-store'

const PRIORITY_COLORS: Record<string, string> = {
  LOW: '#22c55e',
  MEDIUM: '#eab308',
  HIGH: '#f97316',
  URGENT: '#ef4444',
}

interface Props {
  task: Task
  onClick: () => void
}

export default function KanbanCard({ task, onClick }: Props) {
  const [subtasksOpen, setSubtasksOpen] = useState(false)
  const { isRunning, activeTask, currentSeconds } = useTimerStore()
  const { setOpenTaskId } = useAppStore()

  const isTimingThis = isRunning && activeTask?.id === task.id

  const attachCount = task._count?.attachments ?? task.attachments?.length ?? 0
  const subtaskCount = task._count?.subtasks ?? task.subtasks?.length ?? 0
  const subtasks = task.subtasks ?? []

  const doneSubtasks = subtasks.filter((s) => {
    // We don't always have status info on subtasks in list view
    return false
  }).length

  return (
    <div
      className="bg-white rounded-xl shadow-sm border border-border cursor-pointer hover:shadow-md transition-shadow relative overflow-hidden group"
      onClick={onClick}
    >
      {/* Priority indicator on left border */}
      {task.priority && (
        <div
          className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
          style={{ backgroundColor: PRIORITY_COLORS[task.priority] }}
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

      <div className={cn('p-3', task.priority && 'pl-4')}>
        {/* Title */}
        <p className="text-sm font-medium leading-snug mb-2">{task.title}</p>

        {/* Bottom row */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {attachCount > 0 && (
            <span className="flex items-center gap-0.5">
              <Paperclip className="size-3" />
              {attachCount}
            </span>
          )}

          {subtaskCount > 0 && (
            <button
              className="flex items-center gap-0.5 hover:text-foreground transition-colors"
              onClick={(e) => {
                e.stopPropagation()
                setSubtasksOpen(!subtasksOpen)
              }}
            >
              <span className="i-lucide-list-checks size-3">☑</span>
              <span>
                {doneSubtasks}/{subtaskCount}
              </span>
              {subtasksOpen ? (
                <ChevronUp className="size-3" />
              ) : (
                <ChevronDown className="size-3" />
              )}
            </button>
          )}

          {task.deadline && (
            <span className="ml-auto text-xs">
              {new Date(task.deadline).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' })}
            </span>
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
