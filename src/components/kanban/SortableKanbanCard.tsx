'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Task } from '@/lib/types'
import KanbanCard from './KanbanCard'

interface Props {
  task: Task
  onClick: () => void
  onUpdate?: (updates: Partial<Task>) => void
}

export default function SortableKanbanCard({ task, onClick, onUpdate }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: 'card' },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <KanbanCard task={task} onClick={onClick} onUpdate={onUpdate} />
    </div>
  )
}
