import { sendRequestNotification } from "@/lib/email";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerUser } from "@/lib/auth";
import { isAdminRole } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { z } from "zod";

// ============================================================
// GET /api/requests/[id]/messages
// Returns the chat thread for a dossier.
// T-05: server-side ownership check.
// ============================================================

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

    const { id } = await params;
    const request = await db.request.findUnique({
      where: { id },
      select: { customerId: true, customerEmail: true, agentId: true },
    });
    if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // T-05: ownership / authorization
    if (user.role === "CLIENT") {
      const isOwner =
        request.customerId === user.id ||
        request.customerEmail.toLowerCase() === user.email.toLowerCase();
      if (!isOwner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    } else if (!isAdminRole(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const messages = await db.chatMessage.findMany({
      where: { requestId: id },
      orderBy: { createdAt: "asc" },
      include: {
        sender: { select: { name: true, role: true } },
      },
    });

    // If staff, mark thread as read
    if (isAdminRole(user.role)) {
      await db.chatMessage.updateMany({
        where: { requestId: id, readAt: null, senderRole: "CLIENT" },
        data: { readAt: new Date() },
      });
    }

    return NextResponse.json({
      messages: messages.map((m) => ({
        id: m.id,
        senderId: m.senderId,
        senderRole: m.senderRole,
        senderName: m.senderName,
        senderDisplayName: m.sender?.name ?? m.senderName,
        body: m.body,
        attachments: m.attachments,
        createdAt: m.createdAt.toISOString(),
        readAt: m.readAt?.toISOString() ?? null,
      })),
    });
  } catch (err) {
    console.error("[messages] GET error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// ============================================================
// POST /api/requests/[id]/messages
// Posts a new message in the dossier thread.
// Customers and authorized staff can post.
// ============================================================

const schema = z.object({
  body: z.string().min(2, "Message too short").max(2000, "Message too long"),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

    const { id } = await params;
    const request = await db.request.findUnique({
      where: { id },
      select: { customerId: true, customerEmail: true, agentId: true, status: true },
    });
    if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Authorization: client (owner) OR staff (with proper role)
    if (user.role === "CLIENT") {
      const isOwner =
        request.customerId === user.id ||
        request.customerEmail.toLowerCase() === user.email.toLowerCase();
      if (!isOwner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    } else if (!isAdminRole(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Don't allow posting to closed/canceled requests
    if (["CANCELED", "REJECTED", "COMPLETED"].includes(request.status)) {
      return NextResponse.json(
        { error: `Cannot post messages on a ${request.status.toLowerCase()} request.` },
        { status: 400 }
      );
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid" },
        { status: 400 }
      );
    }

    const senderName = user.name ?? user.email;
    const message = await db.chatMessage.create({
      data: {
        requestId: id,
        senderId: user.id,
        senderRole: user.role,
        senderName,
        body: parsed.data.body,
      },
    });

    await audit({
      actorId: user.id,
      actorRole: user.role,
      objectType: "ChatMessage",
      objectId: message.id,
      action: "CREATE",
      metadata: { requestId: id, bodyLength: parsed.data.body.length },
    });

    if (user.role !== "CLIENT") await sendRequestNotification(id, "agent-reply", parsed.data.body, message.id);

    return NextResponse.json({
      id: message.id,
      createdAt: message.createdAt.toISOString(),
    });
  } catch (err) {
    console.error("[messages] POST error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
