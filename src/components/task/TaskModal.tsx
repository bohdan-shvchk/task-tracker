'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import {
  Paperclip, Play, Square, ChevronDown, ChevronUp, Trash2, Plus, MoreVertical, Clock, Check, X, CalendarIcon, Tag, Pencil,
} from 'lucide-react'
import { Task, Status, Comment, TimeLog, Label } from '@/lib/types'
import { ColorPalette } from '@/components/ui/color-palette'
import { useTimerStore } from '@/store/timer-store'
import { formatDuration } from '@/lib/format-time'
import { format } from 'date-fns'
import { uk } from 'date-fns/locale'
import { useAppStore } from '@/store/app-store'

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
}

export default function TaskModal({ taskId, onClose, isSubtask = false }: Props) {
  const [task, setTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)
  const [statuses, setStatuses] = useState<Status[]>([])
  const [allLabels, setAllLabels] = useState<Label[]>([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [descDirty, setDescDirty] = useState(false)
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
  const [pasteUploading, setPasteUploading] = useState(false)
  const [addingManualTime, setAddingManualTime] = useState(false)
  const [manualDate, setManualDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [manualStart, setManualStart] = useState('09:00')
  const [manualEnd, setManualEnd] = useState('10:00')
  const [deadlineOpen, setDeadlineOpen] = useState(false)
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
        setDescription(data.description ?? '')
        setDescDirty(false)
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

  const handleDeadlineSelect = (date: Date | undefined) => {
    updateTask({ deadline: date ? date.toISOString() : undefined })
    setDeadlineOpen(false)
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

  const handleDescriptionPaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = Array.from(e.clipboardData.items)
    const imageItem = items.find((item) => item.type.startsWith('image/'))
    if (!imageItem) return
    e.preventDefault()
    const file = imageItem.getAsFile()
    if (!file) return
    setPasteUploading(true)
    const formData = new FormData()
    const ext = file.type.split('/')[1] || 'png'
    formData.append('file', file, `screenshot-${Date.now()}.${ext}`)
    try {
      const res = await fetch(`/api/tasks/${taskId}/attachments`, { method: 'POST', body: formData })
      if (res.ok) fetchTask()
    } catch (err) { console.error(err) }
    finally { setPasteUploading(false) }
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
      <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
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
                  <button onClick={onClose} className="text-muted-foreground hover:text-foreground ml-2 p-1">
                    <X className="size-4" />
                  </button>
                </div>

                {/* Project + Status + Mark done */}
                <div className="flex items-center gap-3 px-4 py-3 flex-wrap">
                  {task.project && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: task.project.color }}>
                      {task.project.name}
                    </span>
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

                  <Button
                    size="sm"
                    variant={isDone ? 'default' : 'outline'}
                    className={isDone ? 'bg-green-500 hover:bg-green-600 text-white border-0' : ''}
                    onClick={handleMarkDone}
                  >
                    {isDone ? '✓ Завершено' : 'Позначити завершеним'}
                  </Button>
                </div>

                {/* Meta fields */}
                <div className="px-4 pb-4 flex flex-col divide-y divide-border">

                  {/* Assignees */}
                  <div className="flex items-center gap-2 py-2.5 text-sm">
                    <span className="text-muted-foreground w-28 shrink-0">Виконавці</span>
                    <span className="text-muted-foreground italic text-xs">Незабаром</span>
                  </div>

                  {/* Priority */}
                  <div className="flex items-center gap-2 py-2.5 text-sm">
                    <span className="text-muted-foreground w-28 shrink-0">Пріоритет</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger className="flex items-center gap-1.5 border border-input rounded-md px-2 py-1 text-sm hover:bg-muted transition-colors">
                        {task.priority
                          ? <><span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PRIORITY_COLORS[task.priority] }} /><span>{PRIORITY_LABELS[task.priority]}</span></>
                          : <span className="text-muted-foreground">Не вказано</span>
                        }
                        <ChevronDown className="size-3 text-muted-foreground" />
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
                  <div className="flex items-start gap-2 py-2.5 text-sm">
                    <span className="text-muted-foreground w-28 shrink-0 mt-0.5">Мітки</span>
                    <div className="flex flex-wrap items-center gap-1.5 flex-1">
                      {taskLabels.map((lbl) => (
                        <span
                          key={lbl.id}
                          className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full text-white cursor-pointer hover:opacity-80"
                          style={{ backgroundColor: lbl.color }}
                          onClick={() => handleAddLabel(lbl.id)}
                        >
                          {lbl.name}
                          <X className="size-2.5" />
                        </span>
                      ))}
                      <Popover open={labelPopoverOpen} onOpenChange={setLabelPopoverOpen}>
                        <PopoverTrigger className="flex items-center gap-1 text-xs text-muted-foreground border border-dashed border-border rounded-full px-2 py-0.5 hover:text-foreground hover:border-foreground/40 transition-colors">
                          <Tag className="size-3" />
                          Додати мітку
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
                                      <button onClick={() => handleUpdateLabel(lbl.id)} className="text-green-600 hover:text-green-700"><Check className="size-3" /></button>
                                      <button onClick={() => setEditingLabelId(null)} className="text-muted-foreground hover:text-foreground"><X className="size-3" /></button>
                                    </div>
                                    <ColorPalette value={editingLabelColor} onChange={setEditingLabelColor} className="p-0" />
                                  </div>
                                )
                              }
                              return (
                                <div key={lbl.id} className="flex items-center gap-1 px-1 py-0.5 rounded-md hover:bg-muted group">
                                  <button
                                    className="flex items-center gap-2 flex-1 text-sm text-left py-1"
                                    onClick={() => handleAddLabel(lbl.id)}
                                  >
                                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: lbl.color }} />
                                    <span className="flex-1">{lbl.name}</span>
                                    {isActive && <Check className="size-3 text-primary" />}
                                  </button>
                                  <button
                                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground p-0.5"
                                    onClick={() => { setEditingLabelId(lbl.id); setEditingLabelName(lbl.name); setEditingLabelColor(lbl.color) }}
                                  ><Pencil className="size-2.5" /></button>
                                  <button
                                    className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive/80 p-0.5"
                                    onClick={() => handleDeleteLabel(lbl.id)}
                                  ><Trash2 className="size-2.5" /></button>
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

                  {/* Deadline */}
                  <div className="flex items-center gap-2 py-2.5 text-sm">
                    <span className="text-muted-foreground w-28 shrink-0">Дедлайн</span>
                    <Popover open={deadlineOpen} onOpenChange={setDeadlineOpen}>
                      <PopoverTrigger className="flex items-center gap-1.5 border border-input rounded-md px-2 py-1 text-sm hover:bg-muted transition-colors">
                        <CalendarIcon className="size-3.5 text-muted-foreground" />
                        <span className={task.deadline ? '' : 'text-muted-foreground'}>
                          {task.deadline ? format(new Date(task.deadline), 'd MMM yyyy', { locale: uk }) : 'Не вказано'}
                        </span>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={task.deadline ? new Date(task.deadline) : undefined}
                          onSelect={handleDeadlineSelect}
                          initialFocus
                        />
                        {task.deadline && (
                          <div className="p-2 border-t">
                            <Button size="sm" variant="ghost" className="w-full text-xs" onClick={() => handleDeadlineSelect(undefined)}>
                              Очистити
                            </Button>
                          </div>
                        )}
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Description */}
                <div className="px-4 pb-4 border-t border-border pt-4">
                  <p className="text-sm font-medium mb-2">Опис</p>
                  <div className="relative">
                    <Textarea
                      placeholder="Додайте опис завдання... (Ctrl+V / ⌘V для вставки скріншоту)"
                      value={description}
                      onChange={(e) => { setDescription(e.target.value); setDescDirty(true) }}
                      onPaste={handleDescriptionPaste}
                      className="min-h-[100px] text-sm resize-none"
                    />
                    {pasteUploading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-md">
                        <span className="text-xs text-muted-foreground animate-pulse">Завантаження зображення...</span>
                      </div>
                    )}
                  </div>
                  {descDirty && (
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-amber-600">Незбережені зміни</span>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => { setDescription(task.description ?? ''); setDescDirty(false) }}>Скасувати</Button>
                        <Button size="sm" onClick={() => { updateTask({ description }); setDescDirty(false) }}>Зберегти</Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Attachments */}
                <div className="px-4 pb-4 border-t border-border pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium">Вкладення</p>
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => fileInputRef.current?.click()}>
                      <Plus className="size-3" />Додати
                    </Button>
                    <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
                  </div>
                  {task.attachments && task.attachments.length > 0 ? (
                    <div className="flex flex-col gap-1.5">
                      {task.attachments.map((att) => (
                        <div key={att.id} className="flex items-center gap-2 text-sm p-2 rounded-md border border-border group">
                          <Paperclip className="size-3.5 text-muted-foreground shrink-0" />
                          <a href={att.url} target="_blank" rel="noopener noreferrer" className="flex-1 truncate hover:underline">{att.filename}</a>
                          <span className="text-xs text-muted-foreground">{(att.size / 1024).toFixed(0)} KB</span>
                          <button
                            className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive/80 transition-opacity"
                            onClick={() => handleDeleteAttachment(att.id)}
                          ><Trash2 className="size-3.5" /></button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Немає вкладень</p>
                  )}
                </div>

                {/* Timestamps */}
                <div className="px-4 py-3 border-t border-border mt-auto">
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>Створено: {format(new Date(task.createdAt), 'dd.MM.yyyy HH:mm')}</span>
                    <span>Оновлено: {format(new Date(task.updatedAt), 'dd.MM.yyyy HH:mm')}</span>
                  </div>
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
                    <button
                      className="ml-auto text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5 border border-dashed border-border rounded px-1.5 py-1"
                      onClick={() => setAddingManualTime(!addingManualTime)}
                      title="Додати час вручну"
                    >
                      <Plus className="size-3" />
                    </button>
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
                    <button className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1" onClick={() => setTimeLogsOpen(!timeLogsOpen)}>
                      <Clock className="size-3" />
                      {timeLogsOpen ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                    </button>
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
                          <button onClick={() => handleDeleteTimeLog(tl.id)} className="text-muted-foreground hover:text-destructive">
                            <Trash2 className="size-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Subtasks + Comments tabs */}
                <div className="flex-1 p-4">
                  <Tabs defaultValue={isSubtask ? 'comments' : 'subtasks'}>
                    <TabsList className="w-full mb-3">
                      {!isSubtask && (
                        <TabsTrigger value="subtasks" className="flex-1">
                          Підзавдання {subtasks.length > 0 && `(${subtasks.length})`}
                        </TabsTrigger>
                      )}
                      <TabsTrigger value="comments" className={isSubtask ? 'flex-1' : 'flex-1'}>
                        Коментарі {comments.length > 0 && `(${comments.length})`}
                      </TabsTrigger>
                    </TabsList>

                    {/* Subtasks — only for non-subtasks */}
                    {!isSubtask && (
                      <TabsContent value="subtasks">
                        <div className="flex flex-col gap-2">
                          {subtasks.map((subtask) => {
                            const subtaskDone = subtask.statusId === doneStatus?.id
                            return (
                              <div key={subtask.id} className="flex items-center gap-2 group">
                                <Checkbox checked={subtaskDone} onCheckedChange={() => handleToggleSubtask(subtask)} />
                                <button
                                  className="flex-1 text-sm text-left hover:underline truncate"
                                  style={{ textDecoration: subtaskDone ? 'line-through' : undefined, color: subtaskDone ? 'var(--muted-foreground)' : undefined }}
                                  onClick={() => setOpenSubtaskId(subtask.id)}
                                >
                                  {subtask.title}
                                </button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger className="opacity-0 group-hover:opacity-100 transition-opacity">
                                    <MoreVertical className="size-3.5 text-muted-foreground" />
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent side="left">
                                    <DropdownMenuItem onClick={() => setOpenSubtaskId(subtask.id)}>Відкрити</DropdownMenuItem>
                                    <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteSubtask(subtask.id)}>Видалити</DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            )
                          })}

                          {addingSubtask ? (
                            <div className="flex gap-1.5 mt-1">
                              <input
                                autoFocus
                                className="flex-1 text-sm border border-input rounded-md px-2 py-1 outline-none focus:border-ring bg-background"
                                placeholder="Назва підзавдання..."
                                value={newSubtaskTitle}
                                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleAddSubtask()
                                  if (e.key === 'Escape') { setAddingSubtask(false); setNewSubtaskTitle('') }
                                }}
                              />
                              <Button size="sm" onClick={handleAddSubtask}>Додати</Button>
                            </div>
                          ) : (
                            <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mt-1" onClick={() => setAddingSubtask(true)}>
                              <Plus className="size-3.5" />Додати підзавдання
                            </button>
                          )}

                          {subtasks.length > 0 && (
                            <div className="mt-3">
                              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                <span>Прогрес</span><span>{doneSubtasks}/{subtasks.length}</span>
                              </div>
                              <Progress value={(doneSubtasks / subtasks.length) * 100} className="h-1.5" />
                            </div>
                          )}
                        </div>
                      </TabsContent>
                    )}

                    {/* Comments */}
                    <TabsContent value="comments">
                      <div className="flex flex-col gap-3">
                        <Textarea
                          placeholder="Напишіть коментар..."
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          className="text-sm resize-none min-h-[60px]"
                          onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleAddComment() }}
                        />
                        <Button size="sm" onClick={handleAddComment} disabled={!newComment.trim()} className="self-end">
                          Додати коментар
                        </Button>
                        <div className="flex flex-col gap-2">
                          {comments.map((comment: Comment) => (
                            <div key={comment.id} className="flex flex-col gap-1 p-2.5 rounded-lg bg-muted group">
                              <p className="text-sm">{comment.content}</p>
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">{format(new Date(comment.createdAt), 'dd.MM.yyyy HH:mm')}</span>
                                <button className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity" onClick={() => handleDeleteComment(comment.id)}>
                                  <Trash2 className="size-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
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
