import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Auto-clean tasks older than 30 days
    await prisma.task.deleteMany({
      where: { projectId, deletedAt: { lt: thirtyDaysAgo, not: null } },
    });

    const tasks = await prisma.task.findMany({
      where: { projectId, deletedAt: { not: null }, parentId: null },
      include: {
        status: true,
        labels: { include: { label: true } },
        _count: { select: { subtasks: true, attachments: true } },
      },
      orderBy: { deletedAt: 'desc' },
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("GET /api/projects/[id]/trash error:", error);
    return NextResponse.json({ error: "Failed to fetch trash" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    await prisma.task.deleteMany({
      where: { projectId, deletedAt: { not: null } },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/projects/[id]/trash error:", error);
    return NextResponse.json({ error: "Failed to empty trash" }, { status: 500 });
  }
}
