import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      include: {
        statuses: true,
        tasks: {
          where: { deletedAt: null },
          include: {
            status: true,
            subtasks: {
              where: { deletedAt: null },
              include: { status: true },
            },
          },
        },
      },
    });

    let totalTasks = 0;
    let completedTasks = 0;
    let totalSubtasks = 0;
    let completedSubtasks = 0;

    const byProject = projects
      .filter((p) => p.tasks.length > 0)
      .map((p) => {
        const rootTasks = p.tasks.filter((t) => t.parentId === null);
        const subtasks = p.tasks.filter((t) => t.parentId !== null);

        const projectCompletedTasks = rootTasks.filter((t) => t.status.isDone).length;
        const projectCompletedSubtasks = subtasks.filter((t) => t.status.isDone).length;

        totalTasks += rootTasks.length;
        completedTasks += projectCompletedTasks;
        totalSubtasks += subtasks.length;
        completedSubtasks += projectCompletedSubtasks;

        return {
          projectId: p.id,
          projectName: p.name,
          projectColor: p.color,
          totalTasks: rootTasks.length,
          completedTasks: projectCompletedTasks,
          totalSubtasks: subtasks.length,
          completedSubtasks: projectCompletedSubtasks,
        };
      });

    return NextResponse.json({
      totalTasks,
      completedTasks,
      totalSubtasks,
      completedSubtasks,
      byProject,
    });
  } catch (error) {
    console.error("GET /api/analytics/subtasks error:", error);
    return NextResponse.json({ error: "Failed to fetch subtask analytics" }, { status: 500 });
  }
}
