import { useEffect, useMemo, useRef, useState } from "react";
import SimShell from "../components/sim/SimShell";
import Predict from "../components/sim/Predict";
import ViolationExplainer from "../components/sim/ViolationExplainer";
import ProbabilityHistogram from "../components/sim/ProbabilityHistogram";
import BlochSphere from "../components/sim/BlochSphere";
import Pocket from "../components/sim/Pocket";
import { GlowHand } from "../components/sim/motifs";
import { QuantumState, RY, RZ } from "../lib/quantum";

const SLUG = "amplitude-dial";

/**
 * WEEK 1 — Superposition.
 *
 * The reader turns two dials and watches the odds. The aha: the phase dial
 * changes nothing the measurement can see. So the state carries information
 * the outcome can't reveal — which is week 2's entire engine.
 *
 * TWO KINDS OF NOT-KNOWING, held apart deliberately:
 *   - The Bloch sphere is STEADY. The state is fully known; the dials set it.
 *   - The histogram SHIMMERS. The odds are known, but no outcome exists yet.
 * Measurement resolves the second without ever having hidden the first. That
 * distinction is the difference between "we can't tell" and "it isn't decided",
 * and getting it wrong here would poison weeks 3 and 6.
 */

type Phase = "live" | "peeking" | "failing" | "collapsed";

interface Collapse {
  outcome: 0 | 1;
  fromProbs: [number, number];
  fromBloch: { x: number; y: number; z: number };
}

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export default function AmplitudeDial() {
  const [theta, setTheta] = useState(Math.PI / 2);
  const [phi, setPhi] = useState(0);
  const [phase, setPhase] = useState<Phase>("live");
  const [collapse, setCollapse] = useState<Collapse | null>(null);
  const [t, setT] = useState(0);
  const [turbulence, setTurbulence] = useState(0);
  const [peekValue, setPeekValue] = useState<0 | 1 | null>(null);
  const [violation, setViolation] =
    useState<null | Parameters<typeof ViolationExplainer>[0]["violation"]>(null);
  const timers = useRef<number[]>([]);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(() => clearTimers, []);

  const state = useMemo(() => {
    const s = new QuantumState(1);
    s.apply(RY(theta), 0);
    s.apply(RZ(phi), 0);
    return s;
  }, [theta, phi]);

  const liveProbs = state.probabilities();
  const liveBloch = state.bloch(0);

  // Collapse animation: the surviving bar slams to certainty, the Bloch arrow
  // snaps to its pole. Both are literally what measurement does to the state.
  useEffect(() => {
    if (!collapse) {
      setT(0);
      return;
    }
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

  const target: [number, number] = collapse
    ? collapse.outcome === 0 ? [1, 0] : [0, 1]
    : [0, 0];

  const shownProbs = collapse
    ? ([lerp(collapse.fromProbs[0], target[0], t), lerp(collapse.fromProbs[1], target[1], t)] as number[])
    : (Array.from(liveProbs) as number[]);

  const shownBloch = collapse
    ? {
        x: lerp(collapse.fromBloch.x, 0, t),
        y: lerp(collapse.fromBloch.y, 0, t),
        z: lerp(collapse.fromBloch.z, collapse.outcome === 0 ? 1 : -1, t),
      }
    : liveBloch;

  const phases = [
    Math.atan2(state.im[0], state.re[0]),
    Math.atan2(state.im[1], state.re[1]),
  ];

  const doCollapse = (outcome: 0 | 1) => {
    setCollapse({
      outcome,
      fromProbs: [liveProbs[0], liveProbs[1]],
      fromBloch: { ...liveBloch },
    });
    setPhase("collapsed");
    setTurbulence(0);
  };

  const reset = () => {
    clearTimers();
    setTheta(Math.PI / 2);
    setPhi(0);
    setPhase("live");
    setCollapse(null);
    setViolation(null);
    setTurbulence(0);
    setPeekValue(null);
  };

  const measure = () => {
    const outcome = state.clone().measure(0);
    doCollapse(outcome);
  };

  /**
   * TACTIC 2 — the forbidden path is a live button that appears to succeed.
   *
   * Beat 1: a reading appears, the shimmer continues. It looks like it worked.
   * Beat 2: the state destabilises — the peek WAS an interaction.
   * Beat 3: collapse, to the value the peek reported. Looking was measuring.
   */
  const peek = () => {
    const outcome = state.clone().measure(0);
    setPeekValue(outcome);
    setPhase("peeking");

    timers.current.push(
      window.setTimeout(() => {
        setPhase("failing");
        // ramp turbulence 0 -> 1 over 420ms
        const t0 = performance.now();
        const ramp = () => {
          const p = Math.min(1, (performance.now() - t0) / 420);
          setTurbulence(p);
          if (p < 1) requestAnimationFrame(ramp);
        };
        requestAnimationFrame(ramp);
      }, 1150),
    );

    timers.current.push(
      window.setTimeout(() => {
        setPeekValue(null);
        doCollapse(outcome);
        setViolation({
          sfx: "KRAKK!",
          law: "Looking was measuring.",
          attempted: "read the state without disturbing it",
          why: (
            <>
              The reading was real — and taking it is what destroyed the thing
              you were reading. There was never a hidden answer sitting
              underneath waiting to be checked. Reset and turn the dials again:
              nothing about that state was ever a 0 or a 1.
            </>
          ),
        });
      }, 1570),
    );
  };

  const locked = phase === "collapsed";
  const busy = phase === "peeking" || phase === "failing";
  const shimmering = phase !== "collapsed";

  const watchFor =
    phase === "collapsed"
      ? "the sphere has snapped to a pole. That IS the state now — the superposition is gone."
      : "the bars never stop moving. The odds are exact; the outcome simply hasn't happened yet.";

  return (
    <Predict
      slug={SLUG}
      question="Turn the phase dial — only the phase, leaving the first dial alone. What happens to the two probability bars?"
      choices={[
        { id: "swap", label: "They trade places" },
        { id: "shift", label: "They shift gradually" },
        { id: "none", label: "Nothing at all" },
        { id: "even", label: "They even out to 50/50" },
      ]}
      answer="none"
      because={
        <>
          Phase is invisible to a measurement on a single qubit. It's real, and
          it's doing something — but nothing you can see from here. Hold onto
          that; it's next week's whole story.
        </>
      }
    >
      <SimShell
        slug={SLUG}
        title="The amplitude dial"
        watchFor={watchFor}
        motif={<GlowHand alive={!locked} size={220} />}
        onReset={reset}
        controls={
          <div className="stack">
            <div className="ctrl">
              <label htmlFor="th">
                <span>Tilt away from |0⟩</span>
                <span className="val">{((theta / Math.PI) * 180).toFixed(0)}°</span>
              </label>
              <input
                id="th" type="range" min={0} max={Math.PI} step={0.01}
                value={theta} disabled={locked || busy}
                onChange={(e) => setTheta(+e.target.value)}
              />
            </div>
            <div className="ctrl">
              <label htmlFor="ph">
                <span>Phase</span>
                <span className="val">{((phi / Math.PI) * 180).toFixed(0)}°</span>
              </label>
              <input
                id="ph" type="range" min={0} max={Math.PI * 2} step={0.01}
                value={phi} disabled={locked || busy}
                onChange={(e) => setPhi(+e.target.value)}
              />
            </div>
            <div className="row">
              <button className="btn btn--go" onClick={measure} disabled={locked || busy}>
                Measure it
              </button>
              <button className="btn btn--break" onClick={peek} disabled={locked || busy}>
                Peek without measuring
              </button>
            </div>
            {locked && (
              <p className="ad__locked">
                The dials are dead. You don't have a superposition any more — you
                have an answer. Reset to prepare a new one.
              </p>
            )}
          </div>
        }
        readout={
          <>
            <span>P(0) <b>{(shownProbs[0] * 100).toFixed(1)}%</b></span>
            <span>P(1) <b>{(shownProbs[1] * 100).toFixed(1)}%</b></span>
            <span>
              outcome{" "}
              <b>{collapse ? `|${collapse.outcome}⟩` : shimmering ? "—" : "—"}</b>
            </span>
          </>
        }
      >
        <div className="dial">
          <div className="dial__sphere">
            <BlochSphere vector={shownBloch} size={220} />
            <p className="dial__cap">
              {locked ? "collapsed" : "the state — fully known"}
            </p>
            <Pocket label="What am I looking at?">
              <p>
                This diagram is a Bloch Sphere: a visualization of a state
                that combines both phases along the equator (direction) and
                binary basis states at the poles (proximity to both 0 and 1).
              </p>
              <p>
                The vector you're controlling right now combines those
                pieces of information about our superposition!
              </p>
            </Pocket>
          </div>

          <div className="dial__hist">
            <ProbabilityHistogram
              labels={state.labels()}
              probs={shownProbs}
              phases={phases}
              collapsedTo={collapse ? collapse.outcome : null}
              shimmer={shimmering}
              turbulence={turbulence}
              height={220}
            />
            <p className="dial__cap">
              {locked ? "one outcome, forever" : "the odds — exact, but undecided"}
            </p>

            {phase === "peeking" && (
              <div className="ad__peek">
                <span className="ad__peekLabel">reading…</span>
                <span className="ad__peekVal">|{peekValue}⟩</span>
                <span className="ad__peekOk">state intact</span>
              </div>
            )}
            {phase === "failing" && (
              <div className="ad__peek is-bad">
                <span className="ad__peekLabel">state destabilising</span>
              </div>
            )}
          </div>
        </div>

        {phase === "collapsed" && !violation && (
          <span className="sfx sfx--fire ad__snap">SNAP!</span>
        )}

        <ViolationExplainer violation={violation} onDismiss={() => setViolation(null)} />

        <style>{`
          .dial { display: grid; gap: 1.5rem; width: 100%; place-items: center; }
          .dial__sphere, .dial__hist { width: 100%; display: grid; justify-items: center; }
          .dial__hist { position: relative; }
          .dial__cap {
            font-family: var(--font-mono); font-size: 0.66rem; letter-spacing: 0.12em;
            text-transform: uppercase; color: var(--paper-dim);
            margin: 0.5rem 0 0; text-align: center;
          }
          .ad__snap { display: block; margin-top: 0.75rem; }
          .ad__locked {
            font-size: 0.88rem; color: var(--paper-dim); margin: 0;
            border-left: 3px solid var(--yellow); padding-left: 0.7rem;
          }
          .ad__peek {
            position: absolute; left: 50%; top: 38%; transform: translate(-50%,-50%);
            display: flex; gap: 0.6rem; align-items: baseline;
            background: var(--ink); border: 2px solid var(--cyan);
            border-radius: var(--radius); padding: 0.5rem 0.8rem;
            font-family: var(--font-mono); font-size: 0.72rem;
            letter-spacing: 0.1em; text-transform: uppercase;
            box-shadow: 0 0 0 6px rgba(34,196,240,0.12);
          }
          .ad__peekLabel { color: var(--cyan); }
          .ad__peekVal {
            font-family: var(--font-head); font-weight: 900; font-size: 1.1rem;
            color: var(--paper); letter-spacing: 0;
          }
          .ad__peekOk { color: var(--paper-dim); }
          .ad__peek.is-bad {
            border-color: var(--magenta); box-shadow: 0 0 0 6px rgba(255,61,139,0.14);
            animation: ad-shake 90ms linear infinite;
          }
          .ad__peek.is-bad .ad__peekLabel { color: var(--magenta); }
          @keyframes ad-shake {
            0% { transform: translate(-50%,-50%) rotate(-0.6deg); }
            50% { transform: translate(-51%,-49%) rotate(0.6deg); }
            100% { transform: translate(-50%,-50%) rotate(-0.6deg); }
          }
          @media (prefers-reduced-motion: reduce) {
            .ad__peek.is-bad { animation: none; }
          }
          @media (min-width: 44rem) {
            .dial { grid-template-columns: auto 1fr; align-items: center; }
          }
        `}</style>
      </SimShell>
    </Predict>
  );
}
