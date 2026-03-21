import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { startTime, endTime, duration } = body;

    const timeLog = await prisma.timeLog.update({
      where: { id },
      data: {
        ...(startTime !== undefined && { startTime: new Date(startTime) }),
        ...(endTime !== undefined && {
          endTime: endTime ? new Date(endTime) : null,
        }),
        ...(duration !== undefined && { duration }),
      },
    });

    return NextResponse.json(timeLog);
  } catch (error) {
    console.error("PATCH /api/timelogs/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update time log" },
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

    await prisma.timeLog.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/timelogs/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete time log" },
      { status: 500 }
    );
  }
}
