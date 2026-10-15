export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export function parsePhotos(value: string): string[] {
  try {
    const photos = JSON.parse(value || "[]");
    return Array.isArray(photos) ? photos.filter((p): p is string => typeof p === "string") : [];
  } catch { return value ? [value] : []; }
}
