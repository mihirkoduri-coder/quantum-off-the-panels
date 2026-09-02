import type { APIRoute } from "astro";
import { randomBytes } from "node:crypto";
import { OAUTH_STATE_COOKIE } from "../../../lib/auth";

export const prerender = false;

export const GET: APIRoute = ({ cookies, redirect, site }) => {
  const state = randomBytes(16).toString("hex");
  cookies.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600, // just needs to survive the round trip to GitHub and back
  });

  // built from astro.config.mjs's `site`, not the incoming request — on
  // Vercel's serverless runtime request.url reflects the function's
  // internal address (localhost), not the public domain.
  const redirectUri = new URL("/api/auth/callback", site).toString();
  const authorizeUrl = new URL("https://github.com/login/oauth/authorize");
  authorizeUrl.searchParams.set("client_id", import.meta.env.GITHUB_CLIENT_ID);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("scope", "repo");
  authorizeUrl.searchParams.set("state", state);

  return redirect(authorizeUrl.toString());
};
