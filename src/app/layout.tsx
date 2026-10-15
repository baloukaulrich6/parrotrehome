import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";
import { GoogleAnalytics } from "@/components/google-analytics";

// ============================================================
// Fonts are loaded via CSS @import in globals.css to avoid
// Turbopack multi-weight issues with next/font/google.
// EB Garamond (headings) + Lato (body) per Charte p.03.
// ============================================================

export const metadata: Metadata = {
  title: {
    default: "ParrotRehome — Birds • Supplies • Avian Care",
    template: "%s — ParrotRehome",
  },
  description:
    "A brighter life with birds. Ethically raised parrots, quality cages & supplies, and avian advice at $15/hour. Request-based, agent-verified purchasing.",
  keywords: [
    "African Grey parrots",
    "parrot adoption",
    "bird cages",
    "avian advice",
    "parrot supplies",
    "ParrotRehome",
  ],
  authors: [{ name: "ParrotRehome" }],
  icons: {
    icon: "/brand/parrotrehome-emblem.png",
    apple: "/brand/parrotrehome-emblem.png",
  },
  openGraph: {
    title: "ParrotRehome — A brighter life with birds",
    description:
      "Ethically raised parrots, supplies, and avian advice. Manual, agent-verified payment workflow.",
    siteName: "ParrotRehome",
    type: "website",
  },
};

// Charter p.03: EB Garamond (headings) + Lato (body)
const FONT_LINK = (
  <link
    rel="preconnect"
    href="https://fonts.googleapis.com"
  />
);
const FONT_PRECONNECT = (
  <link
    rel="preconnect"
    href="https://fonts.gstatic.com"
    crossOrigin="anonymous"
  />
);
const FONT_STYLESHEET = (
  <link
    href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,700&family=Lato:ital,wght@0,300;0,400;0,700;0,900;1,400;1,700&display=swap"
    rel="stylesheet"
  />
);

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {FONT_LINK}
        {FONT_PRECONNECT}
        {FONT_STYLESHEET}
      </head>
      <body className="antialiased bg-background text-foreground">
        <GoogleAnalytics />
        <Providers>
          {children}
        </Providers>
        <Toaster />
        <SonnerToaster position="top-right" richColors />
      </body>
    </html>
  );
}
