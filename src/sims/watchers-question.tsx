import { useMemo, useRef, useState } from "react";
import SimShell from "../components/sim/SimShell";
import Predict from "../components/sim/Predict";
import Pocket from "../components/sim/Pocket";
import { WatchingEyes } from "../components/sim/motifs";
import ViolationExplainer from "../components/sim/ViolationExplainer";
import { QuantumState, RY } from "../lib/quantum";

const SLUG = "watchers-question";

/**
 * WEEK 2 — Measurement & collapse.
 *
 * Week 1 collapsed a state. This one asks something week 1 structurally could
 * not: collapse into WHAT? The answer depends on the question you ask, and
 * that is the whole lesson.
 *
 * Everything here lives in the X–Z plane (RY rotations only, no phase), so the
 * state can be drawn honestly as a flat circle rather than a sphere. Phase is
 * week 3's problem; leaving it out makes this picture truthful, not simplified.
 *
 * THE UATU ANGLE: his vow is not "I do not look", it is "I look but never
 * interfere". The sim shows there is no such position. Choosing where to look
 * is already the intervention — and refusing to choose returns nothing at all.
 */

interface Question {
  id: string;
  /** angle of the measurement axis from +Z, radians */
  theta: number;
  label: string;
  plus: string;
  minus: string;
}

const QUESTIONS: Question[] = [
  { id: "z", theta: 0, label: "Up or down?", plus: "↑", minus: "↓" },
  { id: "d", theta: Math.PI / 4, label: "Diagonal?", plus: "↗", minus: "↙" },
  { id: "x", theta: Math.PI / 2, label: "Left or right?", plus: "→", minus: "←" },
];

interface Panel {
  key: number;
  q: Question;
  /** probability the "plus" answer was going to come up, before asking */
  pPlus: number;
  outcome: 1 | -1;
  /** state direction before and after, as (x,z) unit vectors */
  before: { x: number; z: number };
  after: { x: number; z: number };
  /** was this answer already certain before we asked? */
  wasCertain: boolean;
}

/** unit axis vector for a question, in the X–Z plane */
const axisOf = (t: number) => ({ x: Math.sin(t), z: Math.cos(t) });

export default function WatchersQuestion() {
  const [state, setState] = useState(() => new QuantumState(1)); // |0⟩ = pointing up
  const [panels, setPanels] = useState<Panel[]>([]);
  const [violation, setViolation] =
    useState<null | Parameters<typeof ViolationExplainer>[0]["violation"]>(null);
  const nextKey = useRef(1);
  const [gaze, setGaze] = useState<{ open: boolean; deg: number; denied: boolean }>({
    open: false, deg: 0, denied: false,
  });
  const gazeTimers = useRef<number[]>([]);

  const bloch = state.bloch(0);
  const dir = { x: bloch.x, z: bloch.z };

  /** probability of the "plus" answer for each question, given the state right now */
  const odds = useMemo(
    () =>
      QUESTIONS.map((q) => {
        const a = axisOf(q.theta);
        return { q, p: (1 + (dir.x * a.x + dir.z * a.z)) / 2 };
      }),
    [dir.x, dir.z],
  );

  const ask = (q: Question) => {
    const a = axisOf(q.theta);
    const pPlus = (1 + (dir.x * a.x + dir.z * a.z)) / 2;
    const wasCertain = pPlus > 0.999 || pPlus < 0.001;

    // rotate the question onto Z, measure, rotate back — the state is left in
    // the eigenstate of the axis we actually asked about
    const s = state.clone();
    s.apply(RY(-q.theta), 0);
    const bit = s.measure(0);
    s.apply(RY(q.theta), 0);

    const outcome: 1 | -1 = bit === 0 ? 1 : -1;
    const after = { x: a.x * outcome, z: a.z * outcome };

    // Ends on the 7th question, full stop — keyed off the same panels
    // count the reader is already watching in the readout, not a separate
    // "was this one a real trade" heuristic. That distinction used to
    // decide whether a question counted toward the cap at all, which
    // meant re-asking something you'd JUST asked (free — you already knew
    // it, nothing changes) added a panel to the strip without moving the
    // cap, so the visible count and the real one could silently drift
    // apart. Every question costs a panel now; the cap can't be outrun.
    const willEnd = panels.length + 1 >= 7;

    setPanels((ps) => [
      ...ps.slice(-11),
      { key: nextKey.current++, q, pPlus, outcome, before: { ...dir }, after, wasCertain },
    ]);
    setState(s);

    // the eyes ARE the measurement: they open only when a question is asked,
    // and the pupil lines up with the axis of that question — except on the
    // question that ends it, where they close for good instead.
    gazeTimers.current.forEach(clearTimeout);
    gazeTimers.current = [];
    setGaze({ open: !willEnd, deg: (q.theta * 180) / Math.PI, denied: false });
    if (!willEnd) {
      gazeTimers.current.push(
        window.setTimeout(() => setGaze((g) => ({ ...g, open: false })), 2200),
      );
    }
  };

  const reset = () => {
    setState(new QuantumState(1));
    setPanels([]);
    setViolation(null);
    nextKey.current = 1;
    gazeTimers.current.forEach(clearTimeout);
    setGaze({ open: false, deg: 0, denied: false });
  };

  /** TACTIC 2 — Uatu's actual vow, offered as a live button. */
  const watchOnly = () => {
    gazeTimers.current.forEach(clearTimeout);
    setGaze({ open: false, deg: 0, denied: true });
    gazeTimers.current.push(
      window.setTimeout(() => setGaze((g) => ({ ...g, denied: false })), 700),
    );
    setViolation({
      sfx: "THUNK!",
      law: "There is no view from nowhere.",
      attempted: "observe without choosing a question",
      why: (
        <>
          Nothing happened, and nothing was learned. A measurement is not a
          passive gaze that reveals what was already there — it is a specific
          question, and without one there is no answer to receive. Uatu's vow
          only holds while he learns nothing.
        </>
      ),
    });
  };

  const certain = odds.find((o) => o.p > 0.999 || o.p < 0.001);
  const destroyed = panels.length > 0 && panels[panels.length - 1].q.id !== "z";
  // derived straight from the same count in the readout below, not tracked
  // separately — see the comment in ask() for why that used to drift.
  const ended = panels.length >= 7;

  return (
    <Predict
      slug={SLUG}
      question="Take a qubit that is definitely UP. Ask 'up or down?' a hundred times and you get UP a hundred times. Now ask it 'left or right?' — what comes back?"
      choices={[
        { id: "left", label: "Left, every time" },
        { id: "right", label: "Right, every time" },
        { id: "coin", label: "A 50/50 coin flip" },
        { id: "none", label: "Nothing — the question doesn't apply" },
      ]}
      answer="coin"
      because={
        <>
          A state that is perfectly certain about one question can be perfectly
          undecided about another. The certainty was never a property the qubit
          had on its own — it was a property of the question you kept asking.
        </>
      }
    >
      <SimShell
        slug={SLUG}
        title="The Watcher's question"
        watchFor="the certainty table. Watch it move between rows — and never add up to more than it started with."
        onReset={reset}
        controls={
          <div className="stack">
            {/* Right above the buttons that trigger it, not up in the stage —
                the eyes only open for ~1.4s, and that used to happen well
                out of view of whatever you'd scrolled down to click. Putting
                the reaction where the click already is means you never have
                to scroll back up to catch it. */}
            <div className="wq__eyes">
              <WatchingEyes open={gaze.open} axisDeg={gaze.deg} denied={gaze.denied} />
              <p className="wq__eyesCap">
                {ended
                  ? "he has seen enough"
                  : gaze.open
                    ? "he is looking"
                    : gaze.denied
                      ? "he refuses to look"
                      : "he is not looking"}
              </p>

              {ended && (
                <div className="wq__end">
                  <p>
                    Seven questions, and the pattern is already the whole lesson:
                    every answer that taught him something also cost him one he
                    already had.
                  </p>
                  <p className="wq__endKicker">
                    There is no way to watch without choosing what to stop knowing.
                    The vow was never available to him.
                  </p>
                  <p className="wq__endHint">Reset to begin again.</p>
                </div>
              )}
            </div>

            <p className="wq__prompt">Ask the qubit a question</p>
            <div className="row">
              {QUESTIONS.map((q) => (
                <button key={q.id} className="btn btn--go" onClick={() => ask(q)} disabled={ended}>
                  {q.label}
                </button>
              ))}
            </div>
            <div className="row">
              <button className="btn btn--break" onClick={watchOnly} disabled={ended}>
                Just watch — don't ask anything
              </button>
            </div>
          </div>
        }
        readout={
          <>
            <span>
              panels <b>{panels.length}</b>
            </span>
            <span>
              certain about{" "}
              <b>{certain ? certain.q.label.replace("?", "") : "nothing"}</b>
            </span>
          </>
        }
      >
        <div className="wq">
          {/* ---- the certainty ledger ---- */}
          <div className="wq__ledger">
            <p className="wq__ledgerHead">What can be predicted right now</p>
            {odds.map(({ q, p }) => {
              const sure = p > 0.999 || p < 0.001;
              const pct = Math.max(p, 1 - p) * 100;
              return (
                <div key={q.id} className={`wq__row${sure ? " is-sure" : ""}`}>
                  <span className="wq__rowQ">{q.label}</span>
                  <span className="wq__bar">
                    <span className="wq__barFill" style={{ width: `${pct}%` }} />
                  </span>
                  <span className="wq__rowV">
                    {sure ? `certain: ${p > 0.5 ? q.plus : q.minus}` : `${pct.toFixed(0)}% ${p > 0.5 ? q.plus : q.minus}`}
                  </span>
                </div>
              );
            })}
            {destroyed && (
              <p className="wq__note">
                Notice what happened to the other rows when you asked.
              </p>
            )}
          </div>

          {/* ---- the panel strip ---- */}
          <div className="wq__stripWrap">
            <div className="wq__page">
              <Frame caption="Uatu prepares to watch." sub="The qubit is definitely ↑">
                <Diagram dir={{ x: 0, z: 1 }} />
              </Frame>

              {panels.map((p, i) => (
                <Frame
                  key={p.key}
                  caption={`“${p.q.label}”`}
                  sub={
                    p.wasCertain
                      ? "He already knew this answer."
                      : `Odds were ${(Math.max(p.pPlus, 1 - p.pPlus) * 100).toFixed(0)}%`
                  }
                  fresh={i === panels.length - 1}
                >
                  <Diagram
                    dir={p.before}
                    axis={axisOf(p.q.theta)}
                    result={p.after}
                    plus={p.q.plus}
                    minus={p.q.minus}
                  />
                  <span className={`sfx sfx--fire wq__answer${p.wasCertain ? " is-dull" : ""}`}>
                    {p.outcome === 1 ? p.q.plus : p.q.minus}
                  </span>
                </Frame>
              ))}

              {panels.length === 0 && (
                <div className="wq__hint">
                  Ask a question
                </div>
              )}
            </div>
          </div>
        </div>

        <Pocket label="What am I looking at?">
          <p>
            The circle is every state this qubit can be in. Up is ↑, down is ↓,
            and the arrow is the qubit itself. There's no phase in play this
            week, so the picture is flat and complete — nothing is hidden behind
            it.
          </p>
          <p>
            The dashed line is <b>the question you asked</b>. A measurement always
            has a direction: you don't ask "what is it?", you ask "is it this way
            or that way?" The answer can only ever be one of the two ends of that
            dashed line, so after asking, the arrow snaps onto it.
          </p>
          <p>
            Which is why certainty moves around instead of accumulating. Line the
            arrow up with one question and you've lined it up sideways to another,
            and sideways means a coin flip. Ask that second question and the arrow
            snaps again — abandoning everything the first answer told you.
          </p>
          <p className="wq__quirk">
            The uncomfortable part: before you asked, there was no answer waiting.
            A qubit pointing ↑ isn't secretly left or right. It genuinely has no
            left-or-right answer until a question forces one into existence.
          </p>
        </Pocket>

        <ViolationExplainer violation={violation} onDismiss={() => setViolation(null)} />

        <style>{`
          .wq { display: grid; gap: 1.25rem; width: 100%; }
          .wq__eyes { display: grid; justify-items: center; gap: 0.3rem; }
          .wq__end {
            border-top: 2px solid var(--magenta);
            margin-top: 0.9rem; padding-top: 0.9rem; max-width: 32rem;
            text-align: center;
          }
          .wq__end p { margin: 0 0 0.6rem; font-size: 0.95rem; line-height: 1.6; }
          .wq__endKicker {
            font-family: var(--font-head); font-weight: 700; font-size: 1.05rem;
            line-height: 1.35; color: var(--paper); text-wrap: balance;
          }
          .wq__endHint {
            font-family: var(--font-mono); font-size: 0.64rem; letter-spacing: 0.14em;
            text-transform: uppercase; color: var(--paper-dim); margin-bottom: 0 !important;
          }
          .wq__eysCap, .wq__eyesCap {
            font-family: var(--font-mono); font-size: 0.62rem; letter-spacing: 0.14em;
            text-transform: uppercase; color: var(--paper-dim); margin: 0;
          }
          .wq__prompt {
            font-family: var(--font-mono); font-size: 0.7rem; letter-spacing: 0.12em;
            text-transform: uppercase; color: var(--paper-dim); margin: 0;
          }

          .wq__ledger {
            border: var(--panel-line) solid var(--gutter);
            border-radius: var(--radius); padding: 0.9rem; background: var(--ink);
          }
          .wq__ledgerHead {
            font-family: var(--font-mono); font-size: 0.66rem; letter-spacing: 0.14em;
            text-transform: uppercase; color: var(--yellow); margin: 0 0 0.7rem;
          }
          .wq__row {
            display: grid; grid-template-columns: 8.5rem 1fr 7rem;
            gap: 0.6rem; align-items: center; padding: 0.25rem 0;
            font-size: 0.85rem;
          }
          .wq__rowQ { color: var(--paper-dim); }
          .wq__rowV {
            font-family: var(--font-mono); font-size: 0.72rem; text-align: right;
            color: var(--paper-dim);
          }
          .wq__row.is-sure .wq__rowQ, .wq__row.is-sure .wq__rowV { color: var(--yellow); }
          .wq__bar {
            display: block; height: 8px; background: var(--ink-3);
            border-radius: 2px; overflow: hidden;
          }
          .wq__barFill {
            display: block; height: 100%; background: var(--cyan);
            transition: width 260ms ease;
          }
          .wq__row.is-sure .wq__barFill { background: var(--yellow); }
          .wq__note {
            font-size: 0.82rem; color: var(--magenta); margin: 0.6rem 0 0;
            font-style: italic;
          }

          .wq__stripWrap { position: relative; }
          /* A comic page, not a filmstrip: every panel stays on screen, so the
             boring certain ones are still visible when the coin flip lands. */
          .wq__page {
            display: grid; gap: 0.6rem;
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          @media (min-width: 30rem) { .wq__page { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
          @media (min-width: 46rem) { .wq__page { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
          .wq__hint {
            display: grid; place-items: center; min-height: 7rem;
            border: var(--panel-line) dashed var(--gutter); border-radius: var(--radius);
            font-family: var(--font-mono); font-size: 0.68rem; letter-spacing: 0.1em;
            text-transform: uppercase; color: var(--gutter); text-align: center;
            padding: 0.5rem;
          }
          .wq__answer {
            position: absolute; right: 0.4rem; bottom: 0.3rem;
            font-size: 1.9rem;
          }
          .wq__answer.is-dull { opacity: 0.45; }
          .wq__quirk {
            border-left: 3px solid var(--magenta); padding-left: 0.75rem;
            color: var(--paper-dim); font-size: 0.9rem;
          }
          @media (max-width: 34rem) {
            .wq__row { grid-template-columns: 6.5rem 1fr; }
            .wq__rowV { grid-column: 2; text-align: left; }
          }
        `}</style>
      </SimShell>
    </Predict>
  );
}

/** One comic panel. Caption box top-left, art below — the classic arrangement. */
function Frame({
  caption,
  sub,
  children,
  fresh = false,
}: {
  caption: string;
  sub?: string;
  children: React.ReactNode;
  fresh?: boolean;
}) {
  return (
    <figure className={`fr${fresh ? " is-fresh" : ""}`}>
      <figcaption className="fr__cap">
        <span className="fr__capMain">{caption}</span>
        {sub && <span className="fr__capSub">{sub}</span>}
      </figcaption>
      <div className="fr__art">{children}</div>
      <style>{`
        .fr {
          margin: 0; width: 100%;
          border: var(--panel-line) solid var(--gutter);
          border-radius: var(--radius); background: var(--ink-2);
          position: relative; overflow: hidden;
        }
        .fr.is-fresh { border-color: var(--cyan); }
        .fr__cap {
          background: var(--ink); border-bottom: var(--panel-line) solid var(--gutter);
          padding: 0.45rem 0.55rem; display: grid; gap: 0.1rem; min-height: 3.1rem;
        }
        .fr__capMain {
          font-family: var(--font-body); font-size: 0.82rem; line-height: 1.25;
          color: var(--paper);
        }
        .fr__capSub {
          font-family: var(--font-mono); font-size: 0.6rem; letter-spacing: 0.1em;
          text-transform: uppercase; color: var(--paper-dim);
        }
        .fr__art { position: relative; display: grid; place-items: center; padding: 0.3rem; }
      `}</style>
    </figure>
  );
}

/**
 * Flat state diagram. The circle is the X–Z plane of the Bloch sphere seen
 * face-on — legitimate here because nothing in this sim leaves that plane.
 */
function Diagram({
  dir,
  axis,
  result,
  plus,
  minus,
}: {
  dir: { x: number; z: number };
  axis?: { x: number; z: number };
  result?: { x: number; z: number };
  plus?: string;
  minus?: string;
}) {
  const C = 70, R = 44;
  const pt = (v: { x: number; z: number }, r = R) => ({
    x: C + v.x * r,
    y: C - v.z * r,
  });
  const a1 = axis ? pt(axis, R + 8) : null;
  const a2 = axis ? pt({ x: -axis.x, z: -axis.z }, R + 8) : null;
  const tip = pt(dir);
  const res = result ? pt(result) : null;

  return (
    <svg viewBox="0 0 140 140" width="100%" role="img"
      aria-label={axis ? "State and the measurement axis" : "State direction"}>
      <circle cx={C} cy={C} r={R} fill="none" stroke="var(--gutter)" strokeWidth="1.5" />
      <line x1={C} y1={C - R} x2={C} y2={C + R} stroke="var(--gutter)" strokeWidth="1" strokeDasharray="2 3" />
      <line x1={C - R} y1={C} x2={C + R} y2={C} stroke="var(--gutter)" strokeWidth="1" strokeDasharray="2 3" />

      {a1 && a2 && (
        <>
          <line x1={a1.x} y1={a1.y} x2={a2.x} y2={a2.y}
            stroke="var(--yellow)" strokeWidth="2" strokeDasharray="5 4" opacity="0.9" />
          <text x={a1.x} y={a1.y} className="dg__end" textAnchor="middle" dominantBaseline="middle">{plus}</text>
          <text x={a2.x} y={a2.y} className="dg__end" textAnchor="middle" dominantBaseline="middle">{minus}</text>
        </>
      )}

      {/* prior state — faded once an answer exists */}
      <line x1={C} y1={C} x2={tip.x} y2={tip.y}
        stroke="var(--cyan)" strokeWidth={res ? 2 : 3} opacity={res ? 0.3 : 1} />
      <circle cx={tip.x} cy={tip.y} r={res ? 3 : 4.5} fill="var(--cyan)" opacity={res ? 0.3 : 1} />

      {res && (
        <>
          <line x1={C} y1={C} x2={res.x} y2={res.y} stroke="var(--magenta)" strokeWidth="3.5" />
          <circle cx={res.x} cy={res.y} r="5" fill="var(--magenta)" />
        </>
      )}

      <style>{`
        .dg__end {
          font-family: var(--font-mono); font-size: 11px; fill: var(--yellow);
        }
      `}</style>
    </svg>
  );
}
