import { db } from "./db";
import { deliverEmail, mailConfiguration } from "./email-transport";
export async function deliverAccountNotification(id: string) {
  const row = await db.accountNotification.findUniqueOrThrow({ where: { id } });
  const claim = await db.accountNotification.updateMany({ where: { id, status: { in: ["PENDING", "QUEUED", "FAILED"] } }, data: { status: "SENDING", errorMessage: null } });
  if (!claim.count) return row.status;
  let status: string;
  let errorMessage: string | null = null;
  try { status = await deliverEmail({ toAddress: row.toAddress, subject: row.subject, body: row.body, replyTo: mailConfiguration().replyTo }, `account:${row.eventKey}`); }
  catch (error) { status = "FAILED"; errorMessage = error instanceof Error ? error.message : "Delivery failed"; }
  await db.accountNotification.update({ where: { id }, data: { status, errorMessage } });
  return status;
}
export async function notifyRegistration(user: { id: string; name: string | null; email: string }, intent: string) {
  const toAddress = process.env.ORDER_NOTIFICATION_EMAIL || mailConfiguration().replyTo;
  const row = await db.accountNotification.upsert({ where: { eventKey: `registration:${user.id}` }, update: {}, create: {
    eventKey: `registration:${user.id}`, userId: user.id, kind: "REGISTRATION", toAddress,
    subject: "New ParrotRehome account — review", body: `A new account has been created.\n\nName: ${user.name || "Not provided"}\nEmail: ${user.email}\nPurpose: ${intent}\n\nReview the account in the administration:\n${process.env.NEXTAUTH_URL}/admin/customers\n\nPasswords are hashed and are never included in notifications. Registration alone does not verify identity or authorize a seller listing.`,
  } });
  return deliverAccountNotification(row.id);
}
export async function requestSecurityAlert(userId: string, actor: { id: string; role: string }) {
  return db.$transaction(async tx => {
    const existing = await tx.accountNotification.findUnique({ where: { eventKey: `security-alert:${userId}` } });
    if (existing) return { id: existing.id, duplicate: true };
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true } });
    const row = await tx.accountNotification.create({ data: { eventKey: `security-alert:${userId}`, userId, kind: "SECURITY_ALERT", toAddress: user.email, subject: "Please review your ParrotRehome account security", body: `Our support team recommends updating the password for your ParrotRehome account. This precautionary advice is not a confirmation of a data breach.\n\nOpen our website directly, sign in, then go to My account → Change password:\n${process.env.NEXTAUTH_URL}/account\n\nUse a unique password of at least 12 characters. We will never ask you to send your password by email or disclose it to our staff. If you need assistance, contact ${mailConfiguration().replyTo}.` } });
    await tx.auditLog.create({ data: { actorId: actor.id, actorRole: actor.role, objectType: "User", objectId: userId, action: "UPDATE", metadata: JSON.stringify({ event: "SECURITY_ALERT_APPROVED", notificationId: row.id }) } });
    return { id: row.id, duplicate: false };
  });
}
