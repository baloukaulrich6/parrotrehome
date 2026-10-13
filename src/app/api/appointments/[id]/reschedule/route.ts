import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerUser } from "@/lib/auth";
import { isAdminRole } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { sendEmail, buildAppointmentConfirmedEmail, generateVideoCallToken, buildVideoCallUrl } from "@/lib/email";
import { z } from "zod";

// ============================================================
// POST /api/appointments/[id]/reschedule
// F-20: Reschedule an appointment within policy.
// Two flows:
//  - CLIENT proposes a new slot → status stays REQUESTED/CONFIRMED,
//    proposedSlotStartUtc is set, agent sees the proposal.
//  - STAFF (agent/manager/super-admin) confirms the proposal →
//    slotStartUtc is updated, proposedSlotStartUtc cleared.
// ============================================================

const schema = z.object({
  action: z.enum(["propose", "confirm", "reject"]),
  proposedSlotStartUtc: z.string().optional(),
  reason: z.string().max(500).optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

    const { id } = await params;
    const appt = await db.appointment.findUnique({
      where: { id },
      include: {
        request: { select: { id: true, customerId: true, customerEmail: true, reference: true } },
        customer: { select: { id: true, name: true, email: true } },
        professional: { select: { id: true, name: true } },
      },
    });
    if (!appt) return NextResponse.json({ error: "Appointment not found" }, { status: 404 });

    if (user.role === "CLIENT") {
      const isOwner =
        appt.customerId === user.id ||
        appt.request.customerEmail.toLowerCase() === user.email.toLowerCase();
      if (!isOwner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    } else if (!isAdminRole(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (["COMPLETED", "CANCELED"].includes(appt.status)) {
      return NextResponse.json(
        { error: `Cannot reschedule a ${appt.status.toLowerCase()} appointment.` },
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

    if (parsed.data.action === "propose") {
      if (!parsed.data.proposedSlotStartUtc) {
        return NextResponse.json(
          { error: "proposedSlotStartUtc is required for propose action" },
          { status: 400 }
        );
      }
      const proposedDate = new Date(parsed.data.proposedSlotStartUtc);
      if (proposedDate.getTime() < Date.now()) {
        return NextResponse.json(
          { error: "Proposed slot must be in the future." },
          { status: 400 }
        );
      }
      const originalSlot = appt.originalSlotStartUtc ?? appt.slotStartUtc;
      await db.appointment.update({
        where: { id },
        data: {
          proposedSlotStartUtc: proposedDate,
          proposedBy: user.id,
          proposedAt: new Date(),
          rescheduleReason: parsed.data.reason ?? null,
          originalSlotStartUtc: originalSlot,
          status: "RESCHEDULED",
        },
      });
      await audit({
        actorId: user.id,
        actorRole: user.role,
        objectType: "Appointment",
        objectId: id,
        action: "UPDATE",
        changes: {
          action: "propose",
          from: appt.slotStartUtc.toISOString(),
          to: proposedDate.toISOString(),
          reason: parsed.data.reason,
        },
      });
      // If staff proposes, auto-confirm immediately
      if (isAdminRole(user.role)) {
        const token = generateVideoCallToken();
        const videoUrl = buildVideoCallUrl(token);
        await db.appointment.update({
          where: { id },
          data: {
            slotStartUtc: proposedDate,
            proposedSlotStartUtc: null,
            proposedBy: null,
            proposedAt: null,
            status: "CONFIRMED",
            videoCallToken: token,
            videoCallUrl: videoUrl,
            remindersSent: "[]",
          },
        });
        // Send confirmation email with video link (F-19)
        try {
          const emailPayload = buildAppointmentConfirmedEmail({
            reference: appt.request.reference,
            customerName: appt.customer?.name ?? appt.request.customerEmail,
            customerEmail: appt.request.customerEmail,
            professionalName: appt.professional.name,
            slotStartUtc: proposedDate,
            durationMinutes: appt.durationMinutes,
            subject: appt.subject ?? "Avian advice",
            priceUsd: Number(appt.priceUsd),
            videoCallUrl: videoUrl,
          });
          emailPayload.requestId = appt.request.id;
          await sendEmail(emailPayload);
        } catch (emailErr) {
          console.error("[reschedule] failed to send confirmation email:", emailErr);
        }
        await audit({
          actorId: user.id,
          actorRole: user.role,
          objectType: "Appointment",
          objectId: id,
          action: "UPDATE",
          changes: { action: "auto-confirm-by-staff", slot: proposedDate.toISOString(), videoLinkGenerated: true },
        });
      }
      return NextResponse.json({
        ok: true,
        status: isAdminRole(user.role) ? "CONFIRMED" : "RESCHEDULED",
      });
    }

    if (parsed.data.action === "confirm") {
      if (!isAdminRole(user.role)) {
        return NextResponse.json(
          { error: "Only staff can confirm a reschedule proposal." },
          { status: 403 }
        );
      }
      if (!appt.proposedSlotStartUtc) {
        return NextResponse.json(
          { error: "No pending proposal to confirm." },
          { status: 400 }
        );
      }
      const token = generateVideoCallToken();
      const videoUrl = buildVideoCallUrl(token);
      await db.appointment.update({
        where: { id },
        data: {
          slotStartUtc: appt.proposedSlotStartUtc,
          proposedSlotStartUtc: null,
          proposedBy: null,
          proposedAt: null,
          status: "CONFIRMED",
          videoCallToken: token,
          videoCallUrl: videoUrl,
          remindersSent: "[]",
        },
      });
      // Send confirmation email with video link (F-19)
      try {
        const emailPayload = buildAppointmentConfirmedEmail({
          reference: appt.request.reference,
          customerName: appt.customer?.name ?? appt.request.customerEmail,
          customerEmail: appt.request.customerEmail,
          professionalName: appt.professional.name,
          slotStartUtc: appt.proposedSlotStartUtc,
          durationMinutes: appt.durationMinutes,
          subject: appt.subject ?? "Avian advice",
          priceUsd: Number(appt.priceUsd),
          videoCallUrl: videoUrl,
        });
        emailPayload.requestId = appt.request.id;
        await sendEmail(emailPayload);
      } catch (emailErr) {
        console.error("[reschedule] failed to send confirmation email:", emailErr);
      }
      await audit({
        actorId: user.id,
        actorRole: user.role,
        objectType: "Appointment",
        objectId: id,
        action: "UPDATE",
        changes: { action: "confirm", slot: appt.proposedSlotStartUtc.toISOString(), videoLinkGenerated: true },
      });
      return NextResponse.json({ ok: true, status: "CONFIRMED" });
    }

    if (parsed.data.action === "reject") {
      if (!isAdminRole(user.role)) {
        return NextResponse.json(
          { error: "Only staff can reject a reschedule proposal." },
          { status: 403 }
        );
      }
      const revertTo = appt.originalSlotStartUtc ?? appt.slotStartUtc;
      await db.appointment.update({
        where: { id },
        data: {
          slotStartUtc: revertTo,
          proposedSlotStartUtc: null,
          proposedBy: null,
          proposedAt: null,
          rescheduleReason: parsed.data.reason ?? "Proposal rejected by staff",
          status: appt.status === "RESCHEDULED" ? "REQUESTED" : appt.status,
        },
      });
      await audit({
        actorId: user.id,
        actorRole: user.role,
        objectType: "Appointment",
        objectId: id,
        action: "UPDATE",
        changes: { action: "reject", reason: parsed.data.reason },
      });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("[reschedule] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}
