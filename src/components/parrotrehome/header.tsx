"use client";

import { defaultSiteSettings, type SiteSettings } from "@/lib/site-settings-schema";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Search,
  ShoppingCart,
  ClipboardList,
  User,
  Headphones,
  ChevronDown,
  Menu,
  X,
  Heart,
} from "lucide-react";
import { ParrotRehomeLogo } from "./logo";
import { AVIAN_ADVICE_PRICE_PER_HOUR } from "@/lib/constants";
import { useCart } from "@/lib/cart-store";
import { useFavoritesCount } from "@/components/parrotrehome/favorite-toggle";

const NAV = [
  { href: "/parrots", label: "Parrots" },
  { href: "/sell", label: "Sell a parrot" },
  { href: "/supplies", label: "Cages & Supplies" },
  { href: "/avian-advice", label: "Avian Advice" },
  { href: "/about", label: "Our Promise" },
  { href: "/contact", label: "Contact" },
];

export function ParrotRehomeHeader({ settings = defaultSiteSettings }: { settings?: SiteSettings }) {
  const BRAND = settings;
  const { data: session } = useSession();
  const cart = useCart((s) => s.items);
  const cartCount = cart.reduce((n, i) => n + i.qty, 0);
  const favCount = useFavoritesCount();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full">
      {/* ── Top utility bar — dark slate ── */}
      <div className="bg-slate text-ivory">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-9 items-center justify-between text-[12px] font-body">
            <div className="hidden md:flex items-center gap-3">
              <span className="tracking-wide">Independent Breeders</span>
              <span className="text-feather">|</span>
              <span className="tracking-wide">Clear Purchase Terms</span>
              <span className="text-feather">|</span>
              <span className="tracking-wide">Worldwide Support</span>
            </div>
            <div className="md:hidden text-[11px] tracking-wide">
              Independent Breeders · Ethical · Support
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/avian-advice"
                className="inline-flex items-center gap-1.5 hover:text-iris transition-colors touch-target px-1"
                aria-label={`Avian advice at $${AVIAN_ADVICE_PRICE_PER_HOUR} per hour`}
              >
                <Headphones className="h-3.5 w-3.5" aria-hidden />
                <span>Avian Advice: ${AVIAN_ADVICE_PRICE_PER_HOUR}/hour</span>
              </Link>
              <Link
                href={session ? "/account" : "/sign-in"}
                className="inline-flex items-center gap-1.5 hover:text-iris transition-colors touch-target px-1"
              >
                <User className="h-3.5 w-3.5" aria-hidden />
                <span>{session ? session.user?.name?.split(" ")[0] ?? "Account" : "Sign In"}</span>
              </Link>
              <span className="hidden sm:inline-flex items-center gap-1 text-ivory/80">
                <span className="text-[14px]" aria-hidden>🇺🇸</span>
                <span>USD</span>
                <ChevronDown className="h-3 w-3" aria-hidden />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main header — ivory/white ── */}
      <div
        className={`bg-ivory border-b transition-shadow ${
          scrolled ? "border-feather/30 shadow-sm" : "border-feather/20"
        }`}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-[72px] lg:h-[84px] items-center justify-between gap-4">
            {/* Logo */}
            <Link
              href="/"
              className="focus-ring rounded-md"
              aria-label="ParrotRehome home"
            >
              <ParrotRehomeLogo name={BRAND.name} tagline={BRAND.subTagline} size="md" />
            </Link>

            {/* Desktop nav */}
            <nav className="hidden lg:flex items-center gap-1">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="px-3 py-2 text-[15px] font-body font-medium text-slate hover:text-tail-red transition-colors rounded-md focus-ring"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* Search — desktop */}
            <form
              action="/search"
              method="get"
              className="hidden lg:flex flex-1 max-w-sm items-center"
              role="search"
            >
              <div className="relative w-full">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-feather"
                  aria-hidden
                />
                <input
                  type="search"
                  name="q"
                  placeholder="Search parrots, cages, supplies..."
                  aria-label="Search the catalog"
                  className="w-full h-10 pl-10 pr-3 rounded-full bg-white border border-feather/30 text-[14px] font-body placeholder:text-feather/70 focus-ring focus:border-tail-red focus:outline-none"
                />
              </div>
            </form>

            {/* Cart + My Requests */}
            <div className="flex items-center gap-2">
              <Link
                href="/favorites"
                className="relative inline-flex h-11 w-11 items-center justify-center rounded-full hover:bg-tail-red/5 transition-colors focus-ring"
                aria-label={`Favorites (${favCount} items)`}
              >
                <Heart className="h-5 w-5 text-feather hover:text-tail-red" aria-hidden />
                {favCount > 0 && (
                  <span
                    className="absolute -top-0.5 -right-0.5 min-w-[20px] h-5 px-1 rounded-full bg-tail-red text-white text-[11px] font-bold flex items-center justify-center"
                    aria-hidden
                  >
                    {favCount}
                  </span>
                )}
              </Link>
              <Link
                href="/cart"
                className="relative inline-flex h-11 w-11 items-center justify-center rounded-full hover:bg-feather/10 transition-colors focus-ring"
                aria-label={`Request cart (${cartCount} items)`}
              >
                <ShoppingCart className="h-5 w-5 text-slate" aria-hidden />
                {cartCount > 0 && (
                  <span
                    className="absolute -top-0.5 -right-0.5 min-w-[20px] h-5 px-1 rounded-full bg-tail-red text-white text-[11px] font-bold flex items-center justify-center"
                    aria-hidden
                  >
                    {cartCount}
                  </span>
                )}
              </Link>
              <Link
                href={session ? "/account" : "/sign-in"}
                className="hidden sm:inline-flex items-center gap-2 h-11 px-5 rounded-full bg-tail-red hover:bg-tail-red-dark text-white text-[14px] font-body font-semibold transition-colors focus-ring shadow-sm"
              >
                <ClipboardList className="h-4 w-4" aria-hidden />
                My Requests
              </Link>
              {/* Mobile menu trigger */}
              <button
                type="button"
                className="lg:hidden inline-flex h-11 w-11 items-center justify-center rounded-full hover:bg-feather/10 focus-ring"
                onClick={() => setMobileOpen((v) => !v)}
                aria-label="Open navigation menu"
                aria-expanded={mobileOpen}
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile nav drawer */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-feather/20 bg-ivory">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4 space-y-1">
              <form action="/search" method="get" className="mb-3" role="search">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-feather" aria-hidden />
                  <input
                    type="search"
                    name="q"
                    placeholder="Search parrots, cages, supplies..."
                    className="w-full h-11 pl-10 pr-3 rounded-full bg-white border border-feather/30 text-[15px] focus-ring"
                  />
                </div>
              </form>
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="block px-3 py-3 text-[16px] font-body font-medium text-slate hover:bg-feather/10 rounded-md"
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href={session ? "/account" : "/sign-in"}
                onClick={() => setMobileOpen(false)}
                className="mt-2 inline-flex w-full items-center justify-center gap-2 h-12 rounded-full bg-tail-red text-white font-semibold"
              >
                <ClipboardList className="h-4 w-4" aria-hidden />
                My Requests
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
