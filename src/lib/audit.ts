import { db } from "@/lib/db";
import type { Role } from "@prisma/client";
import type { AuditAction } from "@prisma/client";

// ============================================================
// ParrotRehome — Audit log writer (A-11, immutable)
// Cahier p.07: every status transition, send, modification
// must be timestamped and stored in the immutable history.
// ============================================================

export interface AuditContext {
  actorId?: string;
  actorRole: string;
  objectType: string;
  objectId: string;
  action: AuditAction;
  changes?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export async function audit(ctx: AuditContext): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        actorId: ctx.actorId ?? null,
        actorRole: ctx.actorRole,
        objectType: ctx.objectType,
        objectId: ctx.objectId,
        action: ctx.action,
        changes: ctx.changes ? JSON.stringify(ctx.changes) : null,
        metadata: ctx.metadata ? JSON.stringify(ctx.metadata) : null,
        timestamp: new Date(),
      },
    });
  } catch (err) {
    // Audit failure must never block the business operation, but must be visible
    console.error("[audit] FAILED to write audit log:", err, ctx);
  }
}

// Convenience helpers
export const auditLog = {
  requestStatusChange: (
    actorId: string,
    actorRole: Role,
    requestId: string,
    from: string,
    to: string,
    extra?: Record<string, unknown>
  ) =>
    audit({
      actorId,
      actorRole,
      objectType: "Request",
      objectId: requestId,
      action: "STATUS_CHANGE",
      changes: { from, to, ...extra },
    }),

  requestAssign: (
    actorId: string,
    actorRole: Role,
    requestId: string,
    newAgentId: string,
    previousAgentId?: string
  ) =>
    audit({
      actorId,
      actorRole,
      objectType: "Request",
      objectId: requestId,
      action: previousAgentId ? "TRANSFER" : "ASSIGN",
      changes: { previousAgentId, newAgentId },
    }),

  paymentVerify: (
    actorId: string,
    actorRole: Role,
    requestId: string,
    reference: string | null,
    amount: number
  ) =>
    audit({
      actorId,
      actorRole,
      objectType: "Request",
      objectId: requestId,
      action: "PAYMENT_VERIFY",
      changes: { reference, amount },
    }),

  instructionSend: (
    actorId: string,
    actorRole: Role,
    requestId: string,
    instructionId: string,
    expiresAt: Date
  ) =>
    audit({
      actorId,
      actorRole,
      objectType: "PaymentInstruction",
      objectId: instructionId,
      action: "INSTRUCTION_SEND",
      metadata: { requestId, expiresAt: expiresAt.toISOString() },
    }),

  instructionExpire: (
    instructionId: string
  ) =>
    audit({
      actorRole: "system",
      objectType: "PaymentInstruction",
      objectId: instructionId,
      action: "INSTRUCTION_EXPIRE",
    }),

  export: (
    actorId: string,
    actorRole: Role,
    filters: Record<string, unknown>
  ) =>
    audit({
      actorId,
      actorRole,
      objectType: "Request",
      objectId: "export",
      action: "EXPORT",
      metadata: filters,
    }),
};
