"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export function AdminSignOut() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/sign-in" })}
      className="inline-flex items-center justify-center gap-1.5 h-8 px-2 rounded-md bg-[var(--sidebar-accent)] hover:bg-tail-red/80 text-ivory/85 hover:text-white text-[12px] font-body font-medium transition-colors"
      aria-label="Sign out"
    >
      <LogOut className="h-3.5 w-3.5" aria-hidden /> Sign out
    </button>
  );
}
