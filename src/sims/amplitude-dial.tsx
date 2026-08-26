import { useMemo, useState } from "react";
import SimShell from "../components/sim/SimShell";
import Predict from "../components/sim/Predict";
import ViolationExplainer from "../components/sim/ViolationExplainer";
import ProbabilityHistogram from "../components/sim/ProbabilityHistogram";
import BlochSphere from "../components/sim/BlochSphere";
import { QuantumState, RY, RZ } from "../lib/quantum";

const SLUG = "amplitude-dial";

/**
 * WEEK 1 — Superposition.
 *
 * Spec: the reader turns two dials (how far from |0>, and the phase) and
 * watches the probabilities. The aha: turning the *phase* dial does nothing
 * at all to the probabilities. So the state carries information the
 * measurement can't see — which is the setup for week 2, where that hidden
 * information turns out to be the entire engine.
 *
 * This file is the template. Every week's sim is shaped like this:
 * derive state from controls → render → offer a way to break it.
 */
export default function AmplitudeDial() {
  const [theta, setTheta] = useState(Math.PI / 2);
  const [phi, setPhi] = useState(0);
  const [collapsed, setCollapsed] = useState<number | null>(null);
  const [violation, setViolation] = useState<null | Parameters<typeof ViolationExplainer>[0]["violation"]>(null);

  const state = useMemo(() => {
    const s = new QuantumState(1);
    s.apply(RY(theta), 0);
    s.apply(RZ(phi), 0);
    return s;
  }, [theta, phi]);

  const probs = state.probabilities();
  const phases = [Math.atan2(state.im[0], state.re[0]), Math.atan2(state.im[1], state.re[1])];

  const reset = () => {
    setTheta(Math.PI / 2);
    setPhi(0);
    setCollapsed(null);
    setViolation(null);
  };

  const measure = () => {
    const copy = state.clone();
    setCollapsed(copy.measure(0));
  };

  /** TACTIC 2 — the forbidden path is a live button, not a disabled one. */
  const peek = () => {
    setCollapsed(state.clone().measure(0));
    setViolation({
      sfx: "SNAP!",
      law: "You can't read a superposition.",
      attempted: "check which state it's really in, without disturbing it",
      why: (
        <>
          There was no hidden "really." Looking is not a passive act here — the
          act of asking forced an answer, and the superposition you were trying
          to inspect is gone. Reset and watch the dials: nothing about them was
          ever a 0 or a 1.
        </>
      ),
    });
  };

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
          that; it's next issue's whole story.
        </>
      }
    >
      <SimShell
        slug={SLUG}
        title="The amplitude dial"
        watchFor="the magenta phase rings above each bar. They spin. The bars don't move."
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
                value={theta} onChange={(e) => { setTheta(+e.target.value); setCollapsed(null); }}
              />
            </div>
            <div className="ctrl">
              <label htmlFor="ph">
                <span>Phase</span>
                <span className="val">{((phi / Math.PI) * 180).toFixed(0)}°</span>
              </label>
              <input
                id="ph" type="range" min={0} max={Math.PI * 2} step={0.01}
                value={phi} onChange={(e) => { setPhi(+e.target.value); setCollapsed(null); }}
              />
            </div>
            <div className="row">
              <button className="btn btn--go" onClick={measure}>Measure it</button>
              <button className="btn btn--break" onClick={peek}>Peek without measuring</button>
            </div>
          </div>
        }
        readout={
          <>
            <span>P(0) <b>{(probs[0] * 100).toFixed(1)}%</b></span>
            <span>P(1) <b>{(probs[1] * 100).toFixed(1)}%</b></span>
            <span>state length <b>{Math.hypot(...Object.values(state.bloch(0))).toFixed(3)}</b></span>
          </>
        }
      >
        <div className="dial">
          <BlochSphere vector={state.bloch(0)} size={220} />
          <ProbabilityHistogram
            labels={state.labels()}
            probs={probs}
            phases={phases}
            collapsedTo={collapsed}
            height={220}
          />
        </div>

        <ViolationExplainer violation={violation} onDismiss={() => setViolation(null)} />

        <style>{`
          .dial { display: grid; gap: 1.5rem; width: 100%; place-items: center; }
          @media (min-width: 44rem) {
            .dial { grid-template-columns: auto 1fr; align-items: center; }
          }
        `}</style>
      </SimShell>
    </Predict>
  );
}
