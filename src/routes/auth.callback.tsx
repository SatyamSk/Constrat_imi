import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallback,
});

/**
 * Catch-all auth landing. With default Supabase config, the SDK already
 * consumes the OAuth hash on its own when ANY page loads. So if the user
 * lands here, we just wait for SIGNED_IN and redirect; or if there's an
 * explicit error in the URL we show it.
 *
 * After v7, we set the OAuth `redirectTo` to `window.location.origin`, so
 * most users land on `/` instead of here. This page exists as a fallback
 * for any legacy bookmarks or stale config in Supabase.
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

    // Explicit error in URL
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const query = new URLSearchParams(window.location.search);
    const errDesc =
      hash.get("error_description") ||
      query.get("error_description") ||
      hash.get("error") ||
      query.get("error");
    if (errDesc) {
      setError(decodeURIComponent(errDesc.replace(/\+/g, " ")));
      return;
    }

    // Already signed in?
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (session) navigate({ to: "/dashboard", replace: true });
    });

    // Wait for SIGNED_IN if the SDK is still processing
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === "PASSWORD_RECOVERY" && session) {
        navigate({ to: "/reset-password", replace: true });
        return;
      }
      if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session) {
        navigate({ to: "/dashboard", replace: true });
      }
    });

    // 8 seconds, then give up gracefully
    const timeout = window.setTimeout(() => {
      if (!cancelled) {
        navigate({ to: "/login", replace: true });
      }
    }, 8000);

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      window.clearTimeout(timeout);
    };
  }, [navigate]);

  return (
    <div
      className="min-h-screen flex items-center justify-center px-5"
      style={{
        background:
          "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(232,73,15,0.06), transparent), #ffffff",
      }}
    >
      <div className="w-full max-w-[460px] text-center">
        {error ? (
          <>
            <h1 className="text-[28px] font-bold text-[#0a1628]">Sign-in failed</h1>
            <p className="mt-3 text-[15px] text-[#4a5d76] leading-[1.65]">
              {error}
            </p>
            <p className="mt-4 text-[13px] text-[#8a9bb0] leading-[1.6]">
              Almost always one of:
              <br />
              1. Your Supabase project doesn't have{" "}
              <code className="bg-[#f0f4f9] px-1 py-0.5 text-[12px]">
                {window.location.origin}
              </code>{" "}
              in Authentication → URL Configuration → Site URL or Redirect URLs.
              <br />
              2. Google OAuth Client ID / Secret in Supabase doesn't match the
              Google Cloud Console credentials.
              <br />
              3. The Google Cloud Console doesn't have{" "}
              <code className="bg-[#f0f4f9] px-1 py-0.5 text-[12px]">
                https://&lt;project-ref&gt;.supabase.co/auth/v1/callback
              </code>{" "}
              as an Authorized Redirect URI.
            </p>
            <a href="/login" className="btn-primary mt-8 inline-flex">
              Back to login
            </a>
          </>
        ) : (
          <>
            <div className="w-12 h-12 mx-auto mb-6 border-4 border-orange/30 border-t-orange rounded-full animate-spin" />
            <h1 className="text-[22px] font-bold text-[#0a1628]">Signing you in…</h1>
            <p className="mt-2 text-[14px] text-[#8a9bb0]">
              Redirecting you to your dashboard.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
