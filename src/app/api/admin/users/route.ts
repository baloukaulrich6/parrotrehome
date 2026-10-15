import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerUser, hashPassword } from "@/lib/auth";
import { accountSchema, canManageAccount } from "@/lib/user-management";

export async function POST(req: Request) {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (user.role !== "SUPER_ADMIN" && user.role !== "MANAGER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (req.headers.get("origin") !== new URL(process.env.NEXTAUTH_URL || req.url).origin) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const parsed = accountSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid account" }, { status: 400 });
  const { password, ...data } = parsed.data;
  if (!canManageAccount(user.role, data.role, data.role)) return NextResponse.json({ error: "Managers may create agents only." }, { status: 403 });
  try {
    const passwordHash = await hashPassword(password);
    const created = await db.$transaction(async (tx) => {
      const account = await tx.user.create({ data: { ...data, passwordHash, status: "ACTIVE", emailVerifiedAt: new Date() }, select: { id: true, name: true, email: true, role: true, status: true } });
      if (data.role === "CLIENT") await tx.request.updateMany({ where: { customerId: null, customerEmail: data.email }, data: { customerId: account.id } });
      await tx.auditLog.create({ data: { actorId: user.id, actorRole: user.role, objectType: "User", objectId: account.id, action: "CREATE", changes: JSON.stringify({ event: "ACCOUNT_CREATED", email: data.email, role: data.role }) } });
      return account;
    });
    return NextResponse.json({ user: created }, { status: 201 });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    return NextResponse.json({ error: "Account creation failed." }, { status: 500 });
  }
}
