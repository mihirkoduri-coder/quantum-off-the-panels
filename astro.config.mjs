import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import vercel from "@astrojs/vercel";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

export default defineConfig({
  site: "https://quantum-off-the-panels.vercel.app",
  // output stays 'static' (the default) — every page still prerenders to
  // plain HTML, same as before. The adapter only comes into play for the
  // handful of routes (/admin, /api/*) that opt out individually with
  // `export const prerender = false`, so the admin panel can run as a
  // Vercel serverless function without turning the whole blog into SSR.
  adapter: vercel(),
  integrations: [mdx(), react(), sitemap()],
  markdown: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [[rehypeKatex, { output: "html" }]],
  },
});
