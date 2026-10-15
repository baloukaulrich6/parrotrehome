import { z } from "zod";

export const photosSchema = z.string().max(12000).refine((value) => {
  try {
    const photos = JSON.parse(value);
    return Array.isArray(photos) && photos.length <= 8 && photos.every((photo) => {
      if (typeof photo !== "string") return false;
      if (/^\/api\/media\/[a-f0-9-]{36}\.webp$/.test(photo)) return true;
      try { return new URL(photo).protocol === "https:"; } catch { return false; }
    });
  } catch { return false; }
}, "Photos must be a valid list of up to 8 images.");
