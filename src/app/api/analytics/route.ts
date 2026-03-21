import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    const where = {
      endTime: { not: null },
      duration: { not: null },
      ...(startDateParam || endDateParam
        ? {
            startTime: {
              ...(startDateParam && { gte: new Date(startDateParam) }),
              ...(endDateParam && {
                lte: new Date(new Date(endDateParam).getTime() + 86400000),
              }),
            },
          }
        : {}),
    };

    const timeLogs = await prisma.timeLog.findMany({
      where,
      include: {
        task: {
          select: {
            id: true,
            title: true,
            projectId: true,
            project: { select: { id: true, name: true } },
          },
        },
      },
    });

    const totalSeconds = timeLogs.reduce(
      (sum, log) => sum + (log.duration ?? 0),
      0
    );

    // Breakdown by task
    const taskMap = new Map<
      string,
      { taskId: string; taskTitle: string; projectId: string; projectName: string; totalSeconds: number }
    >();

    for (const log of timeLogs) {
      const existing = taskMap.get(log.taskId);
      if (existing) {
        existing.totalSeconds += log.duration ?? 0;
      } else {
        taskMap.set(log.taskId, {
          taskId: log.taskId,
          taskTitle: log.task.title,
          projectId: log.task.projectId,
          projectName: log.task.project.name,
          totalSeconds: log.duration ?? 0,
        });
      }
    }

    return NextResponse.json({
      totalSeconds,
      entries: Array.from(taskMap.values()),
    });
  } catch (error) {
    console.error("GET /api/analytics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
