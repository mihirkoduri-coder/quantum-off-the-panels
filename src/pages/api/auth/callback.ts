import type { APIRoute } from "astro";
import { ADMIN_GITHUB_LOGIN, OAUTH_STATE_COOKIE, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS, createSessionCookie } from "../../../lib/auth";
import { exchangeCodeForToken, fetchGithubLogin } from "../../../lib/github";

export const prerender = false;

export const GET: APIRoute = async ({ url, cookies, redirect }) => {
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expectedState = cookies.get(OAUTH_STATE_COOKIE)?.value;
  cookies.delete(OAUTH_STATE_COOKIE, { path: "/" });

  if (!code || !state || !expectedState || state !== expectedState) {
    return redirect("/admin/login?error=state_mismatch");
  }

  let accessToken: string;
  let login: string;
  try {
    accessToken = await exchangeCodeForToken(code);
    login = await fetchGithubLogin(accessToken);
  } catch (err) {
    console.error("GitHub OAuth callback failed:", err);
    return redirect("/admin/login?error=github_error");
  }

  if (login !== ADMIN_GITHUB_LOGIN) {
    return redirect("/admin/login?error=not_allowed");
  }

  cookies.set(SESSION_COOKIE, createSessionCookie({ login, accessToken }), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  return redirect("/admin");
};
