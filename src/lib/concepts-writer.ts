/**
 * Programmatic editing of src/data/concepts.ts's CONCEPTS and ARCS arrays —
 * used only by the admin panel. Deliberately text-splicing rather than a
 * full TS-parser round-trip, so the file's hand-written comments (the
 * manifest header, the issue-0 note, per-field JSDoc) survive untouched.
 * That's only safe because both arrays have one very consistent shape —
 * flat objects, one per entry, no nesting deeper than a string array — so
 * it's validated defensively: any save whose before/after entry count
 * doesn't match by exactly one throws rather than silently writing
 * something wrong.
 */
import type { Concept, Arc } from "../data/concepts";

const ARRAY_OPEN = "export const CONCEPTS: Concept[] = [";
const ARRAY_CLOSE = "\n];";

const ARCS_OPEN = "export const ARCS: Arc[] = [";
const ARCS_CLOSE = "\n];";

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
 *  many as their splice position needs (see upsertConcept).
 *
 *  This used to silently omit stickerMotif entirely — every save through
 *  upsertConcept (the full issue form AND the in-place editor) rewrites a
 *  concept via this function, so a field missing here doesn't fail to
 *  update, it gets erased outright, for every concept, on every save, not
 *  just the one being edited. That's what kept dropping "measurement"'s
 *  sticker motif call after call; it wasn't that one field misbehaving,
 *  it was this function never having had the field in the first place.
 *  branchFrom is new here for the same reason eyes/hand/logo's bbox bug
 *  was worth fixing on sight: anything Concept declares belongs in this
 *  list, or it's one merge away from silently vanishing again. */
export function serializeConcept(c: Concept): string {
  const lines = [
    "  {",
    `    id: ${JSON.stringify(c.id)},`,
    `    week: ${c.week},`,
    `    arc: ${c.arc},`,
    `    title: ${JSON.stringify(c.title)},`,
    `    blurb: ${JSON.stringify(c.blurb)},`,
    `    character: ${JSON.stringify(c.character)},`,
    `    tier: ${JSON.stringify(c.tier)},`,
    `    prereqs: ${serializeStringArray(c.prereqs)},`,
    `    branchFrom: ${c.branchFrom === null ? "null" : JSON.stringify(c.branchFrom)},`,
    `    sims: ${serializeStringArray(c.sims)},`,
    `    published: ${c.published},`,
    `    slug: ${JSON.stringify(c.slug)},`,
  ];
  if (c.stickerMotif) lines.push(`    stickerMotif: ${JSON.stringify(c.stickerMotif)},`);
  lines.push("  },");
  return lines.join("\n");
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

/** Matches one `{ id: N, name: "..." }` entry, anchored on the numeric id
 *  so it can't accidentally match a different arc's entry. */
function arcEntryPattern(id: number): RegExp {
  return new RegExp(`  \\{ id: ${id}, name: "[^"]*" \\},\\n`);
}

export function serializeArc(a: Arc): string {
  return `  { id: ${a.id}, name: ${JSON.stringify(a.name)} },`;
}

/** Same replace-or-append shape as upsertConcept, for the much smaller
 *  ARCS array — a rename replaces its one line in place; a brand-new arc
 *  (see nextArcId below) appends. */
export function upsertArc(sourceText: string, arc: Arc): string {
  const openIdx = sourceText.indexOf(ARCS_OPEN);
  if (openIdx === -1) {
    throw new Error("Could not find `export const ARCS: Arc[] = [` in concepts.ts");
  }
  const closeIdx = sourceText.indexOf(ARCS_CLOSE, openIdx);
  if (closeIdx === -1) {
    throw new Error("Could not find the ARCS array's closing `];` in concepts.ts");
  }

  const before = sourceText.slice(0, openIdx + ARCS_OPEN.length);
  const arrayBody = sourceText.slice(openIdx + ARCS_OPEN.length, closeIdx);
  const after = sourceText.slice(closeIdx);

  const newEntry = serializeArc(arc);
  const pattern = arcEntryPattern(arc.id);
  const existingMatches = arrayBody.match(new RegExp(pattern, "g"));

  let newArrayBody: string;
  if (!existingMatches) {
    newArrayBody = `${arrayBody}\n${newEntry}`;
  } else if (existingMatches.length === 1) {
    newArrayBody = arrayBody.replace(pattern, `${newEntry}\n`);
  } else {
    throw new Error(`Found ${existingMatches.length} entries matching arc id ${arc.id} — expected 0 or 1. Refusing to guess.`);
  }

  return `${before}${newArrayBody}${after}`;
}
