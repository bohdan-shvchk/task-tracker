import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: parentId } = await params;

    const subtasks = await prisma.task.findMany({
      where: { parentId },
      include: {
        status: true,
        timeLogs: true,
        comments: { orderBy: { createdAt: "desc" } },
        _count: { select: { attachments: true } },
      },
      orderBy: { order: "asc" },
    });

    return NextResponse.json(subtasks);
  } catch (error) {
    console.error("GET /api/tasks/[id]/subtasks error:", error);
    return NextResponse.json(
      { error: "Failed to fetch subtasks" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: parentId } = await params;
    const body = await request.json();
    const { title, statusId: providedStatusId } = body;

    if (!title) {
      return NextResponse.json(
        { error: "Subtask title is required" },
        { status: 400 }
      );
    }

    const parent = await prisma.task.findUnique({
      where: { id: parentId },
      select: { statusId: true, projectId: true },
    });

    if (!parent) {
      return NextResponse.json(
        { error: "Parent task not found" },
        { status: 404 }
      );
    }

    const statusId = providedStatusId ?? parent.statusId;

    const subtask = await prisma.task.create({
      data: {
        title,
        statusId,
        projectId: parent.projectId,
        parentId,
        order: 0,
      },
      include: {
        status: true,
        timeLogs: true,
        _count: { select: { attachments: true } },
      },
    });

    return NextResponse.json(subtask, { status: 201 });
  } catch (error) {
    console.error("POST /api/tasks/[id]/subtasks error:", error);
    return NextResponse.json(
      { error: "Failed to create subtask" },
      { status: 500 }
    );
  }
}
