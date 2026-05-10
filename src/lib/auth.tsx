import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase, isSupabaseConfigured } from "./supabase";
import type { User, Session } from "@supabase/supabase-js";

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
  ) => Promise<{ error: Error | null }>;
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
  signUp: async () => ({ error: null }),
  signInWithGoogle: async () => ({ error: null }),
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string>("guest");

  useEffect(() => {
    if (!supabase || !isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    // 1. Set up the auth state listener FIRST — this catches OAuth callbacks
    //    where the hash fragment contains the access token (implicit flow)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, s) => {
      console.log("[Auth] State change:", event, s?.user?.email);
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        // Use setTimeout to avoid Supabase deadlock on concurrent requests
        setTimeout(() => fetchRole(s.user.id), 0);
      } else {
        setRole("guest");
      }
      setLoading(false);
    });

    // 2. Then check for an existing session in storage
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        fetchRole(s.user.id);
      }
      // Only stop loading if there's no OAuth callback in progress
      // The hash fragment (#access_token=...) signals an implicit flow callback
      const hasAuthCallback = window.location.hash.includes("access_token");
      if (!hasAuthCallback) {
        setLoading(false);
      }
      // If hasAuthCallback is true, onAuthStateChange will fire and set loading=false
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchRole(userId: string) {
    if (!supabase) return;
    try {
      const { data } = await supabase.from("profiles").select("role").eq("id", userId).single();
      if (data?.role) setRole(data.role);
    } catch {
      // Profile may not exist yet for new OAuth users — the trigger creates it
      setRole("member");
    }
  }

  const signIn = async (email: string, password: string) => {
    if (!supabase)
      return {
        error: new Error(
          "Supabase not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment.",
        ),
      };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? new Error(error.message) : null };
  };

  const signUp = async (email: string, password: string, metadata: Record<string, unknown>) => {
    if (!supabase)
      return {
        error: new Error(
          "Supabase not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment.",
        ),
      };

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata },
    });

    if (error) return { error: new Error(error.message) };

    // After signup, update the profile with additional fields
    // The DB trigger creates the basic profile, we enrich it here
    if (data.user) {
      const profileUpdate: Record<string, unknown> = {};
      if (metadata.full_name) profileUpdate.full_name = metadata.full_name;
      if (metadata.batch) profileUpdate.batch = metadata.batch;
      if (metadata.section) profileUpdate.section = metadata.section;
      if (metadata.phone) profileUpdate.phone = metadata.phone;

      // Small delay to let the trigger create the profile first
      setTimeout(async () => {
        if (!supabase) return;
        await supabase.from("profiles").update(profileUpdate).eq("id", data.user!.id);
      }, 1000);
    }

    return { error: null };
  };

  const signInWithGoogle = async () => {
    if (!supabase) return { error: new Error("Supabase not configured") };
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });
    return { error: error ? new Error(error.message) : null };
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setRole("guest");
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
