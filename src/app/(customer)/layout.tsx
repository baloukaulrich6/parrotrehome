import { SiteVisitTracker } from "@/components/site-visit-tracker";
import { readSiteSettings } from "@/lib/site-settings";
import { ParrotRehomeHeader } from "@/components/parrotrehome/header";
import { ParrotRehomeFooter } from "@/components/parrotrehome/footer";

export const dynamic = "force-dynamic";

// ============================================================
// Customer layout — wraps all public/customer-facing pages
// with the ParrotRehome header (utility bar + main nav + search +
// cart + My Requests) and footer (brand + links + contact +
// legal). Sticky footer pattern per fullstack skill rule.
// ============================================================

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = readSiteSettings();
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteVisitTracker />
      <ParrotRehomeHeader settings={settings} />
      <main className="flex-1">{children}</main>
      <ParrotRehomeFooter settings={settings} />
    </div>
  );
}
