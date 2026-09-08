import { useEffect, useRef, type ReactNode } from "react";
import { unlock } from "../../lib/unlocks";
import { copy } from "../../lib/site-copy";

interface Props {
  slug: string;
  title: string;
  /** what the reader should be watching for. one line, plain language. */
  watchFor: string;
  /** the interactive surface */
  children: ReactNode;
  /** sliders and buttons */
  controls?: ReactNode;
  /** numeric readouts under the controls */
  readout?: ReactNode;
  /**
   * A character motif anchored to the PANEL FRAME rather than the content
   * area, so it can straddle the border and hang outside. Breaking the panel
   * edge is a comic convention, and it keeps the motif out of the reading
   * column entirely.
   */
  motif?: ReactNode;
  onReset?: () => void;
}

/**
 * Every sim sits in this. Gives consistent framing, the "what to watch for"
 * line, a reset, and the unlock trigger. Building a new sim means filling
 * in children + controls, not rebuilding chrome.
 */
export default function SimShell({
  slug,
  title,
  watchFor,
  children,
  controls,
  readout,
  motif,
  onReset,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const fired = useRef(false);

  // unlock on first real interaction, not on scroll-past
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fire = () => {
      if (fired.current) return;
      fired.current = true;
      unlock(slug);
    };
    const opts = { passive: true } as const;
    el.addEventListener("pointerdown", fire, opts);
    el.addEventListener("keydown", fire);
    return () => {
      el.removeEventListener("pointerdown", fire);
      el.removeEventListener("keydown", fire);
    };
  }, [slug]);

  return (
    <section ref={ref} className="sim dot-shadow" aria-label={`Simulation: ${title}`}>
      {motif && <div className="sim__motif">{motif}</div>}

      <header className="sim__head">
        <div className="eyebrow">
          <span className="wk" data-copy-key="simShell.eyebrowLabel">{copy.simShell.eyebrowLabel}</span>
          <span className="sep">/</span>
          <span>{slug}</span>
        </div>
        <h3 className="sim__title">{title}</h3>
        <p className="sim__watch">
          <span className="sim__watchLabel" data-copy-key="simShell.watchForLabel">{copy.simShell.watchForLabel}</span> {watchFor}
        </p>
      </header>

      <div className="sim__stage">{children}</div>

      {(controls || onReset) && (
        <div className="sim__controls">
          {controls}
          {onReset && (
            <button className="btn" onClick={onReset}>
              <span data-copy-key="simShell.resetButton">{copy.simShell.resetButton}</span>
            </button>
          )}
        </div>
      )}

      {readout && <div className="sim__readout readout">{readout}</div>}

      <style>{`
        .sim {
          border: var(--panel-line) solid var(--gutter);
          border-radius: var(--radius);
          background: var(--ink-2);
          margin: 2.5rem 0;
          position: relative;
          /* visible so a frame motif can hang past the border */
          overflow: visible;
        }
        .sim__motif {
          position: absolute;
          top: -2.2rem;
          right: -3rem;
          z-index: 0;
          pointer-events: none;
        }
        /* content sits above the motif, and the motif never steals a click */
        .sim__head, .sim__stage, .sim__controls, .sim__readout { position: relative; z-index: 1; }
        @media (max-width: 46rem) { .sim__motif { display: none; } }
        .sim__head {
          background: var(--ink-2);
          border-radius: var(--radius) var(--radius) 0 0;
          padding: 1rem 1.15rem 0.75rem;
          border-bottom: var(--panel-line) solid var(--gutter);
        }
        .sim__title {
          font-family: var(--font-head);
          font-weight: 900;
          font-size: 1.1rem;
          margin: 0.35rem 0 0.4rem;
          letter-spacing: -0.01em;
        }
        .sim__watch {
          margin: 0;
          font-size: 0.9rem;
          color: var(--paper-dim);
          line-height: 1.5;
        }
        .sim__watchLabel {
          font-family: var(--font-mono);
          font-size: 0.68rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--yellow);
          margin-right: 0.4rem;
        }
        .sim__stage {
          padding: 1.15rem;
          display: grid;
          place-items: center;
          min-height: 180px;
        }
        .sim__controls {
          display: grid;
          gap: 0.9rem;
          padding: 1.15rem;
          border-top: var(--panel-line) solid var(--gutter);
          background: var(--ink);
        }
        .sim__readout {
          padding: 0.85rem 1.15rem;
          border-top: var(--panel-line) solid var(--gutter);
          display: flex;
          gap: 1.25rem;
          flex-wrap: wrap;
        }
        @media (min-width: 40rem) {
          .sim__controls { grid-template-columns: 1fr auto; align-items: end; }
        }
      `}</style>
    </section>
  );
}
