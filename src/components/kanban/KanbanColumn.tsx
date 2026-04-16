'use client'

import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus, MoreVertical } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Status, Task } from '@/lib/types'
import SortableKanbanCard from './SortableKanbanCard'
import { ColorPalette } from '@/components/ui/color-palette'

interface Props {
  status: Status
  tasks: Task[]
  onAddTask: (statusId: string, title: string) => Promise<void>
  onTaskClick: (taskId: string) => void
  onDeleteStatus: (statusId: string) => void
  onRenameStatus: (statusId: string, name: string) => void
  onChangeStatusColor: (statusId: string, color: string) => void
  onUpdateTask?: (taskId: string, updates: Partial<Task>) => void
  onDeleteTask?: (taskId: string) => void
}

export default function KanbanColumn({
  status,
  tasks,
  onAddTask,
  onTaskClick,
  onDeleteStatus,
  onRenameStatus,
  onChangeStatusColor,
  onUpdateTask,
  onDeleteTask,
}: Props) {
  const [renaming, setRenaming] = useState(false)
  const [newName, setNewName] = useState(status.name)
  const [colorPickerOpen, setColorPickerOpen] = useState(false)
  const [addingTask, setAddingTask] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')

  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: `${status.id}-cards` })

  const {
    attributes,
    listeners,
    setNodeRef: setSortRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: status.id, data: { type: 'column' } })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const handleRenameSubmit = () => {
    if (newName.trim() && newName !== status.name) {
      onRenameStatus(status.id, newName.trim())
    }
    setRenaming(false)
  }

  const handleAddTask = async () => {
    const t = newTaskTitle.trim()
    if (!t) return
    setNewTaskTitle('')
    setAddingTask(false)
    await onAddTask(status.id, t)
  }

  return (
    <div ref={setSortRef} style={style} className="flex flex-col w-72 shrink-0">
      <div className="rounded-xl overflow-hidden shadow-sm bg-[#f4f5f7]">
        {/* Colored top bar — also serves as drag handle */}
        <div
          className="h-1 w-full cursor-grab active:cursor-grabbing"
          style={{ backgroundColor: status.color }}
          {...attributes}
          {...listeners}
        />

        {/* Column header */}
        <div className="flex items-center justify-between px-3 pt-3 pb-2">
          {renaming ? (
            <input
              autoFocus
              className="flex-1 text-sm font-semibold bg-transparent border-b border-border outline-none mr-2"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onBlur={handleRenameSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenameSubmit()
                if (e.key === 'Escape') { setRenaming(false); setNewName(status.name) }
              }}
            />
          ) : (
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-semibold text-foreground truncate">{status.name}</span>
              <span className="text-[11px] text-muted-foreground bg-white border border-border rounded-full px-1.5 py-0.5 shrink-0">
                {tasks.length}
              </span>
            </div>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded shrink-0 ml-1">
              <MoreVertical className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => { setRenaming(true); setNewName(status.name) }}>
                Перейменувати
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setColorPickerOpen((v) => !v)}>
                Змінити колір
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={() => onDeleteStatus(status.id)}>
                Видалити
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Color picker */}
        {colorPickerOpen && (
          <div className="px-3 pb-2" onClick={(e) => e.stopPropagation()}>
            <ColorPalette
              value={status.color}
              onChange={(c) => onChangeStatusColor(status.id, c)}
              onSelect={() => setColorPickerOpen(false)}
            />
          </div>
        )}

        {/* Droppable cards zone */}
        <div
          ref={setDropRef}
          className="flex flex-col gap-2 px-2 pb-2 overflow-y-auto min-h-[80px] max-h-[calc(100vh-220px)] transition-colors"
          style={{ backgroundColor: isOver ? `${status.color}18` : 'transparent' }}
        >
          <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            {tasks.map((task) => (
              <SortableKanbanCard
                key={task.id}
                task={task}
                onClick={() => onTaskClick(task.id)}
                onUpdate={(updates) => onUpdateTask?.(task.id, updates)}
                onDelete={() => onDeleteTask?.(task.id)}
              />
            ))}
          </SortableContext>

          {addingTask && (
            <div className="flex flex-col gap-1.5 p-2 bg-white rounded-lg border border-border shadow-sm mt-1">
              <input
                autoFocus
                className="text-sm bg-transparent outline-none w-full placeholder:text-muted-foreground"
                placeholder="Назва завдання..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddTask()
                  if (e.key === 'Escape') { setAddingTask(false); setNewTaskTitle('') }
                }}
              />
              <div className="flex gap-1.5">
                <Button size="sm" className="h-7 text-xs" onClick={handleAddTask}>Додати</Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setAddingTask(false); setNewTaskTitle('') }}>
                  Скасувати
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Add task button */}
        {!addingTask && (
          <button
            onClick={() => setAddingTask(true)}
            className="flex items-center gap-2 px-3 py-2.5 w-full text-sm text-muted-foreground hover:text-foreground hover:bg-white/60 transition-colors"
          >
            <Plus className="size-4" />
            Додати завдання
          </button>
        )}
      </div>
    </div>
  )
}
