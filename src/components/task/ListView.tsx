'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronDown, ChevronRight, Check, CalendarIcon, Flag, Paperclip, Plus, X, GripVertical } from 'lucide-react'
import {
  DndContext, DragEndEvent, DragOverEvent, DragStartEvent,
  PointerSensor, useSensor, useSensors, DragOverlay,
  pointerWithin, closestCenter,
} from '@dnd-kit/core'
import {
  SortableContext, useSortable, arrayMove, verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useDroppable } from '@dnd-kit/core'
import { Task, Status, Label } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/app-store'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { ColorPalette } from '@/components/ui/color-palette'
import { Button } from '@/components/ui/button'

const PRIORITY_COLORS: Record<string, string> = {
  LOW: '#22c55e', MEDIUM: '#eab308', HIGH: '#f97316', URGENT: '#ef4444',
}
const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Низький', MEDIUM: 'Середній', HIGH: 'Високий', URGENT: 'Критичний',
}

type GroupBy = 'none' | 'status' | 'priority' | 'label'

// ─── Styled Select ─────────────────────────────────────────────────────────────
function StyledSelect({ value, onChange, children, className }: {
  value: string; onChange: (v: string) => void; children: React.ReactNode; className?: string
}) {
  return (
    <div className={cn('relative inline-flex items-center', className)}>
      <select
        className="appearance-none text-sm border border-border rounded-lg pl-3 pr-8 py-1.5 bg-background cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring"
        value={value}
        onChange={e => onChange(e.target.value)}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 size-3.5 text-muted-foreground" />
    </div>
  )
}

// ─── Task Row ──────────────────────────────────────────────────────────────────
interface RowProps {
  task: Task
  statuses: Status[]
  allLabels: Label[]
  onTaskClick: (id: string) => void
  onRefresh?: () => void
  level?: number
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>
  isDragging?: boolean
}

function TaskRow({ task, statuses, allLabels, onTaskClick, onRefresh, level = 0, dragHandleProps, isDragging }: RowProps) {
  const { setOpenTaskId } = useAppStore()
  const [subtasksExpanded, setSubtasksExpanded] = useState(false)
  const [statusId, setStatusId] = useState(task.statusId)
  const [priority, setPriority] = useState(task.priority)
  const [taskLabels, setTaskLabels] = useState(task.labels ?? [])
  const [deadline, setDeadline] = useState(task.deadline ? new Date(task.deadline) : undefined)

  useEffect(() => {
    setStatusId(task.statusId)
    setPriority(task.priority)
    setTaskLabels(task.labels ?? [])
    setDeadline(task.deadline ? new Date(task.deadline) : undefined)
  }, [task.statusId, task.priority, task.labels, task.deadline, task.id])

  const status = statuses.find(s => s.id === statusId)
  const subtasks = task.subtasks ?? []
  const attachCount = task._count?.attachments ?? task.attachments?.length ?? 0
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const isOverdue = deadline && deadline < todayStart

  const patch = async (data: object) => {
    await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    })
    onRefresh?.()
  }

  const handleToggleDone = async () => { await fetch(`/api/tasks/${task.id}/toggle-done`, { method: 'POST' }); onRefresh?.() }
  const handleStatusChange = (sid: string) => { setStatusId(sid); patch({ statusId: sid }) }
  const handlePriorityChange = (p: string | null) => { setPriority(p as Task['priority']); patch({ priority: p }) }
  const handleDeadlineChange = (date: Date | undefined) => { setDeadline(date); patch({ deadline: date ? date.toISOString() : null }) }

  const toggleLabel = async (label: Label) => {
    const has = taskLabels.some(tl => tl.label.id === label.id)
    if (has) {
      setTaskLabels(prev => prev.filter(tl => tl.label.id !== label.id))
      await fetch(`/api/tasks/${task.id}/labels`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ labelId: label.id }) })
    } else {
      setTaskLabels(prev => [...prev, { label }])
      await fetch(`/api/tasks/${task.id}/labels`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ labelId: label.id }) })
    }
  }

  const cols = 'grid-cols-[28px_1fr_150px_130px_130px_1fr]'
  const pl = 16 + level * 28

  return (
    <>
      <div className={cn('grid border-b border-[#e2e8f0] bg-background group', cols, isDragging && 'opacity-50')}>
        {/* Drag handle */}
        <div
          className="flex items-center justify-center text-muted-foreground opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing transition-opacity"
          {...dragHandleProps}
        >
          <GripVertical className="size-3.5" />
        </div>

        {/* Name */}
        <div className="py-5 flex items-start gap-2 min-w-0 pr-6" style={{ paddingLeft: pl }}>
          {level > 0 ? (
            <Button variant="ghost" size="icon" onClick={handleToggleDone} className="shrink-0 mt-0.5 size-5">
              <div className={cn('w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors', status?.isDone ? 'bg-primary border-primary' : 'border-border hover:border-primary')}>
                {status?.isDone && <Check className="size-2.5 text-white" />}
              </div>
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className={cn('mt-0.5 text-muted-foreground hover:text-foreground transition-colors shrink-0 size-5', subtasks.length === 0 && 'invisible')}
              onClick={() => setSubtasksExpanded(v => !v)}
            >
              {subtasksExpanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
            </Button>
          )}
          <div className="flex flex-col gap-0.5 min-w-0 flex-1">
            <Button
              variant="ghost"
              className={cn('text-sm font-medium text-left truncate h-auto px-0 py-0 justify-start hover:bg-transparent', level > 0 && status?.isDone && 'line-through opacity-50')}
              onClick={() => level > 0 ? setOpenTaskId(task.id) : onTaskClick(task.id)}
            >
              {task.title || <span className="text-muted-foreground italic">Без назви</span>}
            </Button>
            {(attachCount > 0 || subtasks.length > 0) && (
              <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
                {attachCount > 0 && <span className="flex items-center gap-0.5"><Paperclip className="size-3" />{attachCount}</span>}
                {subtasks.length > 0 && <span>{subtasks.filter(s => s.status?.isDone).length}/{subtasks.length} підзадач</span>}
              </div>
            )}
          </div>
        </div>

        {/* Status */}
        <div className="px-6 py-5 flex items-center">
          <DropdownMenu>
            <DropdownMenuTrigger render={<span />} nativeButton={false} className="cursor-pointer focus:outline-none">
              {status ? (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium text-white whitespace-nowrap select-none" style={{ backgroundColor: status.color }}>
                  {status.name}
                </span>
              ) : <span className="text-xs text-muted-foreground">—</span>}
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {statuses.map(s => (
                <DropdownMenuItem key={s.id} onClick={() => handleStatusChange(s.id)} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                  {s.name}
                  {statusId === s.id && <Check className="size-3 ml-auto" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Priority */}
        <div className="px-6 py-5 flex items-center">
          <DropdownMenu>
            <DropdownMenuTrigger className="focus:outline-none">
              {priority ? (
                <span className="flex items-center gap-1 text-xs font-medium text-foreground cursor-pointer">
                  <Flag className="size-3 shrink-0" style={{ color: PRIORITY_COLORS[priority] }} fill={PRIORITY_COLORS[priority]} />
                  {PRIORITY_LABELS[priority]}
                </span>
              ) : <span className="text-xs text-muted-foreground cursor-pointer">—</span>}
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                <DropdownMenuItem key={k} onClick={() => handlePriorityChange(k)} className="flex items-center gap-2">
                  <Flag className="size-3" style={{ color: PRIORITY_COLORS[k] }} fill={PRIORITY_COLORS[k]} />
                  {v}
                  {priority === k && <Check className="size-3 ml-auto" />}
                </DropdownMenuItem>
              ))}
              {priority && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handlePriorityChange(null)} className="text-muted-foreground">Очистити</DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Deadline */}
        <div className="px-6 py-5 flex items-center">
          <Popover>
            <PopoverTrigger className="focus:outline-none">
              {deadline ? (
                <span className={cn('flex items-center gap-1 text-xs cursor-pointer', isOverdue ? 'text-red-500' : 'text-foreground')}>
                  <CalendarIcon className="size-3 shrink-0" />
                  {deadline.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground flex items-center gap-1 cursor-pointer">
                  <CalendarIcon className="size-3" />—
                </span>
              )}
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" side="bottom" align="start">
              <Calendar mode="single" selected={deadline} onSelect={date => handleDeadlineChange(date ?? undefined)} />
              {deadline && (
                <div className="px-2 pb-2 border-t border-border pt-2">
                  <Button variant="ghost" className="text-xs text-muted-foreground hover:text-destructive transition-colors h-auto px-0 py-0" onClick={() => handleDeadlineChange(undefined)}>
                    Очистити дату
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>

        {/* Labels */}
        <div className="px-6 py-5 flex items-center">
          <Popover>
            <PopoverTrigger className="focus:outline-none">
              <div className="flex items-center flex-wrap gap-1 cursor-pointer">
                {taskLabels.length > 0 ? (
                  taskLabels.map(tl => (
                    <span key={tl.label.id} className="text-[10px] px-1.5 py-0.5 rounded-full font-medium text-white" style={{ backgroundColor: tl.label.color }}>
                      {tl.label.name}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </div>
            </PopoverTrigger>
            <PopoverContent side="bottom" align="start" className="w-44 p-2">
              <p className="text-xs font-medium text-muted-foreground mb-2">Мітки</p>
              {allLabels.length === 0 ? (
                <p className="text-xs text-muted-foreground">Немає міток</p>
              ) : (
                <div className="flex flex-col gap-0.5">
                  {allLabels.map(label => {
                    const isOn = taskLabels.some(tl => tl.label.id === label.id)
                    return (
                      <Button key={label.id} variant="ghost" className="flex items-center gap-2 text-xs rounded px-1.5 py-1 w-full h-auto justify-start" onClick={() => toggleLabel(label)}>
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: label.color }} />
                        <span className="flex-1 truncate">{label.name}</span>
                        {isOn && <Check className="size-3 text-primary" />}
                      </Button>
                    )
                  })}
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Subtask rows */}
      {subtasksExpanded && subtasks.map(st => (
        <TaskRow key={st.id} task={st} statuses={statuses} allLabels={allLabels} onTaskClick={onTaskClick} onRefresh={onRefresh} level={level + 1} />
      ))}
    </>
  )
}

// ─── Sortable Task Row ─────────────────────────────────────────────────────────
function SortableTaskRow(props: Omit<RowProps, 'dragHandleProps' | 'isDragging'>) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.task.id })
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}>
      <TaskRow {...props} dragHandleProps={{ ...attributes, ...listeners }} isDragging={isDragging} />
    </div>
  )
}

// ─── Droppable Group ───────────────────────────────────────────────────────────
function DroppableGroup({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({ id })
  return <div ref={setNodeRef} className="[&>div:last-child>div]:border-b-0">{children}</div>
}

// ─── Main ListView ─────────────────────────────────────────────────────────────
interface Props {
  tasks: Task[]
  statuses: Status[]
  projectId?: string
  onTaskClick: (id: string) => void
  onRefresh?: () => void
  onStatusColorChange?: (statusId: string, color: string) => void
  onAddTask?: (statusId: string, title: string) => Promise<void>
  onStatusRename?: (statusId: string, name: string) => void
  onStatusAdd?: (status: Status) => void
}

export default function ListView({ tasks, statuses, projectId, onTaskClick, onRefresh, onStatusColorChange, onAddTask, onStatusRename, onStatusAdd }: Props) {
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [groupBy, setGroupBy] = useState<GroupBy>('status')
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [allLabels, setAllLabels] = useState<Label[]>([])
  const [openColorPicker, setOpenColorPicker] = useState<string | null>(null)
  const [addingToStatus, setAddingToStatus] = useState<string | null>(null)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [editingStatusId, setEditingStatusId] = useState<string | null>(null)
  const [editingStatusName, setEditingStatusName] = useState('')
  const [addingStatus, setAddingStatus] = useState(false)
  const [newStatusName, setNewStatusName] = useState('')
  const [localTasks, setLocalTasks] = useState<Task[]>(tasks)
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const localTasksRef = useRef<Task[]>(tasks)

  useEffect(() => { setLocalTasks(tasks); localTasksRef.current = tasks }, [tasks])
  useEffect(() => {
    fetch('/api/labels').then(r => r.ok ? r.json() : []).then(setAllLabels).catch(() => {})
  }, [])

  const setTasks = useCallback((updater: (prev: Task[]) => Task[]) => {
    setLocalTasks(prev => { const next = updater(prev); localTasksRef.current = next; return next })
  }, [])

  const handleRenameStatus = async (statusId: string, name: string) => {
    const trimmed = name.trim()
    setEditingStatusId(null)
    if (!trimmed) return
    onStatusRename?.(statusId, trimmed)
    try {
      await fetch(`/api/statuses/${statusId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      })
    } catch { onRefresh?.() }
  }

  const handleAddStatus = async () => {
    const trimmed = newStatusName.trim()
    if (!trimmed || !projectId) return
    setAddingStatus(false); setNewStatusName('')
    try {
      const res = await fetch(`/api/projects/${projectId}/statuses`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      })
      if (res.ok) {
        const status: Status = await res.json()
        onStatusAdd?.(status)
      }
    } catch { onRefresh?.() }
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveTask(localTasksRef.current.find(t => t.id === String(active.id)) ?? null)
  }

  const handleDragOver = ({ active, over }: DragOverEvent) => {
    if (!over) return
    const activeId = String(active.id)
    const overId = String(over.id)
    const tasks = localTasksRef.current
    const dragged = tasks.find(t => t.id === activeId)
    if (!dragged) return

    // Determine target status
    const overStatus = statuses.find(s => s.id === overId || overId === `drop-${s.id}`)
    const overTask = tasks.find(t => t.id === overId)
    const targetStatusId = overStatus?.id ?? overTask?.statusId

    if (targetStatusId && dragged.statusId !== targetStatusId) {
      setTasks(prev => prev.map(t => t.id === activeId ? { ...t, statusId: targetStatusId } : t))
    }
  }

  const handleDragEnd = async ({ active, over }: DragEndEvent) => {
    setActiveTask(null)
    if (!over) return
    const activeId = String(active.id)
    const overId = String(over.id)
    const tasks = localTasksRef.current
    const movedTask = tasks.find(t => t.id === activeId)
    if (!movedTask) return

    const overTask = tasks.find(t => t.id === overId)
    const overStatus = statuses.find(s => s.id === overId || overId === `drop-${s.id}`)
    const newStatusId = overStatus?.id ?? overTask?.statusId ?? movedTask.statusId

    const columnTasks = tasks.filter(t => t.statusId === newStatusId).sort((a, b) => a.order - b.order)
    const oldIndex = columnTasks.findIndex(t => t.id === activeId)
    const newIndex = columnTasks.findIndex(t => t.id === overId)

    let reordered = columnTasks
    if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
      reordered = arrayMove(columnTasks, oldIndex, newIndex)
    }

    setTasks(prev => {
      const others = prev.filter(t => t.statusId !== newStatusId && t.id !== activeId)
      const updated = reordered.map((t, i) => ({ ...t, order: i, statusId: newStatusId }))
      return [...others, ...updated]
    })

    const finalOrder = reordered.findIndex(t => t.id === activeId)
    try {
      await fetch(`/api/tasks/${activeId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statusId: newStatusId, order: finalOrder }),
      })
    } catch { onRefresh?.() }
  }

  const filtered = localTasks.filter(t => {
    if (statusFilter !== 'all' && t.statusId !== statusFilter) return false
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false
    return true
  })

  const toggleGroup = (key: string) => {
    setCollapsedGroups(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n })
  }

  type Group = { key: string; label: string; color?: string; tasks: Task[] }

  const buildGroups = (): Group[] => {
    if (groupBy === 'none') return [{ key: 'all', label: 'Всі завдання', tasks: filtered }]
    if (groupBy === 'status') {
      return statuses
        .map(s => ({ key: s.id, label: s.name, color: s.color, tasks: filtered.filter(t => t.statusId === s.id) }))
        .filter(g => g.tasks.length > 0 || true)
    }
    if (groupBy === 'priority') {
      const pGroups: Group[] = (['URGENT', 'HIGH', 'MEDIUM', 'LOW'] as const).map(p => ({
        key: p, label: PRIORITY_LABELS[p], color: PRIORITY_COLORS[p],
        tasks: filtered.filter(t => t.priority === p),
      }))
      pGroups.push({ key: 'none', label: 'Без пріоритету', tasks: filtered.filter(t => !t.priority) })
      return pGroups.filter(g => g.tasks.length > 0)
    }
    if (groupBy === 'label') {
      return [
        ...allLabels.map(lbl => ({
          key: lbl.id, label: lbl.name, color: lbl.color,
          tasks: filtered.filter(t => t.labels?.some(tl => tl.label.id === lbl.id)),
        })),
        { key: 'none', label: 'Без мітки', tasks: filtered.filter(t => !t.labels?.length) },
      ].filter(g => g.tasks.length > 0)
    }
    return [{ key: 'all', label: 'Всі завдання', tasks: filtered }]
  }

  const groups = buildGroups()
  const cols = 'grid-cols-[28px_1fr_150px_130px_130px_1fr]'
  const showGroupHeaders = groupBy !== 'none'

  return (
    <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
      <div className="flex flex-col gap-4">
        {/* Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <StyledSelect value={statusFilter} onChange={setStatusFilter}>
            <option value="all">Всі статуси</option>
            {statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </StyledSelect>
          <StyledSelect value={priorityFilter} onChange={setPriorityFilter}>
            <option value="all">Всі пріоритети</option>
            {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </StyledSelect>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Групувати:</span>
            <StyledSelect value={groupBy} onChange={v => setGroupBy(v as GroupBy)}>
              <option value="none">Без групування</option>
              <option value="status">Статус</option>
              <option value="priority">Пріоритет</option>
              <option value="label">Мітки</option>
            </StyledSelect>
          </div>
        </div>

        {/* Groups */}
        <div className="flex flex-col gap-3">
          {groups.length === 0 && (
            <div className="bg-background border border-border rounded-xl px-4 py-10 text-sm text-muted-foreground text-center">Немає завдань</div>
          )}
          {groups.map(group => {
            const isCollapsed = collapsedGroups.has(group.key)
            const isStatusGroup = groupBy === 'status'
            const statusId = isStatusGroup ? group.key : null
            return (
              <div key={group.key} className="border border-border rounded-xl overflow-hidden bg-background">
                {/* Group header */}
                {showGroupHeaders && (
                  <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border select-none bg-[#f1f5f9]">
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground transition-colors" onClick={() => toggleGroup(group.key)}>
                      {isCollapsed ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
                    </Button>

                    {/* Status color picker */}
                    {isStatusGroup && group.color && onStatusColorChange ? (
                      <div className="relative shrink-0">
                        <Button
                          variant="ghost" size="icon"
                          className="w-3 h-3 rounded-full transition-all p-0 min-w-0"
                          style={{ backgroundColor: group.color }}
                          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 0 0 2px white, 0 0 0 3.5px ${group.color}` }}
                          onMouseLeave={e => { if (openColorPicker !== group.key) (e.currentTarget as HTMLButtonElement).style.boxShadow = '' }}
                          onClick={e => { e.stopPropagation(); setOpenColorPicker(openColorPicker === group.key ? null : group.key) }}
                        />
                        {openColorPicker === group.key && (
                          <div className="absolute top-5 left-0 z-50 bg-popover border border-border rounded-xl shadow-lg p-2" style={{ minWidth: 200 }} onClick={e => e.stopPropagation()}>
                            <ColorPalette value={group.color} onChange={color => onStatusColorChange(group.key, color)} onSelect={() => setOpenColorPicker(null)} />
                          </div>
                        )}
                      </div>
                    ) : null}

                    {isStatusGroup && editingStatusId === group.key ? (
                      <input
                        autoFocus
                        className="flex-1 text-sm font-semibold bg-transparent border-b-2 border-ring outline-none px-0"
                        style={{ color: group.color ?? undefined }}
                        value={editingStatusName}
                        onChange={e => setEditingStatusName(e.target.value)}
                        onBlur={() => handleRenameStatus(group.key, editingStatusName)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleRenameStatus(group.key, editingStatusName)
                          if (e.key === 'Escape') setEditingStatusId(null)
                        }}
                      />
                    ) : (
                      <div className="flex-1 flex items-center gap-2 cursor-pointer" onClick={() => toggleGroup(group.key)}>
                        <span
                          className={cn('text-sm font-semibold', isStatusGroup && 'cursor-text')}
                          style={{ color: group.color ?? undefined }}
                          onDoubleClick={e => {
                            if (!isStatusGroup) return
                            e.stopPropagation()
                            setEditingStatusId(group.key)
                            setEditingStatusName(group.label)
                          }}
                        >{group.label}</span>
                        <span className="text-xs text-muted-foreground">{group.tasks.length}</span>
                      </div>
                    )}

                    {isStatusGroup && onAddTask && statusId && (
                      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                        onClick={() => { setAddingToStatus(statusId); setNewTaskTitle('') }}>
                        <Plus className="size-4" />
                      </Button>
                    )}
                  </div>
                )}

                {!isCollapsed && (
                  <>
                    {/* Column headers */}
                    <div className={cn('grid border-b border-border bg-muted/10', cols)}>
                      <div />
                      <div className="px-4 py-2 text-xs font-medium text-muted-foreground">Завдання</div>
                      <div className="px-6 py-2 text-xs font-medium text-muted-foreground">Статус</div>
                      <div className="px-6 py-2 text-xs font-medium text-muted-foreground">Пріоритет</div>
                      <div className="px-6 py-2 text-xs font-medium text-muted-foreground">Дедлайн</div>
                      <div className="px-6 py-2 text-xs font-medium text-muted-foreground">Мітки</div>
                    </div>

                    <SortableContext items={group.tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                      <DroppableGroup id={`drop-${group.key}`}>
                        {group.tasks.map(task => (
                          <SortableTaskRow key={task.id} task={task} statuses={statuses} allLabels={allLabels} onTaskClick={onTaskClick} onRefresh={onRefresh} />
                        ))}
                        {group.tasks.length === 0 && (
                          <div className="px-4 py-6 text-sm text-muted-foreground text-center">Немає завдань</div>
                        )}
                      </DroppableGroup>
                    </SortableContext>

                    {/* Inline add form */}
                    {isStatusGroup && addingToStatus === statusId && (
                      <div className="flex items-center gap-2 px-4 py-2 border-t border-border bg-background">
                        <input
                          autoFocus
                          className="flex-1 text-sm border border-input rounded-lg px-3 py-1.5 outline-none focus:border-ring bg-background"
                          placeholder="Назва завдання..."
                          value={newTaskTitle}
                          onChange={e => setNewTaskTitle(e.target.value)}
                          onKeyDown={async e => {
                            if (e.key === 'Enter' && newTaskTitle.trim() && statusId) {
                              await onAddTask?.(statusId, newTaskTitle.trim())
                              setAddingToStatus(null); setNewTaskTitle('')
                            }
                            if (e.key === 'Escape') { setAddingToStatus(null); setNewTaskTitle('') }
                          }}
                        />
                        <Button size="sm" className="text-white border-0 hover:opacity-90" style={{ backgroundColor: 'var(--aqua-blue)' }}
                          onClick={async () => {
                            if (newTaskTitle.trim() && statusId) {
                              await onAddTask?.(statusId, newTaskTitle.trim())
                              setAddingToStatus(null); setNewTaskTitle('')
                            }
                          }}>Додати</Button>
                        <Button variant="ghost" size="icon" onClick={() => { setAddingToStatus(null); setNewTaskTitle('') }}>
                          <X className="size-4" />
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )
          })}

          {/* Add new status */}
          {groupBy === 'status' && projectId && (
            addingStatus ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  className="flex-1 text-sm border border-input rounded-lg px-3 py-2 outline-none focus:border-ring bg-background"
                  placeholder="Назва статусу..."
                  value={newStatusName}
                  onChange={e => setNewStatusName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleAddStatus()
                    if (e.key === 'Escape') { setAddingStatus(false); setNewStatusName('') }
                  }}
                />
                <Button size="sm" className="text-white border-0 hover:opacity-90" style={{ backgroundColor: 'var(--aqua-blue)' }} onClick={handleAddStatus}>
                  Додати
                </Button>
                <Button variant="ghost" size="icon" onClick={() => { setAddingStatus(false); setNewStatusName('') }}>
                  <X className="size-4" />
                </Button>
              </div>
            ) : (
              <button
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors px-1 py-1"
                onClick={() => { setAddingStatus(true); setNewStatusName('') }}
              >
                <Plus className="size-4" />
                Новий статус
              </button>
            )
          )}
        </div>
      </div>

      <DragOverlay>
        {activeTask && (
          <div className="border border-border rounded-lg bg-background shadow-lg opacity-95 px-4 py-5 text-sm font-medium rotate-1">
            {activeTask.title}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
