import { useEffect, useState } from "react";
import { publishedSims } from "../data/concepts";
import { SIM_TITLES } from "../sims/registry";
import { isUnlocked, onUnlockChange, relock } from "../lib/unlocks";

/**
 * The gallery. Only sims whose issue is published ever appear here — an
 * unpublished week's sim doesn't exist yet as far as a reader can tell.
 * Among published ones, locked sims are listed, not hidden — seeing the
 * locked shelf is part of the pull. The lock is a nudge back to the post,
 * not a wall: the post link is always live.
 */
export default function Gallery() {
  const sims = publishedSims();
  const [open, setOpen] = useState<Set<string>>(new Set());

  useEffect(() => {
    const sync = () => setOpen(new Set(sims.filter((s) => isUnlocked(s.slug)).map((s) => s.slug)));
    sync();
    return onUnlockChange(sync);
  }, []);

  const count = open.size;

  return (
    <>
      <p className="eyebrow gal__count">
        <span className="wk">{count} / {sims.length}</span>
        <span className="sep">/</span>
        <span>unlocked on this device</span>
        {count > 0 && (
          <button className="gal__reset" onClick={() => relock()}>
            reset
          </button>
        )}
      </p>

      <ul className="gal">
        {sims.map(({ slug, concept }) => {
          const live = open.has(slug);
          const built = slug in SIM_TITLES;
          return (
            <li key={slug} className={`gal__i dot-shadow${live && built ? " is-open" : ""}`}>
              <span className="eyebrow">
                <span className="wk">ISSUE {String(concept.week).padStart(2, "0")}</span>
                <span className="sep">/</span>
                <span>{concept.character}</span>
              </span>
              <h2 className="gal__h">{SIM_TITLES[slug] ?? concept.title}</h2>
              <p className="gal__b">{concept.blurb}</p>
              <div className="gal__act">
                {live && built ? (
                  <a className="btn btn--go" href={`/sims/${slug}`}>Open</a>
                ) : (
                  <span className="gal__lock">
                    {built ? "Locked — meet it in the post" : "Not built yet"}
                  </span>
                )}
                <a className="gal__post" href={`/posts/${concept.slug}`}>Issue {concept.week} →</a>
              </div>
            </li>
          );
        })}
      </ul>

      <style>{`
        .gal__count { margin: 1.5rem 0 1rem; }
        .gal__reset {
          background: none; border: none; color: var(--paper-dim);
          font-family: var(--font-mono); font-size: 0.7rem; letter-spacing: 0.12em;
          text-transform: uppercase; cursor: pointer; text-decoration: underline;
        }
        .gal { list-style: none; padding: 0; display: grid; gap: var(--panel-gutter);
               grid-template-columns: repeat(auto-fill, minmax(17rem, 1fr)); }
        .gal__i {
          border: var(--panel-line) dashed var(--gutter);
          border-radius: var(--radius); padding: 1.1rem; background: var(--ink-2);
          opacity: 0.6; display: flex; flex-direction: column; gap: 0.4rem;
        }
        .gal__i.is-open { opacity: 1; border-style: solid; border-color: var(--cyan); }
        .gal__h { font-size: 1.15rem; margin: 0.3rem 0 0; }
        .gal__b { font-size: 0.92rem; color: var(--paper-dim); margin: 0; flex: 1; }
        .gal__act { display: flex; gap: 0.9rem; align-items: center; margin-top: 0.7rem; flex-wrap: wrap; }
        .gal__act .btn { text-decoration: none; display: inline-flex; align-items: center; }
        .gal__lock {
          font-family: var(--font-mono); font-size: 0.68rem; letter-spacing: 0.1em;
          text-transform: uppercase; color: var(--yellow);
        }
        .gal__post { font-family: var(--font-mono); font-size: 0.7rem; letter-spacing: 0.1em; }
      `}</style>
    </>
  );
}
