import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Legacy URL. Redirects to /upgrade — the canonical Pro page.
 * Preserves any bookmarks or emails out in the wild.
 */
export const Route = createFileRoute("/payment")({
  beforeLoad: () => {
    throw redirect({ to: "/upgrade", replace: true });
  },
});
