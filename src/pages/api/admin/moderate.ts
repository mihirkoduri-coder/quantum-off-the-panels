import type { APIRoute } from "astro";
import { setStatus, setReply, setFeatured, removeSubmission } from "../../../lib/db";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  // middleware.ts already rejects unauthenticated requests to /api/admin/*
  // before this ever runs — locals.session is guaranteed set here, same as
  // every other admin API route.
  void locals.session!;

  const { action, id, value } = await request.json();
  const n = Number(id);
  if (!Number.isFinite(n)) return new Response("Bad id.", { status: 400 });

  if (action === "approve") await setStatus(n, "approved");
  else if (action === "reject") await setStatus(n, "rejected");
  else if (action === "pend") await setStatus(n, "pending");
  else if (action === "reply") await setReply(n, String(value ?? "").slice(0, 4000));
  else if (action === "feature") await setFeatured(n, Boolean(value));
  else if (action === "delete") await removeSubmission(n);
  else return new Response("Unknown action.", { status: 400 });

  return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" } });
};
