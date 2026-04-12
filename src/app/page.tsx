'use client'

import { useEffect, useState } from 'react'
import { Plus, Search, Filter, SortAsc, ClipboardList, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import Sidebar from '@/components/layout/Sidebar'
import TaskModal from '@/components/task/TaskModal'
import CreateProjectModal from '@/components/project/CreateProjectModal'
import { useAppStore } from '@/store/app-store'
import { Task, Project } from '@/lib/types'
import { format } from 'date-fns'

const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Низький',
  MEDIUM: 'Середній',
  HIGH: 'Високий',
  URGENT: 'Терміновий',
}

const PRIORITY_COLORS: Record<string, string> = {
  LOW: '#22c55e',
  MEDIUM: '#eab308',
  HIGH: '#f97316',
  URGENT: '#ef4444',
}

export default function DashboardPage() {
  const { projects, setProjects, openTaskId, setOpenTaskId } = useAppStore()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterProject, setFilterProject] = useState<string>('all')
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest')
  const [showCreateProject, setShowCreateProject] = useState(false)
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null)

  const handleDeleteProject = async (projectId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}`, { method: 'DELETE' })
      if (res.ok) {
        setProjects(projects.filter((p) => p.id !== projectId))
        setTasks(tasks.filter((t) => t.projectId !== projectId))
      }
    } catch (e) { console.error(e) }
    setDeletingProjectId(null)
  }

  const fetchData = async () => {
    try {
      const [projRes, taskRes] = await Promise.all([
        fetch('/api/projects'),
        fetch('/api/tasks'),
      ])
      if (projRes.ok) {
        const projs: Project[] = await projRes.json()
        setProjects(projs)
      }
      if (taskRes.ok) {
        const taskData: Task[] = await taskRes.json()
        setTasks(taskData)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const allTasks = tasks.filter((t) => !t.parentId)

  const filterAndSort = (list: Task[]) => {
    let filtered = list
    if (search.trim()) {
      filtered = filtered.filter((t) =>
        t.title.toLowerCase().includes(search.toLowerCase())
      )
    }
    if (filterProject !== 'all') {
      filtered = filtered.filter((t) => t.projectId === filterProject)
    }
    filtered = [...filtered].sort((a, b) => {
      const da = new Date(a.createdAt).getTime()
      const db = new Date(b.createdAt).getTime()
      return sortOrder === 'newest' ? db - da : da - db
    })
    return filtered
  }

  const activeTasks = filterAndSort(allTasks.filter((t) => {
    const proj = projects.find((p) => p.id === t.projectId)
    const status = proj?.statuses.find((s) => s.id === t.statusId)
    return !status?.isDone
  }))

  const doneTasks = filterAndSort(allTasks.filter((t) => {
    const proj = projects.find((p) => p.id === t.projectId)
    const status = proj?.statuses.find((s) => s.id === t.statusId)
    return status?.isDone
  }))

  const TaskCard = ({ task }: { task: Task }) => {
    const proj = projects.find((p) => p.id === task.projectId)
    const status = proj?.statuses.find((s) => s.id === task.statusId)
    const subtaskCount = task._count?.subtasks ?? 0

    return (
      <div
        className="flex items-start gap-3 p-3.5 bg-white border border-border rounded-xl hover:shadow-sm cursor-pointer transition-shadow"
        onClick={() => setOpenTaskId(task.id)}
      >
        {/* Left priority bar */}
        {task.priority && (
          <div
            className="w-1 self-stretch rounded-full shrink-0"
            style={{ backgroundColor: PRIORITY_COLORS[task.priority] }}
          />
        )}

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{task.title}</p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {proj && (
              <span
                className="text-xs font-medium px-1.5 py-0.5 rounded-full text-white"
                style={{ backgroundColor: proj.color }}
              >
                {proj.name}
              </span>
            )}
            {status && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: status.color }}
                />
                {status.name}
              </span>
            )}
            {task.priority && (
              <span
                className="text-xs font-medium"
                style={{ color: PRIORITY_COLORS[task.priority] }}
              >
                {PRIORITY_LABELS[task.priority]}
              </span>
            )}
            {task.deadline && (
              <span className="text-xs text-muted-foreground">
                До {format(new Date(task.deadline), 'dd.MM.yyyy')}
              </span>
            )}
            {subtaskCount > 0 && (
              <span className="text-xs text-muted-foreground">
                ☑ {subtaskCount} підзавдань
              </span>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 min-h-screen bg-muted/20">
      <Sidebar />

      <main className="flex-1 flex overflow-hidden">
        {/* Main content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-xl font-bold">Всі завдання</h1>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 mb-5 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input
                  placeholder="Пошук завдань..."
                  className="pl-8"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <Select value={filterProject} onValueChange={(v) => v && setFilterProject(v)}>
                <SelectTrigger className="w-auto gap-1">
                  <Filter className="size-3.5" />
                  {filterProject === 'all' ? (
                    <span className="text-sm">Всі проєкти</span>
                  ) : (
                    (() => {
                      const p = projects.find((proj) => proj.id === filterProject)
                      return p ? (
                        <span className="flex items-center gap-1.5 text-sm">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                          {p.name}
                        </span>
                      ) : <span className="text-sm">Проєкт</span>
                    })()
                  )}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Всі проєкти</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                        {p.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as 'newest' | 'oldest')}>
                <SelectTrigger className="w-auto gap-1">
                  <SortAsc className="size-3.5" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Спочатку нові</SelectItem>
                  <SelectItem value="oldest">Спочатку старі</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <p className="text-muted-foreground text-sm">Завантаження...</p>
            ) : (
              <Tabs defaultValue="all">
                <TabsList className="mb-4">
                  <TabsTrigger value="all">
                    Всі завдання ({activeTasks.length})
                  </TabsTrigger>
                  <TabsTrigger value="done">
                    Готові ({doneTasks.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="all">
                  {activeTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <ClipboardList className="size-12 text-muted-foreground/30 mb-4" />
                      <p className="text-muted-foreground text-sm">Завдань немає</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">
                        Створіть перший проєкт і додайте завдання
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {activeTasks.map((task) => (
                        <TaskCard key={task.id} task={task} />
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="done">
                  {doneTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <ClipboardList className="size-12 text-muted-foreground/30 mb-4" />
                      <p className="text-muted-foreground text-sm">Немає завершених завдань</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {doneTasks.map((task) => (
                        <TaskCard key={task.id} task={task} />
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-64 border-l border-border bg-background overflow-y-auto px-4 py-6 shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold">Мої проєкти</h2>
            <Button variant="ghost" size="icon" onClick={() => setShowCreateProject(true)}>
              <Plus className="size-4" />
            </Button>
          </div>

          {projects.length === 0 ? (
            <p className="text-xs text-muted-foreground">Немає проєктів</p>
          ) : (
            <div className="flex flex-col gap-1">
              {projects.map((proj) => {
                const initials = proj.name
                  .split(' ')
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()
                return (
                  <div key={proj.id} className="group flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-muted transition-colors">
                    <a
                      href={`/projects/${proj.id}`}
                      className="flex items-center gap-2.5 flex-1 min-w-0"
                    >
                      <div
                        className="w-6 h-6 rounded-md flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ backgroundColor: proj.color }}
                      >
                        {initials}
                      </div>
                      <span className="text-sm truncate">{proj.name}</span>
                    </a>
                    {deletingProjectId === proj.id ? (
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="destructive" size="xs" onClick={() => handleDeleteProject(proj.id)}>Так</Button>
                        <Button variant="ghost" size="xs" onClick={() => setDeletingProjectId(null)}>Ні</Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost" size="icon"
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => setDeletingProjectId(proj.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          <Button
            size="sm"
            variant="outline"
            className="w-full mt-4 gap-1"
            onClick={() => setShowCreateProject(true)}
          >
            <Plus className="size-3.5" />
            Новий проєкт
          </Button>
        </div>
      </main>

      {/* Task modal */}
      {openTaskId && (
        <TaskModal taskId={openTaskId} onClose={() => { setOpenTaskId(null); fetchData() }} />
      )}

      {/* Create project modal */}
      {showCreateProject && (
        <CreateProjectModal
          onClose={() => setShowCreateProject(false)}
          onCreated={(proj) => {
            setProjects([...projects, proj])
            setShowCreateProject(false)
          }}
        />
      )}
    </div>
  )
}
