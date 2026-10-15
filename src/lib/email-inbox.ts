import "server-only";
import { mkdirSync, readFileSync, readdirSync, writeFileSync, renameSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
export type InboxEmail = {
  id: string; threadId: string; direction: "INBOUND" | "OUTBOUND";
  from: string; to: string[]; subject: string; body: string; createdAt: string;
  requestId?: string; status: "RECEIVED" | "QUEUED" | "SENT" | "FAILED";
};
const directory = () => path.resolve(process.env.EMAIL_INBOX_DIR || "var/email-inbox");
const validId = (id: string) => /^[a-z0-9-]{1,100}$/i.test(id);
export function readInboxEmail(id: string): InboxEmail | null {
  if (!validId(id)) return null;
  try { return JSON.parse(readFileSync(path.join(directory(), `${id}.json`), "utf8")); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return null; throw error; }
}
export function saveInboxEmail(email: InboxEmail) {
  if (!validId(email.id)) throw new Error("Invalid email identifier");
  mkdirSync(directory(), { recursive: true, mode: 0o700 });
  const file = path.join(directory(), `${email.id}.json`);
  const temporary = `${file}.${randomUUID()}.tmp`;
  writeFileSync(temporary, JSON.stringify(email), { mode: 0o600 }); renameSync(temporary, file);
}
export function listInboxEmails(): InboxEmail[] {
  let files: string[];
  try { files = readdirSync(directory()); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return []; throw error; }
  return files.filter(file => /^[a-z0-9-]+\.json$/i.test(file)).map(file => readInboxEmail(file.slice(0, -5))!).filter(Boolean).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
