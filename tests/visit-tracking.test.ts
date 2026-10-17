import { expect, test } from "bun:test";
import { canQualify, validVisitToken, visitorKey, visitSource, visitToken, VISIT_WINDOW_MS } from "../src/lib/visit-tracking";
const origin = "https://parrotrehome.com";
test("classifies Google search, paid clicks, links and unknown origins without trusting lookalike domains", () => {
  expect(visitSource("https://www.google.com/search?q=bird", "/parrots", origin)).toBe("google_search");
  expect(visitSource("https://www.google.co.uk/", "/parrots", origin)).toBe("google_search");
  expect(visitSource("https://google.com.evil.example/", "/", origin)).toBe("referral");
  expect(visitSource("", "/?gclid=example", origin)).toBe("google_ads");
  expect(visitSource("", "/?utm_source=google&utm_medium=cpc", origin)).toBe("google_ads");
  expect(visitSource("", "/?utm_source=newsletter", origin)).toBe("campaign");
  expect(visitSource("https://partner.example/birds", "/", origin)).toBe("referral");
  expect(visitSource(origin + "/about", "/", origin)).toBe("direct");
  expect(visitSource("", "/", origin)).toBe("direct");
});
test("requires more than five seconds and a live signed session", () => {
  const started = new Date(100000);
  expect(canQualify(started, new Date(105000))).toBe(false);
  expect(canQualify(started, new Date(105001))).toBe(true);
  expect(canQualify(started, new Date(100000 + VISIT_WINDOW_MS))).toBe(false);
  expect(canQualify(started, new Date(99999))).toBe(false);
  const token = visitToken("id-1", "secret");
  expect(validVisitToken("id-1", token, "secret")).toBe(true);
  expect(validVisitToken("id-2", token, "secret")).toBe(false);
  expect(validVisitToken("id-1", token, "other-secret")).toBe(false);
  expect(validVisitToken("id-1", "invalid", "secret")).toBe(false);
  expect(visitorKey("browser-1", "secret")).not.toContain("browser-1");
});
