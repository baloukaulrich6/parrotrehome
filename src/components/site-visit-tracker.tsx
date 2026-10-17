"use client";
import { useEffect } from "react";
import { optionalTrackingAllowed } from "./cookie-controls";
const SESSION = "parrotrehome-visit";
const VISITOR = "parrotrehome-visitor";
const WINDOW = 30 * 60 * 1000;
type Visit = { id: string; token: string; at: number; activeMs: number; done: boolean };
export function SiteVisitTracker() {
  useEffect(() => {
    let visit: Visit | null = null;
    let busy = false;
    let alive = true;
    let retryAt = 0;
    let previous = performance.now();
    let visible = document.visibilityState === "visible";
    const controller = new AbortController();
    function save() { try { if (visit) sessionStorage.setItem(SESSION, JSON.stringify(visit)); } catch { /* Storage-disabled browsers are not counted. */ } }
    async function start() {
      busy = true;
      try {
        const saved = JSON.parse(sessionStorage.getItem(SESSION) || "null");
        if (saved && typeof saved.id === "string" && typeof saved.token === "string" && Number.isFinite(saved.activeMs) && saved.activeMs >= 0 && saved.at <= Date.now() && Date.now() - saved.at < WINDOW) { visit = saved; return; }
        let visitor = JSON.parse(localStorage.getItem(VISITOR) || "null");
        if (!visitor || !/^[a-f0-9-]{36}$/i.test(visitor.id) || Date.now() - visitor.at > 90 * 86400000) {
          visitor = { id: crypto.randomUUID(), at: Date.now() }; localStorage.setItem(VISITOR, JSON.stringify(visitor));
        }
        const response = await fetch("/api/visits", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "start", visitorId: visitor.id, referrer: document.referrer.slice(0, 2048), landing: location.href.slice(0, 2048), consent: true }), signal: controller.signal });
        if (!response.ok || response.status === 204) throw new Error("Visit unavailable");
        const data = await response.json();
        if (alive && optionalTrackingAllowed()) { visit = { ...data, at: Date.now(), activeMs: 0, done: false }; previous = performance.now(); save(); }
      } catch { retryAt = Date.now() + 10000; } finally { busy = false; }
    }
    async function qualify(current: Visit) {
      busy = true;
      try {
        const response = await fetch("/api/visits", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "qualify", id: current.id, token: current.token, activeMs: current.activeMs, consent: true }), signal: controller.signal });
        if (response.status === 204) { current.done = true; save(); }
        else retryAt = Date.now() + 10000;
      } catch { retryAt = Date.now() + 10000; } finally { busy = false; }
    }
    function tick() {
      const now = performance.now();
      const delta = Math.min(1000, Math.max(0, now - previous)); previous = now;
      const wasVisible = visible; visible = document.visibilityState === "visible";
      if (!optionalTrackingAllowed()) {
        visit = null;
        try { sessionStorage.removeItem(SESSION); localStorage.removeItem(VISITOR); } catch {}
        return;
      }
      if (visit && Date.now() - visit.at >= WINDOW) { visit = null; try { sessionStorage.removeItem(SESSION); } catch {} }
      if (!visit) { if (visible && !busy && Date.now() >= retryAt) void start(); return; }
      if (visit.done || !visible || !wasVisible) return;
      visit.activeMs += delta; save();
      if (visit.activeMs > 5000 && !busy && Date.now() >= retryAt) void qualify(visit);
    }
    const timer = setInterval(tick, 250);
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("cookie-choice-changed", tick);
    tick();
    return () => { alive = false; controller.abort(); clearInterval(timer); document.removeEventListener("visibilitychange", tick); window.removeEventListener("cookie-choice-changed", tick); save(); };
  }, []);
  return null;
}
