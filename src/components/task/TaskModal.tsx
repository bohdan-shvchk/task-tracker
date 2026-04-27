'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

const RichTextEditor = dynamic(() => import('@/components/ui/rich-text-editor'), {
  ssr: false,
  loading: () => <div className="h-32 rounded-lg border border-border bg-muted/20 animate-pulse" />,
})
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import type { DateRange } from '@/components/ui/date-range-picker'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import {
  Paperclip, Play, Square, ChevronDown, ChevronUp, Trash2, Plus, MoreVertical, Clock, Check, X, Tag, Pencil, ListChecks, MessageCircle,
} from 'lucide-react'
import { Task, Status, Comment, TimeLog, Label } from '@/lib/types'
import { ColorPalette } from '@/components/ui/color-palette'
import { useTimerStore } from '@/store/timer-store'
import { formatDuration } from '@/lib/format-time'
import { format } from 'date-fns'
import { uk } from 'date-fns/locale'
import { useAppStore } from '@/store/app-store'
import { ProjectIcon } from '@/components/ui/icon-picker'

const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Низький', MEDIUM: 'Середній', HIGH: 'Високий', URGENT: 'Терміновий',
}
const PRIORITY_COLORS: Record<string, string> = {
  LOW: '#22c55e', MEDIUM: '#eab308', HIGH: '#f97316', URGENT: '#ef4444',
}

interface Props {
  taskId: string
  onClose: () => void
  isSubtask?: boolean
  isNew?: boolean
}

export default function TaskModal({ taskId, onClose, isSubtask = false, isNew = false }: Props) {
  const [task, setTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)
  const [statuses, setStatuses] = useState<Status[]>([])
  const [allLabels, setAllLabels] = useState<Label[]>([])
  const [title, setTitle] = useState('')
  const [newComment, setNewComment] = useState('')
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')
  const [addingSubtask, setAddingSubtask] = useState(false)
  const [timeLogsOpen, setTimeLogsOpen] = useState(false)
  const [openSubtaskId, setOpenSubtaskId] = useState<string | null>(null)
  const [labelPopoverOpen, setLabelPopoverOpen] = useState(false)
  const [newLabelName, setNewLabelName] = useState('')
  const [newLabelColor, setNewLabelColor] = useState('#6366f1')
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null)
  const [editingLabelName, setEditingLabelName] = useState('')
  const [editingLabelColor, setEditingLabelColor] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [addingManualTime, setAddingManualTime] = useState(false)
  const [manualDate, setManualDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [manualStart, setManualStart] = useState('09:00')
  const [manualEnd, setManualEnd] = useState('10:00')
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false)
  const { projects } = useAppStore()

  const { isRunning, currentSeconds, activeTimeLog, activeTask, setActiveTimeLog, setActiveTask, setIsRunning, tick, reset } = useTimerStore()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isThisTask = activeTask?.id === taskId

  useEffect(() => {
    if (isRunning && isThisTask) {
      intervalRef.current = setInterval(() => tick(), 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [isRunning, isThisTask, tick])

  const fetchTask = useCallback(async () => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`)
      if (res.ok) {
        const data: Task = await res.json()
        setTask(data)
        setTitle(data.title)
        if (data.projectId) {
          const pRes = await fetch(`/api/projects/${data.projectId}`)
          if (pRes.ok) {
            const pData = await pRes.json()
            setStatuses(pData.statuses?.slice().sort((a: Status, b: Status) => a.order - b.order) ?? [])
          }
        }
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [taskId, projects])

  const fetchLabels = useCallback(async () => {
    try {
      const res = await fetch('/api/labels')
      if (res.ok) setAllLabels(await res.json())
    } catch (e) { console.error(e) }
  }, [])

  useEffect(() => { fetchTask(); fetchLabels() }, [fetchTask, fetchLabels])

  const updateTask = async (data: Partial<Task>) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        const updated: Task = await res.json()
        setTask(updated)
      }
    } catch (e) { console.error(e) }
  }

  const handleTitleBlur = () => { if (title !== task?.title) updateTask({ title }) }
  const handleStatusChange = (statusId: string) => updateTask({ statusId })
  const handlePriorityChange = (priority: string) => updateTask({ priority: priority as Task['priority'] })
  const handleMarkDone = () => {
    const doneStatus = statuses.find((s) => s.isDone)
    if (doneStatus && task?.statusId !== doneStatus.id) updateTask({ statusId: doneStatus.id })
  }

  const handleDateRangeChange = (range: DateRange | undefined) => {
    updateTask({
      startDate: range?.from ? range.from.toISOString() : undefined,
      deadline: range?.to ? range.to.toISOString() : range?.from ? range.from.toISOString() : undefined,
    })
  }

  const handleAddLabel = async (labelId: string) => {
    const alreadyAdded = task?.labels?.some((l) => l.label.id === labelId)
    if (alreadyAdded) {
      // Remove
      try {
        await fetch(`/api/tasks/${taskId}/labels`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ labelId }),
        })
        fetchTask()
      } catch (e) { console.error(e) }
    } else {
      // Add
      try {
        await fetch(`/api/tasks/${taskId}/labels`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ labelId }),
        })
        fetchTask()
      } catch (e) { console.error(e) }
    }
  }

  const handleUpdateLabel = async (labelId: string) => {
    const name = editingLabelName.trim()
    if (!name) return
    try {
      await fetch(`/api/labels/${labelId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, color: editingLabelColor }),
      })
      setAllLabels((prev) => prev.map((l) => l.id === labelId ? { ...l, name, color: editingLabelColor } : l))
      setEditingLabelId(null)
      fetchTask()
    } catch (e) { console.error(e) }
  }

  const handleDeleteLabel = async (labelId: string) => {
    try {
      await fetch(`/api/labels/${labelId}`, { method: 'DELETE' })
      setAllLabels((prev) => prev.filter((l) => l.id !== labelId))
      fetchTask()
    } catch (e) { console.error(e) }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await fetch(`/api/tasks/${taskId}/attachments`, { method: 'POST', body: formData })
      if (res.ok) fetchTask()
    } catch (err) { console.error(err) }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDeleteAttachment = async (attId: string) => {
    try {
      await fetch(`/api/attachments/${attId}`, { method: 'DELETE' })
      fetchTask()
    } catch (e) { console.error(e) }
  }


  const handleCreateLabel = async () => {
    const name = newLabelName.trim()
    if (!name) return
    try {
      const res = await fetch('/api/labels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, color: newLabelColor }),
      })
      if (res.ok) {
        const label: Label = await res.json()
        setAllLabels((prev) => [...prev, label])
        setNewLabelName('')
        // Auto-add to task
        await fetch(`/api/tasks/${taskId}/labels`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ labelId: label.id }),
        })
        fetchTask()
      }
    } catch (e) { console.error(e) }
  }

  const handleAddComment = async () => {
    if (!newComment.trim()) return
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment.trim() }),
      })
      if (res.ok) { setNewComment(''); fetchTask() }
    } catch (e) { console.error(e) }
  }

  const handleDeleteComment = async (commentId: string) => {
    try {
      await fetch(`/api/tasks/${taskId}/comments/${commentId}`, { method: 'DELETE' })
      fetchTask()
    } catch (e) { console.error(e) }
  }

  const handleAddSubtask = async () => {
    if (!newSubtaskTitle.trim() || !task) return
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newSubtaskTitle.trim(),
          projectId: task.projectId,
          statusId: task.statusId,
          parentId: taskId,
          order: (task.subtasks?.length ?? 0),
        }),
      })
      if (res.ok) { setNewSubtaskTitle(''); setAddingSubtask(false); fetchTask() }
    } catch (e) { console.error(e) }
  }

  const handleToggleSubtask = async (subtask: Task) => {
    const doneStatus = statuses.find((s) => s.isDone)
    if (!doneStatus) return
    const isDone = subtask.statusId === doneStatus.id
    const newStatusId = isDone ? (statuses.find((s) => !s.isDone)?.id ?? subtask.statusId) : doneStatus.id
    try {
      await fetch(`/api/tasks/${subtask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statusId: newStatusId }),
      })
      fetchTask()
    } catch (e) { console.error(e) }
  }

  const handleDeleteSubtask = async (subtaskId: string) => {
    try { await fetch(`/api/tasks/${subtaskId}`, { method: 'DELETE' }); fetchTask() }
    catch (e) { console.error(e) }
  }

  const handleStartTimer = async () => {
    if (!task) return
    try {
      const res = await fetch('/api/timer/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId }),
      })
      if (res.ok) {
        const tl: TimeLog = await res.json()
        setActiveTimeLog(tl)
        setActiveTask({ id: task.id, title: task.title, projectId: task.projectId })
        setIsRunning(true)
        useTimerStore.setState({ currentSeconds: 0 })
      }
    } catch (e) { console.error(e) }
  }

  const handleStopTimer = async () => {
    if (!task) return
    try {
      await fetch('/api/timer/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId }),
      })
      reset()
      fetchTask()
    } catch (e) { console.error(e) }
  }

  const handleSaveManualTime = async () => {
    try {
      const startTime = new Date(`${manualDate}T${manualStart}`)
      const endTime = new Date(`${manualDate}T${manualEnd}`)
      if (endTime <= startTime) return
      const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000)
      const res = await fetch(`/api/tasks/${taskId}/timelogs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startTime: startTime.toISOString(), endTime: endTime.toISOString(), duration }),
      })
      if (res.ok) { setAddingManualTime(false); fetchTask() }
    } catch (e) { console.error(e) }
  }

  const handleDeleteTimeLog = async (tlId: string) => {
    try { await fetch(`/api/timelogs/${tlId}`, { method: 'DELETE' }); fetchTask() }
    catch (e) { console.error(e) }
  }

  const handleDeleteTask = async () => {
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deletedAt: new Date().toISOString() }),
      })
      onClose()
    } catch (e) { console.error(e) }
  }

  const handleClose = async () => {
    if (!isNew) { onClose(); return }
    const hasTitle = title.trim().length > 0
    const hasDesc = (task?.description ?? '').trim().length > 0
    const hasLabels = (task?.labels?.length ?? 0) > 0
    const hasContent = hasTitle || hasDesc || hasLabels
    if (!hasContent) {
      // Nothing entered — delete silently
      try { await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' }) } catch (e) { console.error(e) }
      onClose()
    } else if (!hasTitle) {
      // Has content but no title — show confirmation
      setConfirmCloseOpen(true)
    } else {
      onClose()
    }
  }

  const handleConfirmDiscard = async () => {
    try { await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' }) } catch (e) { console.error(e) }
    setConfirmCloseOpen(false)
    onClose()
  }

  const totalLoggedSeconds = task?.timeLogs?.filter((tl) => tl.endTime).reduce((sum, tl) => sum + (tl.duration ?? 0), 0) ?? 0
  const doneStatus = statuses.find((s) => s.isDone)
  const isDone = task?.statusId === doneStatus?.id
  const currentStatus = statuses.find((s) => s.id === task?.statusId)
  const subtasks = task?.subtasks ?? []
  const doneSubtasks = subtasks.filter((s) => s.statusId === doneStatus?.id).length
  const comments = [...(task?.comments ?? [])].reverse()
  const taskLabels = task?.labels?.map((l) => l.label) ?? []

  return (
    <>
      <Dialog open onOpenChange={(open) => { if (!open) handleClose() }}>
        <DialogContent className="!max-w-5xl w-full h-[85vh] p-0 gap-0 overflow-hidden" showCloseButton={false}>
          {loading ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">Завантаження...</div>
          ) : !task ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">Завдання не знайдено</div>
          ) : (
            <div className="flex h-full overflow-hidden">

              {/* ── LEFT PANEL ── */}
              <div className="flex-1 min-w-0 flex flex-col overflow-y-auto border-r border-border">

                {/* Title header */}
                <div className="flex items-center gap-2 p-4 border-b border-border sticky top-0 bg-background z-10">
                  <input
                    className="flex-1 text-base font-semibold bg-transparent outline-none border-none focus:ring-0"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onBlur={handleTitleBlur}
                    placeholder="Назва завдання"
                  />
                  <Button variant="ghost" size="icon" onClick={handleClose} className="text-muted-foreground hover:text-foreground ml-2">
                    <X className="size-4" />
                  </Button>
                </div>

                {/* Project + Status */}
                <div className="flex items-center gap-3 px-4 py-3 flex-wrap">
                  {task.project && (
                    <div className="flex items-center gap-2">
                      <ProjectIcon icon={task.project.icon} color={task.project.color} size="sm" />
                      <span className="text-sm font-medium">{task.project.name}</span>
                    </div>
                  )}

                  {/* Status dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger className="flex items-center gap-1.5 border border-input rounded-md px-2 py-1 text-sm hover:bg-muted transition-colors">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: currentStatus?.color ?? '#94a3b8' }} />
                      <span>{currentStatus?.name ?? 'Статус'}</span>
                      <ChevronDown className="size-3 text-muted-foreground" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      {statuses.map((s) => (
                        <DropdownMenuItem key={s.id} onClick={() => handleStatusChange(s.id)} className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                          {s.name}
                          {task.statusId === s.id && <Check className="size-3 ml-auto" />}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Meta fields — card style */}
                <div className="px-4 pb-4 flex flex-wrap gap-4 pt-4">

                  {/* Date range (start → deadline) */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-foreground">Дедлайн</span>
                    <DateRangePicker
                      value={
                        task.startDate || task.deadline
                          ? { from: task.startDate ? new Date(task.startDate) : undefined, to: task.deadline ? new Date(task.deadline) : undefined }
                          : undefined
                      }
                      onChange={handleDateRangeChange}
                      className="bg-[#F5F8FF] rounded-[8px] px-3 py-2 hover:opacity-90 transition-opacity"
                    />
                  </div>

                  {/* Priority */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-foreground">Пріоритет</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger className="flex items-center gap-2 bg-[#F5F8FF] rounded-[8px] px-3 py-2 text-sm hover:opacity-90 transition-opacity">
                        {task.priority ? (
                          <>
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PRIORITY_COLORS[task.priority] }} />
                            <span>{PRIORITY_LABELS[task.priority]}</span>
                          </>
                        ) : (
                          <span className="text-muted-foreground">Не вказано</span>
                        )}
                        <ChevronDown className="size-3 text-muted-foreground ml-1" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => handlePriorityChange('')} className="text-muted-foreground">
                          Не вказано
                        </DropdownMenuItem>
                        {Object.entries(PRIORITY_LABELS).map(([val, label]) => (
                          <DropdownMenuItem key={val} onClick={() => handlePriorityChange(val)} className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PRIORITY_COLORS[val] }} />
                            {label}
                            {task.priority === val && <Check className="size-3 ml-auto" />}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Labels */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-foreground">Мітки</span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {taskLabels.map((lbl) => (
                        <span
                          key={lbl.id}
                          className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-[8px] text-white cursor-pointer hover:opacity-80"
                          style={{ backgroundColor: lbl.color }}
                          onClick={() => handleAddLabel(lbl.id)}
                        >
                          {lbl.name}
                          <X className="size-3" />
                        </span>
                      ))}
                      <Popover open={labelPopoverOpen} onOpenChange={setLabelPopoverOpen}>
                        <PopoverTrigger className={taskLabels.length > 0
                          ? "flex items-center justify-center text-sm text-muted-foreground border-2 border-dashed border-border rounded-[8px] px-3 h-9 hover:border-foreground/40 hover:text-foreground transition-colors"
                          : "flex items-center gap-2 text-sm text-muted-foreground bg-[#F5F8FF] rounded-[8px] px-3 py-2 hover:opacity-90 transition-opacity"
                        }>
                          {taskLabels.length > 0 ? (
                            <Plus className="size-3.5" />
                          ) : (
                            <><Tag className="size-3.5" />Додати</>
                          )}
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-2" align="start">
                          <p className="text-xs font-medium text-muted-foreground mb-2 px-1">Мітки</p>
                          <div className="flex flex-col gap-0.5 max-h-48 overflow-y-auto mb-2">
                            {allLabels.map((lbl) => {
                              const isActive = taskLabels.some((t) => t.id === lbl.id)
                              if (editingLabelId === lbl.id) {
                                return (
                                  <div key={lbl.id} className="px-2 py-2 rounded-md bg-muted flex flex-col gap-2">
                                    <div className="flex items-center gap-1.5">
                                      <span className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: editingLabelColor }} />
                                      <input
                                        autoFocus
                                        className="flex-1 text-xs border border-input rounded px-1.5 py-0.5 bg-background outline-none focus:border-ring"
                                        value={editingLabelName}
                                        onChange={(e) => setEditingLabelName(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') handleUpdateLabel(lbl.id)
                                          if (e.key === 'Escape') setEditingLabelId(null)
                                        }}
                                      />
                                      <Button variant="ghost" size="icon" onClick={() => handleUpdateLabel(lbl.id)} className="text-green-600 hover:text-green-700 size-5"><Check className="size-3" /></Button>
                                      <Button variant="ghost" size="icon" onClick={() => setEditingLabelId(null)} className="text-muted-foreground hover:text-foreground size-5"><X className="size-3" /></Button>
                                    </div>
                                    <ColorPalette value={editingLabelColor} onChange={setEditingLabelColor} className="p-0" />
                                  </div>
                                )
                              }
                              return (
                                <div key={lbl.id} className="flex items-center gap-1 px-1 py-0.5 rounded-md hover:bg-muted group">
                                  <Button
                                    variant="ghost"
                                    className="flex items-center gap-2 flex-1 text-sm text-left py-1 h-auto justify-start"
                                    onClick={() => handleAddLabel(lbl.id)}
                                  >
                                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: lbl.color }} />
                                    <span className="flex-1">{lbl.name}</span>
                                    {isActive && <Check className="size-3 text-primary" />}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground size-5"
                                    onClick={() => { setEditingLabelId(lbl.id); setEditingLabelName(lbl.name); setEditingLabelColor(lbl.color) }}
                                  ><Pencil className="size-2.5" /></Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive/80 size-5"
                                    onClick={() => handleDeleteLabel(lbl.id)}
                                  ><Trash2 className="size-2.5" /></Button>
                                </div>
                              )
                            })}
                            {allLabels.length === 0 && <p className="text-xs text-muted-foreground px-2 py-1">Немає міток</p>}
                          </div>
                          <div className="border-t border-border pt-2 flex flex-col gap-2">
                            <div className="flex gap-1 items-center">
                              <span className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: newLabelColor }} />
                              <input
                                className="flex-1 text-xs border border-input rounded px-2 py-1 outline-none focus:border-ring bg-background"
                                placeholder="Нова мітка..."
                                value={newLabelName}
                                onChange={(e) => setNewLabelName(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleCreateLabel() }}
                              />
                              <Button size="sm" className="h-6 text-xs px-2" onClick={handleCreateLabel}>+</Button>
                            </div>
                            <ColorPalette value={newLabelColor} onChange={setNewLabelColor} className="p-0" />
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                </div>

                {/* Description */}
                <div className="px-4 pb-4 pt-4">
                  <p className="text-sm font-medium mb-2 flex items-center gap-2"><Pencil className="size-3.5 text-muted-foreground" />Опис</p>
                  <RichTextEditor
                    key={taskId}
                    initialContent={task.description}
                    onSave={(json) => updateTask({ description: json })}
                  />
                </div>

                {/* Subtasks */}
                {!isSubtask && (
                  <div className="px-4 pb-4 pt-4">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <ListChecks className="size-5 text-foreground" />
                        <span className="text-sm font-semibold">Підзавдання</span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    {subtasks.length > 0 && (
                      <div className="flex items-center gap-3 mb-4">
                        <span className="text-sm text-muted-foreground w-8 shrink-0 tabular-nums">
                          {Math.round((doneSubtasks / subtasks.length) * 100)}%
                        </span>
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{ width: `${Math.round((doneSubtasks / subtasks.length) * 100)}%`, backgroundColor: 'var(--aqua-blue)' }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Subtask list */}
                    <div className="flex flex-col gap-3">
                      {subtasks.map((subtask) => {
                        const subtaskDone = subtask.statusId === doneStatus?.id
                        return (
                          <div key={subtask.id} className="flex items-center gap-3 group">
                            <button
                              className="w-5 h-5 rounded-[5px] border-2 flex items-center justify-center shrink-0 transition-colors"
                              style={subtaskDone
                                ? { backgroundColor: 'var(--aqua-blue)', borderColor: 'var(--aqua-blue)' }
                                : { backgroundColor: 'transparent', borderColor: '#d1d5db' }}
                              onClick={() => handleToggleSubtask(subtask)}
                            >
                              {subtaskDone && (
                                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                  <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              )}
                            </button>
                            <span
                              className="flex-1 text-sm cursor-pointer hover:text-foreground transition-colors"
                              style={subtaskDone ? { textDecoration: 'line-through', color: 'var(--muted-foreground)' } : {}}
                              onClick={() => setOpenSubtaskId(subtask.id)}
                            >
                              {subtask.title}
                            </span>
                            <button
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                              onClick={() => handleDeleteSubtask(subtask.id)}
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        )
                      })}
                    </div>

                    {/* Add new item */}
                    {addingSubtask ? (
                      <div className="flex gap-2 mt-4">
                        <input
                          autoFocus
                          className="flex-1 text-sm border border-input rounded-lg px-3 py-2.5 outline-none focus:border-ring bg-background"
                          placeholder="Назва підзавдання..."
                          value={newSubtaskTitle}
                          onChange={(e) => setNewSubtaskTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddSubtask()
                            if (e.key === 'Escape') { setAddingSubtask(false); setNewSubtaskTitle('') }
                          }}
                        />
                        <button
                          onClick={handleAddSubtask}
                          className="py-2.5 px-5 rounded-[8px] text-sm font-medium text-white hover:opacity-90 transition-opacity"
                          style={{ backgroundColor: 'var(--aqua-blue)' }}
                        >
                          Додати
                        </button>
                      </div>
                    ) : (
                      <button
                        className="mt-4 flex items-center gap-2 text-sm font-medium text-white px-5 py-2.5 rounded-[8px] hover:opacity-90 transition-opacity"
                        onClick={() => setAddingSubtask(true)}
                        style={{ backgroundColor: 'var(--aqua-blue)' }}
                      >
                        <Plus className="size-4" />
                        Add new item
                      </button>
                    )}
                  </div>
                )}

                {/* Attachments */}
                <div className="px-4 pb-4 pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium flex items-center gap-2"><Paperclip className="size-3.5 text-muted-foreground" />Вкладення</p>
                    <button className="flex items-center gap-1.5 py-2.5 px-5 rounded-[8px] text-sm font-medium border border-input hover:bg-muted transition-colors" onClick={() => fileInputRef.current?.click()}>
                      <Plus className="size-4" />Додати
                    </button>
                    <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
                  </div>
                  {task.attachments && task.attachments.length > 0 ? (
                    <div className="flex flex-col gap-1.5">
                      {task.attachments.map((att) => (
                        <div key={att.id} className="flex items-center gap-2 text-sm p-2 rounded-md border border-border group">
                          <Paperclip className="size-3.5 text-muted-foreground shrink-0" />
                          <a href={att.url} target="_blank" rel="noopener noreferrer" className="flex-1 truncate hover:underline">{att.filename}</a>
                          <span className="text-xs text-muted-foreground">{(att.size / 1024).toFixed(0)} KB</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive/80 transition-opacity"
                            onClick={() => handleDeleteAttachment(att.id)}
                          ><Trash2 className="size-3.5" /></Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Немає вкладень</p>
                  )}
                </div>

                {/* Timestamps + delete */}
                <div className="px-4 py-3 border-t border-border mt-auto flex items-center justify-between">
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>Створено: {format(new Date(task.createdAt), 'dd.MM.yyyy HH:mm')}</span>
                    <span>Оновлено: {format(new Date(task.updatedAt), 'dd.MM.yyyy HH:mm')}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleDeleteTask}
                    className="text-muted-foreground hover:text-destructive transition-colors hover:bg-destructive/10"
                    title="Видалити завдання"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>

              {/* ── RIGHT PANEL ── */}
              <div className="w-80 flex flex-col overflow-y-auto shrink-0">

                {/* Timer */}
                <div className="p-4 border-b border-border">
                  <p className="text-sm font-medium mb-3">Таймер</p>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="font-mono text-2xl font-bold tabular-nums">
                      {isThisTask && isRunning ? formatDuration(currentSeconds) : '00:00:00'}
                    </span>
                    {isThisTask && isRunning ? (
                      <Button size="sm" variant="destructive" className="gap-1" onClick={handleStopTimer}>
                        <Square className="size-3.5" />Стоп
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="bg-green-500 hover:bg-green-600 text-white border-0 gap-1"
                        onClick={handleStartTimer}
                      >
                        <Play className="size-3.5" />Старт
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="ml-auto text-xs text-muted-foreground hover:text-foreground border border-dashed border-border rounded px-1.5 py-1 size-7"
                      onClick={() => setAddingManualTime(!addingManualTime)}
                      title="Додати час вручну"
                    >
                      <Plus className="size-3" />
                    </Button>
                  </div>

                  {/* Manual time entry form */}
                  {addingManualTime && (
                    <div className="mb-3 p-2.5 rounded-lg border border-border bg-muted/30 flex flex-col gap-2">
                      <p className="text-xs font-medium text-muted-foreground">Додати час вручну</p>
                      <input type="date" className="text-xs border border-input rounded px-2 py-1 bg-background outline-none focus:border-ring w-full" value={manualDate} onChange={(e) => setManualDate(e.target.value)} />
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <p className="text-xs text-muted-foreground mb-0.5">Початок</p>
                          <input type="time" className="text-xs border border-input rounded px-2 py-1 bg-background outline-none focus:border-ring w-full" value={manualStart} onChange={(e) => setManualStart(e.target.value)} />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-muted-foreground mb-0.5">Кінець</p>
                          <input type="time" className="text-xs border border-input rounded px-2 py-1 bg-background outline-none focus:border-ring w-full" value={manualEnd} onChange={(e) => setManualEnd(e.target.value)} />
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        <Button size="sm" className="h-7 text-xs flex-1" onClick={handleSaveManualTime}>Зберегти</Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setAddingManualTime(false)}>✕</Button>
                      </div>
                    </div>
                  )}

                  {/* Total + logs */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Витрачено: <strong>{formatDuration(totalLoggedSeconds)}</strong></span>
                    <Button variant="ghost" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 h-auto px-1 py-0" onClick={() => setTimeLogsOpen(!timeLogsOpen)}>
                      <Clock className="size-3" />
                      {timeLogsOpen ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                    </Button>
                  </div>

                  {timeLogsOpen && (
                    <div className="mt-2 flex flex-col gap-1">
                      {task.timeLogs?.filter((tl) => tl.endTime).length === 0 && (
                        <p className="text-xs text-muted-foreground">Немає записів</p>
                      )}
                      {task.timeLogs?.filter((tl) => tl.endTime).map((tl) => (
                        <div key={tl.id} className="flex items-center gap-2 text-xs p-1.5 rounded bg-muted">
                          <span className="flex-1 text-muted-foreground">
                            {format(new Date(tl.startTime), 'dd.MM HH:mm')} — {tl.endTime ? format(new Date(tl.endTime), 'HH:mm') : '...'}
                          </span>
                          <span className="font-mono font-medium">{formatDuration(tl.duration ?? 0)}</span>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteTimeLog(tl.id)} className="text-muted-foreground hover:text-destructive size-5">
                            <Trash2 className="size-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Comments */}
                <div className="flex-1 p-4 flex flex-col gap-3">
                  <p className="text-sm font-medium flex items-center gap-2"><MessageCircle className="size-3.5 text-muted-foreground" />Коментарі {comments.length > 0 && `(${comments.length})`}</p>
                  <Textarea
                    placeholder="Напишіть коментар..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="text-sm resize-none min-h-[60px]"
                    onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleAddComment() }}
                  />
                  <button
                    onClick={handleAddComment}
                    disabled={!newComment.trim()}
                    className="w-full py-2.5 rounded-[8px] text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-40"
                    style={{ backgroundColor: 'var(--aqua-blue)' }}
                  >
                    Додати коментар
                  </button>
                  <div className="flex flex-col gap-2">
                    {comments.map((comment: Comment) => (
                      <div key={comment.id} className="flex flex-col gap-1 p-2.5 rounded-lg bg-muted group">
                        <p className="text-sm">{comment.content}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">{format(new Date(comment.createdAt), 'dd.MM.yyyy HH:mm')}</span>
                          <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity size-5" onClick={() => handleDeleteComment(comment.id)}>
                            <Trash2 className="size-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {/* Confirm discard overlay */}
              {confirmCloseOpen && (
                <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
                  <div className="bg-background border border-border rounded-xl p-6 shadow-xl max-w-sm mx-4">
                    <p className="text-sm font-semibold mb-1">Закрити завдання?</p>
                    <p className="text-sm text-muted-foreground mb-4">Завдання без назви — зміни не збережуться, якщо ви закриєте його зараз.</p>
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="ghost"
                        className="px-3 py-1.5 text-sm border border-border"
                        onClick={() => setConfirmCloseOpen(false)}
                      >
                        Продовжити редагування
                      </Button>
                      <Button
                        variant="destructive"
                        className="px-3 py-1.5 text-sm"
                        onClick={handleConfirmDiscard}
                      >
                        Закрити без збереження
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {openSubtaskId && (
        <TaskModal taskId={openSubtaskId} onClose={() => { setOpenSubtaskId(null); fetchTask() }} isSubtask />
      )}
    </>
  )
}
