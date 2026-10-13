import { ParrotRehomeHeader } from "@/components/parrotrehome/header";
import { ParrotRehomeFooter } from "@/components/parrotrehome/footer";

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
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <ParrotRehomeHeader />
      <main className="flex-1">{children}</main>
      <ParrotRehomeFooter />
    </div>
  );
}
