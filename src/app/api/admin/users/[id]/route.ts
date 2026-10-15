import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerUser } from "@/lib/auth";
import { accountUpdateSchema, canManageAccount } from "@/lib/user-management";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: "Sign in with MFA required." }, { status: 401 });
  if (user.role !== "SUPER_ADMIN" && user.role !== "MANAGER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (req.headers.get("origin") !== new URL(process.env.NEXTAUTH_URL || req.url).origin) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const parsed = accountUpdateSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid account details." }, { status: 400 });
  const { id } = await params;
  const data = parsed.data;
  try {
    const result = await db.$transaction(async (tx) => {
      const account = await tx.user.findUnique({ where: { id } });
      if (!account) return { error: "Account not found.", status: 404 };
      if (!canManageAccount(user.role, account.role, data.role)) return { error: "Managers may update agents only.", status: 403 };
      if (id === user.id && (data.status !== "ACTIVE" || data.role !== user.role)) return { error: "You cannot suspend or change your own role.", status: 400 };
      if (account.role === "SUPER_ADMIN" && account.status === "ACTIVE" && (data.role !== "SUPER_ADMIN" || data.status !== "ACTIVE")) {
        if (await tx.user.count({ where: { role: "SUPER_ADMIN", status: "ACTIVE" } }) <= 1) return { error: "The last active super administrator must be preserved.", status: 400 };
      }
      const updated = await tx.user.update({ where: { id }, data, select: { id: true, name: true, email: true, role: true, status: true } });
      await tx.auditLog.create({ data: { actorId: user.id, actorRole: user.role, objectType: "User", objectId: id, action: "UPDATE", changes: JSON.stringify({ event: "ACCOUNT_UPDATED", before: { role: account.role, status: account.status, name: account.name }, after: data }) } });
      return { user: updated, status: 200 };
    });
    return NextResponse.json(result, { status: result.status });
  } catch { return NextResponse.json({ error: "Account update failed." }, { status: 500 }); }
}
