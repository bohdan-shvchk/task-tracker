'use client'

import { useState, useEffect, useCallback } from 'react'
import { Trash2, RotateCcw, X } from 'lucide-react'
import { Task } from '@/lib/types'
import { Button } from '@/components/ui/button'

interface Props {
  projectId: string
  open: boolean
  onClose: () => void
  onRestore: () => void
}

function timeRemaining(deletedAt: string): string {
  const deleted = new Date(deletedAt).getTime()
  const expires = deleted + 30 * 24 * 60 * 60 * 1000
  const remaining = expires - Date.now()
  if (remaining <= 0) return 'Видаляється...'
  const days = Math.floor(remaining / (24 * 60 * 60 * 1000))
  const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000))
  if (days > 0) return `${days}д ${hours}г`
  const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000))
  return `${hours}г ${minutes}хв`
}

export default function TrashModal({ projectId, open, onClose, onRestore }: Props) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)

  const fetchTrash = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/trash`)
      if (res.ok) setTasks(await res.json())
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    if (open) fetchTrash()
  }, [open, fetchTrash])

  if (!open) return null

  const handleRestore = async (taskId: string) => {
    await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deletedAt: null }),
    })
    setTasks((prev) => prev.filter((t) => t.id !== taskId))
    onRestore()
  }

  const handlePermanentDelete = async (taskId: string) => {
    await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' })
    setTasks((prev) => prev.filter((t) => t.id !== taskId))
  }

  const handleEmptyTrash = async () => {
    await fetch(`/api/projects/${projectId}/trash`, { method: 'DELETE' })
    setTasks([])
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 bg-background rounded-2xl shadow-2xl border border-border w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
          <Trash2 className="size-4 text-muted-foreground" />
          <h2 className="font-semibold text-sm flex-1">Кошик</h2>
          <p className="text-xs text-muted-foreground">Задачі видаляються через 30 днів</p>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-muted-foreground hover:text-foreground ml-2">
            <X className="size-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Завантаження...</p>
          ) : tasks.length === 0 ? (
            <div className="text-center py-12">
              <Trash2 className="size-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Кошик порожній</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/30 group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate line-through text-muted-foreground">
                      {task.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Залишилось: <span className="text-foreground font-medium">{timeRemaining(task.deletedAt!)}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                      title="Відновити"
                      onClick={() => handleRestore(task.id)}
                    >
                      <RotateCcw className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                      title="Видалити назавжди"
                      onClick={() => handlePermanentDelete(task.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {tasks.length > 0 && (
          <div className="px-5 py-3 border-t border-border">
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive hover:bg-destructive/10 text-xs"
              onClick={handleEmptyTrash}
            >
              Очистити кошик
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
