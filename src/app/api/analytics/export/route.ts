import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { format } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const projectIdParam = searchParams.get('projectId')
    const fromParam = searchParams.get('from')
    const toParam = searchParams.get('to')

    const dateFrom = fromParam ? new Date(fromParam) : null
    const dateTo = toParam ? new Date(new Date(toParam).setHours(23, 59, 59, 999)) : null

    const tasks = await prisma.task.findMany({
      where: {
        deletedAt: null,
        parentId: null,
        ...(projectIdParam ? { projectId: projectIdParam } : {}),
        ...(dateFrom || dateTo ? {
          createdAt: {
            ...(dateFrom ? { gte: dateFrom } : {}),
            ...(dateTo ? { lte: dateTo } : {}),
          }
        } : {}),
      },
      include: {
        project: { select: { name: true } },
        status: { select: { name: true, isDone: true } },
        labels: { include: { label: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    })

    const headers = ['ID', 'Title', 'Project', 'Status', 'Done', 'Priority', 'Deadline', 'Labels', 'Created At']

    const rows = tasks.map((t) => [
      t.id,
      `"${t.title.replace(/"/g, '""')}"`,
      `"${t.project.name.replace(/"/g, '""')}"`,
      `"${t.status.name.replace(/"/g, '""')}"`,
      t.status.isDone ? 'Yes' : 'No',
      t.priority ?? '',
      t.deadline ? format(new Date(t.deadline), 'yyyy-MM-dd') : '',
      `"${t.labels.map((l) => l.label.name).join(', ')}"`,
      format(new Date(t.createdAt), 'yyyy-MM-dd HH:mm'),
    ])

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="tasks-export-${format(new Date(), 'yyyy-MM-dd')}.csv"`,
      },
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
