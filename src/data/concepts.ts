/**
 * THE MANIFEST — single source of truth.
 *
 * Adding a week = adding one entry here. This file drives:
 *   - the concept map on the homepage (nodes + prerequisite edges)
 *   - the compendium and its filters
 *   - "you'll want week N first" prerequisite banners
 *   - next/previous navigation within an arc
 *   - the simulations gallery (and what's locked)
 *
 * Nothing else should hardcode week numbers or ordering.
 *
 * week/arc are nullable on purpose: writing a concept and slotting it into
 * a numbered place in the reading order are two separate decisions. An
 * entry with week/arc still null is a real, editable draft that just
 * hasn't been grouped into the roadmap yet — see isGrouped() below. The
 * one rule the admin panel enforces: published implies grouped, since
 * "ISSUE —" isn't a real label. Nothing reader-facing should ever see a
 * published concept with a null week/arc; if you do, that's a bug in
 * whatever wrote it, not something to render around.
 */

export type Tier = "A" | "B" | "C";

/** src/components/sim/motifs.tsx's character motifs, redrawn on canvas in
 *  src/lib/motif-canvas.ts. Optional and separate from `sims`: a motif is
 *  bespoke art built for one specific character, not a byproduct of any
 *  sim existing — most weeks won't have one, and that's the expected case,
 *  not a gap to fill in. */
export type StickerMotif = "hand" | "eyes" | "logo";

export interface Concept {
  /** stable id — used for prereq edges and post frontmatter. never change it. */
  id: string;
  /** null = not yet slotted into a reading order. see isGrouped(). */
  week: number | null;
  /** null = not yet assigned to an arc. a concept can exist and even be
   *  drafted long before you decide which arc (or a brand new one) it
   *  belongs to. */
  arc: number | null;
  title: string;
  /** one line, shown on map hover and compendium cards */
  blurb: string;
  character: string;
  /** internal only — never rendered to readers */
  tier: Tier;
  /** ids this concept builds on */
  prereqs: string[];
  /** sim slugs embedded in this post, in order of appearance. [] = no sim yet. */
  sims: string[];
  published: boolean;
  /** matches the .mdx filename in src/content/posts/ */
  slug: string;
  /** the stamp sheet's downloadable sticker for this week, if one's been
   *  built. undefined = the stamp sheet falls back to its plain card. */
  stickerMotif?: StickerMotif;
}

export const isGrouped = (c: Concept): c is Concept & { week: number; arc: number } =>
  c.week !== null && c.arc !== null;

export const CONCEPTS: Concept[] = [
  {
    id: "intro",
    week: 0,
    arc: 0,
    title: "Welcome!",
    blurb: "What is Quantum, off the Panels?",
    character: "The Narrator",
    tier: "C",
    prereqs: [],
    sims: [],
    published: true,
    slug: "week-00-intro",
    stickerMotif: "logo",
  },
  {
    id: "superposition",
    week: 1,
    arc: 1,
    title: "Superposition",
    blurb: "Temporally or spatially, this isn't superposition.",
    character: "Doctor Manhattan",
    tier: "B",
    prereqs: [],
    sims: ["amplitude-dial"],
    published: true,
    slug: "week-01-superposition",
    stickerMotif: "hand",
  },
  {
    id: "interference",
    week: null,
    arc: 1,
    title: "Phases & Interference",
    blurb: "The actual engine. Paths don't just add up — they cancel.",
    character: "The Flash",
    tier: "A",
    prereqs: ["superposition"],
    sims: ["two-path-interference"],
    published: false,
    slug: "week-02-interference",
  },
  {
    id: "measurement",
    week: 2,
    arc: 1,
    title: "Measurement & Collapse",
    blurb: "It's not about observing. It's about interfering.",
    character: "Uatu the Watcher",
    tier: "B",
    prereqs: ["superposition"],
    sims: ["watchers-question"],
    published: true,
    slug: "week-02-measurement-and-collapse",
  },
  {
    id: "entanglement",
    week: null,
    arc: 1,
    title: "Entanglement",
    blurb: "Two halves of one system. Correlation is not connection.",
    character: "Cloak & Dagger",
    tier: "B",
    prereqs: ["measurement", "superposition"],
    sims: ["shared-state"],
    published: false,
    slug: "week-04-entanglement",
  },
  {
    id: "no-signalling",
    week: null,
    arc: 1,
    title: "No-signalling",
    blurb: "Try to send a message with entanglement. Watch it fail.",
    character: "Jean Grey",
    tier: "A",
    prereqs: ["entanglement"],
    sims: ["telepathy-test"],
    published: false,
    slug: "week-05-no-signalling",
  },
  {
    id: "bell",
    week: null,
    arc: 1,
    title: "Bell's theorem",
    blurb: "There's no determined local truth underneath. The numbers rule it out.",
    character: "Rorschach",
    tier: "A",
    prereqs: ["no-signalling"],
    sims: ["bell-counter"],
    published: false,
    slug: "week-06-bell",
  },
  {
    id: "decoherence",
    week: null,
    arc: 1,
    title: "Decoherence",
    blurb: "The quantum realm isn't a place. So why isn't the world weird?",
    character: "Ant-Man",
    tier: "B",
    prereqs: ["measurement", "interference"],
    sims: ["leak-rate"],
    published: false,
    slug: "week-07-decoherence",
  },
  {
    id: "no-cloning",
    week: null,
    arc: 1,
    title: "No-cloning",
    blurb: "You cannot copy an unknown state. This is why quantum cryptography works.",
    character: "Multiple Man",
    tier: "B",
    prereqs: ["measurement", "superposition"],
    sims: ["copy-machine"],
    published: false,
    slug: "week-08-no-cloning",
  },
  {
    id: "qubits",
    week: null,
    arc: 1,
    title: "Qubits vs. bits",
    blurb: "n qubits is not n bits, and it is not 2ⁿ bits of storage either.",
    character: "Brainiac",
    tier: "C",
    prereqs: ["superposition", "measurement"],
    sims: ["register-view"],
    published: false,
    slug: "week-09-qubits",
  },
  {
    id: "single-gates",
    week: null,
    arc: 1,
    title: "Single-qubit gates",
    blurb: "Every gate is a rotation. Reversible, norm-preserving, no exceptions.",
    character: "Mystique",
    tier: "B",
    prereqs: ["qubits"],
    sims: ["gate-bench"],
    published: false,
    slug: "week-10-single-gates",
  },
  {
    id: "two-gates",
    week: null,
    arc: 1,
    title: "Two-qubit gates",
    blurb: "Build a Bell state from scratch. Week 4, now with instructions.",
    character: "Wonder Twins",
    tier: "B",
    prereqs: ["single-gates", "entanglement"],
    sims: ["cnot-bench", "bell-builder"],
    published: false,
    slug: "week-11-two-gates",
  },
  {
    id: "deutsch-jozsa",
    week: null,
    arc: 1,
    title: "Deutsch–Jozsa",
    blurb: "One question instead of many. The first honest advantage.",
    character: "Batman",
    tier: "A",
    prereqs: ["two-gates", "interference"],
    sims: ["one-query"],
    published: false,
    slug: "week-12-deutsch-jozsa",
  },
];

// ---- derived helpers. Import these; don't re-derive in components. ----

export const byId = (id: string) => CONCEPTS.find((c) => c.id === id);
export const bySlug = (slug: string) => CONCEPTS.find((c) => c.slug === slug);

export const published = () => CONCEPTS.filter((c) => c.published);

export const arcs = () => [...new Set(CONCEPTS.map((c) => c.arc).filter((a): a is number => a !== null))].sort();

/** every sim slug that exists anywhere in the manifest, with its owning concept */
export const allSims = () =>
  CONCEPTS.flatMap((c) => c.sims.map((slug) => ({ slug, concept: c })));

/** sim slugs whose owning concept is published — the only ones reader-facing surfaces show */
export const publishedSims = () => allSims().filter(({ concept }) => concept.published);

/** prerequisite edges for the map, as [from, to] concept ids */
export const edges = (): [string, string][] =>
  CONCEPTS.flatMap((c) => c.prereqs.map((p) => [p, c.id] as [string, string]));

/** prev/next by actual week order, not array position — the manifest's own
 *  entry order stops meaning anything once ungrouped drafts (week: null)
 *  can sit anywhere in the file, and even among grouped ones it was never
 *  guaranteed to match reading order in the first place. Ungrouped
 *  concepts are excluded entirely rather than sorted to one end: they
 *  don't have a week to be "next" at. */
export const neighbours = (id: string) => {
  const ordered = CONCEPTS.filter(isGrouped).sort((a, b) => a.week - b.week);
  const i = ordered.findIndex((c) => c.id === id);
  if (i === -1) return { prev: null, next: null };
  return { prev: ordered[i - 1] ?? null, next: ordered[i + 1] ?? null };
};
