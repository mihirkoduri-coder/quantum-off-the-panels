import { SIMS } from "../sims/registry";

/**
 * Astro builds its hydration script from a static import path, so it can't
 * hydrate `SIMS[slug]` looked up in a template. This wrapper is statically
 * importable; the registry lookup happens inside React, where it's fine.
 */
export default function SimLoader({ slug }: { slug: string }) {
  const Sim = SIMS[slug];
  if (!Sim) return <p className="dim">This simulation hasn't been built yet.</p>;
  return <Sim />;
}
