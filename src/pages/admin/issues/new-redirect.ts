import type { APIRoute } from "astro";

export const prerender = false;

/** The "create new" form on /admin/issues can't POST/GET straight to a
 *  dynamic path segment from plain HTML, so it lands here first and gets
 *  bounced to the real form at /admin/issues/[id]. */
export const GET: APIRoute = ({ url, redirect }) => {
  const id = (url.searchParams.get("id") ?? "").trim().toLowerCase();
  if (!/^[a-z0-9-]+$/.test(id)) {
    return redirect("/admin/issues");
  }
  return redirect(`/admin/issues/${id}`);
};
