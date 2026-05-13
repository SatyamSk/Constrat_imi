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
 * PKCE is the recommended flow for SPAs:
 *  - More secure than implicit (no access_token in URL fragment).
 *  - Returns `?code=...` to /auth/callback which we exchange for a session.
 *  - Works cleanly with refresh tokens.
 *
 * In Supabase Dashboard → Authentication → URL Configuration:
 *   Site URL:               https://yourdomain.com
 *   Redirect URLs (add):    https://yourdomain.com/auth/callback
 *                           http://localhost:5173/auth/callback
 *
 * In Authentication → Providers → Google:
 *   - Toggle on, paste your Google OAuth Client ID + Secret.
 *   - Authorized redirect URI in Google Cloud Console must be:
 *     https://<project-ref>.supabase.co/auth/v1/callback
 */
export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          flowType: "pkce",
          detectSessionInUrl: true,
          autoRefreshToken: true,
          persistSession: true,
          storage:
            typeof window !== "undefined" ? window.localStorage : undefined,
        },
      })
    : null;

export const isSupabaseConfigured = !!supabase;
