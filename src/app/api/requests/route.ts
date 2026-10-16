import { publicContent } from "@/lib/public-content";
import { createHash } from "node:crypto";
import { requiredPurchasePolicies } from "@/lib/policy-content";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { sendEmail, buildRequestReceivedEmail, notifyOrderTeam } from "@/lib/email";
import { generateRequestReference } from "@/lib/constants";
import { checkRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const itemSchema = z.object({
  type: z.enum(["BIRD", "PRODUCT", "CONSULTATION"]),
  refId: z.string(),
  name: z.string(),
  qty: z.number().int().min(1),
  priceUsd: z.number(),
});

const schema = z.object({
  customerName: z.string().min(2),
  customerEmail: z.string().email(),
  customerPhone: z.string().optional(),
  paymentMethodId: z.string().min(1).optional(),
  shippingState: z.string().min(2),
  shippingAddress: z.string().optional(),
  experience: z.enum(["Beginner", "Intermediate", "Expert"]).optional(),
  habitat: z.string().optional(),
  preferences: z.string().optional(),
  consent: z.literal(true),
  items: z.array(itemSchema).min(1),
  // A-23: coupon ID only — server re-validates and computes discount
  couponId: z.string().optional(),
  // A-26: channel attribution
  channel: z.string().optional(),
  referrer: z.string().optional(),
  // SECURITY: discountUsd, finalTotalUsd, couponCode are NO LONGER accepted from client.
  // Server looks up coupon by ID and computes discount internally.
});

// ============================================================
// POST /api/requests
// Creates a new request with reference, audit trail, no-reply
// email, agent notification, and bird reservation (T-02:
// lock bird to this request so it cannot be assigned to
// another client simultaneously).
// ============================================================

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

    // Rate limit: 10 request submissions per hour per IP
    const rl = checkRateLimit(req, "REQUEST_SUBMIT");
    if (!rl.ok && rl.response) return rl.response;

    const activeMethods = await db.paymentMethod.findMany({ where: { active: true }, orderBy: { displayOrder: "asc" } });
    const selectedMethod = data.paymentMethodId ? activeMethods.find(method => method.id === data.paymentMethodId) : activeMethods.length === 1 ? activeMethods[0] : null;
    if (data.paymentMethodId && !selectedMethod) return NextResponse.json({ error: "This payment method is no longer available. Refresh and choose an active method." }, { status: 400 });

    // Validate served state
    const state = await db.servedState.findUnique({
      where: { code: data.shippingState },
    });
    if (!state) {
      return NextResponse.json(
        { error: `We do not currently serve state ${data.shippingState}.` },
        { status: 400 }
      );
    }

    // Validate that birds are available (T-02)
    const birdIds = data.items.filter((i) => i.type === "BIRD").map((i) => i.refId);
    if (birdIds.length > 0) {
      const birds = await db.bird.findMany({
        where: { id: { in: birdIds } },
      });
      for (const b of birds) {
        if (b.status !== "AVAILABLE") {
          return NextResponse.json(
            { error: `Bird ${b.commonName} (${b.individualId}) is no longer available.` },
            { status: 409 }
          );
        }
      }
    }

    // Generate a unique reference
    const lastReq = await db.request.findFirst({
      orderBy: { createdAt: "desc" },
    });
    const lastSeq = lastReq?.reference?.match(/REQ-(\d+)/);
    const nextSeq = lastSeq ? parseInt(lastSeq[1], 10) + 1 : 1026;
    const reference = generateRequestReference(nextSeq);

    // SECURITY FIX (Audit 5): NEVER trust client-provided prices.
    // Look up actual prices from the database for each item.
    const serverItems: { type: string; refId: string; name: string; qty: number; priceUsd: number; birdId?: string | null; productId?: string | null }[] = [];
    for (const item of data.items) {
      if (item.type === "BIRD") {
        const bird = await db.bird.findUnique({ where: { id: item.refId }, select: { priceUsd: true, commonName: true, status: true } });
        if (!bird) {
          return NextResponse.json({ error: `Bird not found for ID ${item.refId}` }, { status: 400 });
        }
        if (bird.status !== "AVAILABLE") {
          return NextResponse.json({ error: `Bird ${bird.commonName} is not available for request` }, { status: 409 });
        }
        serverItems.push({ type: "BIRD", refId: item.refId, name: bird.commonName, qty: item.qty, priceUsd: Number(bird.priceUsd ?? 0), birdId: item.refId });
      } else if (item.type === "PRODUCT") {
        const product = await db.product.findUnique({ where: { id: item.refId }, select: { priceUsd: true, name: true, stockQty: true, isActive: true } });
        if (!product) {
          return NextResponse.json({ error: `Product not found for ID ${item.refId}` }, { status: 400 });
        }
        if (!product.isActive) {
          return NextResponse.json({ error: `Product ${product.name} is no longer available` }, { status: 400 });
        }
        if (product.stockQty < item.qty) {
          return NextResponse.json({ error: `Insufficient stock for ${product.name} (requested ${item.qty}, available ${product.stockQty})` }, { status: 400 });
        }
        serverItems.push({ type: "PRODUCT", refId: item.refId, name: product.name, qty: item.qty, priceUsd: Number(product.priceUsd), productId: item.refId });
      } else if (item.type === "CONSULTATION") {
        // Consultations are priced at the standard $15/hour rate (Cahier p.05)
        serverItems.push({ type: "CONSULTATION", refId: item.refId, name: item.name, qty: item.qty, priceUsd: 15 });
      }
    }

    // SECURITY FIX: compute totalQuote from server-verified prices, not client-provided
    const totalQuote = serverItems.reduce((s, i) => s + i.priceUsd * i.qty, 0);
    const type = serverItems.some((i) => i.type === "BIRD")
      ? "PARROT_PURCHASE"
      : serverItems.some((i) => i.type === "CONSULTATION")
      ? "AVIAN_CONSULTATION"
      : "ACCESSORY_ORDER";

    // SECURITY FIX: re-validate coupon server-side if couponId is provided.
    // Never trust client-provided discountUsd or finalTotalUsd.
    let discountUsd = 0;
    let finalTotalUsd = totalQuote;
    let couponId: string | null = null;
    if (data.couponId) {
      const coupon = await db.coupon.findUnique({ where: { id: data.couponId } });
      if (coupon && coupon.active && (!coupon.validUntil || new Date(coupon.validUntil) > new Date()) && (!coupon.usageLimit || coupon.usedCount < coupon.usageLimit)) {
        if (!coupon.minSubtotalUsd || totalQuote >= coupon.minSubtotalUsd) {
          couponId = coupon.id;
          if (coupon.type === "PERCENTAGE") {
            discountUsd = Math.min((totalQuote * coupon.value) / 100, totalQuote);
          } else if (coupon.type === "FLAT_USD") {
            discountUsd = Math.min(coupon.value, totalQuote);
          } else if (coupon.type === "FREE_SHIPPING") {
            discountUsd = 0; // Free shipping doesn't reduce the subtotal, just the shipping
          }
          finalTotalUsd = totalQuote - discountUsd;
        }
      }
    }

    const policies = await Promise.all(requiredPurchasePolicies.map(async (slug) => {
      const page = await publicContent(slug);
      return { slug, version: page?.version ?? "unpublished", digest: page ? createHash("sha256").update(page.title + "\n" + page.body).digest("hex") : null };
    }));

    if (policies.some((policy) => !policy.digest)) return NextResponse.json({ error: "Purchase policies are temporarily unavailable. Please contact support before ordering." }, { status: 409 });

    // Create request + items in a transaction (T-02 bird lock)
    const request = await db.$transaction(async (tx) => {
      if (selectedMethod && !await tx.paymentMethod.findFirst({ where: { id: selectedMethod.id, active: true } })) throw new Error("The selected payment method was disabled. Please refresh.");
      const r = await tx.request.create({
        data: {
          reference,
          type,
          status: "RECEIVED",
          customerId: user?.id ?? null,
          selectedPaymentMethodId: selectedMethod?.id ?? null,
          customerName: data.customerName,
          customerEmail: data.customerEmail,
          customerPhone: data.customerPhone,
          shippingState: data.shippingState,
          shippingAddress: data.shippingAddress,
          experience: data.experience,
          habitat: data.habitat,
          preferences: data.preferences,
          consentAccepted: true,
          totalQuoteUsd: totalQuote,
          // A-23: coupon tracking (server-verified)
          couponId: couponId,
          discountUsd: discountUsd,
          finalTotalUsd: finalTotalUsd,
          // A-26: channel attribution (default "web" if not provided)
          channel: data.channel ?? "web",
          referrer: data.referrer ?? null,
          items: {
            create: serverItems.map((i) => ({
              birdId: i.birdId ?? null,
              productId: i.productId ?? null,
              quantity: i.qty,
              quotedPriceUsd: i.priceUsd, // server-verified price
            })),
          },
        },
        include: { items: true },
      });

      // Lock each bird to this request (T-02)
      for (const bid of birdIds) {
        await tx.bird.update({
          where: { id: bid },
          data: {
            status: "RESERVED",
            reservedByRequestId: r.id,
            reservedUntil: new Date(Date.now() + 1000 * 60 * 60 * 48),
          },
        });
      }

      // A-23: increment coupon usage count if a coupon was applied (server-verified)
      if (couponId) {
        await tx.coupon.update({
          where: { id: couponId },
          data: { usedCount: { increment: 1 } },
        });
      }

      return r;
    });

    // Audit CREATE
    await audit({
      actorId: user?.id,
      actorRole: user?.role ?? "GUEST",
      objectType: "Request",
      objectId: request.id,
      action: "CREATE",
      metadata: { reference, type, totalQuote, guest: !user, policyAcknowledgement: { policies } },
    });

    // Build & send no-reply email (F-22)
    const itemsSummary = serverItems
      .map((i) => `  - ${i.name} (${i.type.toLowerCase()}) × ${i.qty} — $${(i.priceUsd * i.qty).toFixed(2)}`)
      .join("\n");
    const nextSteps = [
      "An authorized agent reviews your request and assigns a dossier.",
      "Your agent emails the details for your selected payment method and the time until which they are valid.",
      "After your payment is manually verified, your request moves to fulfillment.",
    ];
    const emailPayload = buildRequestReceivedEmail({
      reference,
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      itemsSummary,
      totalQuote: finalTotalUsd ?? totalQuote,
      paymentMethodName: selectedMethod?.name,
      customerDetails: `Name: ${data.customerName}\nEmail: ${data.customerEmail}\nPhone: ${data.customerPhone || "Not provided"}\nAddress: ${data.shippingAddress || "Not provided"}\nState: ${data.shippingState}\nExperience: ${data.experience || "Not provided"}\nHabitat: ${data.habitat || "Not provided"}\nPreferences: ${data.preferences || "None"}`,
      nextSteps,
    });
    emailPayload.requestId = request.id;
    const delivery = await sendEmail(emailPayload);
    await notifyOrderTeam(request.id);

    // Agent notification (F-24): internal Message row indicating assignment is needed
    await db.message.create({
      data: {
        requestId: request.id,
        senderRole: "system",
        template: "agent-notification-new-request",
        channel: "IN_APP",
        toAddress: "agents@parrotrehome.com",
        fromAddress: "no-reply@parrotrehome.com",
        subject: `New request ${reference} awaiting assignment`,
        body: `New request ${reference} from ${data.customerName} (${data.customerEmail}). Type: ${type}. Total: $${totalQuote.toFixed(2)}. State: ${data.shippingState}. Please review and assign an agent.`,
        deliveryStatus: "SENT",
      },
    });

    return NextResponse.json({
      requestId: request.id,
      reference: request.reference,
      customerEmail: request.customerEmail,
      emailStatus: delivery.status,
    });
  } catch (err) {
    console.error("[requests] POST error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to submit request" },
      { status: 500 }
    );
  }
}
