import { expect, test } from "bun:test";
import { optionalTrackingAllowed } from "../src/components/cookie-controls";
test("optional tracking requires an unexpired opt-in and respects Global Privacy Control", () => {
  const names = ["window", "navigator", "localStorage"] as const;
  const original = names.map(name => Object.getOwnPropertyDescriptor(globalThis, name));
  let choice: string | null = null;
  const browser = { globalPrivacyControl: false };
  try {
    Object.defineProperty(globalThis, "window", { configurable: true, value: {} });
    Object.defineProperty(globalThis, "navigator", { configurable: true, value: browser });
    Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: () => choice } });
    expect(optionalTrackingAllowed()).toBe(false);
    choice = JSON.stringify({ allowed: false, at: Date.now() }); expect(optionalTrackingAllowed()).toBe(false);
    choice = JSON.stringify({ allowed: true, at: Date.now() }); expect(optionalTrackingAllowed()).toBe(true);
    browser.globalPrivacyControl = true; expect(optionalTrackingAllowed()).toBe(false);
    browser.globalPrivacyControl = false;
    choice = JSON.stringify({ allowed: true, at: Date.now() - 184 * 86400000 }); expect(optionalTrackingAllowed()).toBe(false);
    choice = "invalid"; expect(optionalTrackingAllowed()).toBe(false);
  } finally { names.forEach((name, index) => { const descriptor = original[index]; if (descriptor) Object.defineProperty(globalThis, name, descriptor); else Reflect.deleteProperty(globalThis, name); }); }
});
