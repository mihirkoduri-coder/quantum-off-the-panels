/**
 * Programmatic editing of src/sims/registry.ts — the admin's "new
 * simulation" form writes a .tsx file and needs this file updated to
 * match: one import, one SIMS entry, one SIM_TITLES entry. Text-splicing
 * like concepts-writer.ts, for the same reason: this file's shape is
 * simple and constant enough that it doesn't need a real AST, and it
 * keeps the hand-written header comments intact.
 */

const SIMS_OPEN = "export const SIMS: Record<string, React.ComponentType> = {";
const TITLES_OPEN = "export const SIM_TITLES: Record<string, string> = {";

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** "two-path-interference" -> "TwoPathInterference". The registry always
 *  imports a sim's default export under this name — whatever the pasted
 *  file calls itself internally doesn't matter, since a default export
 *  can be aliased freely on import. */
export function slugToComponentName(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join("");
}

function upsertImport(sourceText: string, slug: string, componentName: string): string {
  const escaped = escapeRegExp(slug);
  const linePattern = new RegExp(`^import \\w+ from "\\./${escaped}";$`, "m");
  const newLine = `import ${componentName} from "./${slug}";`;
  if (linePattern.test(sourceText)) {
    return sourceText.replace(linePattern, newLine);
  }
  const importLines = [...sourceText.matchAll(/^import .+;$/gm)];
  if (importLines.length === 0) {
    throw new Error("Could not find any import lines in registry.ts to insert after");
  }
  const last = importLines[importLines.length - 1];
  const insertAt = last.index! + last[0].length;
  return `${sourceText.slice(0, insertAt)}\n${newLine}${sourceText.slice(insertAt)}`;
}

/** Replace or append one `"slug": <valueLiteral>,` line inside the object
 *  literal that starts at `openMarker` and closes at the next `\n};`. */
function upsertObjectEntry(sourceText: string, openMarker: string, slug: string, valueLiteral: string): string {
  const openIdx = sourceText.indexOf(openMarker);
  if (openIdx === -1) throw new Error(`Could not find \`${openMarker}\` in registry.ts`);
  const closeIdx = sourceText.indexOf("\n};", openIdx);
  if (closeIdx === -1) throw new Error(`Could not find the closing "};" for "${openMarker}" in registry.ts`);

  const before = sourceText.slice(0, openIdx + openMarker.length);
  const body = sourceText.slice(openIdx + openMarker.length, closeIdx);
  const after = sourceText.slice(closeIdx);

  const escaped = escapeRegExp(slug);
  const entryPattern = new RegExp(`^  "${escaped}": .+,$`, "m");
  const newEntry = `  "${slug}": ${valueLiteral},`;

  const newBody = entryPattern.test(body) ? body.replace(entryPattern, newEntry) : `${body}\n${newEntry}`;
  return `${before}${newBody}${after}`;
}

/** Add a brand-new sim, or repoint an existing slug's import/title if it's
 *  already registered. Throws rather than guessing if the file's shape
 *  looks unexpected — a bad splice here would corrupt the sim registry. */
export function upsertSim(sourceText: string, sim: { slug: string; componentName: string; title: string }): string {
  let text = upsertImport(sourceText, sim.slug, sim.componentName);
  text = upsertObjectEntry(text, SIMS_OPEN, sim.slug, sim.componentName);
  text = upsertObjectEntry(text, TITLES_OPEN, sim.slug, JSON.stringify(sim.title));
  return text;
}
