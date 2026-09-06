import type { APIRoute } from "astro";
import { commitFile, getFileContent } from "../../../lib/github";
import { copy as defaultCopy } from "../../../lib/site-copy";

export const prerender = false;

const COPY_PATH = "src/data/site-copy.json";

function setPath(obj: any, path: string, value: string) {
  const keys = path.split(".");
  const last = keys.pop()!;
  const target = keys.reduce((o, k) => (o[k] ??= {}), obj);
  target[last] = value;
}

/**
 * Used by both /admin/copy's form (a full resubmission of every field) and
 * the in-context edit overlay (just the handful of keys actually changed
 * on that page). Either way it's a read-current -> apply -> write-whole-
 * file round trip, same as /admin/copy always did — a partial update here
 * still means reading the latest committed copy first, not trusting
 * whatever the bundled build happens to have.
 */
export const POST: APIRoute = async ({ request, locals }) => {
  const session = locals.session!; // middleware guarantees this
  let changes: Record<string, string>;
  try {
    changes = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400 });
  }

  if (!changes || typeof changes !== "object" || Array.isArray(changes)) {
    return new Response(JSON.stringify({ error: "Body must be a flat object of dot-path -> string" }), { status: 400 });
  }

  try {
    const current = await getFileContent(session.accessToken, COPY_PATH);
    const updated = current ? JSON.parse(current) : JSON.parse(JSON.stringify(defaultCopy));

    for (const [path, value] of Object.entries(changes)) {
      if (typeof value !== "string") continue;
      setPath(updated, path, value);
    }

    await commitFile({
      accessToken: session.accessToken,
      path: COPY_PATH,
      content: `${JSON.stringify(updated, null, 2)}\n`,
      message: `admin: edit copy in place (${Object.keys(changes).join(", ")})`,
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "Something went wrong saving.";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
};
