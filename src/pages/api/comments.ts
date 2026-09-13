import type { APIRoute } from "astro";
import { listSubmissions } from "../../lib/db";

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const slug = url.searchParams.get("slug") ?? "";
  const rows = await listSubmissions({ kind: "comment", status: "approved", slug, limit: 200 });
  // never leak the moderation fields (ip_hash isn't even selected; status/kind are the same for every row here)
  const safe = rows.map((r) => ({ id: r.id, name: r.name, body: r.body, reply: r.reply, created_at: r.created_at }));
  return new Response(JSON.stringify(safe.reverse()), { headers: { "content-type": "application/json" } });
};
