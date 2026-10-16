export type AgeUnit = "weeks" | "months" | "years";
const WEEKS_PER_YEAR = 365.25 / 7;
export function ageToYears(value: number, unit: AgeUnit): number {
  if (!Number.isFinite(value) || value < 0) throw new Error("Enter a non-negative age.");
  return unit === "months" ? value / 12 : unit === "weeks" ? value / WEEKS_PER_YEAR : value;
}
export function ageInput(years?: number | null): { value: string; unit: AgeUnit } {
  if (years == null || !Number.isFinite(years) || years < 0) return { value: "", unit: "months" };
  const unit: AgeUnit = years < 1 / 12 ? "weeks" : years < 1 ? "months" : "years";
  const value = unit === "weeks" ? years * WEEKS_PER_YEAR : unit === "months" ? years * 12 : years;
  return { value: String(Math.round(value * 10000) / 10000), unit };
}
export function formatBirdAge(years?: number | null): string {
  if (years == null || !Number.isFinite(years) || years < 0) return "Age not provided";
  if (years < 1 / WEEKS_PER_YEAR) return "Less than 1 week";
  if (years < 1 / 12) { const weeks = Math.max(1, Math.round(years * WEEKS_PER_YEAR)); return `${weeks} ${weeks === 1 ? "week" : "weeks"}`; }
  if (years < 1) { const months = Math.min(11.9, Math.max(1, Math.round(years * 120) / 10)); return `${months} ${months === 1 ? "month" : "months"}`; }
  const age = Math.round(years * 10) / 10;
  return `${age} ${age === 1 ? "year" : "years"}`;
}
