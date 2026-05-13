import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  type ReactNode,
} from "react";
import { supabase, isSupabaseConfigured } from "./supabase";
import { trackActivity } from "./activityTracker";
import type { User, Session } from "@supabase/supabase-js";

type SignUpResult = {
  error: Error | null;
  /**
   * True when Supabase returned a user but no session.
   * That means email confirmation is enabled and we should NOT redirect to the dashboard.
   */
  needsEmailConfirmation: boolean;
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  isMember: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (
    email: string,
    password: string,
    metadata: Record<string, unknown>,
  ) => Promise<SignUpResult>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  isAdmin: false,
  isMember: false,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null, needsEmailConfirmation: false }),
  signInWithGoogle: async () => ({ error: null }),
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string>("guest");
  const hasTrackedLogin = useRef(false);

  useEffect(() => {
    if (!supabase || !isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    let mounted = true;

    // 1. Subscribe to auth changes (catches SIGNED_IN after OAuth callback exchange).
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, s) => {
      if (!mounted) return;
      // eslint-disable-next-line no-console
      console.log("[Auth] state change:", event, s?.user?.email ?? "(none)");
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);

      if (s?.user) {
        // setTimeout avoids a Supabase deadlock when calling .from() inside the listener.
        setTimeout(() => ensureProfile(s.user), 0);

        if (
          (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") &&
          !hasTrackedLogin.current
        ) {
          hasTrackedLogin.current = true;
          trackActivity({ type: "LOGGED_IN", userId: s.user.id }).catch(() => {
            // Activity tracking is best-effort; never block login.
          });
        }
      } else {
        setRole("guest");
        hasTrackedLogin.current = false;
      }
    });

    // 2. Load the initial session. The PKCE listener above also fires SIGNED_IN
    //    on first successful exchange, but we still want to populate state ASAP
    //    on a normal page load with an existing session.
    supabase.auth
      .getSession()
      .then(({ data: { session: s } }) => {
        if (!mounted) return;
        setSession(s);
        setUser(s?.user ?? null);
        if (s?.user) {
          ensureProfile(s.user);
        }
        setLoading(false);
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error("[Auth] getSession failed:", err);
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  /**
   * Make sure a row exists in `profiles` for this user.
   *
   * The `handle_new_user` trigger in migration 001 should create one automatically,
   * but if it fails (e.g. Google sign-in before the trigger was deployed, or a
   * service-role issue) we self-heal here so the rest of the app doesn't break.
   */
  async function ensureProfile(u: User) {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", u.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        // eslint-disable-next-line no-console
        console.error("[Auth] profile fetch error:", error);
      }

      if (!data) {
        const { error: insertError } = await supabase.from("profiles").insert({
          id: u.id,
          email: u.email ?? "",
          full_name:
            (u.user_metadata?.full_name as string) ??
            (u.user_metadata?.name as string) ??
            "",
          avatar_url: (u.user_metadata?.avatar_url as string) ?? "",
          role: "member",
        });

        if (insertError) {
          // eslint-disable-next-line no-console
          console.error("[Auth] failed to self-heal profile:", insertError);
          setRole("member"); // optimistic; UI will recover on next refresh
          return;
        }
        setRole("member");
        return;
      }

      setRole(data.role ?? "member");
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[Auth] ensureProfile crashed:", err);
      setRole("member");
    }
  }

  const signIn = async (email: string, password: string) => {
    if (!supabase) {
      return {
        error: new Error(
          "Supabase not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env.",
        ),
      };
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) return { error: null };

    // Map common Supabase error codes to friendlier strings (the UI also wraps these).
    const msg = error.message.toLowerCase();
    if (msg.includes("email not confirmed")) {
      return { error: new Error("Please confirm your email before logging in. Check your inbox.") };
    }
    if (msg.includes("invalid login")) {
      return { error: new Error("Invalid email or password.") };
    }
    return { error: new Error(error.message) };
  };

  const signUp = async (
    email: string,
    password: string,
    metadata: Record<string, unknown>,
  ): Promise<SignUpResult> => {
    if (!supabase) {
      return {
        error: new Error(
          "Supabase not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env.",
        ),
        needsEmailConfirmation: false,
      };
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      return { error: new Error(error.message), needsEmailConfirmation: false };
    }

    // If Supabase returned a user but no session, "Confirm email" is enabled.
    const needsEmailConfirmation = !!data.user && !data.session;
    return { error: null, needsEmailConfirmation };
  };

  const signInWithGoogle = async () => {
    if (!supabase) return { error: new Error("Supabase not configured") };
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });
    return { error: error ? new Error(error.message) : null };
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setRole("guest");
    hasTrackedLogin.current = false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isAdmin: role === "admin",
        isMember: role === "member" || role === "admin",
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
