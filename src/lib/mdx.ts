/**
 * Reading and writing post .mdx files for the admin panel. A hand-rolled,
 * schema-specific parser/serializer rather than a general YAML library —
 * safe here only because we're the sole writer of this format (it mirrors
 * exactly what src/content/config.ts accepts) and the fields are all plain
 * single-line strings, dates, or booleans. Don't reach for this pattern on
 * a format you don't fully control.
 */

export interface PostFrontmatter {
  conceptId: string;
  title: string;
  subtitle?: string;
  published: string; // YYYY-MM-DD
  claim?: string;
  claimSource?: string;
  ruling?: string;
  draft: boolean;
}

export interface ParsedPost {
  frontmatter: PostFrontmatter;
  body: string;
}

function yamlString(value: string): string {
  // JSON's escaping (quotes, backslashes) is a valid subset of YAML's
  // double-quoted scalar escaping for the plain text we deal with here.
  return JSON.stringify(value);
}

export function serializePost(post: ParsedPost): string {
  const fm = post.frontmatter;
  const lines = [
    "---",
    `conceptId: ${fm.conceptId}`,
    `title: ${yamlString(fm.title)}`,
    ...(fm.subtitle ? [`subtitle: ${yamlString(fm.subtitle)}`] : []),
    `published: ${fm.published}`,
    ...(fm.claim ? [`claim: ${yamlString(fm.claim)}`] : []),
    ...(fm.claimSource ? [`claimSource: ${yamlString(fm.claimSource)}`] : []),
    ...(fm.ruling ? [`ruling: ${yamlString(fm.ruling)}`] : []),
    `draft: ${fm.draft}`,
    "---",
    "",
    post.body.trim(),
    "",
  ];
  return lines.join("\n");
}

/** Reverse of serializePost, for prefilling the edit form from a post that
 *  already exists. Only understands the exact shape serializePost writes —
 *  a hand-edited .mdx with fancier YAML (multi-line strings, comments
 *  inside frontmatter) will parse incompletely rather than throw, so the
 *  admin form always has *something* sane to show. */
export function parsePost(fileText: string): ParsedPost {
  const match = fileText.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    return { frontmatter: { conceptId: "", title: "", published: "", draft: false }, body: fileText };
  }
  const [, frontmatterBlock, body] = match;

  const fields: Record<string, string> = {};
  for (const line of frontmatterBlock.split("\n")) {
    const fieldMatch = line.match(/^(\w+):\s*(.*)$/);
    if (!fieldMatch) continue;
    const [, key, rawValue] = fieldMatch;
    let value = rawValue.trim();
    if (value.startsWith('"') && value.endsWith('"')) {
      try {
        value = JSON.parse(value);
      } catch {
        // leave as-is — malformed quoting shouldn't crash the admin form
      }
    }
    fields[key] = value;
  }

  return {
    frontmatter: {
      conceptId: fields.conceptId ?? "",
      title: fields.title ?? "",
      subtitle: fields.subtitle,
      published: fields.published ?? "",
      claim: fields.claim,
      claimSource: fields.claimSource,
      ruling: fields.ruling,
      draft: fields.draft === "true",
    },
    body: body.trim(),
  };
}
