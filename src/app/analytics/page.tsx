'use client'

import { useEffect, useState } from 'react'
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Button } from '@/components/ui/button'
import Sidebar from '@/components/layout/Sidebar'
import { useAppStore } from '@/store/app-store'
import { Project } from '@/lib/types'
import { formatDuration } from '@/lib/format-time'
import TaskModal from '@/components/task/TaskModal'
import { CheckCheck, Clock, ListTodo, SquareCheck } from 'lucide-react'

interface AnalyticsEntry {
  taskId: string
  taskTitle: string
  projectId: string
  projectName: string
  totalSeconds: number
}

interface AnalyticsData {
  totalSeconds: number
  entries: AnalyticsEntry[]
}

interface SubtaskStats {
  totalTasks: number
  completedTasks: number
  totalSubtasks: number
  completedSubtasks: number
  byProject: {
    projectId: string
    projectName: string
    projectColor: string
    totalTasks: number
    completedTasks: number
    totalSubtasks: number
    completedSubtasks: number
  }[]
}

interface StatCardProps {
  label: string
  value: number
  description?: string
  icon: React.ReactNode
  valueClassName?: string
}

function StatCard({ label, value, description, icon, valueClassName }: StatCardProps) {
  return (
    <div className="rounded-2xl border bg-card shadow-sm p-6 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <div className={`text-3xl font-bold tabular-nums tracking-tight ${valueClassName ?? ''}`}>
        {value}
      </div>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  )
}

export default function AnalyticsPage() {
  const { setProjects, openTaskId, setOpenTaskId } = useAppStore()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [subtaskStats, setSubtaskStats] = useState<SubtaskStats | null>(null)
  const [startDate, setStartDate] = useState(
    format(startOfMonth(new Date()), 'yyyy-MM-dd')
  )
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'))

  useEffect(() => {
    fetch('/api/projects')
      .then((r) => r.json())
      .then((projs: Project[]) => setProjects(projs))
      .catch(console.error)
  }, [setProjects])

  useEffect(() => {
    fetch('/api/analytics/subtasks')
      .then((r) => r.json())
      .then((json: SubtaskStats) => setSubtaskStats(json))
      .catch(console.error)
  }, [])

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/analytics?startDate=${startDate}&endDate=${endDate}`
      )
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [startDate, endDate])

  const applyQuickFilter = (type: string) => {
    const now = new Date()
    switch (type) {
      case 'this-month':
        setStartDate(format(startOfMonth(now), 'yyyy-MM-dd'))
        setEndDate(format(endOfMonth(now), 'yyyy-MM-dd'))
        break
      case 'last-month': {
        const last = subMonths(now, 1)
        setStartDate(format(startOfMonth(last), 'yyyy-MM-dd'))
        setEndDate(format(endOfMonth(last), 'yyyy-MM-dd'))
        break
      }
      case '7-days':
        setStartDate(format(subDays(now, 7), 'yyyy-MM-dd'))
        setEndDate(format(now, 'yyyy-MM-dd'))
        break
      case '30-days':
        setStartDate(format(subDays(now, 30), 'yyyy-MM-dd'))
        setEndDate(format(now, 'yyyy-MM-dd'))
        break
    }
  }

  const chartData = (data?.entries ?? [])
    .slice()
    .sort((a, b) => b.totalSeconds - a.totalSeconds)
    .slice(0, 10)
    .map((e) => ({
      name: e.taskTitle.length > 20 ? e.taskTitle.slice(0, 20) + '…' : e.taskTitle,
      hours: parseFloat((e.totalSeconds / 3600).toFixed(2)),
      fullTitle: e.taskTitle,
    }))

  const totalSeconds = data?.totalSeconds ?? 0

  const taskCompletionPct = subtaskStats && subtaskStats.totalTasks > 0
    ? Math.round((subtaskStats.completedTasks / subtaskStats.totalTasks) * 100)
    : 0

  const subtaskCompletionPct = subtaskStats && subtaskStats.totalSubtasks > 0
    ? Math.round((subtaskStats.completedSubtasks / subtaskStats.totalSubtasks) * 100)
    : 0

  return (
    <div className="flex flex-1 min-h-screen bg-muted/40">
      <Sidebar />

      <main className="flex-1 overflow-y-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Аналітика</h1>
          <p className="text-sm text-muted-foreground mt-1">Прогрес задач та витрачений час</p>
        </div>

        {/* Stat cards */}
        {subtaskStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard
              label="Задач всього"
              value={subtaskStats.totalTasks}
              description={`${taskCompletionPct}% виконано`}
              icon={<ListTodo className="size-4" />}
            />
            <StatCard
              label="Задач виконано"
              value={subtaskStats.completedTasks}
              description={`з ${subtaskStats.totalTasks} задач`}
              icon={<SquareCheck className="size-4" />}
              valueClassName="text-green-600 dark:text-green-500"
            />
            <StatCard
              label="Підзадач всього"
              value={subtaskStats.totalSubtasks}
              description={`${subtaskCompletionPct}% виконано`}
              icon={<ListTodo className="size-4" />}
            />
            <StatCard
              label="Підзадач виконано"
              value={subtaskStats.completedSubtasks}
              description={`з ${subtaskStats.totalSubtasks} підзадач`}
              icon={<CheckCheck className="size-4" />}
              valueClassName="text-green-600 dark:text-green-500"
            />
          </div>
        )}

        {/* By-project completion table */}
        {subtaskStats && subtaskStats.byProject.length > 0 && (
          <div className="rounded-2xl border bg-card shadow-sm overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-border">
              <p className="text-sm font-semibold">Прогрес по проєктах</p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Проєкт</th>
                  <th className="text-center px-6 py-3 font-medium text-muted-foreground">Задачі</th>
                  <th className="text-center px-6 py-3 font-medium text-muted-foreground">Підзадачі</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Прогрес</th>
                </tr>
              </thead>
              <tbody>
                {subtaskStats.byProject.map((p) => {
                  const total = p.totalTasks + p.totalSubtasks
                  const completed = p.completedTasks + p.completedSubtasks
                  const percent = total > 0 ? Math.round((completed / total) * 100) : 0
                  return (
                    <tr key={p.projectId} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-3 font-medium flex items-center gap-2.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0 inline-block"
                          style={{ backgroundColor: p.projectColor }}
                        />
                        {p.projectName}
                      </td>
                      <td className="px-6 py-3 text-center text-muted-foreground">
                        {p.completedTasks}/{p.totalTasks}
                      </td>
                      <td className="px-6 py-3 text-center text-muted-foreground">
                        {p.completedSubtasks}/{p.totalSubtasks}
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-8 text-right tabular-nums">{percent}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Quick filters */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <Button size="sm" variant="outline" onClick={() => applyQuickFilter('this-month')}>
            Цей місяць
          </Button>
          <Button size="sm" variant="outline" onClick={() => applyQuickFilter('last-month')}>
            Минулий місяць
          </Button>
          <Button size="sm" variant="outline" onClick={() => applyQuickFilter('7-days')}>
            7 днів
          </Button>
          <Button size="sm" variant="outline" onClick={() => applyQuickFilter('30-days')}>
            30 днів
          </Button>
        </div>

        {/* Date range */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-muted-foreground">Від</label>
            <input
              type="date"
              className="text-sm border border-input rounded-lg px-3 py-1.5 bg-background outline-none focus:border-ring transition-colors"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-muted-foreground">До</label>
            <input
              type="date"
              className="text-sm border border-input rounded-lg px-3 py-1.5 bg-background outline-none focus:border-ring transition-colors"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <p className="text-muted-foreground text-sm">Завантаження...</p>
        ) : (
          <>
            {/* Total time card */}
            <div className="rounded-2xl border bg-card shadow-sm p-6 mb-6 inline-flex flex-col gap-3">
              <div className="flex items-center justify-between gap-8">
                <span className="text-sm font-medium text-muted-foreground">Загальний час</span>
                <Clock className="size-4 text-muted-foreground" />
              </div>
              <p className="text-3xl font-bold font-mono tabular-nums tracking-tight">
                {formatDuration(totalSeconds)}
              </p>
            </div>

            {/* Bar chart */}
            {chartData.length > 0 && (
              <div className="rounded-2xl border bg-card shadow-sm p-6 mb-6">
                <p className="text-sm font-semibold mb-6">Топ 10 завдань за часом</p>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                      angle={-35}
                      textAnchor="end"
                      interval={0}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                      label={{ value: 'год', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: 'var(--muted-foreground)' } }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--card)',
                        border: '1px solid var(--border)',
                        borderRadius: '0.75rem',
                        fontSize: 12,
                      }}
                      formatter={(value) => [`${value} год`, 'Час']}
                      labelFormatter={(label) => {
                        const entry = chartData.find((d) => d.name === label)
                        return entry?.fullTitle ?? label
                      }}
                    />
                    <Bar dataKey="hours" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Time-log table */}
            {(data?.entries ?? []).length > 0 ? (
              <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-border">
                  <p className="text-sm font-semibold">Деталізація по завданнях</p>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-6 py-3 font-medium text-muted-foreground">Завдання</th>
                      <th className="text-left px-6 py-3 font-medium text-muted-foreground">Проєкт</th>
                      <th className="text-right px-6 py-3 font-medium text-muted-foreground">Час</th>
                      <th className="text-right px-6 py-3 font-medium text-muted-foreground">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.entries ?? [])
                      .slice()
                      .sort((a, b) => b.totalSeconds - a.totalSeconds)
                      .map((entry) => {
                        const percent =
                          totalSeconds > 0
                            ? ((entry.totalSeconds / totalSeconds) * 100).toFixed(1)
                            : '0'
                        return (
                          <tr
                            key={entry.taskId}
                            className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors cursor-pointer"
                            onClick={() => setOpenTaskId(entry.taskId)}
                          >
                            <td className="px-6 py-3 font-medium">{entry.taskTitle}</td>
                            <td className="px-6 py-3 text-muted-foreground">{entry.projectName}</td>
                            <td className="px-6 py-3 text-right font-mono tabular-nums">
                              {formatDuration(entry.totalSeconds)}
                            </td>
                            <td className="px-6 py-3 text-right text-muted-foreground tabular-nums">{percent}%</td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">Немає даних за обраний період</p>
            )}
          </>
        )}
      </main>

      {openTaskId && (
        <TaskModal
          taskId={openTaskId}
          onClose={() => setOpenTaskId(null)}
        />
      )}
    </div>
  )
}
