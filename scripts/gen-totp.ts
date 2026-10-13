import { generateCurrentTotp } from "../src/lib/mfa";
const secret = process.argv[2];
if (!secret) { console.error("Usage: bun run scripts/gen-totp.ts <secret>"); process.exit(1); }
generateCurrentTotp(secret).then((t) => console.log(t)).catch((e) => console.error("ERR:", e instanceof Error ? e.message : e));
