import { defineMiddleware } from "astro:middleware";
import { SESSION_COOKIE, verifySessionCookie } from "./lib/auth";

/**
 * Gates /admin pages and /api/admin/* endpoints. Only runs for on-demand
 * routes (everything here, plus /api/auth/*, is marked
 * `export const prerender = false`) — every prerendered public page never
 * touches this at all, including the edit-mode overlay script they load:
 * that script hits /api/admin/* directly, which is what's actually
 * enforcing the session, not the client-side hint cookie it reads first.
 */
export const onRequest = defineMiddleware((context, next) => {
  const { pathname } = context.url;
  const isAdminPage = pathname.startsWith("/admin") && pathname !== "/admin/login";
  const isAdminApi = pathname.startsWith("/api/admin");

  if (isAdminPage || isAdminApi) {
    const session = verifySessionCookie(context.cookies.get(SESSION_COOKIE)?.value);
    if (!session) {
      if (isAdminApi) {
        return new Response(JSON.stringify({ error: "Not authenticated" }), {
          status: 401,
          headers: { "content-type": "application/json" },
        });
      }
      return context.redirect("/admin/login");
    }
    context.locals.session = session;
  }

  return next();
});
