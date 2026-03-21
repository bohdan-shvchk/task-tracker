'use client'

import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus, MoreVertical, GripVertical } from 'lucide-react'
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
}

export default function KanbanColumn({
  status,
  tasks,
  onAddTask,
  onTaskClick,
  onDeleteStatus,
  onRenameStatus,
  onChangeStatusColor,
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
      {/* Column header */}
      <div className="flex items-center gap-2 mb-3 px-1">
        {/* Drag handle */}
        <button
          className="text-muted-foreground/50 hover:text-muted-foreground cursor-grab active:cursor-grabbing touch-none"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>

        <div className="relative shrink-0">
          <button
            className="w-2.5 h-2.5 rounded-full block hover:ring-2 hover:ring-offset-1 transition-all"
            style={{ backgroundColor: status.color, boxShadow: colorPickerOpen ? `0 0 0 2px white, 0 0 0 3px ${status.color}` : undefined }}
            onClick={() => setColorPickerOpen((v) => !v)}
            title="Змінити колір"
          />
          {colorPickerOpen && (
            <div className="absolute top-5 left-0 z-50 bg-popover border border-border rounded-xl shadow-lg p-2" style={{ minWidth: 220 }} onClick={(e) => e.stopPropagation()}>
              <ColorPalette
                value={status.color}
                onChange={(c) => onChangeStatusColor(status.id, c)}
                onSelect={() => setColorPickerOpen(false)}
              />
            </div>
          )}
        </div>

        {renaming ? (
          <input
            autoFocus
            className="flex-1 text-sm font-medium bg-transparent border-b border-border outline-none"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={handleRenameSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRenameSubmit()
              if (e.key === 'Escape') { setRenaming(false); setNewName(status.name) }
            }}
          />
        ) : (
          <span className="flex-1 text-sm font-semibold">{status.name}</span>
        )}

        <span className="text-xs text-muted-foreground bg-muted rounded-full px-1.5 py-0.5">{tasks.length}</span>

        <DropdownMenu>
          <DropdownMenuTrigger className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded">
            <MoreVertical className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => { setRenaming(true); setNewName(status.name) }}>
              Перейменувати
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={() => onDeleteStatus(status.id)}>
              Видалити
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Droppable zone */}
      <div
        ref={setDropRef}
        className="flex flex-col gap-2 flex-1 min-h-[80px] p-1 rounded-xl transition-colors"
        style={{ backgroundColor: isOver ? `${status.color}30` : `${status.color}12` }}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <SortableKanbanCard key={task.id} task={task} onClick={() => onTaskClick(task.id)} />
          ))}
        </SortableContext>

        {/* Inline add form */}
        {addingTask && (
          <div className="flex flex-col gap-1.5 p-2 bg-background rounded-lg border border-border shadow-sm mt-1">
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

      {!addingTask && (
        <button
          className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground px-1 py-1.5 rounded-lg hover:bg-muted transition-colors"
          onClick={() => setAddingTask(true)}
        >
          <Plus className="size-4" />
          Додати завдання
        </button>
      )}
    </div>
  )
}
