"use client";
import { useEffect, useState } from "react";

export function usePaymentCountdown(expiryAt: Date | string) {
  const expiry = new Date(expiryAt).getTime();
  const [remaining, setRemaining] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setRemaining(Math.max(0, Math.ceil((expiry - Date.now()) / 1000)));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [expiry]);
  return remaining;
}

export function PaymentCountdown({ expiryAt }: { expiryAt: Date | string }) {
  const remaining = usePaymentCountdown(expiryAt);
  return <p className="rounded-lg border border-iris/30 bg-iris/10 p-3 text-sm text-slate" role="timer">
    {remaining === null ? "Checking payment deadline…" : remaining === 0
      ? "Payment instructions expired. Please ask your agent for new instructions. Your account remains accessible."
      : `Time remaining: ${Math.floor(remaining / 60).toString().padStart(2, "0")}:${(remaining % 60).toString().padStart(2, "0")}. After expiry, do not use these payment details.`}
  </p>;
}
