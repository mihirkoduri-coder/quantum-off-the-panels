import { defineCollection, z } from "astro:content";

/**
 * Frontmatter stays thin on purpose. Week number, character, tier, prereqs
 * and sim slugs all live in src/data/concepts.ts — the post only needs to
 * say which concept it is. One source of truth.
 */
const posts = defineCollection({
  type: "content",
  schema: z.object({
    conceptId: z.string(),
    title: z.string(),
    subtitle: z.string().optional(),
    published: z.date(),
    updated: z.date().optional(),
    /** the comic's claim being argued against. Omit for posts with nothing to
     *  debunk (e.g. issue 0's intro) — the post then skips the Claim/Verdict
     *  chrome entirely rather than faking a claim to fit the mold. */
    claim: z.string().optional(),
    claimSource: z.string().optional(),
    ruling: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { posts };
