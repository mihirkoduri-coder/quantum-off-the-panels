import type { APIRoute } from "astro";
import { commitFile, getFileContent } from "../../../lib/github";
import { parsePost, serializePost } from "../../../lib/mdx";
import { upsertConcept } from "../../../lib/concepts-writer";
import { byId } from "../../../data/concepts";

export const prerender = false;

const CONCEPTS_PATH = "src/data/concepts.ts";
const POSTS_DIR = "src/content/posts";

/**
 * The in-place editing counterpart to /admin/issues/[id] — same two files,
 * same commit pattern, but a *targeted merge* of just the changed fields
 * rather than the full form resubmission that page does. That matters here
 * specifically: the in-context editor only ever sees the handful of fields
 * actually rendered on the post page (title, character, quote, ruling...),
 * so a wholesale overwrite would blank out everything else (week, arc,
 * prereqs, sims, body) that never appeared in this request at all.
 */
export const POST: APIRoute = async ({ request, locals }) => {
  const session = locals.session!;
  let body: { id?: string; concept?: Record<string, string>; post?: Record<string, string> };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400 });
  }

  const id = body.id;
  if (!id) {
    return new Response(JSON.stringify({ error: "Missing issue id" }), { status: 400 });
  }

  const existing = byId(id);
  if (!existing) {
    return new Response(JSON.stringify({ error: `No concept with id "${id}"` }), { status: 404 });
  }

  try {
    if (body.concept && Object.keys(body.concept).length > 0) {
      const currentConceptsText = await getFileContent(session.accessToken, CONCEPTS_PATH);
      if (!currentConceptsText) throw new Error("Could not read concepts.ts from the repo");
      const merged = { ...existing, ...body.concept };
      const newConceptsText = upsertConcept(currentConceptsText, merged);
      await commitFile({
        accessToken: session.accessToken,
        path: CONCEPTS_PATH,
        content: newConceptsText,
        message: `admin: edit "${id}" in place (${Object.keys(body.concept).join(", ")})`,
      });
    }

    if (body.post && Object.keys(body.post).length > 0) {
      const postPath = `${POSTS_DIR}/${existing.slug}.mdx`;
      const currentPostText = await getFileContent(session.accessToken, postPath);
      if (!currentPostText) throw new Error(`Could not read ${postPath} from the repo`);
      const parsed = parsePost(currentPostText);
      const mergedFrontmatter = { ...parsed.frontmatter, ...body.post };
      await commitFile({
        accessToken: session.accessToken,
        path: postPath,
        content: serializePost({ frontmatter: mergedFrontmatter, body: parsed.body }),
        message: `admin: edit "${id}" post in place (${Object.keys(body.post).join(", ")})`,
      });
    }

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
