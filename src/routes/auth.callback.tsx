import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallback,
});

/**
 * Landing page for every Supabase auth redirect.
 *
 * With the **implicit** flow Supabase returns `#access_token=...` in the hash.
 * The Supabase JS client auto-detects it via `detectSessionInUrl: true` and
 * fires `onAuthStateChange(SIGNED_IN, session)`.
 *
 * We just wait for the session to materialise. If there's a `?code=` param
 * (legacy/PKCE), we attempt exchange but never hard-fail — we always fall
 * through to the session poll.
 */
function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"working" | "done" | "error">("working");

  useEffect(() => {
    if (!supabase) {
      setError("Auth is not configured.");
      setStatus("error");
      return;
    }

    let cancelled = false;
    const url = new URL(window.location.href);
    const params = url.searchParams;

    // 1) Surface explicit provider/server errors immediately.
    const urlError = params.get("error_description") || params.get("error");
    if (urlError) {
      setError(prettyError(decodeURIComponent(urlError)));
      setStatus("error");
      return;
    }

    // Also check the hash for errors.
    const hash = window.location.hash.substring(1);
    const hashParams = new URLSearchParams(hash);
    const hashError =
      hashParams.get("error_description") || hashParams.get("error");
    if (hashError) {
      setError(prettyError(decodeURIComponent(hashError)));
      setStatus("error");
      return;
    }

    const recoveryFlow =
      params.get("type") === "recovery" ||
      hashParams.get("type") === "recovery";

    async function handleCallback() {
      if (!supabase || cancelled) return;

      // If there's a PKCE code in the URL, try to exchange it.
      // But if it fails, DON'T show an error — fall through to session poll.
      const code = params.get("code");
      if (code) {
        try {
          // eslint-disable-next-line no-console
          console.log("[auth/callback] Attempting PKCE code exchange...");
          const { data, error: exchErr } =
            await supabase.auth.exchangeCodeForSession(code);
          if (cancelled) return;
          if (!exchErr && data.session) {
            // eslint-disable-next-line no-console
            console.log("[auth/callback] PKCE exchange succeeded.");
            finish(recoveryFlow);
            return;
          }
          if (exchErr) {
            // eslint-disable-next-line no-console
            console.warn(
              "[auth/callback] PKCE exchange failed (will try session poll):",
              exchErr.message,
            );
            // Don't return — fall through to session poll.
          }
        } catch (e) {
          // eslint-disable-next-line no-console
          console.warn("[auth/callback] PKCE exchange threw:", e);
          // Don't return — fall through.
        }
      }

      // For implicit flow the Supabase client auto-parses the #access_token hash.
      // The onAuthStateChange listener fires SIGNED_IN and populates the session.
      // We poll briefly because it happens asynchronously.
      // eslint-disable-next-line no-console
      console.log("[auth/callback] Polling for session...");
      for (let attempt = 0; attempt < 30; attempt++) {
        if (cancelled) return;
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session) {
          // eslint-disable-next-line no-console
          console.log("[auth/callback] Session found on attempt", attempt);
          finish(recoveryFlow);
          return;
        }
        await new Promise((r) => setTimeout(r, 300));
      }

      if (cancelled) return;
      // eslint-disable-next-line no-console
      console.error("[auth/callback] No session after 30 attempts.");
      setError(
        "Could not complete sign-in. Please make sure third-party cookies " +
          "are enabled and try again in a fresh tab.",
      );
      setStatus("error");
    }

    function finish(isRecovery: boolean) {
      if (cancelled) return;
      // Strip OAuth params so back-navigation doesn't re-trigger.
      window.history.replaceState({}, document.title, "/auth/callback");
      setStatus("done");
      navigate({
        to: isRecovery ? "/reset-password" : "/dashboard",
        replace: true,
      });
    }

    handleCallback();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (status === "error") {
    return (
      <Center>
        <h1 className="font-serif text-[28px]">Sign-in failed</h1>
        <p className="mt-3 text-[15px] text-text-secondary leading-[1.65]">
          {error}
        </p>
        <p className="mt-3 text-[12px] text-text-muted leading-[1.6]">
          Tip: open a fresh tab (not private mode), then click "Continue with
          Google" once. Don't click twice — that overwrites the security token.
        </p>
        <a href="/login" className="btn-primary mt-8 inline-flex">
          Back to login
        </a>
      </Center>
    );
  }

  return (
    <Center>
      <div className="w-12 h-12 mx-auto mb-6 border-4 border-orange/30 border-t-orange rounded-full animate-spin" />
      <h1 className="font-serif text-[24px]">Signing you in…</h1>
      <p className="mt-2 text-[15px] text-text-muted">
        You'll be redirected in a moment.
      </p>
    </Center>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-5"
      style={{
        background:
          "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(232,73,15,0.06), transparent), #FAFAF8",
      }}
    >
      <div className="w-full max-w-[460px] text-center">{children}</div>
    </div>
  );
}

function prettyError(msg: string): string {
  const lower = msg.toLowerCase();
  if (lower.includes("redirect")) {
    return (
      "This domain isn't allowed by Supabase. The admin needs to add " +
      `${window.location.origin}/auth/callback to Supabase → Authentication → URL Configuration → Redirect URLs.`
    );
  }
  return msg;
}
