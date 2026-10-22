// Require a country calling code; never guess a local number's country.
export function normalizeWhatsAppPhone(value: string): string | null {
  const compact = value.trim().replace(/[\s().-]/g, "").replace(/^00/, "+");
  return /^\+[1-9][0-9]{7,14}$/.test(compact) ? compact : null;
}
export function whatsAppUrl(value: string): string | null {
  const phone = normalizeWhatsAppPhone(value);
  return phone ? `https://wa.me/${phone.slice(1)}` : null;
}
