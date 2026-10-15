export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/payment-methods?context=active|states
// Returns active payment methods (F-23) or served states for forms

export async function GET(req: Request) {
  const url = new URL(req.url);
  const context = url.searchParams.get("context");

  if (context === "states") {
    const states = await db.servedState.findMany({
      where: { allowsBirdDelivery: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({
      states: states.map((s) => ({ code: s.code, name: s.name })),
    });
  }

  // default: active payment methods
  const methods = await db.paymentMethod.findMany({
    where: { active: true },
    orderBy: { displayOrder: "asc" },
    select: {
      id: true,
      name: true,
      officialProvider: true,
    },
  });
  return NextResponse.json({ methods });
}
