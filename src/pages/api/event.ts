import type { APIRoute } from "astro";
import { bump } from "../../lib/db";

export const prerender = false;

const ALLOWED = new Set(["view", "sim:open", "sim:predict", "sim:violation", "stamp:earned"]);

/** Aggregate counters only — no identifiers, no IPs, nothing per-person stored. */
export const POST: APIRoute = async ({ request }) => {
  try {
    const { name, slug } = await request.json();
    if (ALLOWED.has(name)) await bump(String(name), String(slug ?? "").slice(0, 120));
  } catch { /* a dropped metric is not worth an error */ }
  return new Response(null, { status: 204 });
};
