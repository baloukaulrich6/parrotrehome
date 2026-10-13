import { db } from "../src/lib/db";
import bcrypt from "bcryptjs";

async function main() {
  const u = await db.user.findUnique({ where: { email: "admin@parrotrehome.com" } });
  console.log("user email:", u?.email);
  console.log("hash prefix:", u?.passwordHash?.slice(0, 30), "...");
  console.log("status:", u?.status, "role:", u?.role);
  const ok = await bcrypt.compare("parrotrehome123", u?.passwordHash ?? "");
  console.log("compare result:", ok);
}

main().catch(console.error).finally(() => db.$disconnect());
