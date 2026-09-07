import type { APIRoute } from "astro";

export const prerender = false;

/** Same reason issues/new-redirect.ts exists — a plain HTML form can't
 *  GET/POST straight to a dynamic path segment, so it lands here first. */
export const GET: APIRoute = ({ url, redirect }) => {
  const slug = (url.searchParams.get("slug") ?? "").trim().toLowerCase();
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return redirect("/admin#simulations");
  }
  return redirect(`/admin/sims/${slug}`);
};
