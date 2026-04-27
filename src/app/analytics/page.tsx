'use client'

import { useEffect, useState, useCallback } from 'react'
import { format, isToday, isYesterday } from 'date-fns'
import { uk } from 'date-fns/locale'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell,
  RadialBarChart, RadialBar,
} from 'recharts'
import {
  CheckCircle2, Clock, AlertCircle, CalendarDays, MoreVertical, Plus,
  TrendingUp,
} from 'lucide-react'
import Sidebar from '@/components/layout/Sidebar'
import { useAppStore } from '@/store/app-store'
import { Project } from '@/lib/types'
import TaskModal from '@/components/task/TaskModal'

/* ─── Types ────────────────────────────────────────────────── */
interface DashboardData {
  summary: { total: number; completed: number; inProgress: number; pending: number; upcoming: number }
  weeklyLoad: { day: string; new: number; completed: number }[]
  monthlyByProject: Record<string, string | number>[]
  workloadByProject: Record<string, string | number>[]
  projects: { id: string; name: string; color: string; total: number; completed: number; progress: number }[]
  recentTasks: { id: string; title: string; deadline: string | null; isDone: boolean; createdAt: string }[]
}

/* ─── Gauge SVG ─────────────────────────────────────────────── */
function GaugeChart({ pct, label }: { pct: number; label: string }) {
  const r = 72
  const cx = 110
  const cy = 105
  const strokeW = 18

  // Background full semi-circle: M (cx-r, cy) arc to (cx+r, cy) going UP
  const bgD = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`

  // Filled arc from left, angle proportional to pct
  const rad = Math.PI * (pct / 100)
  const ex = cx - r * Math.cos(rad)
  const ey = cy - r * Math.sin(rad)
  const largeArc = pct > 50 ? 1 : 0
  const fillD = pct > 0 ? `M ${cx - r} ${cy} A ${r} ${r} 0 ${largeArc} 1 ${ex} ${ey}` : ''

  // Tick marks every 10 units
  const ticks = Array.from({ length: 11 }, (_, i) => i * 10)

  return (
    <svg width={220} height={130} viewBox="0 0 220 130">
      <defs>
        <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="45%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#ef4444" />
        </linearGradient>
      </defs>

      {/* Tick marks */}
      {ticks.map((t) => {
        const angle = Math.PI * (t / 100)
        const inner = r + strokeW / 2 + 5
        const outer = inner + 6
        const x1 = cx - inner * Math.cos(angle)
        const y1 = cy - inner * Math.sin(angle)
        const x2 = cx - outer * Math.cos(angle)
        const y2 = cy - outer * Math.sin(angle)
        return <line key={t} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#cbd5e1" strokeWidth={1.5} />
      })}

      {/* Scale labels */}
      {[0, 25, 50, 75, 100].map((t) => {
        const angle = Math.PI * (t / 100)
        const dist = r + strokeW / 2 + 18
        const lx = cx - dist * Math.cos(angle)
        const ly = cy - dist * Math.sin(angle)
        return (
          <text key={t} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
            fontSize={9} fill="#94a3b8">{t}</text>
        )
      })}

      {/* Background arc */}
      <path d={bgD} fill="none" stroke="#e2e8f0" strokeWidth={strokeW} strokeLinecap="round" />

      {/* Filled arc */}
      {fillD && (
        <path d={fillD} fill="none" stroke="url(#gaugeGrad)" strokeWidth={strokeW} strokeLinecap="round" />
      )}

      {/* Center text */}
      <text x={cx} y={cy - 14} textAnchor="middle" fontSize={26} fontWeight="700" fill="#1e293b">
        {pct}%
      </text>
      <text x={cx} y={cy + 6} textAnchor="middle" fontSize={11} fill="#94a3b8">
        {label}
      </text>
    </svg>
  )
}

/* ─── Custom Tooltip ────────────────────────────────────────── */
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-border rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="font-medium text-foreground mb-1">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-medium">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

/* ─── Summary card ──────────────────────────────────────────── */
function StatCard({
  label, value, total, pct, icon, bg, iconColor,
}: {
  label: string; value: number; total: number; pct: number
  icon: React.ReactNode; bg: string; iconColor: string
}) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-border/40 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground mb-1">{label}</p>
          <p className="text-2xl font-bold text-foreground">
            {value} <span className="text-base font-normal text-muted-foreground">/{total}</span>
          </p>
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: bg }}>
          <span style={{ color: iconColor }}>{icon}</span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 text-xs" style={{ color: iconColor }}>
        <TrendingUp className="size-3.5" />
        <span>{pct}% from last month</span>
      </div>
    </div>
  )
}

/* ─── Page ──────────────────────────────────────────────────── */
export default function AnalyticsPage() {
  const { setProjects, openTaskId, setOpenTaskId } = useAppStore()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const [dashRes, projRes] = await Promise.all([
        fetch('/api/analytics/dashboard'),
        fetch('/api/projects'),
      ])
      if (dashRes.ok) setData(await dashRes.json())
      if (projRes.ok) setProjects(await projRes.json() as Project[])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [setProjects])

  useEffect(() => { fetchData() }, [fetchData])

  const handleToggleTask = async (taskId: string, isDone: boolean) => {
    if (isDone) return // already done, click opens modal
    setOpenTaskId(taskId)
  }

  if (loading) {
    return (
      <div className="flex flex-1 min-h-screen bg-[#f8fafc]">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center text-muted-foreground">Завантаження...</main>
      </div>
    )
  }

  const s = data?.summary ?? { total: 0, completed: 0, inProgress: 0, pending: 0, upcoming: 0 }
  const projects = data?.projects ?? []
  const completionPct = s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0

  // Group recent tasks by month
  const tasksByMonth: Record<string, typeof data.recentTasks> = {}
  ;(data?.recentTasks ?? []).forEach((t) => {
    const key = format(new Date(t.createdAt), 'MMMM yyyy', { locale: uk })
    if (!tasksByMonth[key]) tasksByMonth[key] = []
    tasksByMonth[key].push(t)
  })

  // Radial data for "Overall Progress"
  const radialData = projects.map((p) => ({
    name: p.name,
    value: p.progress,
    fill: p.color,
  }))

  return (
    <div className="flex flex-1 min-h-screen bg-[#f8fafc]">
      <Sidebar />

      <main className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-6">

        {/* Page title */}
        <h1 className="text-2xl font-bold text-foreground">Аналітика</h1>

        {/* ── Row 1: Summary cards ── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-foreground">Task Summary</h2>
          </div>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard label="Completed Tasks" value={s.completed} total={s.total}
              pct={s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0}
              icon={<CheckCircle2 className="size-5" />}
              bg="#dcfce7" iconColor="#16a34a" />
            <StatCard label="In Progress Tasks" value={s.inProgress} total={s.total}
              pct={s.total > 0 ? Math.round((s.inProgress / s.total) * 100) : 0}
              icon={<Clock className="size-5" />}
              bg="#dbeafe" iconColor="#2a6ff3" />
            <StatCard label="Tasks Pending" value={s.pending} total={s.total}
              pct={s.total > 0 ? Math.round((s.pending / s.total) * 100) : 0}
              icon={<AlertCircle className="size-5" />}
              bg="#ffedd5" iconColor="#f97316" />
            <StatCard label="Upcoming Tasks" value={s.upcoming} total={s.total}
              pct={s.total > 0 ? Math.round((s.upcoming / s.total) * 100) : 0}
              icon={<CalendarDays className="size-5" />}
              bg="#fee2e2" iconColor="#ef4444" />
          </div>
        </section>

        {/* ── Row 2: Weekly Load + Project Progress ── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

          {/* Weekly Task Load */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-border/40">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-semibold">Weekly Task Load</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              {projects.length} Projects · {s.total} Tasks
            </p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data?.weeklyLoad ?? []} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Line type="monotone" dataKey="completed" name="Completed Tasks" stroke="#2a6ff3" strokeWidth={2.5} dot={{ r: 3, fill: '#2a6ff3' }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="new" name="New Tasks" stroke="#f97316" strokeWidth={2.5} dot={{ r: 3, fill: '#f97316' }} activeDot={{ r: 5 }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Project Progress (monthly) */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-border/40">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-semibold">Project Progress</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              {projects.length} Projects · {s.total} Tasks
            </p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data?.monthlyByProject ?? []} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                {projects.map((p) => (
                  <Line key={p.id} type="monotone" dataKey={p.id} name={p.name}
                    stroke={p.color} strokeWidth={2.5}
                    dot={{ r: 3, fill: p.color }} activeDot={{ r: 5 }} />
                ))}
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Row 3: Project Workload + Completion Rate ── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

          {/* Project Workload */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-border/40">
            <h2 className="text-base font-semibold mb-4">Project Workload</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data?.workloadByProject ?? []} margin={{ top: 5, right: 10, left: -20, bottom: 0 }} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                {projects.map((p) => (
                  <Bar key={p.id} dataKey={p.id} name={p.name} fill={p.color} radius={[3, 3, 0, 0]} maxBarSize={16} />
                ))}
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Task Completion Rate */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-border/40">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold">Task Completion Rate</h2>
            </div>

            <div className="flex justify-center">
              <GaugeChart pct={completionPct} label="Completed" />
            </div>

            <div className="grid grid-cols-4 gap-2 mt-3 text-center">
              <div>
                <p className="text-lg font-bold text-foreground">{s.total}</p>
                <p className="text-[11px] text-muted-foreground">Total Task</p>
              </div>
              <div>
                <p className="text-lg font-bold" style={{ color: '#06b6d4' }}>{s.completed}</p>
                <p className="text-[11px] text-muted-foreground">Completed</p>
              </div>
              <div>
                <p className="text-lg font-bold" style={{ color: '#f97316' }}>{s.pending}</p>
                <p className="text-[11px] text-muted-foreground">Pending</p>
              </div>
              <div>
                <p className="text-lg font-bold" style={{ color: '#ef4444' }}>{s.upcoming}</p>
                <p className="text-[11px] text-muted-foreground">Upcoming</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Row 4: My Tasks + Overall Progress ── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 pb-6">

          {/* My Tasks */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-border/40 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold">My Tasks</h2>
              <button className="text-muted-foreground hover:text-foreground transition-colors">
                <MoreVertical className="size-4" />
              </button>
            </div>

            <div className="flex flex-col gap-4 flex-1">
              {Object.keys(tasksByMonth).length === 0 && (
                <p className="text-sm text-muted-foreground">Немає задач</p>
              )}
              {Object.entries(tasksByMonth).map(([month, tasks]) => (
                <div key={month}>
                  <p className="text-xs font-semibold text-muted-foreground mb-2 capitalize">{month}</p>
                  <div className="flex flex-col gap-2">
                    {tasks.map((t) => {
                      const dateStr = t.deadline
                        ? format(new Date(t.deadline), 'MMM d', { locale: uk })
                        : isToday(new Date(t.createdAt))
                          ? 'Today'
                          : isYesterday(new Date(t.createdAt))
                            ? 'Yesterday'
                            : format(new Date(t.createdAt), 'MMM d', { locale: uk })
                      return (
                        <div
                          key={t.id}
                          className="flex items-center gap-3 p-3 rounded-xl border border-border/60 hover:border-border transition-colors cursor-pointer group"
                          onClick={() => setOpenTaskId(t.id)}
                        >
                          <button
                            className="shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors"
                            style={t.isDone ? { backgroundColor: '#2a6ff3', borderColor: '#2a6ff3' } : { borderColor: '#cbd5e1' }}
                            onClick={(e) => { e.stopPropagation(); handleToggleTask(t.id, t.isDone) }}
                          >
                            {t.isDone && (
                              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </button>
                          <span className={`flex-1 text-sm leading-snug ${t.isDone ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                            {t.title}
                          </span>
                          <span className="text-xs text-muted-foreground shrink-0">{dateStr}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            <button
              className="mt-4 w-full py-3 rounded-xl text-sm font-medium text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
              style={{ backgroundColor: '#2a6ff3' }}
              onClick={() => { /* open new task */ }}
            >
              <Plus className="size-4" />
              Add new Task
            </button>
          </div>

          {/* Overall Progress */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-border/40 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold">Overall Progress</h2>
              <button className="text-muted-foreground hover:text-foreground transition-colors">
                <MoreVertical className="size-4" />
              </button>
            </div>

            {/* Concentric rings chart */}
            <div className="flex justify-center mb-4">
              {radialData.length > 0 ? (
                <div className="relative">
                  <ResponsiveContainer width={200} height={200}>
                    <RadialBarChart
                      cx="50%" cy="50%"
                      innerRadius={40} outerRadius={90}
                      barSize={14}
                      data={radialData}
                      startAngle={90} endAngle={-270}
                    >
                      <RadialBar dataKey="value" cornerRadius={7} background={{ fill: '#f1f5f9' }} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null
                          const d = payload[0].payload
                          return (
                            <div className="bg-white border border-border rounded-lg shadow-lg px-3 py-2 text-xs">
                              <p className="font-medium">{d.name}</p>
                              <p className="text-muted-foreground">Progress: {d.value}%</p>
                            </div>
                          )
                        }}
                      />
                    </RadialBarChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center bg-white rounded-lg px-3 py-1.5 shadow-sm border border-border/60">
                      <p className="text-xs text-muted-foreground">All Tasks</p>
                      <p className="text-lg font-bold">{s.total}</p>
                      <p className="text-xs text-muted-foreground">{s.inProgress} in progress</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-[200px] h-[200px] flex items-center justify-center text-sm text-muted-foreground">
                  Немає проєктів
                </div>
              )}
            </div>

            {/* Projects table */}
            <div className="flex flex-col gap-0">
              <div className="grid grid-cols-3 text-xs font-semibold text-muted-foreground pb-2 border-b border-border/60">
                <span>Projects Name</span>
                <span className="text-center">Tasks</span>
                <span className="text-right">Progress</span>
              </div>
              {projects.map((p) => (
                <div key={p.id} className="grid grid-cols-3 items-center py-2.5 border-b border-border/40 last:border-0">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                    <span className="truncate">{p.name}</span>
                  </div>
                  <span className="text-center text-sm text-muted-foreground">{p.total}</span>
                  <span className="text-right text-sm font-medium">{p.progress}%</span>
                </div>
              ))}
              {projects.length === 0 && (
                <p className="text-sm text-muted-foreground py-3">Немає даних</p>
              )}
            </div>
          </div>

        </div>
      </main>

      {openTaskId && (
        <TaskModal taskId={openTaskId} onClose={() => { setOpenTaskId(null); fetchData() }} />
      )}
    </div>
  )
}
