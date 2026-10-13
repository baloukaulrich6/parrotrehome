import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  message: z.string().min(10).max(2000),
});

export async function POST(req: Request) {
  try {
    // Rate limit: 5 per hour per IP (prevents spam)
    const rl = checkRateLimit(req, "CONTACT");
    if (!rl.ok && rl.response) return rl.response;

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid" },
        { status: 400 }
      );
    }
    const { name, email, message } = parsed.data;
    console.log(`[contact] From ${name} <${email}>: ${message}`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}
