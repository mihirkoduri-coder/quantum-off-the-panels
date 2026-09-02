import { useState, type ReactNode } from "react";
import { unlock } from "../../lib/unlocks";
import { copy } from "../../lib/site-copy";

interface Choice {
  id: string;
  label: string;
}

interface Props {
  slug: string;
  question: string;
  choices: Choice[];
  /** id of the correct choice */
  answer: string;
  /** shown after they commit — why the answer is what it is. one or two sentences. */
  because: ReactNode;
  /** the sim, locked until they commit */
  children: ReactNode;
}

/**
 * TACTIC 1. Wrap any sim in this. The reader guesses, commits, and only then
 * gets the controls. Same ritual every week so it becomes familiar.
 *
 * No aggregate stats, no server — their guess is theirs.
 */
export default function Predict({ slug, question, choices, answer, because, children }: Props) {
  const [picked, setPicked] = useState<string | null>(null);
  const [committed, setCommitted] = useState(false);

  const right = picked === answer;

  const commit = () => {
    if (!picked) return;
    setCommitted(true);
    unlock(slug);
  };

  return (
    <div className="pr">
      {!committed && (
        <div className="pr__gate dot-shadow">
          <p className="eyebrow">
            <span className="wk">{copy.predict.eyebrowLabel}</span>
            <span className="sep">/</span>
            <span>{copy.predict.beforeYouRunIt}</span>
          </p>
          <p className="pr__q">{question}</p>

          <div className="pr__choices" role="radiogroup" aria-label={question}>
            {choices.map((c) => (
              <button
                key={c.id}
                role="radio"
                aria-checked={picked === c.id}
                className={`pr__choice${picked === c.id ? " is-picked" : ""}`}
                onClick={() => setPicked(c.id)}
              >
                {c.label}
              </button>
            ))}
          </div>

          <button className="btn btn--go" onClick={commit} disabled={!picked}>
            {copy.predict.lockItInButton}
          </button>
        </div>
      )}

      {committed && (
        <div className={`pr__result${right ? " is-right" : ""}`}>
          <span className={`sfx sfx--fire${right ? "" : " sfx--break"}`}>
            {right ? copy.predict.nailedIt : copy.predict.nope}
          </span>
          <p className="pr__because">
            {copy.predict.youSaidPrefix} <b>{choices.find((c) => c.id === picked)?.label}</b>.
            {!right && (
              <>
                {" "}
                {copy.predict.itsActuallyPrefix} <b>{choices.find((c) => c.id === answer)?.label}</b>.
              </>
            )}{" "}
            {because}
          </p>
          <p className="dim pr__nudge">{copy.predict.nudge}</p>
        </div>
      )}

      <div className={committed ? "" : "pr__locked"} aria-hidden={!committed}>
        {children}
      </div>

      <style>{`
        .pr__gate {
          border: var(--panel-line) dashed var(--cyan);
          border-radius: var(--radius);
          background: var(--cyan-soft);
          padding: 1.2rem;
          margin: 2.5rem 0 0;
        }
        .pr__q {
          font-family: var(--font-head);
          font-weight: 700;
          font-size: 1.05rem;
          line-height: 1.35;
          margin: 0.6rem 0 1rem;
          text-wrap: balance;
        }
        .pr__choices { display: grid; gap: 0.5rem; margin-bottom: 1rem; }
        .pr__choice {
          text-align: left;
          font-family: var(--font-body);
          font-size: 0.98rem;
          color: var(--paper);
          background: var(--ink-2);
          border: var(--panel-line) solid var(--gutter);
          border-radius: var(--radius);
          padding: 0.7rem 0.9rem;
          cursor: pointer;
          min-height: 44px;
        }
        .pr__choice:hover { border-color: var(--cyan); }
        .pr__choice.is-picked {
          border-color: var(--yellow);
          background: var(--ink-3);
          box-shadow: inset 3px 0 0 var(--yellow);
        }
        .pr__result {
          margin: 2.5rem 0 -0.5rem;
          padding: 1.4rem 0 0.5rem;
        }
        .pr__because { margin: 1rem 0 0.4rem; }
        .pr__nudge { font-size: 0.9rem; margin: 0; }
        .pr__locked {
          filter: blur(6px) saturate(0.3);
          opacity: 0.4;
          pointer-events: none;
          user-select: none;
          max-height: 260px;
          overflow: hidden;
          mask-image: linear-gradient(to bottom, #000 40%, transparent 100%);
        }
      `}</style>
    </div>
  );
}
