import { useEffect, useState } from "react";
import { isUnlocked, onUnlockChange } from "../lib/unlocks";
import { isRead, onReadChange } from "../lib/reads";
import { copy } from "../lib/site-copy";
import type { StickerMotif } from "../data/concepts";
import Sticker from "./Sticker";

interface Stamp {
  id: string; week: number; title: string; character: string;
  slug: string; sims: string[]; stickerMotif?: StickerMotif;
}

/**
 * A collection sheet, after Marvel's value stamps. Earned state is read from
 * the same localStorage the sims gallery already uses — no account, no server,
 * and it stays on the reader's device by design.
 *
 * A week with a built character motif (stickerMotif) gets a real, download-
 * able sticker once earned, rendered by the exact same canvas code the
 * Studio uses — not a generic placeholder standing in for "you did it."
 * Everything else, and everything not yet earned, keeps the plain card.
 *
 * Earning a stamp is an OR of two signals: actually meeting the week's sim
 * (unlocks.ts), or just reading the post to its end (reads.ts). A week
 * whose sim slug doesn't match anything built, or that a reader reads
 * without ever touching the sim, shouldn't be permanently unreachable —
 * finishing the issue is itself the payoff, same as a real comic.
 *
 * A week with no sims (the intro post) has nothing to "use" to earn it
 * either way, so it's counted as collected automatically rather than
 * stuck permanently unreachable — that's how the logo stamp works.
 */
export default function StampSheet({ stamps }: { stamps: Stamp[] }) {
  const [earned, setEarned] = useState<Set<string>>(new Set());

  useEffect(() => {
    const sync = () =>
      setEarned(new Set(
        stamps
          .filter((s) => s.sims.length === 0 || s.sims.some((x) => isUnlocked(x)) || isRead(s.id))
          .map((s) => s.id),
      ));
    sync();
    const offUnlock = onUnlockChange(sync);
    const offRead = onReadChange(sync);
    return () => { offUnlock(); offRead(); };
  }, [stamps]);

  const have = earned.size;

  return (
    <>
      <p className="eyebrow ss__count">
        <span className="wk">{have} / {stamps.length}</span>
        <span className="sep">/</span><span data-copy-key="stamps.collectedSuffix">{copy.stamps.collectedSuffix}</span>
      </p>

      <ul className="ss">
        {stamps.map((s) => {
          const got = earned.has(s.id);
          const hasSim = s.sims.length > 0;
          const showSticker = got && s.stickerMotif;
          return (
            <li key={s.id} className={`ss__i${got ? " is-got" : ""}${showSticker ? " has-sticker" : ""}`}>
              {showSticker && <Sticker kind={s.stickerMotif!} character={s.character} />}
              <span className="ss__wk">No. {String(s.week).padStart(2, "0")}</span>
              <span className="ss__title">{s.title}</span>
              <span className="ss__char">{s.character}</span>
              {got ? (
                <a className="ss__link" href={`/posts/${s.slug}`} data-copy-key="stamps.gotLabel">{copy.stamps.gotLabel}</a>
              ) : hasSim ? (
                <a className="ss__link is-todo" href={`/posts/${s.slug}`} data-copy-key="stamps.goEarnLabel">{copy.stamps.goEarnLabel}</a>
              ) : (
                <span className="ss__link is-soon" data-copy-key="stamps.notIssuedLabel">{copy.stamps.notIssuedLabel}</span>
              )}
            </li>
          );
        })}
      </ul>

      <style>{`
        .ss__count { margin: 1.5rem 0 0.9rem; }
        .ss { list-style: none; padding: 0; margin: 0;
              display: grid; gap: 0.8rem; grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr)); }
        .ss__i {
          position: relative; display: grid; gap: 0.15rem; padding: 0.9rem 0.8rem 0.8rem;
          background: var(--ink-2); border-radius: 2px;
          /* perforated edge, like a stamp torn from a sheet */
          border: 3px dashed var(--gutter);
          opacity: 0.5; filter: saturate(0.2);
        }
        .ss__i.is-got { opacity: 1; filter: none; border-style: solid; border-color: var(--cyan); }
        .ss__i.has-sticker { grid-template-columns: 1fr; justify-items: center; text-align: center; padding-top: 0.7rem; }
        .ss__wk {
          font-family: var(--font-mono); font-size: 0.6rem; letter-spacing: 0.14em;
          text-transform: uppercase; color: var(--yellow);
        }
        .has-sticker .ss__wk { margin-top: 0.6rem; }
        .ss__title { font-family: var(--font-head); font-weight: 900; font-size: 1rem; line-height: 1.15; }
        .ss__char { font-family: var(--font-body); font-style: italic; font-size: 0.85rem; color: var(--paper-dim); }
        .ss__link {
          font-family: var(--font-mono); font-size: 0.6rem; letter-spacing: 0.12em;
          text-transform: uppercase; margin-top: 0.35rem; color: var(--cyan); text-decoration: none;
        }
        .ss__link.is-todo { color: var(--paper-dim); }
        .ss__link.is-soon { color: var(--gutter); }
      `}</style>
    </>
  );
}
