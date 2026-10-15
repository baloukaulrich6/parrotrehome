/// <reference types="bun-types" />
import { expect, test } from "bun:test";
import { sessionAllowsAccess, STAFF_SESSION_MS } from "../src/lib/session-policy";
test("active staff need a current password session and suspended accounts are denied", () => {
  const now = Date.now();
  for (const role of ["SUPER_ADMIN", "MANAGER", "AGENT", "STOCK_MANAGER", "AVIAN_PROFESSIONAL"]) {
    expect(sessionAllowsAccess({ role, status: "ACTIVE" }, { authAt: now }, now)).toBe(true);
    expect(sessionAllowsAccess({ role, status: "SUSPENDED" }, { authAt: now }, now)).toBe(false);
    expect(sessionAllowsAccess({ role, status: "ACTIVE" }, {}, now)).toBe(false);
    expect(sessionAllowsAccess({ role, status: "ACTIVE" }, { authAt: now - STAFF_SESSION_MS - 1 }, now)).toBe(false);
    expect(sessionAllowsAccess({ role, status: "ACTIVE" }, { authAt: now + 1000 }, now)).toBe(false);
  }
});
test("client access still respects account status", () => {
  expect(sessionAllowsAccess({ role: "CLIENT", status: "ACTIVE" }, {})).toBe(true);
  expect(sessionAllowsAccess({ role: "CLIENT", status: "SUSPENDED" }, {})).toBe(false);
});
