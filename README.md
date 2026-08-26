# Quantum Panels — scaffolding

Astro + React islands. Prose pages ship zero JS; only sims hydrate.

## Run it

```bash
npm install
npm run dev
```

Deploy: import the repo in Vercel, framework preset "Astro", no config needed.
Set `site` in `astro.config.mjs` to your real domain before launch — RSS and
the sitemap both depend on it.

## Adding a week

1. **`src/data/concepts.ts`** — add the entry (or flip `published: true`).
   This updates the compendium, prereq banners, next/prev nav, and the sims gallery.
2. **`src/components/ConceptMap.astro`** — publish the week's node by hand:
   add `is-live` to its class, wrap it in an `<a href>`, change SOON to READ.
   Three small edits; the file's header comment walks through it.
3. **`src/content/posts/week-NN-slug.mdx`** — write the post. Frontmatter needs
   `conceptId`, `claim`, `claimSource`, `ruling`.
4. **`src/sims/your-sim.tsx`** — build the sim. Copy `amplitude-dial.tsx` as the
   template; it demonstrates all three tactics.
5. **`src/sims/registry.ts`** — one import, one line in `SIMS`, one in `SIM_TITLES`.
6. Import the sim in the `.mdx` and drop it in with `client:visible`.

## Where things live

```
src/data/concepts.ts          THE MANIFEST — edit this first, always
src/lib/quantum.ts            statevector core (≤8 qubits)
src/lib/unlocks.ts            gallery unlock state (localStorage, per-device)
src/components/ConceptMap.astro  tactic 5 — hand-authored SVG, edit directly
src/components/Gallery.tsx    sims gallery with lock state
src/components/sim/
  SimShell.tsx                chrome every sim sits in
  Predict.tsx                 tactic 1 — guess before the controls unlock
  ViolationExplainer.tsx      tactic 2 — names the law you just broke
  ProbabilityHistogram.tsx    halftone amplitude display (the signature)
  BlochSphere.tsx             2D-projected sphere, no three.js
src/sims/                     one file per week's sim
src/styles/global.css         all design tokens
```

## Design system in one paragraph

Four-colour comic process, inverted onto ink navy. **Cyan = amplitude,
magenta = phase, yellow = your input.** Halftone dot radius encodes
probability (area ∝ p, so it reads honestly). Onomatopoeia fires only inside
simulations, on real events — SNAP! on collapse, KRAKK! on a violation. Post
chrome (claim, verdict) is deliberately quiet so it frames prose rather than
competing with it.
Everything derives from CSS custom properties in `global.css`; sims read them
at runtime, so the light theme works without touching component code.

## Still open

- Domain + site name (masthead is a placeholder)
- Giscus: add the component to `[...slug].astro` once the repo is public and
  you've enabled Discussions
- Vercel Analytics: `npm i @vercel/analytics`, one line in `Base.astro`

## Notes on choices made

**Concept map is hand-authored** (`ConceptMap.astro`), not generated. This is
deliberate: the full prerequisite graph is twenty edges and reads as spaghetti.
The map draws the eleven-step spine plus exactly three curated callbacks — the
moments where the arc closes a loop. Full prerequisites still render as text on
each post, from `concepts.ts`. A generated version is archived at
`src/components/ConceptMap.generated.tsx.bak` if you ever want to swap.

**No newsletter.** RSS only, wired at `/rss.xml`.
