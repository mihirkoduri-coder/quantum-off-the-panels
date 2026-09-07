import type { APIRoute } from "astro";
import { commitFile, getFileContent } from "../../../lib/github";
import { copy as defaultCopy } from "../../../lib/site-copy";

export const prerender = false;

const COPY_PATH = "src/data/site-copy.json";

function setPath(obj: any, path: string, value: unknown) {
  const keys = path.split(".");
  const last = keys.pop()!;
  const target = keys.reduce((o, k) => (o[k] ??= {}), obj);
  target[last] = value;
}

/**
 * The one endpoint for every in-context copy edit — text, the logo's
 * style toggles, all of it. Values keep whatever type the client actually
 * sent (string, boolean, ...) rather than being coerced to string: a
 * boolean field like titleStyle.tilt has to land in the JSON as a real
 * `true`/`false`, not the string "true" — Boolean("false") is true in JS,
 * so silently stringifying booleans here would be a genuine, hard-to-spot
 * correctness bug the moment someone toggled a switch off.
 */
export const POST: APIRoute = async ({ request, locals }) => {
  const session = locals.session!; // middleware guarantees this
  let changes: Record<string, unknown>;
  try {
    changes = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400 });
  }

  if (!changes || typeof changes !== "object" || Array.isArray(changes)) {
    return new Response(JSON.stringify({ error: "Body must be a flat object of dot-path -> value" }), { status: 400 });
  }

  try {
    const current = await getFileContent(session.accessToken, COPY_PATH);
    const updated = current ? JSON.parse(current) : JSON.parse(JSON.stringify(defaultCopy));

    for (const [path, value] of Object.entries(changes)) {
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
