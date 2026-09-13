import { useEffect, useMemo, useState } from "react";
import SimShell from "../components/sim/SimShell";
import Predict from "../components/sim/Predict";
import ViolationExplainer from "../components/sim/ViolationExplainer";
import ProbabilityHistogram from "../components/sim/ProbabilityHistogram";
import Pocket from "../components/sim/Pocket";
import { QuantumState, GATES, RZ } from "../lib/quantum";

const SLUG = "two-path-interference";

/**
 * INTERFERENCE — phase, made visible.
 *
 * Week 1's cliffhanger: turning a lone qubit's phase changed nothing a
 * measurement could see, because there was nothing to compare it against.
 * The circuit here is the payoff: H splits the qubit into two paths, RZ(φ)
 * gives one of them a phase relative to the other, a second H recombines
 * them. Recombination is what makes a difference into a DIFFERENCE — the
 * same phase that vanished on its own now sets whether detector A or B
 * fires. P(A) = cos²(φ/2), P(B) = sin²(φ/2): a clean fringe, certainty at
 * φ=0 and φ=2π, a dead-even coin at φ=π/2 and 3π/2.
 *
 * THE FORBIDDEN OPERATION is a which-path tag, not a measurement mid-run.
 * Tagging path B collapses the path qubit's coherence outright — the sim
 * models this as a flat, phase-blind 50/50 rather than hiding the coherent
 * odds, because that is the actual physics: the moment anything anywhere
 * carries a real record of which path was taken, there are no longer two
 * paths to recombine, just two separate classical ones. Reading the tag is
 * not what breaks it. Existing does.
 */

type Phase = "live" | "collapsed";

interface Collapse {
  outcome: 0 | 1;
  fromProbs: [number, number];
  whichPath: boolean;
}

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const TAU = Math.PI * 2;

export default function TwoPathInterference() {
  const [phi, setPhi] = useState(Math.PI / 4);
  const [whichPath, setWhichPath] = useState(false);
  const [seenViolation, setSeenViolation] = useState(false);
  const [phase, setPhase] = useState<Phase>("live");
  const [collapse, setCollapse] = useState<Collapse | null>(null);
  const [t, setT] = useState(0);
  const [violation, setViolation] =
    useState<null | Parameters<typeof ViolationExplainer>[0]["violation"]>(null);

  const state = useMemo(() => {
    const s = new QuantumState(1);
    s.apply(GATES.H, 0);
    s.apply(RZ(phi), 0);
    s.apply(GATES.H, 0);
    return s;
  }, [phi]);

  // The coherent fringe, always computed — whichPath decides whether the
  // READER sees it or the flat, decohered odds instead. Nothing about the
  // circuit itself changes; what changes is whether the two paths still
  // have a phase relationship left to show.
  const coherentProbs = state.probabilities();
  const liveProbs: [number, number] = whichPath ? [0.5, 0.5] : [coherentProbs[0], coherentProbs[1]];

  useEffect(() => {
    if (!collapse) { setT(0); return; }
    let raf = 0;
    const t0 = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / 260);
      setT(easeOut(p));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [collapse]);

  const target: [number, number] = collapse ? (collapse.outcome === 0 ? [1, 0] : [0, 1]) : [0, 0];
  const shownProbs: number[] = collapse
    ? [lerp(collapse.fromProbs[0], target[0], t), lerp(collapse.fromProbs[1], target[1], t)]
    : liveProbs;

  const toggleWhichPath = () => {
    const next = !whichPath;
    setWhichPath(next);
    if (next && !seenViolation) {
      setSeenViolation(true);
      setViolation({
        sfx: "FLATLINE!",
        law: "Which-path information kills interference.",
        attempted: "tag which path was taken and still see the paths interfere",
        why: (
          <>
            The instant anything, anywhere, carries a real record of which path
            was taken, the two paths stop being one wavefunction to recombine —
            they're just two separate, non-interfering possibilities now. It
            didn't matter that no one read the tag yet. The bars flattened the
            moment the detector existed, not the moment anyone looked at it.
          </>
        ),
      });
    }
  };

  const measure = () => {
    const outcome: 0 | 1 = whichPath
      ? (Math.random() < 0.5 ? 0 : 1)
      : state.clone().measure(0);
    setCollapse({ outcome, fromProbs: [liveProbs[0], liveProbs[1]], whichPath });
    setPhase("collapsed");
  };

  const reset = () => {
    setPhi(Math.PI / 4);
    setWhichPath(false);
    setSeenViolation(false);
    setPhase("live");
    setCollapse(null);
    setViolation(null);
  };

  const locked = phase === "collapsed";
  const phiDeg = (phi / Math.PI) * 180;

  /**
   * THE FLASH'S VOICE.
   *
   * His whole claim is "I moved so fast I was in two places." He talks
   * about the two paths like they're both just him, taken in sequence,
   * one after another — because that's what running fast actually is.
   * He never once talks about them interfering, because for him they
   * don't: there was never a second path to recombine with, just one path
   * covered twice. The apparatus behind him does something his own
   * account has no room for.
   */
  const caption = (() => {
    if (locked) return `door ${collapse?.outcome === 0 ? "a" : "b"}. that's the one i came out of. this time.`;
    if (whichPath) return "you clocked me mid-run. now it's a coin flip — pick a door.";
    if (phiDeg < 15 || phiDeg > 345) return "front door. every time. no second path to speak of.";
    if (phiDeg > 165 && phiDeg < 195) return "back door. every time. i'll tell you that much for free.";
    if (phiDeg > 75 && phiDeg < 105) return "both doors. neither door. ask me which and i've got nothing.";
    return phiDeg < 180 ? "mostly the front door. don't push it." : "mostly the back door. don't push it.";
  })();

  const watchFor = locked
    ? "one detector fired. that's the one path's worth of certainty this run bought."
    : whichPath
      ? "both bars are stuck at 50/50 — slide the phase all you want, the tag already erased the fringe."
      : "the two bars swing smoothly from certain to 50/50 and back as you slide the phase. that swing IS the phase, made visible.";

  // ── the interferometer diagram — two paths from one source, recombined at
  // one detector pair. Path B carries a phase ring (same visual language as
  // ProbabilityHistogram's phase ring) showing φ directly on the path that
  // carries it, and a which-path tag when active. Static/reactive, not
  // continuously animated — the histogram below already owns "unresolved."
  const ringX = 155, ringY = 110, ringR = 11;
  const tickX = ringX + Math.cos(-phi) * ringR;
  const tickY = ringY + Math.sin(-phi) * ringR;
  const coherent = !whichPath && !locked;

  return (
    <Predict
      slug={SLUG}
      question="Last week, turning a lone qubit's phase changed nothing a measurement could see. Slide the phase control on ONE of two recombining paths here — what happens to the two detectors?"
      choices={[
        { id: "nothing", label: "Still nothing — phase stays invisible" },
        { id: "swap", label: "They swap abruptly, like a coin landing the other way" },
        { id: "swing", label: "They swing smoothly between certainty and 50/50" },
        { id: "random", label: "They go random, with no pattern at all" },
      ]}
      answer="swing"
      because={
        <>
          Phase was invisible on one path because there was nothing to compare
          it against. Recombine two paths that picked up different phases, and
          the difference between them becomes the entire mechanism —
          interference is just phase, read out through addition.
        </>
      }
    >
      <SimShell
        slug={SLUG}
        title="Two-path interference"
        watchFor={watchFor}
        onReset={reset}
        controls={
          <div className="stack">
            <div className="ctrl">
              <label htmlFor="phi">
                <span>Phase on path B</span>
                <span className="val">{phiDeg.toFixed(0)}°</span>
              </label>
              <input
                id="phi" type="range" min={0} max={TAU} step={0.01}
                value={phi} disabled={locked}
                onChange={(e) => setPhi(+e.target.value)}
              />
            </div>
            <div className="row">
              <button className="btn btn--go" onClick={measure} disabled={locked}>
                Open both detectors
              </button>
              <button
                className={`btn btn--break${whichPath ? " is-on" : ""}`}
                onClick={toggleWhichPath}
                disabled={locked}
              >
                {whichPath ? "Remove the which-path tag" : "Tag which path was taken"}
              </button>
            </div>
            {locked && (
              <p className="tpi__locked">
                One door fired. There's no path pair left to slide a phase
                between — reset to send another one through.
              </p>
            )}
          </div>
        }
        readout={
          <>
            <span>P(A) <b>{(shownProbs[0] * 100).toFixed(1)}%</b></span>
            <span>P(B) <b>{(shownProbs[1] * 100).toFixed(1)}%</b></span>
            <span>outcome <b>{collapse ? (collapse.outcome === 0 ? "A" : "B") : "—"}</b></span>
          </>
        }
      >
        <p className="tpi__caption">{caption}</p>

        <div className="tpi">
          <svg viewBox="0 0 320 160" className="tpi__diagram" role="img"
            aria-label={`Two paths from one source, recombining at two detectors. Path B currently carries a phase of ${phiDeg.toFixed(0)} degrees${whichPath ? "; a which-path tag is active, so the paths no longer interfere" : ""}.`}>
            <circle cx="26" cy="80" r="7" fill="var(--cyan)" />
            <text x="26" y="102" textAnchor="middle" className="tpi__lbl">source</text>

            <line x1="62" y1="70" x2="78" y2="90" stroke="var(--paper-dim)" strokeWidth="3" strokeLinecap="round" />
            <line x1="242" y1="70" x2="258" y2="90" stroke="var(--paper-dim)" strokeWidth="3" strokeLinecap="round" />

            <path d="M70,80 Q155,20 250,80" fill="none" stroke="var(--cyan)" strokeWidth="4" strokeLinecap="round" />
            <path
              d="M70,80 Q155,140 250,80" fill="none" strokeWidth="4" strokeLinecap="round"
              stroke={whichPath ? "var(--paper-dim)" : "var(--cyan)"}
              strokeDasharray={whichPath ? "3 7" : undefined}
            />

            <line x1="250" y1="80" x2="285" y2="42" stroke="var(--gutter)" strokeWidth="2" strokeDasharray="2 3" />
            <line x1="250" y1="80" x2="285" y2="118" stroke="var(--gutter)" strokeWidth="2" strokeDasharray="2 3" />

            <circle
              cx={ringX} cy={ringY} r={ringR} fill="none"
              stroke={whichPath ? "var(--paper-dim)" : "var(--magenta)"} strokeWidth="2"
            />
            <line
              x1={ringX} y1={ringY} x2={tickX} y2={tickY}
              stroke={whichPath ? "var(--paper-dim)" : "var(--magenta)"} strokeWidth="2"
            />
            {whichPath && (
              <text x={ringX} y={ringY + 26} textAnchor="middle" className="tpi__tag">tagged</text>
            )}

            <circle
              cx="250" cy="80" r={coherent ? 9 : 6}
              fill={coherent ? "var(--cyan)" : "var(--gutter)"}
              opacity={coherent ? 0.55 : 1}
            />

            <circle cx="285" cy="42" r="9" fill="var(--ink)" stroke="var(--gutter)" strokeWidth="2" />
            <text x="285" y="45.5" textAnchor="middle" className="tpi__det">A</text>
            <circle cx="285" cy="118" r="9" fill="var(--ink)" stroke="var(--gutter)" strokeWidth="2" />
            <text x="285" y="121.5" textAnchor="middle" className="tpi__det">B</text>
          </svg>

          <Pocket label="What am I looking at?">
            <p>
              One source, two paths, one recombination point. Path B is the
              one carrying the phase you're setting — the magenta ring shows
              it directly, same dial the probability bars use elsewhere on
              this site.
            </p>
            <p>
              A which-path tag doesn't just hide the interference from you —
              it removes it from the system. That's why the bars go flat the
              instant you add the tag, not the instant you check it.
            </p>
          </Pocket>

          <ProbabilityHistogram
            labels={["A", "B"]}
            probs={shownProbs}
            collapsedTo={collapse ? collapse.outcome : null}
            shimmer={!locked}
            height={200}
          />
        </div>

        {phase === "collapsed" && !violation && (
          <span className="sfx sfx--fire tpi__snap">SNAP!</span>
        )}

        <ViolationExplainer violation={violation} onDismiss={() => setViolation(null)} />

        <style>{`
          .tpi__caption {
            font-family: var(--font-mono); font-size: 0.72rem; letter-spacing: 0.08em;
            color: var(--cyan); margin: 0 0 1rem; text-align: center; min-height: 1.1rem;
          }
          .tpi { display: grid; gap: 1.1rem; width: 100%; justify-items: center; }
          .tpi__diagram { width: 100%; max-width: 26rem; height: auto; }
          .tpi__lbl {
            font-family: var(--font-mono); font-size: 8px; letter-spacing: 0.08em;
            text-transform: uppercase; fill: var(--paper-dim);
          }
          .tpi__tag {
            font-family: var(--font-mono); font-size: 8px; letter-spacing: 0.08em;
            text-transform: uppercase; fill: var(--paper-dim);
          }
          .tpi__det { font-family: var(--font-head); font-weight: 900; font-size: 10px; fill: var(--paper); }
          .tpi__snap { display: block; margin-top: 0.75rem; }
          .tpi__locked {
            font-size: 0.88rem; color: var(--paper-dim); margin: 0;
            border-left: 3px solid var(--yellow); padding-left: 0.7rem;
          }
          .btn--break.is-on { background: var(--magenta); color: var(--ink); border-color: var(--magenta); }
        `}</style>
      </SimShell>
    </Predict>
  );
}
