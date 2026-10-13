import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { sendEmail, buildAppointmentReminderEmail } from "@/lib/email";

// POST /api/admin/appointments/send-reminders
// F-19: Pre-appointment reminders.
// Checks all CONFIRMED appointments with video link, sends:
//  - 24h reminder if slot is within 24h and 24h reminder not sent
//  - 1h reminder if slot is within 1h and 1h reminder not sent
// Returns: { sent24h: number, sent1h: number, total: number }

export async function POST() {
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!can(user.role, "appointments:manage")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const now = new Date();
    const within24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const within1h = new Date(now.getTime() + 60 * 60 * 1000);

    // All confirmed appointments with video link in the next 24h
    const upcoming = await db.appointment.findMany({
      where: {
        status: "CONFIRMED",
        slotStartUtc: { gt: now, lt: within24h },
        videoCallToken: { not: null },
      },
      include: {
        request: { select: { id: true, reference: true, customerEmail: true } },
        customer: { select: { name: true } },
        professional: { select: { name: true } },
      },
    });

    let sent24h = 0;
    let sent1h = 0;

    for (const appt of upcoming) {
      let reminders: { "24h"?: string; "1h"?: string } = {};
      try {
        reminders = JSON.parse(appt.remindersSent ?? "{}");
      } catch {
        reminders = {};
      }

      const slot = appt.slotStartUtc;
      const in1hWindow = slot < within1h;

      // Send 24h reminder if not yet sent
      if (!reminders["24h"]) {
        try {
          const emailPayload = buildAppointmentReminderEmail({
            reference: appt.request.reference,
            customerName: appt.customer?.name ?? appt.request.customerEmail,
            customerEmail: appt.request.customerEmail,
            professionalName: appt.professional.name,
            slotStartUtc: slot,
            durationMinutes: appt.durationMinutes,
            subject: appt.subject ?? "Avian advice",
            videoCallUrl: appt.videoCallUrl!,
            whenLabel: "24 hours",
          });
          emailPayload.requestId = appt.request.id;
          await sendEmail(emailPayload);
          reminders["24h"] = new Date().toISOString();
          sent24h++;
        } catch (emailErr) {
          console.error(`[reminders] 24h email failed for ${appt.id}:`, emailErr);
        }
      }

      // Send 1h reminder if in 1h window and not yet sent
      if (in1hWindow && !reminders["1h"]) {
        try {
          const emailPayload = buildAppointmentReminderEmail({
            reference: appt.request.reference,
            customerName: appt.customer?.name ?? appt.request.customerEmail,
            customerEmail: appt.request.customerEmail,
            professionalName: appt.professional.name,
            slotStartUtc: slot,
            durationMinutes: appt.durationMinutes,
            subject: appt.subject ?? "Avian advice",
            videoCallUrl: appt.videoCallUrl!,
            whenLabel: "1 hour",
          });
          emailPayload.requestId = appt.request.id;
          await sendEmail(emailPayload);
          reminders["1h"] = new Date().toISOString();
          sent1h++;
        } catch (emailErr) {
          console.error(`[reminders] 1h email failed for ${appt.id}:`, emailErr);
        }
      }

      // Persist remindersSent
      if (reminders["24h"] || reminders["1h"]) {
        await db.appointment.update({
          where: { id: appt.id },
          data: { remindersSent: JSON.stringify(reminders) },
        });
      }
    }

    await audit({
      actorId: user.id,
      actorRole: user.role,
      objectType: "Appointment",
      objectId: "send-reminders",
      action: "UPDATE",
      changes: { sent24h, sent1h, total: upcoming.length },
    });

    return NextResponse.json({
      ok: true,
      sent24h,
      sent1h,
      total: upcoming.length,
    });
  } catch (err) {
    console.error("[send-reminders] error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
