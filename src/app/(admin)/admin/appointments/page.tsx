import { requireStaffPage } from "@/lib/staff-page";
import Link from "next/link";
import { db } from "@/lib/db";
import { formatDateUTC, formatUsd, AVIAN_ADVICE_PRICE_PER_HOUR } from "@/lib/constants";
import { Stethoscope, Calendar, Bell } from "lucide-react";
import { SendRemindersButton } from "@/components/admin/send-reminders-button";

export const metadata = { title: "Appointments — Admin" };

export default async function AdminAppointmentsPage() {
  await requireStaffPage();
  const appts = await db.appointment.findMany({
    orderBy: { slotStartUtc: "asc" },
    include: { professional: true, customer: true, request: true },
    where: { slotStartUtc: { gt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7) } },
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <p className="eyebrow mb-1">Avian advice</p>
          <h1 className="font-heading text-slate text-[26px] lg:text-[32px] font-bold">
            Appointments
          </h1>
          <p className="text-feather text-[14px] font-body mt-1">
            {appts.length} upcoming appointment{appts.length !== 1 ? "s" : ""} · ${AVIAN_ADVICE_PRICE_PER_HOUR}/hour
          </p>
        </div>
        <SendRemindersButton />
      </div>

      <div className="bg-white rounded-xl border border-feather/20 overflow-hidden">
        {appts.length === 0 ? (
          <div className="p-12 text-center">
            <Calendar className="h-10 w-10 text-feather mx-auto mb-3" aria-hidden />
            <h2 className="font-heading text-slate text-[20px] mb-2">No appointments</h2>
            <p className="text-feather text-[14px] font-body">No upcoming or recent appointments.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[14px] font-body">
              <thead className="bg-ivory border-b border-feather/20 text-feather text-[11px] uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Reference</th>
                  <th className="text-left px-4 py-3 font-semibold">Customer</th>
                  <th className="text-left px-4 py-3 font-semibold">Professional</th>
                  <th className="text-left px-4 py-3 font-semibold">Slot (UTC)</th>
                  <th className="text-right px-4 py-3 font-semibold">Duration</th>
                  <th className="text-left px-4 py-3 font-semibold">Subject</th>
                  <th className="text-left px-4 py-3 font-semibold">Status</th>
                  <th className="text-right px-4 py-3 font-semibold">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-feather/10">
                {appts.map((a) => (
                  <tr key={a.id} className="hover:bg-feather/5">
                    <td className="px-4 py-3">
                      <Link href={`/admin/requests/${a.requestId}`} className="font-heading text-slate font-bold hover:text-tail-red">
                        {a.request.reference}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate">{a.customer?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-slate">{a.professional.name}</td>
                    <td className="px-4 py-3 text-feather text-[12px]">{formatDateUTC(a.slotStartUtc)}</td>
                    <td className="px-4 py-3 text-right text-slate">{a.durationMinutes} min</td>
                    <td className="px-4 py-3 text-feather">{a.subject}</td>
                    <td className="px-4 py-3">
                      <span className="text-slate font-body font-semibold">{a.status}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate font-semibold">{formatUsd(Number(a.priceUsd))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
