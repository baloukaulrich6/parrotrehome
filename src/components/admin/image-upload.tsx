"use client";

import { useId, useState } from "react";
import { toast } from "sonner";
import { MAX_IMAGE_BYTES, parsePhotos } from "@/lib/photo-data";

export function ImageUpload({ value, onChange, onBusyChange }: {
  value: string; onChange: (value: string) => void; onBusyChange: (busy: boolean) => void;
}) {
  const id = useId();
  const [busy, setBusy] = useState(false);
  const photos = parsePhotos(value);
  async function upload(files: FileList | null) {
    if (!files?.length) return;
    if (files.length + photos.length > 8) { toast.error("A maximum of 8 photos is allowed."); return; }
    setBusy(true); onBusyChange(true);
    const uploaded = [...photos];
    try {
      for (const file of Array.from(files)) {
        if (file.size > MAX_IMAGE_BYTES) throw new Error("Images must be at most 5 MB.");
        const res = await fetch("/api/admin/uploads", {
          method: "POST", headers: { "Content-Type": file.type }, body: file,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Upload failed");
        uploaded.push(data.url);
        onChange(JSON.stringify(uploaded));
      }
      toast.success("Photos uploaded. Save the form to publish them in the catalog.");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Upload failed"); }
    finally { setBusy(false); onBusyChange(false); }
  }
  return <div className="space-y-2">
    <label htmlFor={id} className="text-[11px] font-semibold text-feather uppercase">Photos</label>
    <input id={id} type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={busy}
      onChange={(e) => { void upload(e.target.files); e.target.value = ""; }}
      className="block w-full rounded-lg border border-feather/30 bg-ivory p-3 text-sm" />
    <p role="status" className="text-xs text-feather">{busy ? "Uploading…" : "JPEG, PNG or WebP · 5 MB per image · up to 8 photos. First photo is the cover."}</p>
    <div className="flex flex-wrap gap-3">{photos.map((photo, index) => <div key={`${photo}-${index}`} className="w-24">
      <img src={photo} alt={`Photo ${index + 1}`} className="h-20 w-24 rounded-lg object-cover" />
      <button type="button" disabled={busy} className="text-xs text-tail-red" onClick={() => onChange(JSON.stringify(photos.filter((_, i) => i !== index)))}>Remove photo {index + 1}</button>
    </div>)}</div>
  </div>;
}
