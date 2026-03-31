'use client'

import { useEffect, useState } from 'react'
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import Sidebar from '@/components/layout/Sidebar'
import { useAppStore } from '@/store/app-store'
import { Project } from '@/lib/types'
import { formatDuration } from '@/lib/format-time'
import TaskModal from '@/components/task/TaskModal'

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

const chartConfig = {
  hours: {
    label: 'Час (год)',
    color: 'var(--chart-5)',
  },
} satisfies ChartConfig

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
    <div className="flex flex-1 min-h-screen bg-muted/20">
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">

            {/* Page title */}
            <div className="px-4 lg:px-6">
              <h1 className="text-2xl font-bold tracking-tight">Аналітика</h1>
            </div>

            {/* Stat cards */}
            {subtaskStats && (
              <div className="*:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
                <Card className="@container/card">
                  <CardHeader>
                    <CardDescription>Задач всього</CardDescription>
                    <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                      {subtaskStats.totalTasks}
                    </CardTitle>
                    <CardAction>
                      <Badge variant="outline">{taskCompletionPct}% виконано</Badge>
                    </CardAction>
                  </CardHeader>
                  <CardFooter className="flex-col items-start gap-1.5 text-sm">
                    <div className="text-muted-foreground">
                      {subtaskStats.completedTasks} завершено
                    </div>
                  </CardFooter>
                </Card>

                <Card className="@container/card">
                  <CardHeader>
                    <CardDescription>Задач виконано</CardDescription>
                    <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                      {subtaskStats.completedTasks}
                    </CardTitle>
                    <CardAction>
                      <Badge variant="outline">з {subtaskStats.totalTasks}</Badge>
                    </CardAction>
                  </CardHeader>
                  <CardFooter className="flex-col items-start gap-1.5 text-sm">
                    <div className="text-muted-foreground">
                      {subtaskStats.totalTasks - subtaskStats.completedTasks} залишилось
                    </div>
                  </CardFooter>
                </Card>

                <Card className="@container/card">
                  <CardHeader>
                    <CardDescription>Підзадач всього</CardDescription>
                    <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                      {subtaskStats.totalSubtasks}
                    </CardTitle>
                    <CardAction>
                      <Badge variant="outline">{subtaskCompletionPct}% виконано</Badge>
                    </CardAction>
                  </CardHeader>
                  <CardFooter className="flex-col items-start gap-1.5 text-sm">
                    <div className="text-muted-foreground">
                      {subtaskStats.completedSubtasks} завершено
                    </div>
                  </CardFooter>
                </Card>

                <Card className="@container/card">
                  <CardHeader>
                    <CardDescription>Підзадач виконано</CardDescription>
                    <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                      {subtaskStats.completedSubtasks}
                    </CardTitle>
                    <CardAction>
                      <Badge variant="outline">з {subtaskStats.totalSubtasks}</Badge>
                    </CardAction>
                  </CardHeader>
                  <CardFooter className="flex-col items-start gap-1.5 text-sm">
                    <div className="text-muted-foreground">
                      {subtaskStats.totalSubtasks - subtaskStats.completedSubtasks} залишилось
                    </div>
                  </CardFooter>
                </Card>
              </div>
            )}

            {/* By-project progress table */}
            {subtaskStats && subtaskStats.byProject.length > 0 && (
              <div className="px-4 lg:px-6">
                <Card>
                  <CardHeader className="border-b">
                    <CardTitle>Прогрес по проєктах</CardTitle>
                  </CardHeader>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="px-4">Проєкт</TableHead>
                        <TableHead className="px-4 text-center">Задачі</TableHead>
                        <TableHead className="px-4 text-center">Підзадачі</TableHead>
                        <TableHead className="px-4">Прогрес</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {subtaskStats.byProject.map((p) => {
                        const total = p.totalTasks + p.totalSubtasks
                        const completed = p.completedTasks + p.completedSubtasks
                        const percent = total > 0 ? Math.round((completed / total) * 100) : 0
                        return (
                          <TableRow key={p.projectId}>
                            <TableCell className="px-4 font-medium">
                              <div className="flex items-center gap-2.5">
                                <span
                                  className="w-2.5 h-2.5 rounded-full shrink-0 inline-block"
                                  style={{ backgroundColor: p.projectColor }}
                                />
                                {p.projectName}
                              </div>
                            </TableCell>
                            <TableCell className="px-4 text-center text-muted-foreground">
                              {p.completedTasks}/{p.totalTasks}
                            </TableCell>
                            <TableCell className="px-4 text-center text-muted-foreground">
                              {p.completedSubtasks}/{p.totalSubtasks}
                            </TableCell>
                            <TableCell className="px-4">
                              <div className="flex items-center gap-3">
                                <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className="h-full bg-primary rounded-full transition-all"
                                    style={{ width: `${percent}%` }}
                                  />
                                </div>
                                <span className="text-xs text-muted-foreground w-8 text-right tabular-nums">{percent}%</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </Card>
              </div>
            )}

            {/* Quick filters */}
            <div className="flex gap-2 px-4 lg:px-6 flex-wrap">
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
            <div className="flex items-center gap-3 px-4 lg:px-6 flex-wrap">
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
              <p className="text-muted-foreground text-sm px-4 lg:px-6">Завантаження...</p>
            ) : (
              <>
                {/* Total time card */}
                <div className="px-4 lg:px-6">
                  <Card className="*:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs dark:*:data-[slot=card]:bg-card @container/card inline-flex flex-col">
                    <CardHeader>
                      <CardDescription>Загальний час</CardDescription>
                      <CardTitle className="text-2xl font-semibold tabular-nums font-mono @[250px]/card:text-3xl">
                        {formatDuration(totalSeconds)}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                </div>

                {/* Bar chart */}
                {chartData.length > 0 && (
                  <div className="px-4 lg:px-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Топ 10 завдань за часом</CardTitle>
                      </CardHeader>
                      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
                        <ChartContainer config={chartConfig} className="aspect-auto h-[280px] w-full">
                          <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 60 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis
                              dataKey="name"
                              tick={{ fontSize: 11 }}
                              angle={-35}
                              textAnchor="end"
                              interval={0}
                              axisLine={false}
                              tickLine={false}
                              tickMargin={8}
                            />
                            <YAxis
                              tick={{ fontSize: 11 }}
                              label={{ value: 'год', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <ChartTooltip
                              cursor={false}
                              content={
                                <ChartTooltipContent
                                  labelFormatter={(label) => {
                                    const entry = chartData.find((d) => d.name === label)
                                    return entry?.fullTitle ?? label
                                  }}
                                />
                              }
                            />
                            <Bar dataKey="hours" fill="var(--color-hours)" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ChartContainer>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Time-log table */}
                {(data?.entries ?? []).length > 0 ? (
                  <div className="px-4 lg:px-6">
                    <Card>
                      <CardHeader className="border-b">
                        <CardTitle>Деталізація по завданнях</CardTitle>
                      </CardHeader>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="px-4">Завдання</TableHead>
                            <TableHead className="px-4">Проєкт</TableHead>
                            <TableHead className="px-4 text-right">Час</TableHead>
                            <TableHead className="px-4 text-right">%</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(data?.entries ?? [])
                            .slice()
                            .sort((a, b) => b.totalSeconds - a.totalSeconds)
                            .map((entry) => {
                              const percent =
                                totalSeconds > 0
                                  ? ((entry.totalSeconds / totalSeconds) * 100).toFixed(1)
                                  : '0'
                              return (
                                <TableRow
                                  key={entry.taskId}
                                  className="cursor-pointer"
                                  onClick={() => setOpenTaskId(entry.taskId)}
                                >
                                  <TableCell className="px-4 font-medium">{entry.taskTitle}</TableCell>
                                  <TableCell className="px-4 text-muted-foreground">{entry.projectName}</TableCell>
                                  <TableCell className="px-4 text-right font-mono tabular-nums">
                                    {formatDuration(entry.totalSeconds)}
                                  </TableCell>
                                  <TableCell className="px-4 text-right text-muted-foreground tabular-nums">{percent}%</TableCell>
                                </TableRow>
                              )
                            })}
                        </TableBody>
                      </Table>
                    </Card>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm px-4 lg:px-6">Немає даних за обраний період</p>
                )}
              </>
            )}

          </div>
        </div>
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
