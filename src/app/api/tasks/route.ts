import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const projectId = searchParams.get("projectId");
    const statusId = searchParams.get("statusId");

    const tasks = await prisma.task.findMany({
      where: {
        ...(projectId && { projectId }),
        ...(statusId && { statusId }),
        parentId: null,
      },
      include: {
        status: true,
        project: true,
        labels: { include: { label: true } },
        tags: { include: { tag: true } },
        timeLogs: true,
        _count: {
          select: { subtasks: true, attachments: true },
        },
      },
      orderBy: { order: "asc" },
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("GET /api/tasks error:", error);
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title,
      statusId,
      projectId,
      priority,
      deadline,
      description,
      order,
      parentId,
    } = body;

    if (!title) {
      return NextResponse.json(
        { error: "Task title is required" },
        { status: 400 }
      );
    }
    if (!statusId) {
      return NextResponse.json(
        { error: "statusId is required" },
        { status: 400 }
      );
    }
    if (!projectId) {
      return NextResponse.json(
        { error: "projectId is required" },
        { status: 400 }
      );
    }

    const task = await prisma.task.create({
      data: {
        title,
        statusId,
        projectId,
        priority: priority ?? null,
        deadline: deadline ? new Date(deadline) : null,
        description: description ?? null,
        order: order ?? 0,
        parentId: parentId ?? null,
      },
      include: {
        status: true,
        project: true,
        labels: { include: { label: true } },
        tags: { include: { tag: true } },
        timeLogs: true,
        _count: {
          select: { subtasks: true, attachments: true },
        },
      },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error("POST /api/tasks error:", error);
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    );
  }
}
