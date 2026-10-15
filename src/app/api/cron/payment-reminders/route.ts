import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { sendPaymentReminders, expireInstructions } from "@/lib/email";
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  const provided = req.headers.get("authorization") || "";
  const expected = `Bearer ${secret || ""}`;
  if (!secret || Buffer.byteLength(provided) !== Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(provided), Buffer.from(expected))) return new Response(null, { status: 401 });
  const expired = await expireInstructions();
  return NextResponse.json({ expired, ...await sendPaymentReminders() });
}
