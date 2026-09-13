import type { APIRoute } from "astro";
import { addSubmission, recentCount, bump, type Kind } from "../../lib/db";
import { hashIp } from "../../lib/auth";
import { screen } from "../../lib/spam";

export const prerender = false;

const KINDS: Kind[] = ["letter", "question", "comment"];

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { "content-type": "application/json" } });

  let data: any;
  try { data = await request.json(); } catch { return json({ error: "Bad request." }, 400); }

  const kind = data.kind as Kind;
  if (!KINDS.includes(kind)) return json({ error: "Unknown kind." }, 400);

  const v = screen({
    name: String(data.name ?? ""), body: String(data.body ?? ""),
    trap: String(data.website ?? ""), elapsed: Number(data.elapsed ?? 0),
  });
  // a tripped honeypot gets a cheerful 200 so bots do not learn anything
  if (!v.ok) return v.why === "rejected" ? json({ ok: true }) : json({ error: v.why }, 400);

  let ip = "unknown";
  try { ip = clientAddress ?? "unknown"; } catch { /* not available in every runtime — rate limiting just degrades */ }
  const ip_hash = hashIp(ip);
  if (await recentCount(ip_hash) >= 5)
    return json({ error: "You've sent a few already — give it ten minutes." }, 429);

  // Letters and questions are curated by definition, so they always wait.
  // Comments go live unless something about them looks off.
  const status = kind === "comment" && !v.hold ? "approved" : "pending";

  await addSubmission({
    kind, post_slug: String(data.slug ?? "").slice(0, 120),
    name: String(data.name).trim().slice(0, 60),
    body: String(data.body).trim().slice(0, 4000),
    status, ip_hash,
  });
  await bump(`submit:${kind}`, String(data.slug ?? ""));

  return json({ ok: true, status });
};
