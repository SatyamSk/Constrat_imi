import { redirect } from "@tanstack/react-router";
import { supabase } from "./supabase";

/**
 * Use inside a route's `beforeLoad` to redirect non-admins.
 *
 * We check the `profiles.role` row directly so the gate works even if the
 * AuthProvider hasn't hydrated yet (e.g. on a hard refresh of /timetable).
 */
export async function requireAdmin() {
  if (!supabase) {
    throw redirect({ to: "/", replace: true });
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw redirect({ to: "/login", replace: true });
  }
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (data?.role !== "admin") {
    throw redirect({ to: "/", replace: true });
  }
}
