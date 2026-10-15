import { defaultSiteSettings, type SiteSettings } from "@/lib/site-settings-schema";
import Link from "next/link";
import { Mail, Phone, MapPin, Clock, Heart } from "lucide-react";
import { ParrotRehomeLogo } from "./logo";
import { NewsletterSubscribeForm } from "./newsletter-subscribe-form";

const FOOTER_LINKS = [
  {
    title: "Browse",
    links: [
      { href: "/parrots", label: "Parrots" },
      { href: "/supplies", label: "Cages & Supplies" },
      { href: "/avian-advice", label: "Avian Advice" },
      { href: "/how-it-works", label: "How it works" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "Our promise" },
      { href: "/contact", label: "Contact" },
      { href: "/cms/terms", label: "Terms of service" },
      { href: "/cms/privacy", label: "Privacy policy" },
    ],
  },
  {
    title: "Account",
    links: [
      { href: "/sign-in", label: "Sign in" },
      { href: "/sign-up", label: "Create account" },
      { href: "/my-requests", label: "My requests" },
      { href: "/cart", label: "Request cart" },
    ],
  },
];

export function ParrotRehomeFooter({ settings = defaultSiteSettings }: { settings?: SiteSettings }) {
  const BRAND = settings;
  return (
    <footer className="mt-auto bg-slate text-ivory">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">
          {/* Brand block */}
          <div className="space-y-4">
            <ParrotRehomeLogo name={BRAND.name} tagline={BRAND.subTagline} variant="mono-light" size="md" showTagline={true} />
            <p className="text-ivory/80 text-[14px] font-body leading-relaxed max-w-sm">
              {BRAND.tagline} A US-based parrot e-commerce and avian consultation
              platform with manual, agent-verified payment workflow.
            </p>
            <p className="text-ivory/70 text-[12px] font-body">
              {BRAND.subTagline}
            </p>
          </div>

          {/* Link groups */}
          {FOOTER_LINKS.map((group) => (
            <nav key={group.title} aria-label={group.title}>
              <h3 className="font-heading text-[14px] font-semibold uppercase tracking-wider text-iris mb-4">
                {group.title}
              </h3>
              <ul className="space-y-2.5">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-ivory/80 hover:text-iris transition-colors text-[14px] font-body"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/* Feather rule */}
        <div className="feather-rule my-10 opacity-40" />

        {/* Newsletter subscribe (A-23) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <NewsletterSubscribeForm />
          <div className="lg:text-right">
            <p className="font-heading text-ivory text-[16px] font-semibold mb-1">
              Stay in touch
            </p>
            <p className="text-ivory/70 text-[12px] font-body max-w-md">
              Our newsletter brings you the latest from ParrotRehome: new bird arrivals, care
              tips from our avian advisor, and member-only offers. We respect your inbox.
            </p>
          </div>
        </div>

        {/* Contact strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-[13px] text-ivory/80 font-body">
          <div className="flex items-start gap-2">
            <Mail className="h-4 w-4 mt-0.5 text-iris" aria-hidden />
            <span>{BRAND.email}</span>
          </div>
          <div className="flex items-start gap-2">
            <Phone className="h-4 w-4 mt-0.5 text-iris" aria-hidden />
            <span>{BRAND.phone}{BRAND.secondaryPhone ? ` / ${BRAND.secondaryPhone}` : ""}</span>
          </div>
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 mt-0.5 text-iris" aria-hidden />
            <span>{BRAND.address}</span>
          </div>
          <div className="flex items-start gap-2">
            <Clock className="h-4 w-4 mt-0.5 text-iris" aria-hidden />
            <span>{BRAND.hours}</span>
          </div>
        </div>

        {/* Legal */}
        <div className="mt-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-[12px] text-ivory/60 font-body">
          <p>
            © {new Date().getFullYear()} {BRAND.name}. All rights reserved.
            {" "}Brand provisional — pending client validation.
          </p>
          <p className="flex items-center gap-1.5">
            Built with
            <Heart className="h-3 w-3 text-tail-red" aria-hidden />
            for responsible avian companionship
          </p>
        </div>
      </div>
    </footer>
  );
}
