import { existsSync, readdirSync, statSync } from "node:fs";
import { join as joinPath } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import vercel from "@astrojs/vercel";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

// sharp (image uploads, api/admin/upload-image) picks its native binary via
// a dynamically-constructed require() at runtime, based on the actual
// process.platform/arch — not a static import path. Vercel's build-time file
// tracer only bundles what it can see through static analysis, so it can
// silently miss that binary and leave the deployed function unable to load
// sharp at all, failing every single upload with no local repro.
//
// includeFiles is the documented escape hatch for exactly this, but it does
// NOT accept glob patterns — @astrojs/vercel passes each entry straight to
// fs.realpath with no expansion step (confirmed by reading its own
// copyFilesToFolder implementation), and for a bare directory entry it only
// ever creates an empty folder at the destination, never copies what's
// inside it. So a directory has to be walked and every individual file
// listed by hand — there is no shortcut. Two other things learned the hard
// way, from a genuinely failed deploy each time: an unconditional path
// throws outright (via that same realpath call) on any machine where the
// platform-specific optional dependency isn't installed, which is
// EVERY machine except whichever one actually ran npm install on Vercel's
// side — so the path only exists there, never locally — hence the
// existsSync guard; and Vercel's build fleet's actual architecture isn't
// documented anywhere I could find, so both linux-x64 and linux-arm64 are
// checked rather than assumed.
function listFilesRecursively(absDir) {
  const out = [];
  for (const entry of readdirSync(absDir, { withFileTypes: true })) {
    const childPath = joinPath(absDir, entry.name);
    if (entry.isDirectory()) out.push(...listFilesRecursively(childPath));
    else if (entry.isFile()) out.push(childPath);
  }
  return out;
}

const root = fileURLToPath(new URL(".", import.meta.url));
const SHARP_CANDIDATES = [
  "node_modules/@img/sharp-linux-x64",
  "node_modules/@img/sharp-libvips-linux-x64",
  "node_modules/@img/sharp-linux-arm64",
  "node_modules/@img/sharp-libvips-linux-arm64",
];
const sharpIncludeFiles = SHARP_CANDIDATES.flatMap((relDir) => {
  const absDir = joinPath(root, relDir);
  if (!existsSync(absDir) || !statSync(absDir).isDirectory()) return [];
  return listFilesRecursively(absDir).map((absFile) => absFile.slice(root.length));
});
if (sharpIncludeFiles.length === 0) {
  console.warn(
    `[astro.config] no linux sharp binary found under ${root}node_modules/@img — ` +
      "skipping includeFiles for it. Expected on a non-Linux machine (this is only " +
      "needed for the deployed function); if this warning shows up in a Vercel build " +
      "log instead, image uploads will fail in production.",
  );
}

export default defineConfig({
  site: "https://www.quantumoffthepanels.com",
  // output stays 'static' (the default) — every page still prerenders to
  // plain HTML, same as before. The adapter only comes into play for the
  // handful of routes (/admin, /api/*) that opt out individually with
  // `export const prerender = false`, so the admin panel can run as a
  // Vercel serverless function without turning the whole blog into SSR.
  adapter: vercel({
    includeFiles: sharpIncludeFiles,
  }),
  security: {
    // Astro only trusts the request's real Host/X-Forwarded-Host header
    // against this allowlist — without it, Vercel's serverless runtime
    // falls back to treating every request as if it came from
    // "localhost", which breaks anything that depends on the request's
    // own origin: the OAuth redirect_uri earlier, and the built-in CSRF
    // check (origin-vs-url mismatch => "Cross-site POST forbidden") now.
    allowedDomains: [
      { hostname: "www.quantumoffthepanels.com", protocol: "https" },
      { hostname: "quantumoffthepanels.com", protocol: "https" },
      // kept for continuity — Vercel still serves this alongside the
      // custom domain, and nothing should suddenly 403 someone who still
      // has the old URL bookmarked or linked somewhere.
      { hostname: "quantum-off-the-panels.vercel.app", protocol: "https" },
    ],
  },
  integrations: [mdx(), react(), sitemap()],
  markdown: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [[rehypeKatex, { output: "html" }]],
  },
});
