"use client";
import { useState, type ReactNode } from "react";
import { Bird } from "lucide-react";

export function PhotoGallery({ photos, name, badge }: { photos: string[]; name: string; badge?: ReactNode }) {
  const [selected, setSelected] = useState(0);
  return <div aria-label={`${name} photo gallery`}>
    <div className="relative aspect-[4/5] lg:aspect-[5/6] rounded-xl overflow-hidden bg-feather/10 shadow-md">
      {photos.length ? <img src={photos[selected] ?? photos[0]} alt={`${name} — photo ${selected + 1} of ${photos.length}`} className="h-full w-full object-contain" /> : <div className="absolute inset-0 flex items-center justify-center"><Bird className="h-16 w-16 text-feather/40" aria-hidden /></div>}
      <div className="absolute top-4 left-4">{badge}</div>
    </div>
    {photos.length > 1 && <>
      <p className="text-sm text-feather my-3" aria-live="polite">Photo {selected + 1} of {photos.length}. Select a thumbnail to view.</p>
      <div className="flex gap-3 overflow-x-auto pb-2" role="group" aria-label="Choose a photo">
        {photos.map((photo, index) => <button key={`${photo}-${index}`} type="button" onClick={() => setSelected(index)} aria-label={`View photo ${index + 1} of ${name}`} aria-pressed={index === selected} className={`shrink-0 w-20 h-24 rounded-lg overflow-hidden border-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-tail-red ${index === selected ? "border-tail-red" : "border-feather/20"}`}><img src={photo} alt={`${name} thumbnail ${index + 1}`} className="w-full h-full object-cover" loading="lazy" /></button>)}
      </div>
    </>}
  </div>;
}
