import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;
    const body = await request.json();
    const { labelId } = body;

    if (!labelId) {
      return NextResponse.json(
        { error: "labelId is required" },
        { status: 400 }
      );
    }

    const taskLabel = await prisma.taskLabel.upsert({
      where: { taskId_labelId: { taskId, labelId } },
      create: { taskId, labelId },
      update: {},
      include: { label: true },
    });

    return NextResponse.json(taskLabel, { status: 201 });
  } catch (error) {
    console.error("POST /api/tasks/[id]/labels error:", error);
    return NextResponse.json(
      { error: "Failed to add label to task" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;
    const body = await request.json();
    const { labelId } = body;

    if (!labelId) {
      return NextResponse.json(
        { error: "labelId is required" },
        { status: 400 }
      );
    }

    await prisma.taskLabel.delete({
      where: { taskId_labelId: { taskId, labelId } },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/tasks/[id]/labels error:", error);
    return NextResponse.json(
      { error: "Failed to remove label from task" },
      { status: 500 }
    );
  }
}
