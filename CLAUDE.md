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
- Virtually every reader-facing text string on the site must be click-to-edit
  via data-copy-key + site-copy.json — this now explicitly includes each
  sim's Predict question/choices/because, ViolationExplainer's law/attempted/
  why, and per-sim UI chrome (labels, button text, empty states), not just
  site-wide nav/page copy. Add the copy key and the data-copy-key attribute
  as part of writing the feature, not as a follow-up pass. The only text that
  stays hardcoded is: (a) admin-only UI (Studio, the moderation queue, /admin
  pages generally — the admin is the one person who'd ever edit it, and can
  already do that in code), and (b) a caption/line that is genuinely
  recomputed from live state on every render (e.g. a value that changes
  because a slider moved), where a single static copy key can't represent
  every variant — for those, wire whatever *can* be a stable string (each
  distinct branch's text, not the branching logic itself) and say plainly
  when a specific piece truly can't be, rather than leaving it silently
  uneditable.

## Adding a week
1. Add/publish the entry in src/data/concepts.ts
2. Publish its node in ConceptMap.astro (add is-live, wrap in <a>, SOON -> READ)
3. Write src/content/posts/week-NN-slug.mdx
4. Build the sim in src/sims/, register it in src/sims/registry.ts
5. Import the sim into the .mdx with client:visible
