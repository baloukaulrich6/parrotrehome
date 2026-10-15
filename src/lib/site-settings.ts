import "server-only";
import { readFileSync, mkdirSync, writeFileSync, renameSync } from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { defaultSiteSettings, siteSettingsSchema, type SiteSettings } from "./site-settings-schema";
const location = () => path.resolve(process.env.SITE_SETTINGS_FILE || "var/site-settings.json");
export function readSiteSettings(): SiteSettings {
  try { return siteSettingsSchema.parse({ ...defaultSiteSettings, ...JSON.parse(readFileSync(location(), "utf8")) }); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return { ...defaultSiteSettings }; throw error; }
}
export function saveSiteSettings(settings: SiteSettings) {
  const validated = siteSettingsSchema.parse(settings);
  const file = location();
  mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${randomUUID()}.tmp`;
  writeFileSync(temporary, JSON.stringify(validated, null, 2), { mode: 0o600 });
  renameSync(temporary, file);
}
