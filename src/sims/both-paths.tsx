import { useCallback, useEffect, useRef, useState } from "react";
import SimShell from "../components/sim/SimShell";
import Predict from "../components/sim/Predict";
import Pocket from "../components/sim/Pocket";
import ViolationExplainer from "../components/sim/ViolationExplainer";
import BlochSphere from "../components/sim/BlochSphere";
import { FlashBolt } from "../components/sim/motifs";
import { QuantumState, GATES, RZ } from "../lib/quantum";
import { copy } from "../lib/site-copy";
import { rig, speedBlur, rider, coreBolt, catcher, drawDial, INK, type Path } from "./flash-art";

const SLUG = "both-paths";
const C = copy.simCopy.bothPaths;
const DEG = Math.PI / 180;
const RUN_MS = 3000;
const LOOP_GAP = 240;
const HIT_KEYS = ["a", "b", "c", "d"] as const;

/**
 * WEEK 3 — Phase & interference.
 *
 * The payoff for week 1's cliffhanger. Phase was invisible there because the
 * qubit was measured straight away. Here the two routes are allowed to MEET,
 * and the same dial that did nothing now decides everything.
 *
 * TWO DIALS ON PURPOSE. A phase that every copy shares is undetectable in
 * principle, so turning both together changes nothing at all. Only the
 * difference is physical, and a reader can discover that in fifteen seconds.
 *
 * HE IS NEVER DESTROYED. Cancelling at one rod means arriving at the other.
 * Destructive interference redistributes; it does not delete. Every visual
 * here is built so nothing implies otherwise.
 *
 * Circuit: H -> RZ(delta) -> [optional which-route measurement] -> H -> measure
 * With both routes open, P(D0) = cos^2(delta/2).
 */
export default function BothPaths() {
  const [phiA, setPhiA] = useState(0);
  const [phiB, setPhiB] = useState(0);
  const [running, setRunning] = useState(false);
  const [scorch, setScorch] = useState<0 | 1 | null>(null);
  const [which, setWhich] = useState(false);
  const [looping, setLooping] = useState(false);
  const [diag, setDiag] = useState<"bloch" | "fringe" | "none">("bloch");
  // runT mirrors tRef below into React state — only the Bloch vector needs a
  // reactive value (BlochSphere is a real React component); the canvas track
  // and fringe curve paint imperatively off the ref every frame instead, the
  // same way amplitude-dial's own collapse animation splits the two.
  const [runT, setRunT] = useState(0);
  const [sfx, setSfx] = useState<{ copyKey: string; text: string; stamp: number } | null>(null);
  const [line, setLine] = useState<{ copyKey: string; text: string } | null>(null);
  const [violation, setViolation] =
    useState<null | Parameters<typeof ViolationExplainer>[0]["violation"]>(null);

  const trackRef = useRef<HTMLCanvasElement>(null);
  const fringeRef = useRef<HTMLCanvasElement>(null);
  const dialARef = useRef<HTMLCanvasElement>(null);
  const dialBRef = useRef<HTMLCanvasElement>(null);
  const tRef = useRef(0);
  const raf = useRef(0);
  const timers = useRef<number[]>([]);
  const loopRef = useRef(false);
  const liveRef = useRef({ phiA: 0, phiB: 0, which: false, outcome: 0 as 0 | 1, scorch: null as 0 | 1 | null });

  const delta = ((phiB - phiA) % 360 + 360) % 360;
  const p0 = which ? 0.5 : Math.cos(delta * DEG / 2) ** 2;

  useEffect(() => { loopRef.current = looping; }, [looping]);
  useEffect(() => {
    liveRef.current.phiA = phiA; liveRef.current.phiB = phiB; liveRef.current.which = which;
  }, [phiA, phiB, which]);
  useEffect(() => () => {
    cancelAnimationFrame(raf.current);
    timers.current.forEach(clearTimeout);
  }, []);

  // ---- the physics ----
  const sample = useCallback((d: number, w: boolean): 0 | 1 => {
    const s = new QuantumState(1);
    s.apply(GATES.H, 0);          // the splitter: he takes both routes
    s.apply(RZ(d * DEG), 0);      // the phase difference between the copies
    if (w) s.measure(0);          // the route is observed
    s.apply(GATES.H, 0);          // the routes meet again
    return s.measure(0) as 0 | 1;
  }, []);

  /**
   * Barry's line, chosen by the PHASE DIFFERENCE rather than by the odds of the
   * rod he hit: at 180° he lands at the far rod with near-certainty, so a high
   * hit probability occurs BOTH when the copies add and when they cancel.
   */
  const explainBranch = useCallback((d: number, w: boolean): { copyKey: string; text: string } => {
    if (w) return { copyKey: "simCopy.bothPaths.voice.watchedLine", text: C.voice.watchedLine };
    if (d < 35 || d > 325) return { copyKey: "simCopy.bothPaths.voice.inPhaseLine", text: C.voice.inPhaseLine };
    if (d > 145 && d < 215) return { copyKey: "simCopy.bothPaths.voice.outOfPhaseLine", text: C.voice.outOfPhaseLine };
    return { copyKey: "simCopy.bothPaths.voice.partialLine", text: C.voice.partialLine };
  }, []);

  // ---- run ----
  const run = useCallback(() => {
    cancelAnimationFrame(raf.current);
    const { phiA: a, phiB: b, which: w } = liveRef.current;
    const d = ((b - a) % 360 + 360) % 360;
    const result = sample(d, w);
    liveRef.current.outcome = result;
    liveRef.current.scorch = null;
    setScorch(null); setRunning(true);
    tRef.current = 0; setRunT(0);
    let fired = false;
    const t0 = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / RUN_MS);
      tRef.current = t; setRunT(t);
      if (!fired && t > 0.965) {
        fired = true;
        const k = HIT_KEYS[Math.floor(Math.random() * HIT_KEYS.length)];
        setSfx({ copyKey: `simCopy.bothPaths.hits.${k}`, text: C.hits[k], stamp: now });
        // the lettering lands first; the explanation follows a beat later
        timers.current.push(window.setTimeout(() => setLine(explainBranch(d, w)), 380));
      }
      if (t < 1) raf.current = requestAnimationFrame(step);
      else {
        liveRef.current.scorch = result;
        setScorch(result); setRunning(false);
        if (loopRef.current) timers.current.push(window.setTimeout(run, LOOP_GAP));
      }
    };
    raf.current = requestAnimationFrame(step);
  }, [sample, explainBranch]);

  const reset = () => {
    cancelAnimationFrame(raf.current);
    timers.current.forEach(clearTimeout);
    timers.current = [];
    loopRef.current = false;
    setPhiA(0); setPhiB(0); setRunning(false); setScorch(null);
    setWhich(false); setLooping(false); setSfx(null); setLine(null); setViolation(null);
    liveRef.current = { phiA: 0, phiB: 0, which: false, outcome: 0, scorch: null };
    tRef.current = 0; setRunT(0);
  };

  /** TACTIC 2 — the forbidden path is a live button, not a disabled one */
  const watchRoute = () => {
    setWhich(true);
    liveRef.current.which = true;
    setViolation({
      sfx: C.violation.sfx, sfxKey: "simCopy.bothPaths.violation.sfx",
      law: C.violation.law, lawKey: "simCopy.bothPaths.violation.law",
      attempted: C.violation.attempted, attemptedKey: "simCopy.bothPaths.violation.attempted",
      why: C.violation.why, whyKey: "simCopy.bothPaths.violation.why",
    });
  };

  // ---- dials ----
  useEffect(() => {
    const a = dialARef.current, b = dialBRef.current;
    if (a) { const g = a.getContext("2d"); if (g) drawDial(g, a.width, a.height, phiA, INK.red, which); }
    if (b) { const g = b.getContext("2d"); if (g) drawDial(g, b.width, b.height, phiB, "#ffb02e", which); }
  }, [phiA, phiB, which]);

  const dragDial = (set: (v: number) => void) => (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (which) return;
    if (e.type === "pointermove" && e.buttons === 0) return;
    if (e.type === "pointerdown") e.currentTarget.setPointerCapture(e.pointerId);
    const r = e.currentTarget.getBoundingClientRect();
    const ang = Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) / DEG;
    set(((ang % 360) + 360) % 360);
  };

  // ---- painters (read live refs so the rAF loop never sees stale state) ----
  const drawTrack = useCallback(() => {
    const cv = trackRef.current; if (!cv) return;
    const g = cv.getContext("2d"); if (!g) return;
    const W = cv.width, H = cv.height, P = rig(W, H), TAU = Math.PI * 2;
    const L = liveRef.current;
    const isRun = tRef.current > 0 && tRef.current < 1;
    const t = tRef.current;

    g.clearRect(0, 0, W, H);
    g.fillStyle = INK.ink; g.fillRect(0, 0, W, H);
    g.strokeStyle = INK.gut; g.lineWidth = 3; g.setLineDash([7, 7]);
    g.beginPath(); g.arc(P.cx, P.cy, P.R, 0, TAU); g.stroke(); g.setLineDash([]);
    g.beginPath(); g.moveTo(P.entry.x, P.entry.y); g.lineTo(P.split.x, P.split.y); g.stroke();
    for (const d of [P.d0, P.d1]) {
      g.beginPath(); g.moveTo(P.merge.x, P.merge.y); g.lineTo(d.x - 16, d.y); g.stroke();
    }
    const hot0 = isRun && t > 0.96 && L.outcome === 0;
    const hot1 = isRun && t > 0.96 && L.outcome === 1;
    const zap = Math.abs(Math.sin(t * 120));
    catcher(g, P.d0.x, P.d0.y, "D0", hot0, zap, L.scorch === 0 ? 1 : 0);
    catcher(g, P.d1.x, P.d1.y, "D1", hot1, zap, L.scorch === 1 ? 1 : 0);
    for (const n of [P.split, P.merge]) {
      g.strokeStyle = INK.dim; g.lineWidth = 4;
      g.beginPath(); g.moveTo(n.x - 11, n.y + 11); g.lineTo(n.x + 11, n.y - 11); g.stroke();
    }
    if (L.which) {
      const m = P.B(0.5);
      g.strokeStyle = INK.mag; g.lineWidth = 3; g.fillStyle = INK.ink2;
      g.beginPath(); g.rect(m.x - 22, m.y - 16, 44, 32); g.fill(); g.stroke();
      g.fillStyle = INK.mag; g.beginPath(); g.arc(m.x, m.y, 6, 0, TAU); g.fill();
    }
    let charge = 0, flash = 0;
    if (isRun) {
      if (t >= 0.16 && t < 0.78) charge = (t - 0.16) / 0.62;
      else if (t >= 0.78) { charge = 1; flash = Math.max(0, 1 - (t - 0.78) / 0.1); }
    }
    coreBolt(g, P.cx, P.cy, P.R, charge, flash);

    if (!isRun) return;
    if (t < 0.16) {
      const u = t / 0.16;
      const fn: Path = (s) => ({ x: P.entry.x + (P.split.x - P.entry.x) * s, y: P.entry.y });
      speedBlur(g, fn, u, { grow: 0.5, len: 0.5, strands: 8, spread: 11, seed: 1 });
      rider(g, fn, u, 1.3);
      return;
    }
    if (t < 0.78) {
      const u = (t - 0.16) / 0.62, grow = 0.45 + 0.85 * u;
      if (L.which) {
        const fn = L.outcome === 0 ? P.A : P.B;
        speedBlur(g, fn, u, { grow, seed: 3 });
        rider(g, fn, u, 1.4);
      } else {
        speedBlur(g, P.A, u, { grow, seed: 3, head: INK.red, tail: INK.orange });
        speedBlur(g, P.B, u, { grow, seed: 9, head: "#ffb02e", tail: INK.yel });
        rider(g, P.A, u, 1.4); rider(g, P.B, u, 1.4);
      }
      return;
    }
    const u = (t - 0.78) / 0.22;
    const tgt = L.outcome === 0 ? P.d0 : P.d1;
    const exit: Path = (s) => ({
      x: P.merge.x + (tgt.x - 16 - P.merge.x) * s,
      y: P.merge.y + (tgt.y - P.merge.y) * s,
    });
    // he burns out on arrival — nothing left but the scorch
    const fade = u > 0.82 ? Math.max(0, 1 - (u - 0.82) / 0.18) : 1;
    if (fade > 0.01) {
      speedBlur(g, exit, u, { grow: 1.7, len: 0.85, strands: 15, spread: 22, seed: 5, alpha: fade });
      rider(g, exit, u, 1.6, fade);
    }
  }, []);

  const drawFringe = useCallback(() => {
    const cv = fringeRef.current; if (!cv) return;
    const g = cv.getContext("2d"); if (!g) return;
    const L = liveRef.current;
    const d = ((L.phiB - L.phiA) % 360 + 360) % 360;
    const pr = L.which ? 0.5 : Math.cos(d * DEG / 2) ** 2;
    const W = cv.width, H = cv.height, PAD = 32, TAU = Math.PI * 2;
    g.clearRect(0, 0, W, H); g.fillStyle = INK.ink; g.fillRect(0, 0, W, H);
    g.strokeStyle = INK.gut; g.lineWidth = 2;
    g.beginPath(); g.moveTo(PAD, H - PAD); g.lineTo(W - PAD, H - PAD); g.stroke();
    g.beginPath(); g.moveTo(PAD, PAD); g.lineTo(PAD, H - PAD); g.stroke();
    g.setLineDash([3, 4]); g.lineWidth = 1;
    g.beginPath(); g.moveTo(PAD, H - PAD - (H - PAD * 2) * 0.5);
    g.lineTo(W - PAD, H - PAD - (H - PAD * 2) * 0.5); g.stroke(); g.setLineDash([]);
    g.strokeStyle = L.which ? INK.mag : INK.cyan; g.lineWidth = 3.5;
    if (L.which) g.setLineDash([6, 5]);
    g.beginPath();
    for (let i = 0; i <= 120; i++) {
      const ph = i / 120 * 360, y = L.which ? 0.5 : Math.cos(ph * DEG / 2) ** 2;
      const x = PAD + (i / 120) * (W - PAD * 2), yy = H - PAD - y * (H - PAD * 2);
      i ? g.lineTo(x, yy) : g.moveTo(x, yy);
    }
    g.stroke(); g.setLineDash([]);
    const mx = PAD + (d / 360) * (W - PAD * 2), my = H - PAD - pr * (H - PAD * 2);
    g.strokeStyle = INK.yel; g.globalAlpha = 0.5; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(mx, PAD); g.lineTo(mx, H - PAD); g.stroke(); g.globalAlpha = 1;
    g.fillStyle = INK.yel; g.beginPath(); g.arc(mx, my, 5.5, 0, TAU); g.fill();
    g.fillStyle = INK.dim; g.font = '10px "Space Mono", monospace';
    g.textAlign = "left"; g.fillText("0°", PAD, H - 10);
    g.textAlign = "right"; g.fillText("360°", W - PAD, H - 10); g.fillText("1", PAD - 6, PAD + 5);
  }, []);

  // paint continuously while running; once otherwise
  useEffect(() => {
    let alive = true;
    const paint = () => {
      if (!alive) return;
      drawTrack(); drawFringe();
      if (running) requestAnimationFrame(paint);
    };
    paint();
    return () => { alive = false; };
  }, [running, drawTrack, drawFringe]);

  // idle repaint when a control changes
  useEffect(() => {
    if (!running) { drawTrack(); drawFringe(); }
  }, [phiA, phiB, which, diag, scorch, running, drawTrack, drawFringe]);

  // ---- the Bloch vector, as React state so the shared BlochSphere component
  // (a real React tree, not a bespoke canvas) can render it — merged tracks
  // whether the routes have recombined yet, driving both the vector's height
  // and which status line shows underneath.
  const d = (((phiB - phiA) % 360 + 360) % 360) * DEG;
  const merged = runT >= 0.78;
  const m = which ? 0 : merged ? Math.min(1, Math.max(0, (runT - 0.78) / 0.14)) : 0;
  const blochVector = which
    ? { x: 0, y: 0, z: 0 }
    : { x: Math.cos(d) * (1 - m), y: Math.sin(d) * (1 - m), z: Math.cos(d) * m };
  const blochStatusKey = which
    ? "simCopy.bothPaths.blochLabels.noPhaseLeft"
    : merged ? "simCopy.bothPaths.blochLabels.heightSetsOdds" : "simCopy.bothPaths.blochLabels.phaseUnchanged";
  const blochStatusText = which
    ? C.blochLabels.noPhaseLeft
    : merged ? C.blochLabels.heightSetsOdds : C.blochLabels.phaseUnchanged;

  const isRun = runT > 0 && runT < 1;

  return (
    <Predict
      slug={SLUG}
      question={C.predict.question}
      questionKey="simCopy.bothPaths.predict.question"
      choices={[
        { id: "nothing", label: C.predict.choiceNothing, labelKey: "simCopy.bothPaths.predict.choiceNothing" },
        { id: "sweep", label: C.predict.choiceSweep, labelKey: "simCopy.bothPaths.predict.choiceSweep" },
        { id: "both", label: C.predict.choiceBoth, labelKey: "simCopy.bothPaths.predict.choiceBoth" },
        { id: "random", label: C.predict.choiceRandom, labelKey: "simCopy.bothPaths.predict.choiceRandom" },
      ]}
      answer="sweep"
      because={C.predict.because}
      becauseKey="simCopy.bothPaths.predict.because"
    >
      <SimShell
        slug={SLUG}
        title={C.title}
        titleKey="simCopy.bothPaths.title"
        watchFor={C.watchFor}
        watchForKey="simCopy.bothPaths.watchFor"
        onReset={reset}
        motif={<FlashBolt size={150} alive={running} />}
        controls={
          <div className="stack">
            <div className="bp__dials">
              <div className="bp__dial">
                <canvas ref={dialARef} width={216} height={216}
                  onPointerDown={dragDial(setPhiA)} onPointerMove={dragDial(setPhiA)}
                  aria-label="Phase of the first copy" />
                <span className="bp__dlab" data-copy-key="simCopy.bothPaths.controls.copyALabel">{C.controls.copyALabel}</span>
                <span className="bp__dval" style={{ color: INK.red }}>{Math.round(phiA)}&deg;</span>
              </div>
              <div className="bp__dial">
                <canvas ref={dialBRef} width={216} height={216}
                  onPointerDown={dragDial(setPhiB)} onPointerMove={dragDial(setPhiB)}
                  aria-label="Phase of the second copy" />
                <span className="bp__dlab" data-copy-key="simCopy.bothPaths.controls.copyBLabel">{C.controls.copyBLabel}</span>
                <span className="bp__dval" style={{ color: "#ffb02e" }}>{Math.round(phiB)}&deg;</span>
              </div>
              <div className="bp__diff">
                <span className="bp__dlab" data-copy-key="simCopy.bothPaths.controls.diffLabel">{C.controls.diffLabel}</span>
                <b>{which ? "—" : `${Math.round(delta)}°`}</b>
                <span className="bp__odds">
                  D0 {Math.round(p0 * 100)}% &middot; D1 {Math.round((1 - p0) * 100)}%
                </span>
              </div>
            </div>
            <div className="row">
              <button className="btn btn--go" onClick={run} disabled={running}>
                <span data-copy-key="simCopy.bothPaths.controls.runButton">{C.controls.runButton}</span>
              </button>
              <button className={`btn${looping ? " is-on" : ""}`}
                onClick={() => {
                  const n = !looping;
                  setLooping(n); loopRef.current = n;
                  if (n && !running) run();
                }}>
                <span data-copy-key={looping ? "simCopy.bothPaths.controls.stopLoopButton" : "simCopy.bothPaths.controls.loopButton"}>
                  {looping ? C.controls.stopLoopButton : C.controls.loopButton}
                </span>
              </button>
              <button className={`btn btn--break${which ? " is-on" : ""}`}
                onClick={which ? () => { setWhich(false); liveRef.current.which = false; } : watchRoute}>
                <span data-copy-key={which ? "simCopy.bothPaths.controls.stopWatchButton" : "simCopy.bothPaths.controls.watchButton"}>
                  {which ? C.controls.stopWatchButton : C.controls.watchButton}
                </span>
              </button>
            </div>
          </div>
        }
        readout={
          <>
            <span><span data-copy-key="simCopy.bothPaths.readout.predictedD0">{C.readout.predictedD0}</span> <b>{(p0 * 100).toFixed(1)}%</b></span>
            <span>
              <span data-copy-key="simCopy.bothPaths.readout.routes">{C.readout.routes}</span>{" "}
              <b data-copy-key={which ? "simCopy.bothPaths.readout.routesOne" : "simCopy.bothPaths.readout.routesBoth"}>
                {which ? C.readout.routesOne : C.readout.routesBoth}
              </b>
            </span>
          </>
        }
      >
        <div className="bp">
          <div className="bp__stage">
            <canvas ref={trackRef} width={860} height={540} className="bp__track" role="img"
              aria-label="Accelerator ring. One runner splits into two copies that travel opposite ways around the loop, meet, and strike one of two lightning rods." />
            {!isRun && (
              <p className="bp__pressRun" data-copy-key="simCopy.bothPaths.controls.pressRun">{C.controls.pressRun}</p>
            )}
          </div>
          <div className="bp__side">
            <div className="row bp__tabs">
              {(["bloch", "fringe", "none"] as const).map((k) => (
                <button key={k} className={`btn btn--xs${diag === k ? " is-on" : ""}`}
                  onClick={() => setDiag(k)}>
                  <span data-copy-key={
                    k === "bloch" ? "simCopy.bothPaths.diagTabs.bloch"
                      : k === "fringe" ? "simCopy.bothPaths.diagTabs.fringe" : "simCopy.bothPaths.diagTabs.hide"
                  }>
                    {k === "bloch" ? C.diagTabs.bloch : k === "fringe" ? C.diagTabs.fringe : C.diagTabs.hide}
                  </span>
                </button>
              ))}
            </div>
            {diag === "bloch" && (
              <>
                <BlochSphere vector={blochVector} size={280} />
                <p className="bp__blochStatus" data-copy-key={blochStatusKey}>{blochStatusText}</p>
                <p className="bp__cap" data-copy-key="simCopy.bothPaths.diagCaptions.bloch">{C.diagCaptions.bloch}</p>
              </>
            )}
            {diag === "fringe" && (
              <>
                <canvas ref={fringeRef} width={520} height={250} className="bp__diag" role="img"
                  aria-label="Interference fringe: probability of detector zero against phase difference" />
                <p className="bp__cap" data-copy-key="simCopy.bothPaths.diagCaptions.fringe">{C.diagCaptions.fringe}</p>
              </>
            )}
          </div>
        </div>

        {sfx && (
          <div className="bp__voice">
            <span className="bp__who" data-copy-key="simCopy.bothPaths.voice.who">{C.voice.who}</span>
            <span key={sfx.stamp} className="sfx sfx--fire bp__sfx" data-copy-key={sfx.copyKey}>{sfx.text}</span>
            {line && <p className="bp__line" data-copy-key={line.copyKey}>{line.text}</p>}
          </div>
        )}

        <Pocket label={C.pocket.label} labelKey="simCopy.bothPaths.pocket.label">
          <p data-copy-key="simCopy.bothPaths.pocket.p1">{C.pocket.p1}</p>
          <p data-copy-key="simCopy.bothPaths.pocket.p2">{C.pocket.p2}</p>
          <p data-copy-key="simCopy.bothPaths.pocket.p3">{C.pocket.p3}</p>
          <p className="bp__quirk" data-copy-key="simCopy.bothPaths.pocket.p4">{C.pocket.p4}</p>
        </Pocket>

        <ViolationExplainer violation={violation} onDismiss={() => setViolation(null)} />

        <style>{`
          .bp { display: grid; gap: 1rem; width: 100%; }
          @media (min-width: 62rem) { .bp { grid-template-columns: 1.7fr 1fr; align-items: start; } }
          .bp__stage { min-width: 0; position: relative; }
          .bp__track { width: 100%; height: auto; display: block; border-radius: var(--radius); }
          .bp__pressRun {
            position: absolute; left: 50%; bottom: 0.9rem; transform: translateX(-50%);
            font-family: var(--font-mono); font-size: 0.72rem; font-weight: 700;
            letter-spacing: 0.1em; text-transform: uppercase; color: var(--paper-dim);
            margin: 0; pointer-events: none;
          }
          .bp__side { display: grid; gap: 0.5rem; align-content: start; min-width: 0; }
          .bp__tabs { gap: 0.3rem; }
          .btn--xs { font-size: 0.66rem; padding: 0.3rem 0.55rem; min-height: 34px; }
          .btn.is-on { background: var(--cyan); color: var(--ink); border-color: var(--cyan); }
          .btn--break.is-on { background: var(--magenta); color: var(--ink); }
          .bp__diag { width: 100%; height: auto; display: block; }
          .bp__blochStatus {
            font-family: var(--font-mono); font-weight: 700; font-size: 0.68rem; letter-spacing: 0.08em;
            text-transform: uppercase; color: var(--paper-dim); margin: 0.3rem 0 0; text-align: center;
          }
          .bp__cap {
            font-family: var(--font-mono); font-size: 0.6rem; letter-spacing: 0.12em;
            text-transform: uppercase; color: var(--paper-dim); margin: 0.15rem 0 0; text-align: center;
          }
          .bp__dials { display: flex; gap: 1.1rem; align-items: center; flex-wrap: wrap; }
          .bp__dial { display: grid; justify-items: center; gap: 0.2rem; }
          .bp__dial canvas { width: 96px; height: 96px; touch-action: none; cursor: grab; display: block; }
          .bp__dial canvas:active { cursor: grabbing; }
          .bp__dlab {
            font-family: var(--font-mono); font-size: 0.58rem; letter-spacing: 0.13em;
            text-transform: uppercase; color: var(--paper-dim);
          }
          .bp__dval { font-family: var(--font-head); font-weight: 900; font-size: 0.95rem; }
          .bp__diff { display: grid; gap: 0.1rem; }
          .bp__diff b { font-family: var(--font-head); font-weight: 900; font-size: 1.5rem; color: var(--magenta); }
          .bp__odds { font-family: var(--font-mono); font-size: 0.66rem; color: var(--paper-dim); }
          .bp__voice {
            border: 2px solid #e8342a; border-radius: var(--radius);
            background: rgba(232,52,42,0.07); padding: 1rem 1.1rem 0.9rem;
            margin-top: 1.1rem; max-width: 40rem;
          }
          .bp__who {
            font-family: var(--font-mono); font-size: 0.6rem; letter-spacing: 0.18em;
            text-transform: uppercase; color: #e8342a; display: block; margin-bottom: 0.4rem;
          }
          .bp__sfx { display: inline-block; }
          .bp__line { margin: 0.55rem 0 0; font-size: 1rem; line-height: 1.55; }
          .bp__quirk {
            border-left: 3px solid var(--magenta); padding-left: 0.75rem;
            color: var(--paper-dim); font-size: 0.9rem;
          }
        `}</style>
      </SimShell>
    </Predict>
  );
}
