/**
 * Programmatic editing of src/data/concepts.ts's CONCEPTS array — used only
 * by the admin panel. Deliberately text-splicing rather than a full
 * TS-parser round-trip, so the file's hand-written comments (the manifest
 * header, the issue-0 note, per-field JSDoc) survive untouched. That's only
 * safe because the array has one very consistent shape — flat objects, one
 * per concept, no nesting deeper than a string array — so it's validated
 * defensively: any save whose before/after entry count doesn't match by
 * exactly one throws rather than silently writing something wrong.
 */
import type { Concept } from "../data/concepts";

const ARRAY_OPEN = "export const CONCEPTS: Concept[] = [";
const ARRAY_CLOSE = "\n];";

/** Matches one top-level concept object, anchored so it can only start at
 *  the `{` that's immediately followed (past any comment lines) by this
 *  exact id — not just any `{` that eventually leads to it. Without that
 *  anchor a lazy `(?:.*\n)*?` before the id line will happily swallow
 *  earlier, unrelated entries too, since `},` and `{` lines look like any
 *  other line to it. Objects here never nest a `}` before their own close
 *  (arrays close with `]`, not `}`), so matching through to the next
 *  `\n  },` is safe once the start is pinned down correctly. */
function entryPattern(id: string): RegExp {
  const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`  \\{\\n(?:\\s*//[^\\n]*\\n)*    id: "${escaped}",\\n(?:.*\\n)*?  \\},\\n`);
}

function serializeStringArray(values: string[]): string {
  return `[${values.map((v) => JSON.stringify(v)).join(", ")}]`;
}

/** Produces one entry block in the file's existing style — 2-space object
 *  indent, 4-space field indent, matching field order to the Concept type.
 *  No trailing newline after the closing `},` — callers add exactly as
 *  many as their splice position needs (see upsertConcept). */
export function serializeConcept(c: Concept): string {
  return [
    "  {",
    `    id: ${JSON.stringify(c.id)},`,
    `    week: ${c.week},`,
    `    arc: ${c.arc},`,
    `    title: ${JSON.stringify(c.title)},`,
    `    blurb: ${JSON.stringify(c.blurb)},`,
    `    character: ${JSON.stringify(c.character)},`,
    `    tier: ${JSON.stringify(c.tier)},`,
    `    prereqs: ${serializeStringArray(c.prereqs)},`,
    `    sims: ${serializeStringArray(c.sims)},`,
    `    published: ${c.published},`,
    `    slug: ${JSON.stringify(c.slug)},`,
    "  },",
  ].join("\n");
}

/** Replace an existing entry (by id) in place, or append a new one at the
 *  end of the array if that id isn't found yet. Returns the full new file
 *  text. Throws rather than guessing if the array's shape looks unexpected
 *  — a bad splice here would corrupt the site's actual source of truth. */
export function upsertConcept(sourceText: string, concept: Concept): string {
  const openIdx = sourceText.indexOf(ARRAY_OPEN);
  if (openIdx === -1) {
    throw new Error("Could not find `export const CONCEPTS: Concept[] = [` in concepts.ts");
  }
  const closeIdx = sourceText.indexOf(ARRAY_CLOSE, openIdx);
  if (closeIdx === -1) {
    throw new Error("Could not find the CONCEPTS array's closing `];` in concepts.ts");
  }

  const before = sourceText.slice(0, openIdx + ARRAY_OPEN.length);
  const arrayBody = sourceText.slice(openIdx + ARRAY_OPEN.length, closeIdx);
  const after = sourceText.slice(closeIdx);

  const newEntry = serializeConcept(concept);
  const pattern = entryPattern(concept.id);
  const existingMatches = arrayBody.match(new RegExp(pattern, "g"));

  let newArrayBody: string;
  if (!existingMatches) {
    // not found — append as a new entry at the end of the array. arrayBody
    // ends right after the last entry's `},` with no trailing newline (the
    // newline before the closing `];` belongs to `after`), so supply one.
    newArrayBody = `${arrayBody}\n${newEntry}`;
  } else if (existingMatches.length === 1) {
    // the matched text consumed through its own trailing `\n` — replacement
    // text needs to supply that same trailing newline back.
    newArrayBody = arrayBody.replace(pattern, `${newEntry}\n`);
  } else {
    throw new Error(`Found ${existingMatches.length} entries matching id "${concept.id}" — expected 0 or 1. Refusing to guess.`);
  }

  // arrayBody already starts with its own leading "\n" (the newline right
  // after the array's opening "["), so nothing extra goes between it and `before`.
  return `${before}${newArrayBody}${after}`;
}
