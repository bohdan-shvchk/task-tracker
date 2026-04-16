'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Pencil, Check, X, Plus, LayoutDashboard, Table2, GanttChart, Network, Archive, ExternalLink, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Sidebar from '@/components/layout/Sidebar'
import KanbanBoard from '@/components/kanban/KanbanBoard'
import ListView from '@/components/task/ListView'
import TaskModal from '@/components/task/TaskModal'
import TrashModal from '@/components/task/TrashModal'
import PomodoroTimer from '@/components/pomodoro/PomodoroTimer'
import { useAppStore } from '@/store/app-store'
import { Project, Task } from '@/lib/types'
import { cn } from '@/lib/utils'
import IconPicker, { ProjectIcon } from '@/components/ui/icon-picker'

interface Props {
  params: Promise<{ id: string }>
}

type View = 'kanban' | 'list'

const VIEW_TABS = [
  { id: 'kanban' as View, label: 'Kanban', icon: LayoutDashboard, enabled: true },
  { id: 'list' as View, label: 'Table', icon: Table2, enabled: true },
  { id: null, label: 'Timeline', icon: GanttChart, enabled: false },
  { id: null, label: 'Galaxy View', icon: Network, enabled: false },
  { id: null, label: 'Archive', icon: Archive, enabled: false },
]

export default function ProjectPage({ params }: Props) {
  const { id } = use(params)
  const router = useRouter()
  const { setProjects, openTaskId, setOpenTaskId, trashOpen, setTrashOpen } = useAppStore()
  const [project, setProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [iconPickerOpen, setIconPickerOpen] = useState(false)
  const [view, setView] = useState<View>('kanban')

  const [isNewTask, setIsNewTask] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  const handleDeleteProject = async () => {
    try {
      const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' })
      if (res.ok) {
        const allProjects = await fetch('/api/projects').then((r) => r.json())
        setProjects(allProjects)
        router.push('/')
      }
    } catch (e) { console.error(e) }
  }

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

  const handleNewTask = async () => {
    if (!project?.statuses.length) return
    try {
      const firstStatus = project.statuses[0]
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Нове завдання',
          projectId: id,
          statusId: firstStatus.id,
          order: tasks.filter((t) => t.statusId === firstStatus.id).length,
        }),
      })
      if (res.ok) {
        const newTask: Task = await res.json()
        setIsNewTask(true)
        setOpenTaskId(newTask.id)
      }
    } catch (e) { console.error(e) }
  }

  const handleStatusColorChange = async (statusId: string, color: string) => {
    setProject((p) => p ? { ...p, statuses: p.statuses.map((s) => s.id === statusId ? { ...s, color } : s) } : p)
    try {
      await fetch(`/api/statuses/${statusId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ color }),
      })
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

  const handleIconChange = async (icon: string) => {
    if (!project) return
    setProject((p) => p ? { ...p, icon } : p)
    setIconPickerOpen(false)
    try {
      await fetch(`/api/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ icon }),
      })
      fetchProjects()
    } catch (e) { console.error(e) }
  }

  const handleRefresh = () => { fetchTasks(); fetchProject() }

  if (loading) {
    return (
      <div className="w-full flex h-screen overflow-hidden bg-background">
        <Sidebar />
        <main className="flex-1 min-w-0 overflow-hidden flex flex-col items-center justify-center">
          <p className="text-muted-foreground">Завантаження...</p>
        </main>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="w-full flex h-screen overflow-hidden bg-background">
        <Sidebar />
        <main className="flex-1 min-w-0 flex items-center justify-center">
          <p className="text-muted-foreground">Проєкт не знайдено</p>
        </main>
      </div>
    )
  }

  return (
    <div className="w-full flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="shrink-0 flex items-center gap-3 px-6 py-3 bg-background">
          <Button variant="ghost" size="icon" onClick={() => router.push('/')}>
            <ArrowLeft className="size-4" />
          </Button>

          {/* Icon picker */}
          <div className="relative shrink-0">
            <button
              onClick={() => setIconPickerOpen((v) => !v)}
              title="Змінити іконку проєкту"
              className="hover:opacity-80 transition-opacity"
            >
              <ProjectIcon icon={project.icon} color={project.color} size="md" />
            </button>
            {iconPickerOpen && (
              <div
                className="absolute top-10 left-0 z-50 bg-popover border border-border rounded-xl shadow-lg"
                onClick={(e) => e.stopPropagation()}
              >
                <IconPicker
                  value={project.icon}
                  onChange={handleIconChange}
                  color={project.color}
                />
              </div>
            )}
          </div>

          {editingName ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                className="text-2xl font-bold bg-transparent outline-none border-b-2 border-primary"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveName()
                  if (e.key === 'Escape') { setEditingName(false); setNameInput(project.name) }
                }}
              />
              <Button variant="ghost" size="icon" onClick={handleSaveName} className="text-green-600 hover:text-green-700"><Check className="size-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => { setEditingName(false); setNameInput(project.name) }}><X className="size-4" /></Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 group">
              <h1 className="text-2xl font-bold">{project.name}</h1>
              <Button
                variant="ghost" size="icon"
                className="opacity-0 group-hover:opacity-100"
                onClick={() => setEditingName(true)}
              >
                <Pencil className="size-3.5" />
              </Button>
            </div>
          )}

          <span className="text-sm text-muted-foreground">{tasks.length} завдань</span>

          {project.url && (
            <a
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
              title={project.url}
            >
              <ExternalLink className="size-3.5" />
              {new URL(project.url).hostname}
            </a>
          )}

          {deleteConfirm ? (
            <div className="flex items-center gap-2 ml-2">
              <span className="text-sm text-muted-foreground">Видалити проєкт?</span>
              <Button variant="destructive" size="sm" onClick={handleDeleteProject}>Так</Button>
              <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(false)}>Ні</Button>
            </div>
          ) : (
            <Button
              variant="ghost" size="icon"
              className="text-muted-foreground hover:text-destructive"
              title="Видалити проєкт"
              onClick={() => setDeleteConfirm(true)}
            >
              <Trash2 className="size-4" />
            </Button>
          )}

          <div className="ml-auto flex items-center gap-2">
            <PomodoroTimer projectId={id} tasks={tasks} statuses={project?.statuses ?? []} />
            <Button
              onClick={handleNewTask}
              className="flex items-center gap-1.5 px-3 py-1.5 h-auto text-sm font-medium rounded-lg text-white"
              style={{ backgroundColor: 'var(--aqua-blue)' }}
            >
              <Plus className="size-4" />
              Нове завдання
            </Button>
          </div>
        </div>

        {/* View tabs bar */}
        <div className="shrink-0 flex items-stretch px-6 bg-background h-11">
          {VIEW_TABS.map(({ id: tabId, label, icon: Icon, enabled }) => {
            const isActive = tabId !== null && view === tabId
            return (
              <button
                key={label}
                disabled={!enabled}
                onClick={() => {
                  if (tabId === 'list') { setView('list'); fetchTasks(); fetchProject() }
                  else if (tabId) setView(tabId)
                }}
                className={cn(
                  'flex items-center gap-1.5 px-3 text-sm border-b-2 transition-colors',
                  isActive ? 'border-[#2a6ff3] font-medium' : 'border-transparent',
                  enabled ? 'cursor-pointer' : 'opacity-40 cursor-not-allowed'
                )}
                style={{ color: isActive ? 'var(--aqua-blue)' : 'var(--neutral-500)' }}
              >
                <Icon className="size-3.5 shrink-0" style={{ color: isActive ? 'var(--aqua-blue)' : 'var(--neutral-500)' }} />
                {label}
              </button>
            )
          })}
        </div>

        <div className={cn(
          'flex-1 min-h-0',
          view === 'kanban' ? 'overflow-hidden' : 'overflow-auto px-6 py-5'
        )}>
          {view === 'kanban' ? (
            <KanbanBoard
              statuses={project.statuses}
              tasks={tasks}
              projectId={id}
              onTaskClick={setOpenTaskId}
              onAddTask={handleAddTask}
              onRefresh={handleRefresh}
            />
          ) : (
            <ListView
              tasks={tasks}
              statuses={project.statuses}
              onTaskClick={setOpenTaskId}
              onRefresh={handleRefresh}
              onStatusColorChange={handleStatusColorChange}
            />
          )}
        </div>
      </main>

      {openTaskId && (
        <TaskModal
          taskId={openTaskId}
          onClose={() => { setOpenTaskId(null); setIsNewTask(false); handleRefresh() }}
          isNew={isNewTask}
        />
      )}

      <TrashModal
        projectId={id}
        open={trashOpen}
        onClose={() => setTrashOpen(false)}
        onRestore={handleRefresh}
      />

    </div>
  )
}
