import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;

    const timeLogs = await prisma.timeLog.findMany({
      where: { taskId },
      orderBy: { startTime: "desc" },
    });

    return NextResponse.json(timeLogs);
  } catch (error) {
    console.error("GET /api/tasks/[id]/timelogs error:", error);
    return NextResponse.json(
      { error: "Failed to fetch time logs" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;
    const body = await request.json();
    const { startTime, endTime, duration } = body;

    if (!startTime) {
      return NextResponse.json(
        { error: "startTime is required" },
        { status: 400 }
      );
    }

    const timeLog = await prisma.timeLog.create({
      data: {
        taskId,
        startTime: new Date(startTime),
        endTime: endTime ? new Date(endTime) : null,
        duration: duration ?? null,
      },
    });

    return NextResponse.json(timeLog, { status: 201 });
  } catch (error) {
    console.error("POST /api/tasks/[id]/timelogs error:", error);
    return NextResponse.json(
      { error: "Failed to create time log" },
      { status: 500 }
    );
  }
}
