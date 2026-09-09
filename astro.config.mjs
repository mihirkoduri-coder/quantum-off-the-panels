import { existsSync } from "node:fs";
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
// sharp at all, failing every single upload with no local repro. The
// includeFiles option below is the documented fix — but npm only ever
// installs the optional-dependency package(s) matching whatever machine
// actually ran `npm install`, and @astrojs/vercel calls fs.realpath on every
// includeFiles entry, throwing outright if one doesn't exist — so listing a
// path unconditionally would build fine only on a machine that happens to
// have it and crash everywhere else. Checking both linux architectures
// rather than assuming x64: Vercel's build fleet isn't guaranteed to be one
// or the other, and getting this wrong once already broke a deploy.
const root = fileURLToPath(new URL(".", import.meta.url));
const SHARP_CANDIDATES = [
  "node_modules/@img/sharp-linux-x64",
  "node_modules/@img/sharp-libvips-linux-x64",
  "node_modules/@img/sharp-linux-arm64",
  "node_modules/@img/sharp-libvips-linux-arm64",
];
const sharpLinuxPaths = SHARP_CANDIDATES.filter((p) => existsSync(new URL(p, import.meta.url)));
if (sharpLinuxPaths.length === 0) {
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
    includeFiles: sharpLinuxPaths.map((p) => `${p}/**/*`),
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
