"use client";
import { useEffect, useState } from "react";
import { PaymentCountdown, usePaymentCountdown } from "./payment-countdown";
import { renderEmailHtml } from "@/lib/email-design";

export function WorkflowDemo({ paymentTemplate }: { paymentTemplate: { subject: string; body: string } }) {
  const [photo, setPhoto] = useState("");
  const [name, setName] = useState("African Grey — demonstration");
  const [details, setDetails] = useState("CHMK\nDemonstration only — no real recipient or account.\nRequest reference: DEMO-001\nAmount: $250.00 USD");
  const [issued, setIssued] = useState<{ body: string; expiry: string } | null>(null);
  const remaining = usePaymentCountdown(issued?.expiry || "1970-01-01T00:00:00Z");
  useEffect(() => () => { if (photo) URL.revokeObjectURL(photo); }, [photo]);
  const variables: Record<string, string> = {
    customerName: "Alex", reference: "DEMO-001", paymentLabel: "CHMK", selectedMethod: "CHMK",
    agentName: "ParrotRehome Demo", amount: "$250.00 USD",
    expiry: issued ? new Date(issued.expiry).toUTCString() : "",
    secureLink: "https://example.com/demo-payment",
  };
  const substitute = (text: string) => text.replace(/\{\{(\w+)\}\}/g, (_, key: string) => variables[key] || "");
  const email = substitute(paymentTemplate.body);
  return <main className="min-h-screen bg-ivory p-5 md:p-10 text-slate">
    <div className="max-w-6xl mx-auto space-y-6">
      <p className="text-forest font-semibold uppercase text-xs tracking-widest">ParrotRehome · Démonstration</p>
      <h1 className="font-heading text-4xl">De l’administration à l’espace client</h1>
      <p className="text-feather">Données fictives, conservées uniquement dans cette page. Aucun paiement ni mail envoyé. L’upload enregistré et les vrais dossiers se trouvent dans l’administration.</p>
      <div className="grid md:grid-cols-2 gap-6">
        <section className="bg-white rounded-xl border border-feather/20 p-6 space-y-4">
          <h2 className="font-heading text-2xl">Administration</h2>
          <label className="block text-sm">Nom du dossier<input value={name} onChange={(e) => setName(e.target.value)} className="block border rounded-lg p-3 w-full mt-1" /></label>
          <label className="block text-sm">Charger une photo<input type="file" accept="image/jpeg,image/png,image/webp" className="block w-full mt-2" onChange={(e) => {
            const file = e.target.files?.[0];
            if (file && file.size <= 5 * 1024 * 1024 && ["image/jpeg", "image/png", "image/webp"].includes(file.type)) setPhoto(URL.createObjectURL(file));
          }} /></label>
          <label className="block text-sm">Instructions propres à ce client<textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={5} className="block w-full border rounded-lg p-3 mt-1" /></label>
          <button onClick={() => setIssued({ body: details, expiry: new Date(Date.now() + 20 * 60_000).toISOString() })} className="rounded-full bg-tail-red text-white px-5 py-3">Préparer une réponse · 20 minutes</button>
          <p className="text-xs text-feather">Chaque nouvelle réponse remplace les instructions affichées côté client.</p>
        </section>
        <section className="bg-white rounded-xl border border-feather/20 p-6 space-y-4">
          <h2 className="font-heading text-2xl">Espace client</h2>
              {photo ? <img src={photo} alt={name} className="w-full h-56 object-cover rounded-xl" /> : <div className="h-56 rounded-xl bg-forest/10 flex items-center justify-center text-forest">Votre photo apparaîtra ici</div>}
          <h3 className="font-heading text-xl">{name}</h3>
          <p className="text-sm">Dossier DEMO-001 · $250.00 USD</p>
          {issued ? <><PaymentCountdown expiryAt={issued.expiry} />{remaining !== 0 && <pre className="whitespace-pre-wrap text-sm bg-ivory rounded-lg p-4">{issued.body}</pre>}</> : <p className="text-feather">En attente des instructions de l’agent.</p>}
        </section>
      </div>
      {issued && <section className="space-y-3"><h2 className="font-heading text-2xl">Réponse mail au client</h2><iframe sandbox="" title="Aperçu du mail client" srcDoc={renderEmailHtml(substitute(paymentTemplate.subject), email)} className="w-full h-[650px] rounded-xl border" /></section>}
    </div>
  </main>;
}
