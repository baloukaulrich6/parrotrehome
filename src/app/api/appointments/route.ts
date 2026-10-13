import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { sendEmail, buildAppointmentReceivedEmail } from "@/lib/email";
import { AVIAN_ADVICE_PRICE_PER_HOUR, generateRequestReference } from "@/lib/constants";
import { checkRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const schema = z.object({
  preferredDate: z.string().min(1),
  preferredTime: z.string().min(1),
  timezone: z.string(),
  durationMinutes: z.number().int().min(30).max(180),
  subject: z.string(),
  customerName: z.string().min(2),
  customerEmail: z.string().email(),
  customerPhone: z.string().optional(),
  species: z.string().min(2),
  ageYears: z.string().optional(),
  symptoms: z.string().optional(),
  history: z.string().optional(),
  notes: z.string().optional(),
});

// POST /api/appointments
// Creates an avian consultation request (F-15, F-16, F-17)

export async function POST(req: Request) {
  try {
    const user = await getServerUser();
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }
    const data = parsed.data;

    // Rate limit: 5 appointments per hour per IP
    const rl = checkRateLimit(req, "APPOINTMENT");
    if (!rl.ok && rl.response) return rl.response;

    // Get the avian professional
    const professional = await db.user.findFirst({
      where: { role: "AVIAN_PROFESSIONAL", status: "ACTIVE" },
    });
    if (!professional) {
      return NextResponse.json(
        { error: "No avian professional is currently available." },
        { status: 503 }
      );
    }

    // Compose slot UTC from date+time+timezone
    const dateStr = `${data.preferredDate}T${data.preferredTime}:00`;
    const localDate = new Date(dateStr);
    // Apply timezone offset (PT=-8, MT=-7, CT=-6, ET=-5)
    const tzMatch = data.timezone.match(/UTC([+-]\d+)/);
    const tzOffset = tzMatch ? parseInt(tzMatch[1], 10) : -5;
    const slotStartUtc = new Date(localDate.getTime() - tzOffset * 60 * 60 * 1000);

    if (slotStartUtc.getTime() < Date.now()) {
      return NextResponse.json(
        { error: "Please choose a future date and time." },
        { status: 400 }
      );
    }

    // Generate reference
    const lastReq = await db.request.findFirst({
      orderBy: { createdAt: "desc" },
    });
    const lastSeq = lastReq?.reference?.match(/REQ-(\d+)/);
    const nextSeq = lastSeq ? parseInt(lastSeq[1], 10) + 1 : 1027;
    const reference = generateRequestReference(nextSeq);

    const priceUsd = (data.durationMinutes / 60) * AVIAN_ADVICE_PRICE_PER_HOUR;

    // Create request + appointment + audit
    const request = await db.$transaction(async (tx) => {
      const r = await tx.request.create({
        data: {
          reference,
          type: "AVIAN_CONSULTATION",
          status: "RECEIVED",
          customerId: user?.id ?? null,  // nullable — guest appointment (F-08)
          customerName: data.customerName,
          customerEmail: data.customerEmail,
          customerPhone: data.customerPhone,
          shippingState: "—",
          consentAccepted: true,
          totalQuoteUsd: priceUsd,
        },
      });

      await tx.appointment.create({
        data: {
          requestId: r.id,
          customerId: user?.id ?? null,
          professionalId: professional.id,
          slotStartUtc,
          durationMinutes: data.durationMinutes,
          status: "REQUESTED",
          subject: data.subject,
          animalInfo: JSON.stringify({
            species: data.species,
            age: data.ageYears,
            symptoms: data.symptoms,
            history: data.history,
            notes: data.notes,
          }),
          priceUsd,
        },
      });

      return r;
    });

    await audit({
      actorId: user?.id,
      actorRole: user?.role ?? "GUEST",
      objectType: "Request",
      objectId: request.id,
      action: "CREATE",
      metadata: { reference, type: "AVIAN_CONSULTATION", slot: slotStartUtc.toISOString(), guest: !user },
    });

    // Build & send no-reply email (F-17)
    const emailPayload = buildAppointmentReceivedEmail({
      reference,
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      professionalName: professional.name ?? "Avian professional",
      slotStartUtc,
      durationMinutes: data.durationMinutes,
      subject: data.subject,
      priceUsd,
    });
    emailPayload.requestId = request.id;
    await sendEmail(emailPayload);

    return NextResponse.json({
      requestId: request.id,
      reference: request.reference,
    });
  } catch (err) {
    console.error("[appointments] POST error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to submit" },
      { status: 500 }
    );
  }
}
