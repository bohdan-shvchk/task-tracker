import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const task = await prisma.task.findUnique({
      where: { id },
      include: { status: true },
    });
    if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const statuses = await prisma.status.findMany({
      where: { projectId: task.projectId },
      orderBy: { order: "asc" },
    });

    const newStatus = task.status.isDone
      ? statuses.find((s) => !s.isDone)
      : statuses.find((s) => s.isDone);

    if (!newStatus) return NextResponse.json(task);

    const updated = await prisma.task.update({
      where: { id },
      data: { statusId: newStatus.id },
      include: { status: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("POST /api/tasks/[id]/toggle-done error:", error);
    return NextResponse.json({ error: "Failed to toggle" }, { status: 500 });
  }
}
