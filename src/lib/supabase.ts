import { createClient } from "@supabase/supabase-js";

/** Z adresu projektu zostawia tylko https://xxxx.supabase.co – także gdy wklejono np. …/rest/v1/. */
export function projectUrl(raw: string | undefined): string | undefined {
  const s = raw?.trim();
  if (!s) return undefined;
  try {
    return new URL(s).origin;
  } catch {
    return s.replace(/\/+$/, "");
  }
}

const url = projectUrl(import.meta.env.VITE_SUPABASE_URL as string | undefined);
const key = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

export const configured = Boolean(url && key);

export const supabase = createClient(url || "http://localhost", key || "missing", {
  auth: { persistSession: true, autoRefreshToken: true },
});
