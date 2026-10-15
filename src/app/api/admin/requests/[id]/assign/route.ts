import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerUser } from "@/lib/auth";
import { can, requireStaff } from "@/lib/rbac";
import { auditLog } from "@/lib/audit";
import { canTransition } from "@/lib/constants";
import { z } from "zod";

// POST /api/admin/requests/[id]/assign
// A-04: Assign or transfer dossier to an agent.
// Transitions: RECEIVED → PENDING_REVIEW (on first assign)
//              PENDING_REVIEW stays in PENDING_REVIEW (on transfer)

const schema = z.object({
  agentId: z.string().min(1),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await requireStaff(user.role);
    if (!can(user.role, "request:assign")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const request = await db.request.findUnique({ where: { id } });
    if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const targetAgent = await db.user.findUnique({ where: { id: parsed.data.agentId } });
    if (!targetAgent || !["AGENT", "MANAGER", "SUPER_ADMIN"].includes(targetAgent.role)) {
      return NextResponse.json({ error: "Invalid agent" }, { status: 400 });
    }

    const previousAgentId = request.agentId;
    const newStatus = request.selectedPaymentMethodId ? "AWAITING_INSTRUCTIONS" : "PENDING_REVIEW";

    if (request.status === "RECEIVED") {
      if (!canTransition("RECEIVED", newStatus)) {
        return NextResponse.json({ error: "Invalid transition" }, { status: 400 });
      }
      await db.request.update({
        where: { id },
        data: { agentId: parsed.data.agentId, status: newStatus, assignedAt: new Date() },
      });
    } else if (["PENDING_REVIEW", "AWAITING_INSTRUCTIONS"].includes(request.status)) {
      await db.request.update({
        where: { id },
        data: { agentId: parsed.data.agentId },
      });
    } else {
      return NextResponse.json(
        { error: `Cannot assign in status ${request.status}` },
        { status: 400 }
      );
    }

    await auditLog.requestAssign(
      user.id,
      user.role,
      id,
      parsed.data.agentId,
      previousAgentId ?? undefined
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[assign] error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
