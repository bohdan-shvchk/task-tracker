import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskId } = body;

    if (!taskId) {
      return NextResponse.json(
        { error: "taskId is required" },
        { status: 400 }
      );
    }

    const now = new Date();

    // Close any currently active timelog across all tasks
    const activeTimelog = await prisma.timeLog.findFirst({
      where: { endTime: null },
    });

    if (activeTimelog) {
      const durationSeconds = Math.floor(
        (now.getTime() - activeTimelog.startTime.getTime()) / 1000
      );
      await prisma.timeLog.update({
        where: { id: activeTimelog.id },
        data: {
          endTime: now,
          duration: durationSeconds,
        },
      });
    }

    // Create new active timelog for the given task
    const newTimelog = await prisma.timeLog.create({
      data: {
        taskId,
        startTime: now,
      },
      include: {
        task: {
          select: { id: true, title: true, projectId: true },
        },
      },
    });

    return NextResponse.json(newTimelog, { status: 201 });
  } catch (error) {
    console.error("POST /api/timer/start error:", error);
    return NextResponse.json(
      { error: "Failed to start timer" },
      { status: 500 }
    );
  }
}
