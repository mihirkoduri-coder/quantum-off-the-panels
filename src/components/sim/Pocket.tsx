import type { ReactNode } from "react";

interface Props {
  /** the invitation, e.g. "What am I looking at?" */
  label: string;
  children: ReactNode;
  /** open on first render. Default closed so it never competes with the prose. */
  defaultOpen?: boolean;
}

/**
 * A collapsible aside for readers who want the picture explained.
 *
 * Native <details> on purpose: keyboard accessible, works with no JS, and the
 * open/closed state survives an island failing to hydrate. Closed by default —
 * a reader who already gets it should never have to scroll past an explanation.
 */
export default function Pocket({ label, children, defaultOpen = false }: Props) {
  return (
    <details className="pocket" open={defaultOpen}>
      <summary className="pocket__sum">
        <span className="pocket__chev" aria-hidden="true">▸</span>
        {label}
      </summary>
      <div className="pocket__body">{children}</div>

      <style>{`
        .pocket {
          border: var(--panel-line) solid var(--gutter);
          border-radius: var(--radius);
          background: var(--ink);
          margin-top: 1.25rem;
          width: 100%;
        }
        .pocket__sum {
          cursor: pointer;
          list-style: none;
          padding: 0.7rem 0.9rem;
          font-family: var(--font-mono);
          font-size: 0.72rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--cyan);
          display: flex;
          align-items: center;
          gap: 0.5rem;
          min-height: 44px;
        }
        .pocket__sum::-webkit-details-marker { display: none; }
        .pocket__sum:hover { color: var(--paper); }
        .pocket__chev {
          display: inline-block;
          transition: transform 140ms ease;
          font-size: 0.8rem;
        }
        .pocket[open] .pocket__chev { transform: rotate(90deg); }
        .pocket__body {
          padding: 0 0.9rem 1rem;
          font-size: 0.95rem;
          line-height: 1.65;
          color: var(--paper);
          max-width: 46rem;
        }
        .pocket__body > p { margin: 0 0 0.85rem; }
        .pocket__body > p:last-child { margin-bottom: 0; }
        @media (prefers-reduced-motion: reduce) {
          .pocket__chev { transition: none; }
        }
      `}</style>
    </details>
  );
}
