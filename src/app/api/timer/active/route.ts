import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const activeTimelog = await prisma.timeLog.findFirst({
      where: { endTime: null },
      include: {
        task: {
          select: { id: true, title: true, projectId: true },
        },
      },
    });

    if (!activeTimelog) {
      return NextResponse.json(null);
    }

    return NextResponse.json(activeTimelog);
  } catch (error) {
    console.error("GET /api/timer/active error:", error);
    return NextResponse.json(
      { error: "Failed to fetch active timer" },
      { status: 500 }
    );
  }
}
