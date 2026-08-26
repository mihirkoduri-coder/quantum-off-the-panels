# Quantum Panels

Weekly blog: one quantum concept per week, argued against a comic
book claim, with an interactive simulation.

## Rules
- src/data/concepts.ts is the source of truth. Edit it before anything else.
- The concept map (ConceptMap.astro) is hand-authored SVG. Edit coordinates
  directly. Do not make it generated.
- Only show published weeks anywhere reader-facing.
- Design: cyan = amplitude, magenta = phase, yellow = user input.
  Halftone dot area tracks probability. Ink-navy ground.
- Onomatopoeia fires ONLY on real sim events. Never in prose.
- Post chrome (claim, verdict) stays quiet. The prose is the point.
- Sims follow: Predict wrapper -> SimShell -> ViolationExplainer for
  forbidden operations.
- Every sim must work on a phone. 44px minimum touch targets.

## Adding a week
1. Add/publish the entry in src/data/concepts.ts
2. Publish its node in ConceptMap.astro (add is-live, wrap in <a>, SOON -> READ)
3. Write src/content/posts/week-NN-slug.mdx
4. Build the sim in src/sims/, register it in src/sims/registry.ts
5. Import the sim into the .mdx with client:visible
