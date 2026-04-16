'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  closestCenter,
  pointerWithin,
  CollisionDetection,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, horizontalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Status, Task } from '@/lib/types'
import KanbanColumn from './KanbanColumn'
import KanbanCard from './KanbanCard'

interface Props {
  statuses: Status[]
  tasks: Task[]
  projectId: string
  onTaskClick: (taskId: string) => void
  onAddTask: (statusId: string, title: string) => Promise<void>
  onRefresh: () => void
}

export default function KanbanBoard({ statuses, tasks, projectId, onTaskClick, onAddTask, onRefresh }: Props) {
  const [localTasks, setLocalTasks] = useState<Task[]>(tasks)
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [localStatuses, setLocalStatuses] = useState<Status[]>(statuses)
  const [addingStatus, setAddingStatus] = useState(false)
  const [newStatusName, setNewStatusName] = useState('')

  // Refs always hold the latest values — drag handlers use refs, not stale closure state
  const draggingTypeRef = useRef<'card' | 'column' | null>(null)
  const [draggingTypeState, setDraggingTypeState] = useState<'card' | 'column' | null>(null)
  const localTasksRef = useRef<Task[]>(tasks)
  const localStatusesRef = useRef<Status[]>(statuses)

  // Helper: update tasks state AND ref atomically
  const setTasks = useCallback((updater: (prev: Task[]) => Task[]) => {
    setLocalTasks((prev) => {
      const next = updater(prev)
      localTasksRef.current = next
      return next
    })
  }, [])

  useEffect(() => {
    setLocalTasks(tasks)
    localTasksRef.current = tasks
  }, [tasks])

  useEffect(() => {
    setLocalStatuses(statuses)
    localStatusesRef.current = statuses
  }, [statuses])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const getTasksByStatus = useCallback(
    (statusId: string) =>
      localTasks
        .filter((t) => t.statusId === statusId)
        .sort((a, b) => a.order - b.order),
    [localTasks]
  )

  // Always reads from ref — safe to call from drag handlers
  const resolveStatusId = useCallback((overId: string): string | null => {
    const statuses = localStatusesRef.current
    const direct = statuses.find((s) => s.id === overId)
    if (direct) return direct.id
    const fromCards = statuses.find((s) => overId === `${s.id}-cards`)
    return fromCards ? fromCards.id : null
  }, [])

  // Custom collision detection:
  // - When dragging a COLUMN: only consider other column sortable elements
  // - When dragging a CARD: exclude column sortable elements entirely (they intercept card drags)
  //   and use pointerWithin so "which column am I over" is determined by cursor position
  const collisionDetection = useCallback<CollisionDetection>((args) => {
    if (draggingTypeRef.current === 'column') {
      return closestCenter({
        ...args,
        droppableContainers: args.droppableContainers.filter((c) =>
          localStatusesRef.current.some((s) => s.id === String(c.id))
        ),
      })
    }
    // Card drag: strip out column sortable containers (plain status.id, no suffix)
    const cardContainers = args.droppableContainers.filter(
      (c) => !localStatusesRef.current.some((s) => s.id === String(c.id))
    )
    const hits = pointerWithin({ ...args, droppableContainers: cardContainers })
    if (hits.length > 0) return hits
    return closestCenter({ ...args, droppableContainers: cardContainers })
  }, [])

  const handleDragStart = (event: DragStartEvent) => {
    const type = (event.active.data.current?.type ?? 'card') as 'card' | 'column'
    draggingTypeRef.current = type
    setDraggingTypeState(type)
    if (type === 'card') {
      setActiveTask(localTasksRef.current.find((t) => t.id === String(event.active.id)) ?? null)
    }
  }

  const handleDragOver = (event: DragOverEvent) => {
    if (draggingTypeRef.current === 'column') return
    const { active, over } = event
    if (!over) return

    const activeId = String(active.id)
    const overId = String(over.id)

    // Always read from ref — state may be stale between React re-renders
    const tasks = localTasksRef.current
    const draggedTask = tasks.find((t) => t.id === activeId)
    if (!draggedTask) return

    const overStatusId = resolveStatusId(overId)
    const targetStatusId = overStatusId ?? tasks.find((t) => t.id === overId)?.statusId

    if (!targetStatusId || draggedTask.statusId === targetStatusId) return

    // Optimistically move task to target column; ref is updated inside setTasks
    setTasks((prev) =>
      prev.map((t) => (t.id === activeId ? { ...t, statusId: targetStatusId } : t))
    )
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    const type = draggingTypeRef.current

    setActiveTask(null)
    draggingTypeRef.current = null
    setDraggingTypeState(null)

    if (!over) return

    const activeId = String(active.id)
    const overId = String(over.id)

    // ── Column reorder ──
    if (type === 'column') {
      if (activeId === overId) return
      const sorted = [...localStatuses].sort((a, b) => a.order - b.order)
      const oldIndex = sorted.findIndex((s) => s.id === activeId)
      const newIndex = sorted.findIndex((s) => s.id === overId)
      if (oldIndex === -1 || newIndex === -1) return
      const reordered = arrayMove(sorted, oldIndex, newIndex).map((s, i) => ({ ...s, order: i }))
      setLocalStatuses(reordered)
      await Promise.all(
        reordered.map((s) =>
          fetch(`/api/statuses/${s.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order: s.order }),
          })
        )
      )
      return
    }

    // ── Card reorder ──
    // Read from ref — guaranteed to have the latest statusId set by handleDragOver
    const tasks = localTasksRef.current
    const movedTask = tasks.find((t) => t.id === activeId)
    if (!movedTask) return

    const overStatusId = resolveStatusId(overId)
    const overTask = tasks.find((t) => t.id === overId)
    const newStatusId = overStatusId ?? overTask?.statusId ?? movedTask.statusId

    const columnTasks = tasks
      .filter((t) => t.statusId === newStatusId)
      .sort((a, b) => a.order - b.order)

    const activeIndex = columnTasks.findIndex((t) => t.id === activeId)
    const overIndex = columnTasks.findIndex((t) => t.id === overId)

    let reordered: Task[]
    if (activeIndex !== -1 && overIndex !== -1 && activeIndex !== overIndex) {
      reordered = arrayMove(columnTasks, activeIndex, overIndex)
    } else {
      reordered = columnTasks
    }

    // Update ALL tasks in the column with sequential orders (prevents stale order drift)
    setTasks((prev) => {
      const otherTasks = prev.filter((t) => t.id !== activeId && t.statusId !== newStatusId)
      const updatedColumn = reordered.map((t, i) => ({ ...t, order: i, statusId: newStatusId }))
      return [...otherTasks, ...updatedColumn]
    })

    const finalOrder = reordered.findIndex((t) => t.id === activeId)

    try {
      await fetch(`/api/tasks/${activeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statusId: newStatusId, order: finalOrder }),
      })
    } catch (e) {
      console.error(e)
      onRefresh()
    }
  }

  const handleDeleteStatus = async (statusId: string) => {
    try {
      await fetch(`/api/statuses/${statusId}`, { method: 'DELETE' })
      setLocalStatuses((prev) => prev.filter((s) => s.id !== statusId))
      onRefresh()
    } catch (e) { console.error(e) }
  }

  const handleRenameStatus = async (statusId: string, name: string) => {
    try {
      await fetch(`/api/statuses/${statusId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      setLocalStatuses((prev) => prev.map((s) => (s.id === statusId ? { ...s, name } : s)))
    } catch (e) { console.error(e) }
  }

  const handleUpdateTask = useCallback((taskId: string, updates: Partial<Task>) => {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...updates } : t)))
  }, [setTasks])

  const handleDeleteTask = useCallback((taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId))
  }, [setTasks])

  const handleChangeStatusColor = async (statusId: string, color: string) => {
    setLocalStatuses((prev) => {
      const next = prev.map((s) => (s.id === statusId ? { ...s, color } : s))
      localStatusesRef.current = next
      return next
    })
    try {
      await fetch(`/api/statuses/${statusId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ color }),
      })
    } catch (e) { console.error(e) }
  }

  const handleAddStatus = async () => {
    const name = newStatusName.trim()
    if (!name) return
    setNewStatusName('')
    setAddingStatus(false)
    try {
      const res = await fetch(`/api/projects/${projectId}/statuses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, color: '#94a3b8', order: localStatuses.length }),
      })
      if (res.ok) {
        const newStatus: Status = await res.json()
        setLocalStatuses((prev) => [...prev, newStatus])
      }
    } catch (e) { console.error(e) }
  }

  const sorted = [...localStatuses].sort((a, b) => a.order - b.order)

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={sorted.map((s) => s.id)} strategy={horizontalListSortingStrategy}>
        <div className="flex gap-5 overflow-x-auto pb-6 pt-4 px-6 min-h-[calc(100vh-160px)] min-w-[calc(100vw-15rem)]">
          {sorted.map((status) => (
            <KanbanColumn
              key={status.id}
              status={status}
              tasks={getTasksByStatus(status.id)}
              onAddTask={onAddTask}
              onTaskClick={onTaskClick}
              onDeleteStatus={handleDeleteStatus}
              onRenameStatus={handleRenameStatus}
              onChangeStatusColor={handleChangeStatusColor}
              onUpdateTask={handleUpdateTask}
              onDeleteTask={handleDeleteTask}
            />
          ))}

          {/* Add List column */}
          <div className="shrink-0 w-72">
            {addingStatus ? (
              <div className="rounded-[8px] overflow-hidden shadow-sm bg-[#f4f5f7]">
                <div className="h-1 w-full bg-border" />
                <div className="p-3 flex flex-col gap-2">
                  <input
                    autoFocus
                    className="text-sm bg-transparent outline-none w-full placeholder:text-muted-foreground border-b border-border pb-1"
                    placeholder="Назва колонки..."
                    value={newStatusName}
                    onChange={(e) => setNewStatusName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddStatus()
                      if (e.key === 'Escape') { setAddingStatus(false); setNewStatusName('') }
                    }}
                  />
                  <div className="flex gap-1.5">
                    <Button size="sm" className="h-7 text-xs flex-1" onClick={handleAddStatus}>Додати</Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setAddingStatus(false); setNewStatusName('') }}>✕</Button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAddingStatus(true)}
                className="w-full rounded-[8px] border-2 border-dashed border-border hover:border-muted-foreground/40 bg-transparent hover:bg-muted/40 transition-all duration-200 px-3 py-3 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
              >
                <Plus className="size-4 shrink-0" />
                Add List
              </button>
            )}
          </div>
        </div>
      </SortableContext>

      <DragOverlay>
        {activeTask && draggingTypeState === 'card' && (
          <div className="rotate-2 opacity-90">
            <KanbanCard task={activeTask} onClick={() => {}} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
