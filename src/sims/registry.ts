/**
 * Slug -> component. Adding a sim = one import + one line here, plus its
 * slug in the concept's `sims` array in concepts.ts. Nothing else.
 */
import AmplitudeDial from "./amplitude-dial";

export const SIMS: Record<string, React.ComponentType> = {
  "amplitude-dial": AmplitudeDial,
};

/** Human titles for the gallery. Keep in sync when you add one. */
export const SIM_TITLES: Record<string, string> = {
  "amplitude-dial": "The amplitude dial",
};
