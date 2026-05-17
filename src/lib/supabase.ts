import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.warn(
    "[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY missing. Running in demo mode.",
  );
}

/**
 * Minimal Supabase client — same shape as the reference HTML app that works
 * in the user's other project. NO flowType set, NO custom storage, NO
 * custom detectSessionInUrl. The SDK's defaults work; every time we've added
 * extra config the OAuth flow has broken.
 *
 * The SDK default IS `detectSessionInUrl: true` and `persistSession: true`
 * and `autoRefreshToken: true` — we don't need to set them.
 *
 * If you want PKCE later, add `flowType: "pkce"` AND make sure /auth/callback
 * is in Supabase's redirect allowlist AND that no other client overwrites
 * the verifier. For now: don't.
 */
export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export const isSupabaseConfigured = !!supabase;
