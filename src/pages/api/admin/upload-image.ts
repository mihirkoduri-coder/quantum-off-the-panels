import type { APIRoute } from "astro";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { commitFile } from "../../../lib/github";

export const prerender = false;

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // before downsizing
const MAX_DIMENSION = 1600; // longest edge, after downsizing
const UPLOADS_DIR = "public/uploads";

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
};

/**
 * General-purpose image upload, not tied to the About page specifically —
 * the same endpoint a future "add a cover image to this post" feature
 * would reuse. Commits straight into public/uploads/ (same "git is the
 * only store" model every other admin save uses), named by a caller-given
 * slug plus a content hash so re-uploading the same field always lands at
 * a fresh URL — nothing else has to bust a cache.
 */
export const POST: APIRoute = async ({ request, locals }) => {
  const session = locals.session!;
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid upload" }), { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return new Response(JSON.stringify({ error: "No file provided" }), { status: 400 });
  }

  const ext = EXT_BY_TYPE[file.type];
  if (!ext) {
    return new Response(
      JSON.stringify({ error: `Unsupported image type "${file.type || "unknown"}" — use JPEG, PNG, WebP, GIF, or SVG.` }),
      { status: 400 },
    );
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return new Response(
      JSON.stringify({ error: `Image is ${(file.size / 1024 / 1024).toFixed(1)}MB — keep it under ${MAX_UPLOAD_BYTES / 1024 / 1024}MB.` }),
      { status: 400 },
    );
  }

  const rawSlug = (form.get("slug") as string | null) || "upload";
  const safeSlug = rawSlug.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "") || "upload";

  let buf: Buffer = Buffer.from(await file.arrayBuffer());

  // downsize raster formats so a phone photo doesn't land in the repo at
  // full resolution — vector (SVG) passes through untouched. `animated:
  // true` on the reader keeps a GIF's frames intact through the resize
  // instead of silently flattening it to its first frame.
  if (ext !== "svg") {
    try {
      buf = await sharp(buf, { animated: ext === "gif" })
        .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
        .toBuffer();
    } catch (err) {
      console.error(err);
      return new Response(JSON.stringify({ error: "Couldn't process that image — is it a valid image file?" }), { status: 400 });
    }
  }

  const hash = createHash("sha256").update(buf).digest("hex").slice(0, 10);
  const filename = `${safeSlug}-${hash}.${ext}`;
  const path = `${UPLOADS_DIR}/${filename}`;

  try {
    await commitFile({
      accessToken: session.accessToken,
      path,
      content: buf,
      message: `admin: upload image (${safeSlug})`,
    });
    return new Response(JSON.stringify({ url: `/uploads/${filename}` }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "Upload failed.";
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
};
