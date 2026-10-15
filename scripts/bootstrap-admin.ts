/// <reference types="bun-types" />
// Production bootstrap only: no demo users, no deletion or password reset.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();
async function main() {
  if (await db.user.findFirst({ where: { role: "SUPER_ADMIN" } })) {
    console.log("Administrator already exists; accounts and passwords unchanged.");
    return;
  }
  if (await db.user.count() > 0) throw new Error("Users exist without a super administrator. Review accounts manually; automatic promotion refused.");
  const email = process.env.ADMIN_EMAIL?.toLowerCase().trim();
  const password = await Bun.stdin.text();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 12) {
    throw new Error("A valid administrator email and a password of at least 12 characters are required.");
  }
  const hash = await bcrypt.hash(password, 12);
  await db.$transaction(async (tx) => {
    await tx.user.create({ data: {
      email, name: "Administrator", passwordHash: hash,
      role: "SUPER_ADMIN", status: "ACTIVE", emailVerifiedAt: new Date(),
    } });
    await tx.paymentMethod.create({ data: {
      name: "CHMK", officialProvider: "To be configured", active: false,
      instructionsTemplate: "Request {{requestReference}} — amount USD {{totalQuoteUsd}}. Replace this text with the verified payment details before activation.",
    } });
    // Same initial delivery areas as the repository's seed; no sample orders/users.
    for (const [code, name] of [["CA", "California"], ["NY", "New York"], ["TX", "Texas"], ["FL", "Florida"], ["WA", "Washington"], ["OR", "Oregon"], ["MA", "Massachusetts"], ["IL", "Illinois"], ["GA", "Georgia"]]) {
      await tx.servedState.upsert({ where: { code }, update: {}, create: {
        code, name, allowsBirdDelivery: true, allowsPickup: code === "OR",
      } });
    }
  });
  console.log("Administrator created. Configure your catalog and payment provider before accepting orders. No demo accounts were created.");
}
main().catch((error) => { console.error(error instanceof Error ? error.message : "Bootstrap failed"); process.exitCode = 1; }).finally(() => db.$disconnect());
