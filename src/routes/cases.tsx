import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * `/cases` was merged into `/practice` (which now shows the case library
 * inline). We keep a stub route that redirects, so old bookmarks and nav
 * tiles continue to work.
 */
export const Route = createFileRoute("/cases")({
  beforeLoad: () => {
    throw redirect({ to: "/practice", replace: true });
  },
  component: () => null,
});
