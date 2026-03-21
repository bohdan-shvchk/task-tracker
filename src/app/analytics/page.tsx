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

export default function AnalyticsPage() {
  const { setProjects } = useAppStore()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(false)
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

  return (
    <div className="flex flex-1 min-h-screen bg-muted/20">
      <Sidebar />

      <main className="flex-1 overflow-y-auto px-6 py-6">
        <h1 className="text-xl font-bold mb-6">Аналітика</h1>

        {/* Quick filters */}
        <div className="flex gap-2 mb-5 flex-wrap">
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
            <label className="text-sm font-medium">Від</label>
            <input
              type="date"
              className="text-sm border border-input rounded-md px-2 py-1 bg-background outline-none focus:border-ring"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">До</label>
            <input
              type="date"
              className="text-sm border border-input rounded-md px-2 py-1 bg-background outline-none focus:border-ring"
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
            <div className="bg-white border border-border rounded-xl p-5 mb-6 inline-block">
              <p className="text-sm text-muted-foreground mb-1">Загальний час</p>
              <p className="text-3xl font-bold font-mono tabular-nums">
                {formatDuration(totalSeconds)}
              </p>
            </div>

            {/* Bar chart */}
            {chartData.length > 0 && (
              <div className="bg-white border border-border rounded-xl p-5 mb-6">
                <p className="text-sm font-semibold mb-4">Топ 10 завдань за часом</p>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11 }}
                      angle={-35}
                      textAnchor="end"
                      interval={0}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      label={{ value: 'год', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }}
                    />
                    <Tooltip
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

            {/* Table */}
            {(data?.entries ?? []).length > 0 ? (
              <div className="bg-white border border-border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Завдання</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Проєкт</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Час</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">%</th>
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
                          <tr key={entry.taskId} className="border-b border-border last:border-0 hover:bg-muted/30">
                            <td className="px-4 py-2.5 font-medium">{entry.taskTitle}</td>
                            <td className="px-4 py-2.5 text-muted-foreground">{entry.projectName}</td>
                            <td className="px-4 py-2.5 text-right font-mono">
                              {formatDuration(entry.totalSeconds)}
                            </td>
                            <td className="px-4 py-2.5 text-right text-muted-foreground">{percent}%</td>
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
    </div>
  )
}
