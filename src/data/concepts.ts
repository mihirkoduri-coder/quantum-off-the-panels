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
 */

export type Tier = "A" | "B" | "C";

export interface Concept {
  /** stable id — used for prereq edges and post frontmatter. never change it. */
  id: string;
  week: number;
  arc: number;
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
}

export const CONCEPTS: Concept[] = [
  {
    // issue 0: the project's intro, not a physics concept. arc: 0 keeps it
    // out of "ARC 1, twelve weeks" counts (see ConceptMap.astro / index.astro,
    // which filter to arc === 1) — it stays off the concept map's grid, but
    // it's still first in this array, so prev/next nav, the compendium, and
    // "start it from the top" all pick it up for free.
    id: "intro",
    week: 0,
    arc: 0,
    title: "Start here",
    blurb: "What this project actually is, before week one throws you into a superposition.",
    character: "The Narrator",
    tier: "C",
    prereqs: [],
    sims: [],
    published: true,
    slug: "week-00-intro",
  },
  {
    id: "superposition",
    week: 1,
    arc: 1,
    title: "Superposition",
    blurb: "Not a menu of outcomes. One object pointing somewhere that isn't 0 or 1.",
    character: "Doctor Manhattan",
    tier: "B",
    prereqs: [],
    sims: ["amplitude-dial"],
    published: true,
    slug: "week-01-superposition",
  },
  {
    id: "interference",
    week: 2,
    arc: 1,
    title: "Interference",
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
    week: 3,
    arc: 1,
    title: "Measurement & collapse",
    blurb: "A photon detector has no opinions. Consciousness is not required.",
    character: "Uatu the Watcher",
    tier: "B",
    prereqs: ["superposition"],
    sims: ["collapse-lab"],
    published: false,
    slug: "week-03-measurement",
  },
  {
    id: "entanglement",
    week: 4,
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
    week: 5,
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
    week: 6,
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
    week: 7,
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
    week: 8,
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
    week: 9,
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
    week: 10,
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
    week: 11,
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
    week: 12,
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

export const arcs = () => [...new Set(CONCEPTS.map((c) => c.arc))].sort();

/** every sim slug that exists anywhere in the manifest, with its owning concept */
export const allSims = () =>
  CONCEPTS.flatMap((c) => c.sims.map((slug) => ({ slug, concept: c })));

/** sim slugs whose owning concept is published — the only ones reader-facing surfaces show */
export const publishedSims = () => allSims().filter(({ concept }) => concept.published);

/** prerequisite edges for the map, as [from, to] concept ids */
export const edges = (): [string, string][] =>
  CONCEPTS.flatMap((c) => c.prereqs.map((p) => [p, c.id] as [string, string]));

export const neighbours = (id: string) => {
  const i = CONCEPTS.findIndex((c) => c.id === id);
  return { prev: CONCEPTS[i - 1] ?? null, next: CONCEPTS[i + 1] ?? null };
};
