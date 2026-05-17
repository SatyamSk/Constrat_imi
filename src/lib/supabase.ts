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
 * Implicit flow — returns #access_token directly in the URL hash.
 * The SDK's detectSessionInUrl (default: true) picks it up automatically.
 *
 * DO NOT use PKCE here. The code verifier stored in localStorage before
 * the Google redirect consistently gets lost/mismatched, producing the
 * "Unable to exchange external code: 4/0A" error. Implicit avoids this.
 */
export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          flowType: "implicit",
        },
      })
    : null;

export const isSupabaseConfigured = !!supabase;
