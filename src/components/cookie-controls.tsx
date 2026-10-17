"use client";
import { useEffect, useState } from "react";
import Script from "next/script";
const KEY = "parrotrehome-cookie-choice";
export function optionalTrackingAllowed() {
  if (typeof window === "undefined" || (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl) return false;
  try { const value = JSON.parse(localStorage.getItem(KEY) || "null"); return value?.allowed === true && Date.now() - value.at < 183 * 86400000; } catch { return false; }
}
export function CookieSettingsButton() { return <button type="button" className="underline text-sm" onClick={() => window.dispatchEvent(new Event("cookie-preferences"))}>Cookie preferences</button>; }
export function CookieControls({ ga, ads }: { ga?: string; ads?: string }) {
  const [allowed, setAllowed] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    setAllowed(optionalTrackingAllowed());
    try { const value = JSON.parse(localStorage.getItem(KEY) || "null"); setOpen(!value || Date.now() - value.at >= 183 * 86400000); } catch { setOpen(true); }
    const show = () => setOpen(true); window.addEventListener("cookie-preferences", show); return () => window.removeEventListener("cookie-preferences", show);
  }, []);
  function choose(choice: boolean) {
    const next = choice && !(navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl;
    try { localStorage.setItem(KEY, JSON.stringify({ allowed: next, at: Date.now() })); } catch { /* Refuse tracking when storage is unavailable. */ }
    window.dispatchEvent(new Event("cookie-choice-changed"));
    const withdrawing = allowed && !next; setAllowed(next && optionalTrackingAllowed()); setOpen(false);
    if (withdrawing) {
      const w = window as unknown as { gtag?: (...args: unknown[]) => void }; w.gtag?.("consent", "update", { analytics_storage: "denied", ad_storage: "denied" });
      for (const cookie of document.cookie.split(";")) { const name = cookie.split("=")[0].trim(); if (!/^(_ga|_gcl_)/.test(name)) continue; for (const domain of ["", location.hostname, `.${location.hostname}`]) document.cookie = `${name}=; Max-Age=0; path=/${domain ? `; domain=${domain}` : ""}`; }
      location.reload();
    }
  }
  const ids = [ga, ads].filter((id): id is string => !!id && /^(G|AW)-[A-Z0-9]+$/.test(id) && !id.includes("XXXX"));
  return <>{allowed && ids.length > 0 && <><Script src={`https://www.googletagmanager.com/gtag/js?id=${ids[0]}`} strategy="afterInteractive" /><Script id="analytics-consented" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];window.gtag=function(){dataLayer.push(arguments)};gtag('js',new Date());${ids.map(id => `gtag('config',${JSON.stringify(id)});`).join("")}window.parrotAdsId=${JSON.stringify(ids.find(id => id.startsWith("AW-")) || "")};`}</Script></>}{open && <aside aria-label="Cookie preferences" className="fixed bottom-4 left-4 right-4 z-50 rounded-xl border bg-white p-5 shadow-lg max-w-xl"><p className="text-sm mb-3">Necessary storage supports your account and cart. Allow optional site visitor statistics, Google analytics and advertising tracking? You can refuse and continue using the site. <a className="underline" href="/cms/cookies">Cookie policy</a></p><div className="flex gap-3"><button className="border rounded px-4 py-2" onClick={() => choose(false)}>Refuse optional tracking</button><button className="border rounded px-4 py-2" onClick={() => choose(true)}>Allow optional tracking</button></div></aside>}</>;
}
