import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getServerUser } from "@/lib/auth";
import { REQUEST_STATUS_META, formatUsd, formatDateUTC } from "@/lib/constants";
import { ClipboardList, ArrowRight, Package, Bird, Stethoscope } from "lucide-react";

export const metadata = { title: "My Requests" };

export default async function MyRequestsPage() {
  const user = await getServerUser();
  if (!user) {
    redirect("/sign-in?callbackUrl=/my-requests");
  }

  // Fetch requests owned by this client (matched by customerId OR customerEmail —
  // covers guest requests that haven't been linked to the user account yet, F-08)
  const requests = await db.request.findMany({
    where: {
      OR: [
        { customerId: user.id },
        { customerEmail: user.email.toLowerCase() },
      ],
    },
    orderBy: { createdAt: "desc" },
    include: {
      items: { include: { bird: true, product: true } },
      appointments: { include: { professional: true } },
    },
  });

  // Link any unlinked guest requests (customerId=null) to this user account
  const unlinked = requests.filter((r) => !r.customerId);
  if (unlinked.length > 0) {
    await db.request.updateMany({
      where: { id: { in: unlinked.map((r) => r.id) } },
      data: { customerId: user.id },
    });
  }

  return (
    <div className="bg-ivory min-h-[60vh]">
      <section className="bg-white border-b border-feather/20 py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="eyebrow mb-2">Account</p>
          <h1 className="display-heading text-slate text-[28px] lg:text-[36px]">
            My Requests
          </h1>
          <p className="text-feather text-[14px] font-body mt-2 max-w-2xl">
            Hi {user.name?.split(" ")[0] ?? user.email}. Track your requests,
            view secure payment instructions, and deposit payment references
            here. Each status change is timestamped.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        {requests.length === 0 ? (
          <div className="bg-white rounded-xl border border-feather/20 p-12 text-center">
            <ClipboardList className="h-10 w-10 text-feather mx-auto mb-3" aria-hidden />
            <h2 className="font-heading text-slate text-[20px] mb-2">
              You don&apos;t have any requests yet
            </h2>
            <p className="text-feather text-[14px] font-body mb-5">
              Browse parrots, supplies, or book an avian advice session to begin.
            </p>
            <Link href="/parrots" className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-tail-red text-white text-[14px] font-body font-semibold">
              Explore parrots <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((r) => {
              const meta = REQUEST_STATUS_META[r.status];
              const itemCount = r.items.length;
              const hasAppointment = r.appointments.length > 0;
              return (
                <Link
                  key={r.id}
                  href={`/my-requests/${r.id}`}
                  className="card-hover block bg-white rounded-xl border border-feather/20 p-5 focus-ring"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-heading text-slate text-[18px] font-bold">
                          {r.reference}
                        </span>
                        <span className={`status-badge ${meta.className}`}>
                          {meta.label}
                        </span>
                      </div>
                      <p className="text-feather text-[13px] font-body flex items-center gap-3 flex-wrap">
                        {r.type === "PARROT_PURCHASE" && (
                          <span className="inline-flex items-center gap-1">
                            <Bird className="h-3.5 w-3.5" /> Parrot purchase
                          </span>
                        )}
                        {r.type === "ACCESSORY_ORDER" && (
                          <span className="inline-flex items-center gap-1">
                            <Package className="h-3.5 w-3.5" /> Accessory order
                          </span>
                        )}
                        {r.type === "AVIAN_CONSULTATION" && (
                          <span className="inline-flex items-center gap-1">
                            <Stethoscope className="h-3.5 w-3.5" /> Avian consultation
                          </span>
                        )}
                        <span>·</span>
                        <span>{itemCount} {itemCount === 1 ? "item" : "items"}</span>
                        {hasAppointment && (
                          <>
                            <span>·</span>
                            <span>{r.appointments[0].durationMinutes} min consultation</span>
                          </>
                        )}
                        <span>·</span>
                        <span>{formatDateUTC(r.createdAt)}</span>
                      </p>
                      <p className="text-[12px] font-body text-feather mt-1">
                        {meta.description}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {r.totalQuoteUsd != null && (
                        <p className="font-heading text-slate text-[18px] font-bold">
                          {formatUsd(Number(r.totalQuoteUsd))}
                        </p>
                      )}
                      <p className="text-tail-red text-[13px] font-body font-semibold inline-flex items-center gap-1">
                        View request
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
