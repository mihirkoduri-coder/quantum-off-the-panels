import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { byId } from "../data/concepts";
import type { APIContext } from "astro";

export async function GET(ctx: APIContext) {
  const posts = await getCollection("posts", (p) => !p.data.draft);
  return rss({
    title: "Quantum off the Panels",
    description: "One quantum concept a week, argued against a comic book.",
    site: ctx.site!,
    items: posts
      .sort((a, b) => +b.data.published - +a.data.published)
      .map((p) => ({
        title: `Issue ${byId(p.data.conceptId)?.week}: ${p.data.title}`,
        description: byId(p.data.conceptId)?.blurb ?? "",
        pubDate: p.data.published,
        link: `/posts/${p.slug}/`,
      })),
  });
}
