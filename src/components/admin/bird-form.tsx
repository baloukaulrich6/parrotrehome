"use client";

import { ageInput, ageToYears, type AgeUnit } from "@/lib/bird-age";
import { ImageUpload } from "./image-upload";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil } from "lucide-react";
import { toast } from "sonner";
import { BirdStatus } from "@prisma/client";

interface BirdData {
  id?: string;
  species?: string;
  commonName?: string;
  individualId?: string;
  ageYears?: number | string;
  sex?: string;
  photos?: string; // JSON string
  status?: BirdStatus;
  location?: string;
  publicPhone?: string | null;
  priceUsd?: number | string;
  shortDescription?: string;
  longDescription?: string;
  careNotes?: string;
  breederName?: string;
  originState?: string;
}

export function BirdFormDialog({
  mode,
  bird,
  trigger,
}: {
  mode: "create" | "edit";
  bird?: BirdData;
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [age, setAge] = useState(() => ageInput(bird?.ageYears == null || bird.ageYears === "" ? null : Number(bird.ageYears)));
  const [form, setForm] = useState({
    species: bird?.species ?? "",
    commonName: bird?.commonName ?? "",
    individualId: bird?.individualId ?? "",
    sex: bird?.sex ?? "Unknown",
    photos: bird?.photos ?? "",
    status: bird?.status ?? "AVAILABLE",
    location: bird?.location ?? "",
    publicPhone: bird?.publicPhone ?? "",
    priceUsd: bird?.priceUsd ?? "",
    shortDescription: bird?.shortDescription ?? "",
    longDescription: bird?.longDescription ?? "",
    careNotes: bird?.careNotes ?? "",
    breederName: bird?.breederName ?? "",
    originState: bird?.originState ?? "",
  });

  function update<K extends keyof typeof form>(key: K, val: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Wrap photos URL in JSON array if user typed a single URL
      let photosJson = form.photos.trim();
      if (photosJson && !photosJson.startsWith("[")) {
        photosJson = JSON.stringify([photosJson]);
      }
      const payload = {
        ...form,
        ageYears: age.value === "" ? null : ageToYears(Number(age.value), age.unit),
        priceUsd: form.priceUsd ? Number(form.priceUsd) : null,
        photos: photosJson || "[]",
      };
      const url = mode === "create"
        ? "/api/admin/birds"
        : `/api/admin/birds/${bird?.id}`;
      const method = mode === "create" ? "POST" : "PUT";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success(mode === "create" ? "Bird dossier created." : "Bird updated.");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  }

  const defaultTrigger = mode === "create" ? (
    <button className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-tail-red hover:bg-tail-red-dark text-white text-[13px] font-body font-semibold">
      <Plus className="h-4 w-4" /> Add bird dossier
    </button>
  ) : (
    <button className="inline-flex items-center gap-1 text-tail-red text-[12px] font-body font-semibold hover:underline">
      <Pencil className="h-3 w-3" /> Edit
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-slate">
            {mode === "create" ? "Add new bird dossier" : "Edit bird dossier"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Common name *" htmlFor="commonName">
              <input id="commonName" type="text" required value={form.commonName} onChange={(e) => update("commonName", e.target.value)} className="w-full h-10 px-3 rounded-md border border-feather/30 bg-ivory text-[14px] focus-ring" />
            </Field>
            <Field label="Species (latin)" htmlFor="species">
              <input id="species" type="text" value={form.species} onChange={(e) => update("species", e.target.value)} placeholder="e.g., Psittacus erithacus" className="w-full h-10 px-3 rounded-md border border-feather/30 bg-ivory text-[14px] focus-ring" />
            </Field>
            <Field label="Individual ID / band" htmlFor="individualId">
              <input id="individualId" type="text" value={form.individualId} onChange={(e) => update("individualId", e.target.value)} placeholder="e.g., AG-2026-001" className="w-full h-10 px-3 rounded-md border border-feather/30 bg-ivory text-[14px] focus-ring" />
            </Field>
            <Field label="Public seller / adoption contact (WhatsApp, optional)" htmlFor="publicPhone"><input id="publicPhone" type="tel" maxLength={60} value={form.publicPhone} onChange={event => update("publicPhone", event.target.value)} placeholder="+1 503 555 0123" className="w-full h-10 px-3 rounded-md border border-feather/30 bg-ivory" /><p className="text-xs text-feather mt-1">Use a WhatsApp-enabled number with its country code. This number will be visible to customers and will open the contact's WhatsApp. Confirm the owner's permission before publishing it.</p></Field>
            <Field label="Age (approximate if not documented)" htmlFor="bird-age-value">
              <div className="flex gap-2"><input id="bird-age-value" type="number" step="any" min="0" value={age.value} onChange={event => setAge({ ...age, value: event.target.value })} className="w-full h-10 px-3 rounded-md border border-feather/30 bg-ivory" /><select aria-label="Age unit" value={age.unit} onChange={event => setAge({ ...age, unit: event.target.value as AgeUnit })} className="h-10 rounded-md border bg-ivory px-2"><option value="weeks">Weeks</option><option value="months">Months</option><option value="years">Years</option></select></div>
            </Field>
            <Field label="Sex" htmlFor="sex">
              <select id="sex" value={form.sex} onChange={(e) => update("sex", e.target.value)} className="w-full h-10 px-3 rounded-md border border-feather/30 bg-ivory text-[14px] focus-ring">
                <option>Unknown</option><option>Male</option><option>Female</option>
              </select>
            </Field>
            <Field label="Status" htmlFor="status">
              <select id="status" value={form.status} onChange={(e) => update("status", e.target.value as BirdStatus)} className="w-full h-10 px-3 rounded-md border border-feather/30 bg-ivory text-[14px] focus-ring">
                <option value="AVAILABLE">Available</option>
                <option value="RESERVED">Reserved</option>
                <option value="UNAVAILABLE">Unavailable</option>
                <option value="SOLD">Sold</option>
              </select>
            </Field>
            <Field label="Location" htmlFor="location">
              <input id="location" type="text" value={form.location} onChange={(e) => update("location", e.target.value)} placeholder="City, State" className="w-full h-10 px-3 rounded-md border border-feather/30 bg-ivory text-[14px] focus-ring" />
            </Field>
            <Field label="Price (USD)" htmlFor="priceUsd">
              <input id="priceUsd" type="number" step="0.01" min="0" value={form.priceUsd} onChange={(e) => update("priceUsd", e.target.value)} className="w-full h-10 px-3 rounded-md border border-feather/30 bg-ivory text-[14px] focus-ring" />
            </Field>
            <Field label="Breeder name" htmlFor="breederName">
              <input id="breederName" type="text" value={form.breederName} onChange={(e) => update("breederName", e.target.value)} className="w-full h-10 px-3 rounded-md border border-feather/30 bg-ivory text-[14px] focus-ring" />
            </Field>
            <Field label="Origin state" htmlFor="originState">
              <input id="originState" type="text" value={form.originState} onChange={(e) => update("originState", e.target.value)} className="w-full h-10 px-3 rounded-md border border-feather/30 bg-ivory text-[14px] focus-ring" />
            </Field>
          </div>
          <ImageUpload value={form.photos} onChange={(value) => update("photos", value)} onBusyChange={setUploading} />
          <Field label="Short description" htmlFor="shortDescription">
            <textarea id="shortDescription" rows={2} value={form.shortDescription} onChange={(e) => update("shortDescription", e.target.value)} className="w-full px-3 py-2 rounded-md border border-feather/30 bg-ivory text-[14px] focus-ring" />
          </Field>
          <Field label="Long description" htmlFor="longDescription">
            <textarea id="longDescription" rows={4} value={form.longDescription} onChange={(e) => update("longDescription", e.target.value)} className="w-full px-3 py-2 rounded-md border border-feather/30 bg-ivory text-[14px] focus-ring" />
          </Field>
          <Field label="Care notes / species FAQ" htmlFor="careNotes">
            <textarea id="careNotes" rows={4} value={form.careNotes} onChange={(e) => update("careNotes", e.target.value)} className="w-full px-3 py-2 rounded-md border border-feather/30 bg-ivory text-[14px] focus-ring" />
          </Field>
          <div className="flex justify-end gap-2 pt-2 border-t border-feather/15">
            <button type="button" onClick={() => setOpen(false)} className="h-10 px-4 rounded-md border border-feather/30 hover:bg-feather/10 text-slate text-[13px] font-body font-semibold">
              Cancel
            </button>
            <button type="submit" disabled={submitting || uploading} className="h-10 px-4 rounded-md bg-tail-red hover:bg-tail-red-dark text-white text-[13px] font-body font-semibold disabled:bg-feather/40">
              {submitting ? "Saving..." : mode === "create" ? "Create dossier" : "Save changes"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="text-[11px] font-body font-semibold text-feather uppercase tracking-wide">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
