import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const body = await request.json();
    const { name, color, order, isDone } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Status name is required" },
        { status: 400 }
      );
    }

    const status = await prisma.status.create({
      data: {
        name,
        color: color ?? "#6366f1",
        order: order ?? 0,
        isDone: isDone ?? false,
        projectId,
      },
    });

    return NextResponse.json(status, { status: 201 });
  } catch (error) {
    console.error("POST /api/projects/[id]/statuses error:", error);
    return NextResponse.json(
      { error: "Failed to create status" },
      { status: 500 }
    );
  }
}
