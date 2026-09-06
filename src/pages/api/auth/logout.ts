import type { APIRoute } from "astro";
import { ADMIN_HINT_COOKIE, SESSION_COOKIE } from "../../../lib/auth";

export const prerender = false;

export const GET: APIRoute = ({ cookies, redirect }) => {
  cookies.delete(SESSION_COOKIE, { path: "/" });
  cookies.delete(ADMIN_HINT_COOKIE, { path: "/" });
  return redirect("/");
};
