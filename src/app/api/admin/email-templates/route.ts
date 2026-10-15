import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { emailVariables, saveEmailTemplate } from "@/lib/email-templates";
import { audit } from "@/lib/audit";

const schema = z.object({
  name: z.enum(["request-received", "instructions-ready", "payment-reminder", "payment-reference-received", "payment-verified", "agent-reply"]),
  subject: z.string().min(3).max(200).regex(/^[^\r\n]+$/),
  body: z.string().trim().min(1).max(10000),
});

export async function PUT(req: Request) {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(user.role, "payment:configure")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (req.headers.get("origin") !== new URL(process.env.NEXTAUTH_URL || req.url).origin) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid subject and message." }, { status: 400 });
  const { name, subject, body } = parsed.data;
  const variables = [...`${subject}\n${body}`.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]);
  if (variables.some((v) => !emailVariables.includes(v))) return NextResponse.json({ error: "Unknown template variable." }, { status: 400 });
  if ((name === "instructions-ready" || name === "payment-reminder") && ["secureLink", "expiry", "reference"].some((v) => !body.includes(`{{${v}}}`))) {
    return NextResponse.json({ error: "Payment emails must include {{secureLink}}, {{expiry}} and {{reference}}." }, { status: 400 });
  }
  saveEmailTemplate(name, { subject, body });
  await audit({ actorId: user.id, actorRole: user.role, objectType: "EmailTemplate", objectId: name, action: "UPDATE" });
  return NextResponse.json({ ok: true });
}
