import { defineMiddleware } from "astro:middleware";
import { SESSION_COOKIE, verifySessionCookie } from "./lib/auth";

/**
 * Gates everything under /admin except the login page itself. Only runs
 * for on-demand routes (this one and everything under /admin/, /api/auth/
 * are marked `export const prerender = false`) — every prerendered public
 * page never touches this at all.
 */
export const onRequest = defineMiddleware((context, next) => {
  const { pathname } = context.url;
  const isGatedRoute = pathname.startsWith("/admin") && pathname !== "/admin/login";

  if (isGatedRoute) {
    const session = verifySessionCookie(context.cookies.get(SESSION_COOKIE)?.value);
    if (!session) {
      return context.redirect("/admin/login");
    }
    context.locals.session = session;
  }

  return next();
});
