'use client'

import { useEffect, useRef, useState } from 'react'
import { Square, ChevronLeft, ChevronRight } from 'lucide-react'
import { useTimerStore } from '@/store/timer-store'
import { formatDuration } from '@/lib/format-time'
import TaskModal from '@/components/task/TaskModal'
import { Button } from '@/components/ui/button'

export default function GlobalTimerWidget() {
  const { isRunning, currentSeconds, activeTask, activeTimeLog, setActiveTimeLog, setActiveTask, setIsRunning, tick, reset } = useTimerStore()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const [openTaskId, setOpenTaskId] = useState<string | null>(null)

  // Restore active timer on mount
  useEffect(() => {
    fetch('/api/timer/active')
      .then((r) => r.json())
      .then((data) => {
        if (data && data.id) {
          setActiveTimeLog(data)
          setIsRunning(true)
          if (data.task) setActiveTask(data.task)
          const start = new Date(data.startTime).getTime()
          const elapsed = Math.floor((Date.now() - start) / 1000)
          useTimerStore.setState({ currentSeconds: elapsed })
        }
      })
      .catch(() => {})
      .finally(() => setInitialized(true))
  }, [setActiveTimeLog, setActiveTask, setIsRunning])

  // Tick interval
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => tick(), 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isRunning, tick])

  const handleStop = async () => {
    if (!activeTask) return
    try {
      await fetch('/api/timer/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: activeTask.id }),
      })
      reset()
    } catch (e) {
      console.error(e)
    }
  }

  if (!initialized || !isRunning) return null

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-white border border-border rounded-2xl shadow-lg px-4 py-2.5">
        {/* Collapse toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          {collapsed ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
        </Button>

        {!collapsed && activeTask && (
          <Button
            variant="ghost"
            className="text-sm text-muted-foreground max-w-[140px] truncate hover:text-foreground hover:underline transition-colors text-left h-auto px-0 py-0 justify-start"
            onClick={() => setOpenTaskId(activeTask.id)}
          >
            {activeTask.title}
          </Button>
        )}

        {/* Time display */}
        <span className="font-mono text-sm font-semibold tabular-nums min-w-[64px]">
          {formatDuration(currentSeconds)}
        </span>

        {/* Stop */}
        <Button
          variant="destructive"
          size="icon"
          onClick={handleStop}
          className="w-8 h-8 rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors"
          title="Зупинити"
        >
          <Square className="size-3.5" />
        </Button>
      </div>

      {openTaskId && (
        <TaskModal
          taskId={openTaskId}
          onClose={() => setOpenTaskId(null)}
        />
      )}
    </>
  )
}
