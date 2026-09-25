/**
 * An issue is "read" once the reader has scrolled to the end of its post —
 * a separate, deliberately looser signal than unlocks.ts's sim-unlock,
 * which requires actually touching the sim ("not merely scrolled past").
 *
 * The stamp sheet earns a week's stamp on EITHER signal: read the issue to
 * its end, or meet its sim. A week without a working sim (or one a reader
 * skips) shouldn't be permanently unreachable just because the other path
 * exists — a real comic didn't make you solve anything to keep the page.
 *
 * Purely local to the reader's browser, same as unlocks.ts — no accounts,
 * no server, no stats. Kept in its own localStorage key rather than folded
 * into unlocks.ts's set, since that set also feeds the sims gallery's
 * "unlocked" state — mixing a scroll signal into it would make a sim look
 * met there when it was only the surrounding post that got scrolled past.
 */

const KEY = "qp:read:v1";

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
    window.dispatchEvent(new CustomEvent("qp:read-change"));
  } catch {
    /* private browsing — stamp just stays gated on the sim path instead. */
  }
};

export const isRead = (conceptId: string) => read().has(conceptId);

export const markRead = (conceptId: string) => {
  const s = read();
  if (s.has(conceptId)) return;
  s.add(conceptId);
  write(s);
};

/** Subscribe to changes — the stamp sheet uses this to update live. */
export const onReadChange = (fn: () => void) => {
  window.addEventListener("qp:read-change", fn);
  window.addEventListener("storage", fn);
  return () => {
    window.removeEventListener("qp:read-change", fn);
    window.removeEventListener("storage", fn);
  };
};
