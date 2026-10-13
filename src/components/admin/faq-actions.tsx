"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface FaqData {
  id: string;
  question: string;
  answer: string;
  category?: string | null;
  displayOrder: number;
  isPublished: boolean;
}

export function FaqCreateButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    question: "",
    answer: "",
    category: "General",
    displayOrder: 0,
    isPublished: true,
  });

  function update<K extends keyof typeof form>(key: K, val: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/faq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success("FAQ entry created.");
      setOpen(false);
      setForm({ question: "", answer: "", category: "General", displayOrder: 0, isPublished: true });
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-tail-red hover:bg-tail-red-dark text-white text-[13px] font-body font-semibold">
          <Plus className="h-4 w-4" /> Add FAQ
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-heading text-slate">Add FAQ entry</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-[11px] font-body font-semibold text-feather uppercase tracking-wide">Question *</label>
            <input type="text" required value={form.question} onChange={(e) => update("question", e.target.value)} className="mt-1 w-full h-10 px-3 rounded-md border border-feather/30 bg-ivory text-[14px] focus-ring" />
          </div>
          <div>
            <label className="text-[11px] font-body font-semibold text-feather uppercase tracking-wide">Answer *</label>
            <textarea required rows={5} value={form.answer} onChange={(e) => update("answer", e.target.value)} className="mt-1 w-full px-3 py-2 rounded-md border border-feather/30 bg-ivory text-[14px] focus-ring" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-body font-semibold text-feather uppercase tracking-wide">Category</label>
              <input type="text" value={form.category} onChange={(e) => update("category", e.target.value)} className="mt-1 w-full h-10 px-3 rounded-md border border-feather/30 bg-ivory text-[14px] focus-ring" />
            </div>
            <div>
              <label className="text-[11px] font-body font-semibold text-feather uppercase tracking-wide">Order</label>
              <input type="number" min="0" value={form.displayOrder} onChange={(e) => update("displayOrder", Number(e.target.value))} className="mt-1 w-full h-10 px-3 rounded-md border border-feather/30 bg-ivory text-[14px] focus-ring" />
            </div>
            <div>
              <label className="text-[11px] font-body font-semibold text-feather uppercase tracking-wide">Published</label>
              <select value={form.isPublished ? "1" : "0"} onChange={(e) => update("isPublished", e.target.value === "1")} className="mt-1 w-full h-10 px-3 rounded-md border border-feather/30 bg-ivory text-[14px] focus-ring">
                <option value="1">Yes</option>
                <option value="0">Draft</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-feather/15">
            <button type="button" onClick={() => setOpen(false)} className="h-10 px-4 rounded-md border border-feather/30 hover:bg-feather/10 text-slate text-[13px] font-body font-semibold">Cancel</button>
            <button type="submit" disabled={submitting} className="h-10 px-4 rounded-md bg-tail-red hover:bg-tail-red-dark text-white text-[13px] font-body font-semibold disabled:bg-feather/40">
              {submitting ? "Saving..." : "Create entry"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function FaqEditButton({ faq }: { faq: FaqData }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    question: faq.question,
    answer: faq.answer,
    category: faq.category ?? "General",
    displayOrder: faq.displayOrder,
    isPublished: faq.isPublished,
  });

  function update<K extends keyof typeof form>(key: K, val: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/faq/${faq.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success("FAQ updated.");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="inline-flex items-center gap-1 text-tail-red text-[12px] font-body font-semibold hover:underline">
          <Pencil className="h-3 w-3" /> Edit
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-heading text-slate">Edit FAQ entry</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-[11px] font-body font-semibold text-feather uppercase tracking-wide">Question</label>
            <input type="text" required value={form.question} onChange={(e) => update("question", e.target.value)} className="mt-1 w-full h-10 px-3 rounded-md border border-feather/30 bg-ivory text-[14px] focus-ring" />
          </div>
          <div>
            <label className="text-[11px] font-body font-semibold text-feather uppercase tracking-wide">Answer</label>
            <textarea required rows={5} value={form.answer} onChange={(e) => update("answer", e.target.value)} className="mt-1 w-full px-3 py-2 rounded-md border border-feather/30 bg-ivory text-[14px] focus-ring" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-body font-semibold text-feather uppercase tracking-wide">Category</label>
              <input type="text" value={form.category} onChange={(e) => update("category", e.target.value)} className="mt-1 w-full h-10 px-3 rounded-md border border-feather/30 bg-ivory text-[14px] focus-ring" />
            </div>
            <div>
              <label className="text-[11px] font-body font-semibold text-feather uppercase tracking-wide">Order</label>
              <input type="number" min="0" value={form.displayOrder} onChange={(e) => update("displayOrder", Number(e.target.value))} className="mt-1 w-full h-10 px-3 rounded-md border border-feather/30 bg-ivory text-[14px] focus-ring" />
            </div>
            <div>
              <label className="text-[11px] font-body font-semibold text-feather uppercase tracking-wide">Published</label>
              <select value={form.isPublished ? "1" : "0"} onChange={(e) => update("isPublished", e.target.value === "1")} className="mt-1 w-full h-10 px-3 rounded-md border border-feather/30 bg-ivory text-[14px] focus-ring">
                <option value="1">Yes</option>
                <option value="0">Draft</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-feather/15">
            <button type="button" onClick={() => setOpen(false)} className="h-10 px-4 rounded-md border border-feather/30 hover:bg-feather/10 text-slate text-[13px] font-body font-semibold">Cancel</button>
            <button type="submit" disabled={submitting} className="h-10 px-4 rounded-md bg-tail-red hover:bg-tail-red-dark text-white text-[13px] font-body font-semibold disabled:bg-feather/40">
              {submitting ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function FaqDeleteButton({ faqId, question }: { faqId: string; question: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function del() {
    if (!confirm(`Delete this FAQ?\n\n"${question.slice(0, 60)}${question.length > 60 ? "..." : ""}"`)) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/faq/${faqId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success("FAQ entry deleted.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={del}
      disabled={submitting}
      className="inline-flex items-center gap-1 text-feather hover:text-tail-red text-[12px] font-body font-semibold disabled:opacity-50"
      aria-label="Delete FAQ"
    >
      <Trash2 className="h-3 w-3" /> Delete
    </button>
  );
}
