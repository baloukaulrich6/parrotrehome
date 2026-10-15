import { NextResponse } from "next/server";
import { getServerUser } from "@/lib/auth";
import { siteSettingsSchema } from "@/lib/site-settings-schema";
import { saveSiteSettings } from "@/lib/site-settings";
import { audit } from "@/lib/audit";
export async function PUT(req: Request) {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (req.headers.get("origin") !== new URL(process.env.NEXTAUTH_URL || req.url).origin) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const parsed = siteSettingsSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid settings" }, { status: 400 });
  saveSiteSettings(parsed.data);
  await audit({ actorId: user.id, actorRole: user.role, objectType: "SiteSettings", objectId: "site", action: "UPDATE", metadata: { fields: Object.keys(parsed.data) } });
  return NextResponse.json({ ok: true });
}
