/// <reference types="bun-types" />
// Server-console recovery only. Not exposed as an HTTP endpoint.
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
async function main() {
  const args = process.argv.slice(2);
  const email = args[args.indexOf("--email") + 1]?.toLowerCase();
  if (!args.includes("--email") || !args.includes("--confirm-reset") || !email) throw new Error("Usage: bun run scripts/reset-staff-mfa.ts --email user@example.com --confirm-reset");
  const user = await db.user.findUnique({ where: { email } });
  if (!user || user.role === "CLIENT") throw new Error("Staff account not found.");
  await db.$transaction(async (tx) => {
    await tx.user.update({ where: { id: user.id }, data: { mfaSecret: null, mfaEnabled: false } });
    await tx.sessionToken.deleteMany({ where: { userId: user.id, token: { startsWith: "mfa:" } } });
    await tx.auditLog.create({ data: { actorRole: "SERVER_ADMIN", objectType: "User", objectId: user.id, action: "UPDATE", changes: JSON.stringify({ event: "MFA_RESET_FROM_SERVER_CONSOLE" }) } });
  });
  console.log(`MFA reset for ${email}. The password is unchanged. Sign in and enroll a new authenticator; existing administrative sessions no longer grant access.`);
}
main().catch((error) => { console.error(error instanceof Error ? error.message : "Reset failed"); process.exitCode = 1; }).finally(() => db.$disconnect());
