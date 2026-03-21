import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const labels = await prisma.label.findMany({
      orderBy: { name: "asc" },
    });

    return NextResponse.json(labels);
  } catch (error) {
    console.error("GET /api/labels error:", error);
    return NextResponse.json(
      { error: "Failed to fetch labels" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, color } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Label name is required" },
        { status: 400 }
      );
    }

    const label = await prisma.label.create({
      data: {
        name,
        color: color ?? "#6366f1",
      },
    });

    return NextResponse.json(label, { status: 201 });
  } catch (error) {
    console.error("POST /api/labels error:", error);
    return NextResponse.json(
      { error: "Failed to create label" },
      { status: 500 }
    );
  }
}
