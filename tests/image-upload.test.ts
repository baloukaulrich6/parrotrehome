/// <reference types="bun-types" />
import { afterAll, expect, mock, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import sharp from "sharp";

let role: string | null = null;
mock.module("@/lib/auth", () => ({ getServerUser: async () => role ? { id: "demo", role, email: "demo@example.com" } : null }));
const { POST } = await import("../src/app/api/admin/uploads/route");
const { GET } = await import("../src/app/api/media/[name]/route");
const directory = mkdtempSync(path.join(tmpdir(), "parrot-images-"));
const previous = process.env.MEDIA_DIR;
process.env.MEDIA_DIR = directory;
const previousUrl = process.env.NEXTAUTH_URL;
process.env.NEXTAUTH_URL = "http://localhost:3000";
afterAll(() => {
  rmSync(directory, { recursive: true });
  if (previous) process.env.MEDIA_DIR = previous; else delete process.env.MEDIA_DIR;
  if (previousUrl) process.env.NEXTAUTH_URL = previousUrl; else delete process.env.NEXTAUTH_URL;
});
const request = (bytes: Uint8Array, origin = "http://localhost:3000") => new Request("http://localhost:3000/api/admin/uploads", {
  method: "POST", headers: { "Content-Type": "image/png", origin }, body: new Uint8Array(bytes).buffer,
});

test("upload denies anonymous users, clients and other origins", async () => {
  role = null;
  expect((await POST(request(new Uint8Array()))).status).toBe(401);
  role = "CLIENT";
  expect((await POST(request(new Uint8Array()))).status).toBe(403);
  role = "SUPER_ADMIN";
  expect((await POST(request(new Uint8Array(), "https://untrusted.example"))).status).toBe(403);
});
test("upload rejects invalid images and oversized input", async () => {
  role = "SUPER_ADMIN";
  expect((await POST(request(new Uint8Array([1, 2, 3])))).status).toBe(400);
  expect((await POST(request(new Uint8Array(5 * 1024 * 1024 + 1)))).status).toBe(413);
});
test("admin image is converted, stored and publicly readable for the client catalog", async () => {
  role = "STOCK_MANAGER";
  const image = await sharp({ create: { width: 20, height: 20, channels: 3, background: "green" } }).png().toBuffer();
  const response = await POST(request(image));
  expect(response.status).toBe(201);
  const { url } = await response.json();
  const name = url.split("/").pop();
  const media = await GET(new Request(`http://localhost:3000${url}`), { params: Promise.resolve({ name }) });
  expect(media.status).toBe(200);
  expect(media.headers.get("content-type")).toBe("image/webp");
  const metadata = await sharp(Buffer.from(await media.arrayBuffer())).metadata();
  expect(metadata.width).toBe(20);
  expect(metadata.format).toBe("webp");
});
test("media path traversal is rejected", async () => {
  expect((await GET(new Request("http://localhost:3000/api/media/nope"), { params: Promise.resolve({ name: "../private" }) })).status).toBe(404);
});
