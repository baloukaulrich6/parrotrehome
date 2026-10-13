"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Pencil } from "lucide-react";
import { toast } from "sonner";

interface CmsPageData {
  slug: string;
  title: string;
  body: string;
  isPublished: boolean;
}

export function CmsPageEditDialog({ page }: { page: CmsPageData }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: page.title,
    body: page.body,
    isPublished: page.isPublished,
  });

  function update<K extends keyof typeof form>(key: K, val: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/cms/${page.slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success("Page saved.");
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-slate">Edit page · /cms/{page.slug}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-[11px] font-body font-semibold text-feather uppercase tracking-wide">Title</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              className="mt-1 w-full h-10 px-3 rounded-md border border-feather/30 bg-ivory text-[14px] focus-ring"
            />
          </div>
          <div>
            <label className="text-[11px] font-body font-semibold text-feather uppercase tracking-wide">Body (Markdown)</label>
            <textarea
              required
              rows={20}
              value={form.body}
              onChange={(e) => update("body", e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-md border border-feather/30 bg-ivory text-[13px] font-mono focus-ring"
              placeholder="# Heading&#10;&#10;Paragraph text..."
            />
            <p className="text-[11px] text-feather font-body mt-1">
              Supports Markdown — headings (#), bold (**), lists (-), links ([text](url))
            </p>
          </div>
          <label className="flex items-center gap-2 text-[13px] font-body text-slate cursor-pointer">
            <input
              type="checkbox"
              checked={form.isPublished}
              onChange={(e) => update("isPublished", e.target.checked)}
              className="h-4 w-4 rounded text-tail-red focus-ring"
            />
            Published (visible to customers)
          </label>
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
