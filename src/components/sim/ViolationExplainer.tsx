import { useEffect, useState, type ReactNode } from "react";
import { copy } from "../../lib/site-copy";

interface Props {
  /** null = nothing broken yet. Set it to fire the panel. */
  violation: {
    /** the onomatopoeia. KRAKK, THUNK, FIZZ — pick one per sim and keep it. */
    sfx: string;
    /** the name of the thing they just ran into */
    law: string;
    /** what they tried */
    attempted: string;
    /** why it can't work. two sentences max — the post does the long version. */
    why: ReactNode;
  } | null;
  onDismiss?: () => void;
}

/**
 * TACTIC 2. Every sim with a forbidden operation exposes it as a real,
 * clickable path. The button is not disabled — it works, and then it fails,
 * and this panel names the law they just hit.
 *
 * Design rule: the failure must be *visible in the sim itself* first
 * (numbers going wrong, a state going flat). This panel explains what
 * they already saw. It doesn't substitute for showing it.
 */
export default function ViolationExplainer({ violation, onDismiss }: Props) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (violation) setShown(true);
  }, [violation]);

  if (!violation || !shown) return null;

  return (
    <div className="vio dot-shadow" role="alert">
      <span className="sfx sfx--break sfx--fire vio__sfx">{violation.sfx}</span>

      <div className="vio__body">
        <p className="vio__law">{violation.law}</p>
        <p className="vio__attempted">
          {copy.violationExplainer.youTriedToPrefix} <b>{violation.attempted}</b>.
        </p>
        <p className="vio__why">{violation.why}</p>
      </div>

      <button
        className="btn btn--break vio__close"
        onClick={() => {
          setShown(false);
          onDismiss?.();
        }}
      >
        {copy.violationExplainer.trySomethingElse}
      </button>

      <style>{`
        .vio {
          border: 3px solid var(--magenta);
          border-radius: var(--radius);
          background: var(--ink);
          padding: 1.6rem 1.2rem 1.2rem;
          margin: var(--panel-gutter) 0 0;
          position: relative;
        }
        .vio__sfx {
          position: absolute;
          top: -1.1rem;
          left: 1rem;
          font-size: clamp(1.3rem, 4vw, 1.9rem);
        }
        .vio__body { margin-top: 0.5rem; }
        .vio__law {
          font-family: var(--font-head);
          font-weight: 900;
          font-size: 1.05rem;
          color: var(--magenta);
          margin: 0 0 0.4rem;
          letter-spacing: -0.01em;
        }
        .vio__attempted { margin: 0 0 0.5rem; font-size: 0.95rem; color: var(--paper-dim); }
        .vio__why { margin: 0 0 1rem; font-size: 0.98rem; }
        .vio__close { min-height: 44px; }
      `}</style>
    </div>
  );
}
