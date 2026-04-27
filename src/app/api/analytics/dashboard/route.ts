import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { subDays, startOfDay, format, subMonths, startOfMonth, endOfMonth } from 'date-fns'

export async function GET() {
  try {
    const now = new Date()
    const today = startOfDay(now)

    const projects = await prisma.project.findMany({
      include: {
        statuses: true,
        tasks: {
          where: { deletedAt: null, parentId: null },
          select: {
            id: true,
            title: true,
            statusId: true,
            deadline: true,
            priority: true,
            createdAt: true,
            updatedAt: true,
            status: { select: { isDone: true } },
          },
        },
      },
    })

    const allTasks = projects.flatMap((p) => p.tasks)
    const total = allTasks.length
    const completed = allTasks.filter((t) => t.status.isDone).length
    const inProgress = allTasks.filter((t) => !t.status.isDone).length
    const upcoming = allTasks.filter(
      (t) => !t.status.isDone && t.deadline && new Date(t.deadline) > now
    ).length
    const pending = allTasks.filter((t) => !t.status.isDone && !t.deadline).length

    // Weekly load — last 7 days
    const weeklyLoad = Array.from({ length: 7 }, (_, i) => {
      const day = subDays(today, 6 - i)
      const nextDay = subDays(today, 5 - i)
      return {
        day: format(day, 'EEE'),
        new: allTasks.filter((t) => {
          const d = new Date(t.createdAt)
          return d >= day && d < nextDay
        }).length,
        completed: allTasks.filter((t) => {
          if (!t.status.isDone) return false
          const d = new Date(t.updatedAt)
          return d >= day && d < nextDay
        }).length,
      }
    })

    // Last 6 months labels
    const months = Array.from({ length: 6 }, (_, i) => {
      const m = subMonths(now, 5 - i)
      return { label: format(m, 'MMM'), start: startOfMonth(m), end: endOfMonth(m) }
    })

    // Monthly completed per project
    const monthlyByProject = months.map((m) => {
      const entry: Record<string, string | number> = { month: m.label }
      projects.forEach((p) => {
        const doneStatusIds = new Set(p.statuses.filter((s) => s.isDone).map((s) => s.id))
        entry[p.id] = p.tasks.filter((t) => {
          const d = new Date(t.updatedAt)
          return doneStatusIds.has(t.statusId) && d >= m.start && d <= m.end
        }).length
      })
      return entry
    })

    // Monthly created per project (workload)
    const workloadByProject = months.map((m) => {
      const entry: Record<string, string | number> = { month: m.label }
      projects.forEach((p) => {
        entry[p.id] = p.tasks.filter((t) => {
          const d = new Date(t.createdAt)
          return d >= m.start && d <= m.end
        }).length
      })
      return entry
    })

    // Per-project summary
    const projectsData = projects
      .map((p) => {
        const doneStatusIds = new Set(p.statuses.filter((s) => s.isDone).map((s) => s.id))
        const ptotal = p.tasks.length
        const pcompleted = p.tasks.filter((t) => doneStatusIds.has(t.statusId)).length
        return {
          id: p.id,
          name: p.name,
          color: p.color,
          total: ptotal,
          completed: pcompleted,
          progress: ptotal > 0 ? Math.round((pcompleted / ptotal) * 100) : 0,
        }
      })
      .filter((p) => p.total > 0)

    // Recent tasks (upcoming by deadline, then by createdAt desc) — max 8
    const recentTasks = allTasks
      .sort((a, b) => {
        if (a.deadline && b.deadline)
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
        if (a.deadline) return -1
        if (b.deadline) return 1
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })
      .slice(0, 8)
      .map((t) => ({
        id: t.id,
        title: t.title,
        deadline: t.deadline,
        isDone: t.status.isDone,
        createdAt: t.createdAt,
      }))

    return NextResponse.json({
      summary: { total, completed, inProgress, pending, upcoming },
      weeklyLoad,
      monthlyByProject,
      workloadByProject,
      projects: projectsData,
      recentTasks,
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
