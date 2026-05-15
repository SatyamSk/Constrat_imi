import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallback,
});

/**
 * Single landing page for every Supabase auth redirect:
 *   - Google OAuth:           ?code=<pkce-code>
 *   - Email confirmation:     ?code=<pkce-code>
 *   - Password recovery:      ?code=<pkce-code>&type=recovery
 *   - Magic link:             ?code=<pkce-code>
 *   - Errors:                 ?error=...&error_description=...
 *
 * The Supabase JS client doesn't auto-exchange `?code=` for us — we have to
 * call `exchangeCodeForSession` explicitly. (It DOES auto-detect the legacy
 * `#access_token=...` hash, but PKCE never produces that.)
 *
 * Common failure: "Unable to exchange external code". Causes:
 *  1. The PKCE verifier in localStorage was cleared between sign-in
 *     and callback (private mode, third-party cookie reset).
 *  2. The user clicked sign-in twice and the second flow's verifier
 *     overwrote the first.
 *  3. The callback domain doesn't match the Site URL or Redirect URLs
 *     configured in Supabase Dashboard → Authentication → URL Configuration.
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

    const code = params.get("code");
    const recoveryFlow = params.get("type") === "recovery";

    async function doExchange() {
      if (!supabase) return;

      // If there's no code, maybe the session was already exchanged by the
      // client (back button, etc). Check getSession.
      if (!code) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          finish(session, recoveryFlow);
          return;
        }
        setError("No sign-in code in this URL. Please try again.");
        setStatus("error");
        return;
      }

      try {
        const { data, error: exchErr } =
          await supabase.auth.exchangeCodeForSession(code);

        if (cancelled) return;

        if (exchErr) {
          // Most often: PKCE verifier missing/mismatched. Tell the user
          // exactly what to do.
          setError(prettyError(exchErr.message));
          setStatus("error");
          return;
        }

        if (data.session) {
          finish(data.session, recoveryFlow);
        } else {
          setError("Sign-in completed but no session was returned. Try again.");
          setStatus("error");
        }
      } catch (e) {
        if (cancelled) return;
        setError(
          e instanceof Error
            ? prettyError(e.message)
            : "Unexpected error while completing sign-in.",
        );
        setStatus("error");
      }
    }

    function finish(_session: unknown, isRecovery: boolean) {
      if (cancelled) return;
      // Strip the OAuth params so a back-navigation doesn't re-trigger.
      window.history.replaceState({}, document.title, "/auth/callback");
      setStatus("done");
      // Recovery flow → reset password page. Otherwise → dashboard.
      navigate({
        to: isRecovery ? "/reset-password" : "/dashboard",
        replace: true,
      });
    }

    doExchange();

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
  if (lower.includes("exchange external code") || lower.includes("code verifier")) {
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
