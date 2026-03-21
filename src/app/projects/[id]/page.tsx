'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Pencil, Check, X } from 'lucide-react'
import Sidebar from '@/components/layout/Sidebar'
import KanbanBoard from '@/components/kanban/KanbanBoard'
import TaskModal from '@/components/task/TaskModal'
import { useAppStore } from '@/store/app-store'
import { Project, Task } from '@/lib/types'
import { ColorPalette } from '@/components/ui/color-palette'

interface Props {
  params: Promise<{ id: string }>
}

export default function ProjectPage({ params }: Props) {
  const { id } = use(params)
  const router = useRouter()
  const { setProjects } = useAppStore()
  const [project, setProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [openTaskId, setOpenTaskId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [colorPickerOpen, setColorPickerOpen] = useState(false)

  const fetchProject = async () => {
    try {
      const res = await fetch(`/api/projects/${id}`)
      if (res.ok) {
        const data: Project = await res.json()
        setProject(data)
        setNameInput(data.name)
      }
    } catch (e) { console.error(e) }
  }

  const fetchTasks = async () => {
    try {
      const res = await fetch(`/api/tasks?projectId=${id}`)
      if (res.ok) {
        const data: Task[] = await res.json()
        setTasks(data.filter((t) => !t.parentId))
      }
    } catch (e) { console.error(e) }
  }

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects')
      if (res.ok) setProjects(await res.json())
    } catch (e) { console.error(e) }
  }

  useEffect(() => {
    Promise.all([fetchProject(), fetchTasks(), fetchProjects()]).finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const handleAddTask = async (statusId: string, title: string) => {
    if (!project) return
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, projectId: id, statusId, order: tasks.filter((t) => t.statusId === statusId).length }),
      })
      if (res.ok) {
        const newTask: Task = await res.json()
        setTasks((prev) => [...prev, { ...newTask, project }])
      }
    } catch (e) { console.error(e) }
  }

  const handleSaveName = async () => {
    const name = nameInput.trim()
    if (!name || !project || name === project.name) { setEditingName(false); return }
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (res.ok) {
        setProject((p) => p ? { ...p, name } : p)
        fetchProjects()
      }
    } catch (e) { console.error(e) }
    setEditingName(false)
  }

  const handleColorChange = async (color: string) => {
    if (!project) return
    setProject((p) => p ? { ...p, color } : p)
    try {
      await fetch(`/api/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ color }),
      })
      fetchProjects()
    } catch (e) { console.error(e) }
  }

  const handleRefresh = () => { fetchTasks(); fetchProject() }

  if (loading) {
    return (
      <div className="flex flex-1 min-h-screen bg-muted/20">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Завантаження...</p>
        </main>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex flex-1 min-h-screen bg-muted/20">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Проєкт не знайдено</p>
        </main>
      </div>
    )
  }

  return (
    <div className="flex flex-1 min-h-screen bg-muted/20">
      <Sidebar />
      <main className="flex-1 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-background">
          <button onClick={() => router.push('/')} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="size-4" />
          </button>
          <div className="relative shrink-0">
            <button
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold hover:opacity-80 transition-opacity"
              style={{ backgroundColor: project.color }}
              onClick={() => setColorPickerOpen((v) => !v)}
              title="Змінити колір проєкту"
            >
              {project.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
            </button>
            {colorPickerOpen && (
              <div
                className="absolute top-9 left-0 z-50 bg-popover border border-border rounded-xl shadow-lg p-2"
                style={{ minWidth: 220 }}
                onClick={(e) => e.stopPropagation()}
              >
                <ColorPalette
                  value={project.color}
                  onChange={handleColorChange}
                  onSelect={() => setColorPickerOpen(false)}
                />
              </div>
            )}
          </div>

          {editingName ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                className="text-lg font-bold bg-transparent outline-none border-b-2 border-primary"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveName()
                  if (e.key === 'Escape') { setEditingName(false); setNameInput(project.name) }
                }}
              />
              <button onClick={handleSaveName} className="text-green-600 hover:text-green-700"><Check className="size-4" /></button>
              <button onClick={() => { setEditingName(false); setNameInput(project.name) }} className="text-muted-foreground hover:text-foreground"><X className="size-4" /></button>
            </div>
          ) : (
            <div className="flex items-center gap-2 group">
              <h1 className="text-lg font-bold">{project.name}</h1>
              <button
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-opacity"
                onClick={() => setEditingName(true)}
              >
                <Pencil className="size-3.5" />
              </button>
            </div>
          )}
          <span className="ml-2 text-sm text-muted-foreground">{tasks.length} завдань</span>
        </div>

        <div className="flex-1 overflow-auto px-6 py-5">
          <KanbanBoard
            statuses={project.statuses}
            tasks={tasks}
            projectId={id}
            onTaskClick={setOpenTaskId}
            onAddTask={handleAddTask}
            onRefresh={handleRefresh}
          />
        </div>
      </main>

      {openTaskId && (
        <TaskModal
          taskId={openTaskId}
          onClose={() => { setOpenTaskId(null); handleRefresh() }}
        />
      )}
    </div>
  )
}
