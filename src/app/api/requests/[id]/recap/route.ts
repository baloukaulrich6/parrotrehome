import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerUser } from "@/lib/auth";
import { formatUsd, formatDateUTC, REQUEST_STATUS_META } from "@/lib/constants";
import PDFDocument from "pdfkit";
import { Readable } from "stream";

// GET /api/requests/[id]/recap
// F-29: Téléchargement récapitulatif — customer downloads a PDF summary
// of their request. T-05: server-side ownership check.

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }

    const { id } = await params;
    const request = await db.request.findUnique({
      where: { id },
      include: {
        items: { include: { bird: true, product: true } },
        appointments: { include: { professional: true } },
        paymentChecks: { include: { verifier: true } },
        paymentInstructions: { orderBy: { createdAt: "desc" } },
        selectedPaymentMethod: true,
        agent: true,
      },
    });

    if (!request) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // T-05: clients can only download their own recap (matched by customerId OR customerEmail)
    if (user.role === "CLIENT") {
      const isOwner =
        request.customerId === user.id ||
        request.customerEmail.toLowerCase() === user.email.toLowerCase();
      if (!isOwner) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Build PDF
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks: Buffer[] = [];
    const stream = Readable.from(doc);
    stream.on("data", (chunk: Buffer) => chunks.push(chunk));

    // ── Header ──
    doc
      .fillColor("#424B50")
      .font("Helvetica-Bold")
      .fontSize(22)
      .text("ParrotRehome", { continued: true })
      .fillColor("#D54149")
      .text("", { continued: false })
      .moveDown(0.2)
      .fillColor("#89959A")
      .fontSize(9)
      .font("Helvetica")
      .text("BIRDS · SUPPLIES · AVIAN CARE", { continued: false })
      .moveDown(0.3)
      .fillColor("#424B50")
      .fontSize(14)
      .font("Helvetica-Bold")
      .text("Request Recap")
      .moveDown(0.5);

    // ── Reference block ──
    const meta = REQUEST_STATUS_META[request.status];
    doc
      .font("Helvetica-Bold")
      .fontSize(11)
      .fillColor("#424B50")
      .text(`Reference: ${request.reference}`)
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#89959A")
      .text(`Status: ${meta.label} — ${meta.description}`)
      .text(`Type: ${request.type.replace(/_/g, " ").toLowerCase()}`)
      .text(`Created: ${formatDateUTC(request.createdAt)}`)
      .moveDown(0.5);

    // ── Customer info ──
    doc
      .font("Helvetica-Bold")
      .fontSize(11)
      .fillColor("#424B50")
      .text("Customer")
      .moveDown(0.1)
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#424B50")
      .text(`Name: ${request.customerName}`)
      .text(`Email: ${request.customerEmail}`)
      .text(`Phone: ${request.customerPhone ?? "—"}`)
      .text(`Shipping state: ${request.shippingState}${request.shippingAddress ? ` — ${request.shippingAddress}` : ""}`)
      .moveDown(0.5);

    // ── Items table ──
    doc
      .font("Helvetica-Bold")
      .fontSize(11)
      .fillColor("#424B50")
      .text(`Items (${request.items.length})`)
      .moveDown(0.1);

    let y = doc.y;
    doc
      .fillColor("#F7F6F1")
      .rect(50, y, 495, 18)
      .fill()
      .fillColor("#424B50")
      .font("Helvetica-Bold")
      .fontSize(9)
      .text("Item", 55, y + 5, { width: 295 })
      .text("Qty", 360, y + 5, { width: 30, align: "right" })
      .text("Unit price", 400, y + 5, { width: 70, align: "right" })
      .text("Subtotal", 470, y + 5, { width: 70, align: "right" });
    y += 22;
    doc.fillColor("#424B50").font("Helvetica").fontSize(9);

    for (const item of request.items) {
      const name = item.bird?.commonName ?? item.product?.name ?? "Item";
      const price = Number(item.quotedPriceUsd);
      const subtotal = price * item.quantity;
      doc.text(name, 55, y, { width: 295 });
      doc.text(String(item.quantity), 360, y, { width: 30, align: "right" });
      doc.text(formatUsd(price), 400, y, { width: 70, align: "right" });
      doc.text(formatUsd(subtotal), 470, y, { width: 70, align: "right" });
      if (item.bird?.individualId) {
        doc.fontSize(8).fillColor("#89959A").text(`ID: ${item.bird.individualId}`, 55, y + 11, { width: 295 });
        doc.fillColor("#424B50").fontSize(9);
      }
      y += 22;
    }
    doc.y = y + 5;

    // ── Total ──
    if (request.totalQuoteUsd != null) {
      doc
        .moveDown(0.3)
        .font("Helvetica-Bold")
        .fontSize(11)
        .fillColor("#424B50")
        .text(`Estimated total: `, { continued: true })
        .fillColor("#D54149")
        .text(formatUsd(Number(request.totalQuoteUsd)))
        .moveDown(0.5);
    }

    // ── Appointment ──
    if (request.appointments.length > 0) {
      doc
        .font("Helvetica-Bold")
        .fontSize(11)
        .fillColor("#424B50")
        .text("Consultation")
        .moveDown(0.1);
      for (const a of request.appointments) {
        doc
          .font("Helvetica")
          .fontSize(9)
          .text(`Professional: ${a.professional.name}`)
          .text(`Slot (UTC): ${formatDateUTC(a.slotStartUtc)}`)
          .text(`Duration: ${a.durationMinutes} minutes`)
          .text(`Subject: ${a.subject}`)
          .text(`Price: ${formatUsd(Number(a.priceUsd))}`)
          .moveDown(0.3);
      }
    }

    // ── Payment method + checks ──
    if (request.selectedPaymentMethod) {
      doc
        .font("Helvetica-Bold")
        .fontSize(11)
        .fillColor("#424B50")
        .text("Payment")
        .moveDown(0.1)
        .font("Helvetica")
        .fontSize(9)
        .text(`Method: ${request.selectedPaymentMethod.name}`)
        .text(`Provider: ${request.selectedPaymentMethod.officialProvider}`);
      if (request.paymentReference) {
        doc.text(`Reference deposited: ${request.paymentReference}`);
      }
      doc.moveDown(0.3);
    }

    if (request.paymentChecks.length > 0) {
      doc
        .fillColor("#47745B")
        .font("Helvetica-Bold")
        .fontSize(9)
        .text("✓ Payment verified by authorized agent");
      for (const c of request.paymentChecks) {
        doc
          .fillColor("#424B50")
          .font("Helvetica")
          .fontSize(9)
          .text(`  Verified by: ${c.verifier?.name ?? "—"}`)
          .text(`  Verified at: ${formatDateUTC(c.verifiedAt)}`)
          .text(`  Amount: ${formatUsd(Number(c.amount))}`);
      }
      doc.moveDown(0.3);
    }

    // ── Agent ──
    if (request.agent) {
      doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .fillColor("#424B50")
        .text(`Assigned agent: ${request.agent.name}`)
        .moveDown(0.3);
    }

    // ── Footer ──
    doc
      .moveDown(1)
      .fillColor("#89959A")
      .font("Helvetica")
      .fontSize(8)
      .text(
        "This document is a recap of your request. Payment was verified through the authorized provider — no card details were collected on-site. For questions, contact our team via your My Requests page.",
        { align: "left", width: 495 }
      )
      .moveDown(0.3)
      .text(`Generated: ${formatDateUTC(new Date())} · ParrotRehome recap · ${request.reference}`);

    doc.end();

    // Wait for the stream to finish
    const pdfBuffer = await new Promise<Buffer>((resolve) => {
      stream.on("end", () => resolve(Buffer.concat(chunks)));
    });

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="parrotrehome-${request.reference}.pdf"`,
        "Content-Length": String(pdfBuffer.length),
      },
    });
  } catch (err) {
    console.error("[recap] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}
