import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { byId } from "../data/concepts";
import { copy, fullSiteTitle } from "../lib/site-copy";
import type { APIContext } from "astro";

export async function GET(ctx: APIContext) {
  const posts = await getCollection("posts", (p) => !p.data.draft);
  return rss({
    title: fullSiteTitle(),
    description: copy.site.description,
    site: ctx.site!,
    items: posts
      .sort((a, b) => +b.data.published - +a.data.published)
      .map((p) => {
        const week = byId(p.data.conceptId)?.week;
        return {
          title: week !== null && week !== undefined ? `${copy.labels.issue} ${week}: ${p.data.title}` : p.data.title,
          description: byId(p.data.conceptId)?.blurb ?? "",
          pubDate: p.data.published,
          link: `/posts/${p.slug}/`,
        };
      }),
  });
}
