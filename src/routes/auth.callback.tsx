import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallback,
});

/**
 * Landing page for every Supabase auth redirect.
 *
 * With the **implicit** flow Supabase returns an `#access_token=...` hash.
 * The Supabase JS client auto-detects it via `detectSessionInUrl: true` and
 * fires an `onAuthStateChange(SIGNED_IN, session)` event.
 *
 * All we need to do here is:
 *  1. Wait for the session to appear.
 *  2. If there's an `?error=...` query param (provider error), show it.
 *  3. Redirect to /dashboard (or /reset-password for recovery flows).
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

    // Also check the hash for errors (some providers put them there).
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

    // For PKCE legacy: if there's a ?code= param, try to exchange it.
    const code = params.get("code");

    async function handleCallback() {
      if (!supabase) return;

      // If we have a PKCE code, exchange it (backwards compat).
      if (code) {
        try {
          const { data, error: exchErr } =
            await supabase.auth.exchangeCodeForSession(code);
          if (cancelled) return;
          if (exchErr) {
            setError(prettyError(exchErr.message));
            setStatus("error");
            return;
          }
          if (data.session) {
            finish(recoveryFlow);
            return;
          }
        } catch {
          // Fall through to the session-poll below.
        }
      }

      // For implicit flow the Supabase client auto-parses the hash.
      // Give it a moment, then check for the session.
      // We poll briefly because onAuthStateChange fires asynchronously.
      for (let attempt = 0; attempt < 20; attempt++) {
        if (cancelled) return;
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session) {
          finish(recoveryFlow);
          return;
        }
        await new Promise((r) => setTimeout(r, 250));
      }

      if (cancelled) return;
      setError("No session found after sign-in. Please try again.");
      setStatus("error");
    }

    function finish(isRecovery: boolean) {
      if (cancelled) return;
      // Strip the OAuth params so a back-navigation doesn't re-trigger.
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
        <p className="mt-3 text-[14px] text-text-secondary leading-[1.65]">
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
      <p className="mt-2 text-[13px] text-text-muted">
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
  if (
    lower.includes("exchange external code") ||
    lower.includes("code verifier")
  ) {
    return (
      "Your sign-in token expired before we could complete it. This usually means " +
      "the page was reloaded or browser storage was cleared during sign-in. " +
      "Please try again."
    );
  }
  if (lower.includes("redirect")) {
    return (
      "This domain isn't allowed by Supabase. The admin needs to add " +
      `${window.location.origin}/auth/callback to Supabase → Authentication → URL Configuration → Redirect URLs.`
    );
  }
  return msg;
}
