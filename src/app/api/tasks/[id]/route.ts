import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        status: true,
        project: true,
        labels: { include: { label: true } },
        tags: { include: { tag: true } },
        subtasks: {
          include: {
            status: true,
            timeLogs: true,
            _count: { select: { attachments: true } },
          },
          orderBy: { order: "asc" },
        },
        comments: { orderBy: { createdAt: "desc" } },
        attachments: { orderBy: { createdAt: "desc" } },
        timeLogs: { orderBy: { startTime: "desc" } },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error("GET /api/tasks/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch task" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, description, priority, deadline, statusId, order, deletedAt } = body;

    // Cascade deletedAt to subtasks (soft-delete or restore together)
    if (deletedAt !== undefined) {
      await prisma.task.updateMany({
        where: { parentId: id },
        data: { deletedAt: deletedAt ? new Date(deletedAt) : null },
      })
    }

    const task = await prisma.task.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(priority !== undefined && { priority }),
        ...(deadline !== undefined && {
          deadline: deadline ? new Date(deadline) : null,
        }),
        ...(statusId !== undefined && { statusId }),
        ...(order !== undefined && { order }),
        ...(deletedAt !== undefined && {
          deletedAt: deletedAt ? new Date(deletedAt) : null,
        }),
      },
      include: {
        status: true,
        project: true,
        labels: { include: { label: true } },
        tags: { include: { tag: true } },
        _count: { select: { subtasks: true, attachments: true } },
      },
    });

    return NextResponse.json(task);
  } catch (error) {
    console.error("PATCH /api/tasks/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update task" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.task.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/tasks/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 }
    );
  }
}
