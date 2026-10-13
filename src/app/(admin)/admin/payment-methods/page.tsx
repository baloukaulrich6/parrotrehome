import { db } from "@/lib/db";
import { PaymentMethodToggle } from "@/components/admin/payment-method-toggle";

export const metadata = { title: "Payment methods — Admin" };

export default async function AdminPaymentMethodsPage() {
  const methods = await db.paymentMethod.findMany({
    orderBy: { displayOrder: "asc" },
  });

  return (
    <div className="space-y-5">
      <div>
        <p className="eyebrow mb-1">Configuration</p>
        <h1 className="font-heading text-slate text-[26px] lg:text-[32px] font-bold">
          Payment methods
        </h1>
        <p className="text-feather text-[14px] font-body mt-1">
          Manage authorized payment methods and instruction templates (A-06).
          Customers see only <strong>active</strong> methods.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {methods.map((m) => (
          <article key={m.id} className="bg-white rounded-xl border border-feather/20 p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h2 className="font-heading text-slate text-[18px] font-semibold">{m.name}</h2>
                <p className="text-feather text-[12px] font-body">{m.officialProvider}</p>
              </div>
              <PaymentMethodToggle id={m.id} active={m.active} />
            </div>
            <div className="bg-ivory border border-feather/20 rounded-md p-3">
              <p className="text-[11px] text-feather uppercase font-semibold tracking-wide mb-1">Instructions template</p>
              <pre className="whitespace-pre-wrap text-[12px] font-body text-slate leading-relaxed max-h-32 overflow-y-auto custom-scroll">
                {m.instructionsTemplate}
              </pre>
            </div>
            <p className="text-[11px] text-feather font-body mt-2">
              Placeholders <code className="bg-ivory px-1 rounded text-[10px]">{`{{requestReference}}`}</code> and{" "}
              <code className="bg-ivory px-1 rounded text-[10px]">{`{{totalQuoteUsd}}`}</code> are auto-filled when the agent sends instructions.
            </p>
          </article>
        ))}
      </div>

      <div className="bg-tail-red/5 border border-tail-red/20 rounded-xl p-4">
        <p className="text-[13px] font-body text-slate leading-relaxed">
          <strong>Important:</strong> The instruction templates above are
          illustrative. Production deployment requires verified bank account
          details, Zelle contacts, and CashApp tags supplied by the authorized
          company agent (see Q-11 in Phase 1 analysis).
        </p>
      </div>
    </div>
  );
}
