/**
 * Lets a post body reference a sim as `[[sim:slug]]` instead of hand-written
 * JSX — the actual point of this file. Drafting is supposed to be prose in
 * a textarea; an import statement plus a `<ComponentName client:visible />`
 * tag (each sim its own PascalCase name, its own import path) doesn't
 * belong in that box, and a typo in either one breaks the whole build.
 *
 * expandSimShortcodes runs once, at save time, turning `[[sim:slug]]` into
 * real MDX: `<SimLoader slug="slug" client:visible />`, using the *one*
 * generic SimLoader component (see src/components/SimLoader.tsx) rather
 * than a different import per sim — so there's nothing to generate beyond
 * a single constant import line, regardless of how many distinct sims (or
 * repeats) appear in the body.
 *
 * collapseSimShortcodes is the reverse, for prefilling the edit textarea —
 * it only recognizes the exact shape expandSimShortcodes writes, same
 * philosophy as lib/mdx.ts: hand-rolled and schema-specific because this
 * app is the only writer of the format.
 */

const SIMLOADER_IMPORT = 'import SimLoader from "../../components/SimLoader";';
const SHORTCODE_RE = /\[\[sim:([a-z0-9-]+)\]\]/g;
const EMBED_RE = /<SimLoader\s+slug=["']([a-z0-9-]+)["']\s+client:visible\s*\/>/g;

export function expandSimShortcodes(body: string): string {
  if (!SHORTCODE_RE.test(body)) return body;
  SHORTCODE_RE.lastIndex = 0; // .test() above advanced it; reset before reuse
  const expanded = body.replace(SHORTCODE_RE, (_, slug) => `<SimLoader slug="${slug}" client:visible />`);
  if (expanded.includes(SIMLOADER_IMPORT)) return expanded;
  return `${SIMLOADER_IMPORT}\n\n${expanded}`;
}

export function collapseSimShortcodes(body: string): string {
  return body
    .replace(new RegExp(`^${SIMLOADER_IMPORT.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\n+`, "m"), "")
    .replace(EMBED_RE, (_, slug) => `[[sim:${slug}]]`)
    .trim();
}
