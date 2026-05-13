import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallback,
});

/**
 * Lands here after:
 *   - Google OAuth: ?code=...
 *   - Email confirmation link: ?code=...
 *   - Magic-link / password-recovery: ?code=...
 *
 * With `flowType: "pkce"` and `detectSessionInUrl: true`, the Supabase
 * client auto-exchanges the code on construction. We just need to wait
 * for `onAuthStateChange` to fire SIGNED_IN, then redirect.
 */
function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setError("Auth is not configured.");
      return;
    }

    let cancelled = false;

    // Surface any explicit error in the URL (e.g. ?error=access_denied)
    const params = new URLSearchParams(window.location.search);
    const urlError = params.get("error_description") || params.get("error");
    if (urlError) {
      setError(decodeURIComponent(urlError));
      return;
    }

    // 1) Fast path: the client may have already exchanged the code.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (session) {
        navigate({ to: "/practice", replace: true });
      }
    });

    // 2) Otherwise wait for SIGNED_IN.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === "SIGNED_IN" && session) {
        navigate({ to: "/practice", replace: true });
      }
    });

    // 3) Fallback timeout: if nothing happens in 10s, send them back to login.
    const t = setTimeout(() => {
      if (!cancelled) {
        setError(
          "Sign-in is taking too long. Please try again or use email/password.",
        );
      }
    }, 10_000);

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      clearTimeout(t);
    };
  }, [navigate]);

  return (
    <div
      className="min-h-screen flex items-center justify-center px-5"
      style={{
        background:
          "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(232,73,15,0.06), transparent), #FAFAF8",
      }}
    >
      <div className="w-full max-w-[420px] text-center">
        {error ? (
          <>
            <h1 className="font-serif text-[28px]">Sign-in failed</h1>
            <p className="mt-3 text-[14px] text-text-secondary leading-[1.65]">
              {error}
            </p>
            <a
              href="/login"
              className="btn-primary mt-8 inline-flex"
            >
              Back to login
            </a>
          </>
        ) : (
          <>
            <div className="w-12 h-12 mx-auto mb-6 border-4 border-orange/30 border-t-orange rounded-full animate-spin" />
            <h1 className="font-serif text-[24px]">Signing you in…</h1>
            <p className="mt-2 text-[13px] text-text-muted">
              You'll be redirected in a moment.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
