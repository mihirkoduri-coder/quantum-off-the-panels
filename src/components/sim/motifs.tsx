/**
 * Character motifs.
 *
 * Original geometry — no traced art, no costume elements, no insignia. These
 * are generic visual vocabulary (a glowing hand, glowing eyes, motion streaks)
 * that read as an allusion because of the surrounding argument, not because
 * they copy a design. They also do a job: each one reports the state of its
 * simulation, so they're mechanism rather than decoration.
 *
 * Rendered in halftone where it fits, so they belong to the same print
 * language as the probability bars.
 */

// ─────────────────────────────────────────────────────────────
// WEEK 1 — a glowing hand, dotted like everything else on the site.
// alive: the qubit is still in superposition. dim: it has collapsed.
// ─────────────────────────────────────────────────────────────

export function GlowHand({ alive = true, size = 130 }: { alive?: boolean; size?: number }) {
  return (
    <div className={`gh${alive ? " is-alive" : ""}`} aria-hidden="true">
      <svg viewBox="0 0 130 150" width={size} height={size * (150 / 130)}>
        <defs>
          <pattern id="gh-dots" width="5" height="5" patternUnits="userSpaceOnUse">
            <circle cx="1.3" cy="1.3" r="1.15" fill="var(--cyan)" />
            <circle cx="3.8" cy="3.8" r="0.55" fill="var(--cyan)" />
          </pattern>
          <filter id="gh-glow" x="-70%" y="-70%" width="240%" height="240%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
          <g id="gh-shape">
            <path d="M136,10 L78,70" strokeWidth="30" strokeLinecap="round" fill="none" />
            <ellipse cx="62" cy="86" rx="21" ry="17" transform="rotate(-32 62 86)" />
            <g strokeLinecap="round" fill="none">
              <path d="M48,94 Q39,112 36,129" strokeWidth="11" />
              <path d="M59,99 Q52,117 49,134" strokeWidth="11" />
              <path d="M70,98 Q66,114 64,129" strokeWidth="10" />
              <path d="M79,93 Q79,106 78,118" strokeWidth="9" />
              <path d="M50,76 Q36,76 28,85" strokeWidth="10" />
            </g>
          </g>
        </defs>

        <g className="gh__glow" filter="url(#gh-glow)">
          <use href="#gh-shape" fill="var(--cyan)" stroke="var(--cyan)" />
        </g>
        <use href="#gh-shape" fill="var(--ink)" stroke="var(--ink)" />
        <use href="#gh-shape" fill="url(#gh-dots)" stroke="url(#gh-dots)" className="gh__skin" />
      </svg>

      <style>{`
        .gh { pointer-events: none; line-height: 0; }
        .gh__glow { opacity: 0.18; transition: opacity 400ms ease; }
        .gh__skin { opacity: 0.35; transition: opacity 400ms ease; }
        .gh.is-alive .gh__glow { opacity: 0.5; animation: gh-breathe 3.4s ease-in-out infinite; }
        .gh.is-alive .gh__skin { opacity: 1; }
        @keyframes gh-breathe { 0%,100% { opacity: 0.38; } 50% { opacity: 0.62; } }
        @media (prefers-reduced-motion: reduce) {
          .gh.is-alive .gh__glow { animation: none; }
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// WEEK 2 — eyes that open only when a question is asked, with the
// pupil aligned to the axis of that question. Closed means nothing
// was learned, which is the entire point of the week.
// ─────────────────────────────────────────────────────────────

const EYE_L = "M58,42 Q84,19 110,42 Q84,65 58,42 Z";
const EYE_R = "M130,42 Q156,19 182,42 Q156,65 130,42 Z";
const LID_L = "M58,42 Q84,38 110,42 Q84,46 58,42 Z";
const LID_R = "M130,42 Q156,38 182,42 Q156,46 130,42 Z";

export function WatchingEyes({
  open,
  axisDeg = 0,
  denied = false,
}: {
  open: boolean;
  /** rotation of the pupil, degrees from vertical — matches the question's axis */
  axisDeg?: number;
  /** the reader tried to watch without asking: a refusal twitch */
  denied?: boolean;
}) {
  return (
    <div className={`we${open ? " is-open" : ""}${denied ? " is-denied" : ""}`} aria-hidden="true">
      <svg viewBox="0 0 240 84" width="100%" style={{ maxWidth: 300 }}>
        <defs>
          <radialGradient id="we-shroud">
            <stop offset="0%" stopColor="var(--ink-3)" stopOpacity="0.95" />
            <stop offset="100%" stopColor="var(--ink-3)" stopOpacity="0" />
          </radialGradient>
          <filter id="we-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="5" />
          </filter>
          <clipPath id="we-clipL"><path d={EYE_L} /></clipPath>
          <clipPath id="we-clipR"><path d={EYE_R} /></clipPath>
        </defs>

        <ellipse cx="120" cy="42" rx="112" ry="36" fill="url(#we-shroud)" />

        {/* closed lids */}
        <g className="we__lids">
          <path d={LID_L} fill="var(--ink)" stroke="var(--gutter)" strokeWidth="2" />
          <path d={LID_R} fill="var(--ink)" stroke="var(--gutter)" strokeWidth="2" />
        </g>

        {/* open eyes */}
        <g className="we__eyes">
          <g filter="url(#we-glow)" className="we__halo">
            <path d={EYE_L} fill="var(--cyan)" />
            <path d={EYE_R} fill="var(--cyan)" />
          </g>
          <path d={EYE_L} fill="var(--ink)" stroke="var(--cyan)" strokeWidth="2" />
          <path d={EYE_R} fill="var(--ink)" stroke="var(--cyan)" strokeWidth="2" />
          <g clipPath="url(#we-clipL)">
            <rect x="80" y="16" width="8" height="52" rx="4" fill="var(--paper)"
              transform={`rotate(${axisDeg} 84 42)`} className="we__slit" />
          </g>
          <g clipPath="url(#we-clipR)">
            <rect x="152" y="16" width="8" height="52" rx="4" fill="var(--paper)"
              transform={`rotate(${axisDeg} 156 42)`} className="we__slit" />
          </g>
        </g>
      </svg>

      <style>{`
        .we { line-height: 0; display: grid; justify-items: center; pointer-events: none; }
        .we__eyes { opacity: 0; transform-origin: 120px 42px; transform: scaleY(0.12); transition: opacity 120ms ease, transform 160ms cubic-bezier(0.2,1.5,0.4,1); }
        .we__lids { opacity: 1; transition: opacity 120ms ease; }
        .we.is-open .we__eyes { opacity: 1; transform: scaleY(1); }
        .we.is-open .we__lids { opacity: 0; }
        .we__slit { transition: transform 260ms cubic-bezier(0.2,0.9,0.3,1); }
        .we__halo { opacity: 0.65; }
        .we.is-denied .we__lids { animation: we-refuse 260ms ease-in-out 2; }
        @keyframes we-refuse {
          0%,100% { transform: translateX(0); }
          25% { transform: translateX(-3px); }
          75% { transform: translateX(3px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .we__eyes, .we__slit { transition: none; }
          .we.is-denied .we__lids { animation: none; }
        }
      `}</style>
    </div>
  );
}
