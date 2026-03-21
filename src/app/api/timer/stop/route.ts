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

    const activeTimelog = await prisma.timeLog.findFirst({
      where: { taskId, endTime: null },
    });

    if (!activeTimelog) {
      return NextResponse.json(
        { error: "No active timer found for this task" },
        { status: 404 }
      );
    }

    const now = new Date();
    const durationSeconds = Math.floor(
      (now.getTime() - activeTimelog.startTime.getTime()) / 1000
    );

    const updatedTimelog = await prisma.timeLog.update({
      where: { id: activeTimelog.id },
      data: {
        endTime: now,
        duration: durationSeconds,
      },
      include: {
        task: {
          select: { id: true, title: true, projectId: true },
        },
      },
    });

    return NextResponse.json(updatedTimelog);
  } catch (error) {
    console.error("POST /api/timer/stop error:", error);
    return NextResponse.json(
      { error: "Failed to stop timer" },
      { status: 500 }
    );
  }
}
