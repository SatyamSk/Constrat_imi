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

    // 1. Subscribe to auth state changes. The SDK fires SIGNED_IN once it
    //    consumes the URL token after Google OAuth bounces back.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, s) => {
      if (!mounted) return;
      // eslint-disable-next-line no-console
      console.log("[Auth]", event, s?.user?.email ?? "(none)");
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);

      if (s?.user) {
        setTimeout(() => ensureProfile(s.user), 0);
        if (
          (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") &&
          !hasTrackedLogin.current
        ) {
          hasTrackedLogin.current = true;
          trackActivity({ type: "LOGGED_IN", userId: s.user.id }).catch(
            () => {},
          );
        }
      } else {
        setRole("guest");
        hasTrackedLogin.current = false;
      }
    });

    // 2. Read initial session. Note: the SDK will have already consumed any
    //    OAuth hash from the URL on construction.
    supabase.auth
      .getSession()
      .then(({ data: { session: s } }) => {
        if (!mounted) return;
        setSession(s);
        setUser(s?.user ?? null);
        if (s?.user) ensureProfile(s.user);
        setLoading(false);
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

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
        await supabase.from("profiles").insert({
          id: u.id,
          email: u.email ?? "",
          full_name:
            (u.user_metadata?.full_name as string) ??
            (u.user_metadata?.name as string) ??
            "",
          avatar_url: (u.user_metadata?.avatar_url as string) ?? "",
          role: "member",
        });
        setRole("member");
        return;
      }
      setRole(data.role ?? "member");
    } catch {
      setRole("member");
    }
  }

  const signIn = async (email: string, password: string) => {
    if (!supabase) {
      return { error: new Error("Supabase not configured") };
    }
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (!error) return { error: null };
    const msg = error.message.toLowerCase();
    if (msg.includes("email not confirmed")) {
      return {
        error: new Error("Please confirm your email before logging in."),
      };
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
        error: new Error("Supabase not configured"),
        needsEmailConfirmation: false,
      };
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
        // After clicking the confirmation email, land on the callback page;
        // the SDK will consume the token and redirect to dashboard.
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) return { error: new Error(error.message), needsEmailConfirmation: false };

    return {
      error: null,
      needsEmailConfirmation: !!data.user && !data.session,
    };
  };

  const signInWithGoogle = async () => {
    if (!supabase) return { error: new Error("Supabase not configured") };
    // Redirect to /auth/callback — that page is in Supabase's redirect
    // allowlist and waits for SIGNED_IN before sending to dashboard.
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
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
