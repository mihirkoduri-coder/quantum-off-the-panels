/**
 * A sim is "unlocked" once the reader has met it inside its post.
 * Purely local to the reader's browser — no accounts, no server, no stats.
 *
 * Unlocking fires when a sim is actually interacted with (a prediction
 * committed, or a control touched), not merely scrolled past. Meeting it
 * should mean meeting it.
 */

const KEY = "qp:unlocked:v1";

const read = (): Set<string> => {
  if (typeof window === "undefined") return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) ?? "[]"));
  } catch {
    return new Set();
  }
};

const write = (s: Set<string>) => {
  try {
    localStorage.setItem(KEY, JSON.stringify([...s]));
    window.dispatchEvent(new CustomEvent("qp:unlock-change"));
  } catch {
    /* private browsing — gallery just stays locked. not worth an error. */
  }
};

export const isUnlocked = (slug: string) => read().has(slug);

export const unlock = (slug: string) => {
  const s = read();
  if (s.has(slug)) return;
  s.add(slug);
  write(s);
};

export const unlockedList = () => [...read()];

export const relock = () => write(new Set());

/** Subscribe to changes — the gallery uses this to update live. */
export const onUnlockChange = (fn: () => void) => {
  window.addEventListener("qp:unlock-change", fn);
  window.addEventListener("storage", fn);
  return () => {
    window.removeEventListener("qp:unlock-change", fn);
    window.removeEventListener("storage", fn);
  };
};
