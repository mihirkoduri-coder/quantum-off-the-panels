import { useEffect, useState } from "react";
import { isUnlocked, onUnlockChange } from "../lib/unlocks";
import { copy } from "../lib/site-copy";

interface Stamp {
  id: string; week: number; title: string; character: string;
  slug: string; sims: string[];
}

/**
 * A collection sheet, after Marvel's value stamps. Earned state is read from
 * the same localStorage the sims gallery already uses — no account, no server,
 * and it stays on the reader's device by design.
 */
export default function StampSheet({ stamps }: { stamps: Stamp[] }) {
  const [earned, setEarned] = useState<Set<string>>(new Set());

  useEffect(() => {
    const sync = () =>
      setEarned(new Set(stamps.filter((s) => s.sims.some((x) => isUnlocked(x))).map((s) => s.id)));
    sync();
    return onUnlockChange(sync);
  }, [stamps]);

  const have = earned.size;

  return (
    <>
      <p className="eyebrow ss__count">
        <span className="wk">{have} / {stamps.length}</span>
        <span className="sep">/</span><span>{copy.stamps.collectedSuffix}</span>
      </p>

      <ul className="ss">
        {stamps.map((s) => {
          const got = earned.has(s.id);
          const hasSim = s.sims.length > 0;
          return (
            <li key={s.id} className={`ss__i${got ? " is-got" : ""}`}>
              <span className="ss__perf" />
              <span className="ss__wk">No. {String(s.week).padStart(2, "0")}</span>
              <span className="ss__title">{s.title}</span>
              <span className="ss__char">{s.character}</span>
              {got ? (
                <a className="ss__link" href={`/posts/${s.slug}`}>{copy.stamps.gotLabel}</a>
              ) : hasSim ? (
                <a className="ss__link is-todo" href={`/posts/${s.slug}`}>{copy.stamps.goEarnLabel}</a>
              ) : (
                <span className="ss__link is-soon">{copy.stamps.notIssuedLabel}</span>
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
        .ss__wk {
          font-family: var(--font-mono); font-size: 0.6rem; letter-spacing: 0.14em;
          text-transform: uppercase; color: var(--yellow);
        }
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
