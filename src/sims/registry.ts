/**
 * Slug -> component. Adding a sim = one import + one line here, plus its
 * slug in the concept's `sims` array in concepts.ts. Nothing else.
 */
import AmplitudeDial from "./amplitude-dial";
import WatchersQuestion from "./watchers-question";

export const SIMS: Record<string, React.ComponentType> = {
  "amplitude-dial": AmplitudeDial,
  "watchers-question": WatchersQuestion,
};

/** Human titles for the gallery. Keep in sync when you add one. */
export const SIM_TITLES: Record<string, string> = {
  "amplitude-dial": "The amplitude dial",
  "watchers-question": "The Watcher's question",
};

/** For the admin's sim directory — every built sim, slug + title, sorted for display. */
export const listSims = () =>
  Object.keys(SIMS)
    .map((slug) => ({ slug, title: SIM_TITLES[slug] ?? slug }))
    .sort((a, b) => a.title.localeCompare(b.title));
