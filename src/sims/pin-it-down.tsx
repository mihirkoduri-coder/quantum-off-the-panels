import { useEffect, useRef, useState } from "react";
import SimShell from "../components/sim/SimShell";
import Predict from "../components/sim/Predict";
import Pocket from "../components/sim/Pocket";
import ViolationExplainer from "../components/sim/ViolationExplainer";
import {
  DD_W, DD_H, T_FLIGHT, CATCH, SAMP,
  spreadX, spreadP, catchOdds, focusWord,
  drawPerch, drawScene, drawCurves, drawOdds, type Caught,
} from "./dd-art";
import { copy } from "../lib/site-copy";

const SLUG = "pin-it-down";
const C = copy.simCopy.pinItDown;

/**
 * WEEK 4 — The uncertainty principle.
 *
 * The misconception this exists to kill is the observer effect: that position
 * and momentum trade off because measuring disturbs things. It does not. A
 * sharply located man does not have a speed Matt is too crude to hear — he
 * does not have one. Which is why the character is a better INSTRUMENT: the
 * limit is in the thing, not the tool, so a better sense changes nothing.
 *
 * The derivation is week 3's, one step on. A wave with one exact wavelength is
 * infinitely long and has no location; to localise it you add many wavelengths;
 * wavelength is momentum. Adding waves is what interference was.
 *
 * To intercept a man you need both — where he is tells you where he was, how
 * fast tells you where he will be. So there IS a best focus setting, and even
 * there he misses sometimes. That is the inequality as a consequence rather
 * than a decree.
 */

interface Line { copyKey: string; text: string }

const FOCUS_WORD_KEY: Record<string, keyof typeof C.controls> = {
  loose: "focusWordLoose", "closing in": "focusWordClosingIn",
  tight: "focusWordTight", "very tight": "focusWordVeryTight",
};
/** reuses dd-art.ts's own threshold logic (the single source of truth for
 *  where "loose" turns into "tight") rather than re-deriving the cutoffs
 *  here, just swapping its hardcoded word for the copy-driven text. */
const focusCaption = (f: number): Line => {
  const key = FOCUS_WORD_KEY[focusWord(f)];
  return { copyKey: `simCopy.pinItDown.controls.${key}`, text: C.controls[key] };
};

const listenLineFor = (f: number): Line =>
  f > 0.6
    ? { copyKey: "simCopy.pinItDown.voice.listenLineDoorway", text: C.voice.listenLineDoorway }
    : f > 0.35
      ? { copyKey: "simCopy.pinItDown.voice.listenLineStorefront", text: C.voice.listenLineStorefront }
      : { copyKey: "simCopy.pinItDown.voice.listenLineHalfBlock", text: C.voice.listenLineHalfBlock };

export default function PinItDown() {
  const [focus, setFocus] = useState(0.30);
  const [meas, setMeas] = useState<{ x: number; p: number } | null>(null);
  const [caught, setCaught] = useState<Caught | null>(null);
  const [view, setView] = useState<"curves" | "odds">("curves");
  const [sfx, setSfx] = useState<(Line & { stamp: number }) | null>(null);
  const [line, setLine] = useState<Line | null>(null);
  const [violation, setViolation] =
    useState<null | Parameters<typeof ViolationExplainer>[0]["violation"]>(null);

  const sceneRef = useRef<HTMLCanvasElement>(null);
  const perchRef = useRef<HTMLCanvasElement>(null);
  const curvesRef = useRef<HTMLCanvasElement>(null);
  const oddsRef = useRef<HTMLCanvasElement>(null);
  const live = useRef({ focus: 0.30, meas: null as null | { x: number; p: number }, caught: null as Caught | null });
  const clock = useRef({ t: 0, ring: 0 });
  const timers = useRef<number[]>([]);

  useEffect(() => { live.current.focus = focus; }, [focus]);
  useEffect(() => { live.current.meas = meas; }, [meas]);
  useEffect(() => { live.current.caught = caught; }, [caught]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const gauss = () => {
    let u = 0, v = 0;
    while (!u) u = Math.random();
    while (!v) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  /** a reading: a position and a speed, each blurred by its own spread */
  const takeReading = (f: number) => ({ x: gauss() * spreadX(f) * 0.6, p: gauss() * spreadP(f) * 0.6 });

  const say = (hit: Line, text: Line) => {
    setSfx({ ...hit, stamp: performance.now() });
    setLine(null);
    timers.current.push(window.setTimeout(() => setLine(text), 380));
  };

  const listen = () => {
    const m = takeReading(focus);
    setMeas(m); setCaught(null);
    live.current.meas = m; live.current.caught = null;
    say({ copyKey: "simCopy.pinItDown.hits.listen", text: C.hits.listen }, listenLineFor(focus));
  };

  const intercept = () => {
    // pressing this cold just takes the reading first, then jumps
    const m = live.current.meas ?? takeReading(focus);
    if (!live.current.meas) { setMeas(m); live.current.meas = m; }
    const trueX = m.x + gauss() * spreadX(focus) * SAMP;
    const trueP = m.p + gauss() * spreadP(focus) * SAMP;
    const actual = trueX + trueP * T_FLIGHT;
    const aim = m.x + m.p * T_FLIGHT;
    const hit = Math.abs(actual - aim) < CATCH;
    const c = { actual, aim, hit };
    setCaught(c); live.current.caught = c;
    const hitWord: Line = hit
      ? { copyKey: "simCopy.pinItDown.hits.hit", text: C.hits.hit }
      : { copyKey: "simCopy.pinItDown.hits.miss", text: C.hits.miss };
    const resultLine: Line = hit
      ? { copyKey: "simCopy.pinItDown.voice.interceptHit", text: C.voice.interceptHit }
      : focus > 0.6
        ? { copyKey: "simCopy.pinItDown.voice.interceptMissTight", text: C.voice.interceptMissTight }
        : { copyKey: "simCopy.pinItDown.voice.interceptMissLoose", text: C.voice.interceptMissLoose };
    say(hitWord, resultLine);
  };

  /** TACTIC 2 — the forbidden move is a live button */
  const pinExactly = () => {
    setFocus(0.98); live.current.focus = 0.98;
    setMeas(null); setCaught(null);
    live.current.meas = null; live.current.caught = null;
    setViolation({
      sfx: C.violation.sfx, sfxKey: "simCopy.pinItDown.violation.sfx",
      law: C.violation.law, lawKey: "simCopy.pinItDown.violation.law",
      attempted: C.violation.attempted, attemptedKey: "simCopy.pinItDown.violation.attempted",
      why: C.violation.why, whyKey: "simCopy.pinItDown.violation.why",
    });
  };

  const reset = () => {
    timers.current.forEach(clearTimeout); timers.current = [];
    setFocus(0.30); setMeas(null); setCaught(null); setSfx(null); setLine(null);
    setViolation(null); setView("curves");
    live.current = { focus: 0.30, meas: null, caught: null };
  };

  // the figure is static; draw him once
  useEffect(() => {
    const cv = perchRef.current;
    if (cv) { const g = cv.getContext("2d"); if (g) drawPerch(g, cv.width); }
  }, []);

  // the scene animates forever: the sense sweeps and the light travels
  useEffect(() => {
    let alive = true;
    const paint = () => {
      if (!alive) return;
      clock.current.t += 0.055;
      clock.current.ring = (clock.current.ring + 0.0032) % 1;
      const cv = sceneRef.current;
      const g = cv?.getContext("2d");
      if (cv && g) {
        drawScene(g, cv.width, cv.height, {
          focus: live.current.focus, t: clock.current.t, ring: clock.current.ring,
          meas: live.current.meas, caught: live.current.caught,
        });
      }
      requestAnimationFrame(paint);
    };
    paint();
    return () => { alive = false; };
  }, []);

  // the side panel only redraws when something changes
  useEffect(() => {
    if (view === "curves") {
      const cv = curvesRef.current;
      const g = cv?.getContext("2d");
      if (cv && g) drawCurves(g, cv.width, cv.height, focus);
    } else {
      const cv = oddsRef.current;
      const g = cv?.getContext("2d");
      if (cv && g) drawOdds(g, cv.width, cv.height, focus);
    }
  }, [view, focus]);

  const perchW = 172;
  const focusCap = focusCaption(focus);
  const speedKey: keyof typeof C.readout = focus > 0.75 ? "speedGuess" : focus > 0.45 ? "speedVague" : "speedSure";

  return (
    <Predict
      slug={SLUG}
      question={C.predict.question}
      questionKey="simCopy.pinItDown.predict.question"
      choices={[
        { id: "both", label: C.predict.choiceBoth, labelKey: "simCopy.pinItDown.predict.choiceBoth" },
        { id: "worse", label: C.predict.choiceWorse, labelKey: "simCopy.pinItDown.predict.choiceWorse" },
        { id: "noise", label: C.predict.choiceNoise, labelKey: "simCopy.pinItDown.predict.choiceNoise" },
        { id: "same", label: C.predict.choiceSame, labelKey: "simCopy.pinItDown.predict.choiceSame" },
      ]}
      answer="worse"
      because={C.predict.because}
      becauseKey="simCopy.pinItDown.predict.because"
    >
      <SimShell
        slug={SLUG}
        title={C.title}
        titleKey="simCopy.pinItDown.title"
        watchFor={C.watchFor}
        watchForKey="simCopy.pinItDown.watchFor"
        onReset={reset}
        controls={
          <div className="stack">
            <label className="pd__slab">
              <span>
                <span data-copy-key="simCopy.pinItDown.controls.focusLabel">{C.controls.focusLabel}</span>
                <b data-copy-key={focusCap.copyKey}>{focusCap.text}</b>
              </span>
              <input type="range" min={2} max={98} value={Math.round(focus * 100)}
                onChange={(e) => { setFocus(+e.target.value / 100); setMeas(null); setCaught(null);
                  live.current.meas = null; live.current.caught = null; }} />
            </label>
            <div className="row">
              <button className="btn btn--go" onClick={listen}>
                <span data-copy-key="simCopy.pinItDown.controls.listenButton">{C.controls.listenButton}</span>
              </button>
              <button className="btn" onClick={intercept}>
                <span data-copy-key="simCopy.pinItDown.controls.interceptButton">{C.controls.interceptButton}</span>
              </button>
              <button className="btn btn--break" onClick={pinExactly}>
                <span data-copy-key="simCopy.pinItDown.controls.pinButton">{C.controls.pinButton}</span>
              </button>
            </div>
          </div>
        }
        readout={
          <>
            <span>
              <span data-copy-key="simCopy.pinItDown.readout.odds">{C.readout.odds}</span>{" "}
              <b>{(catchOdds(focus) * 100).toFixed(0)}%</b>
            </span>
            <span>
              <span data-copy-key="simCopy.pinItDown.readout.speed">{C.readout.speed}</span>{" "}
              <b data-copy-key={`simCopy.pinItDown.readout.${speedKey}`}>{C.readout[speedKey]}</b>
            </span>
          </>
        }
      >
        <div className="pd">
          <div className="pd__main">
            <div className="pd__perch" aria-hidden="true">
              <canvas ref={perchRef} width={DD_W * 2} height={DD_H * 2}
                style={{ width: perchW, height: perchW * (DD_H / DD_W) }} />
            </div>
            <canvas ref={sceneRef} width={860} height={540} className="pd__scene" role="img"
              aria-label="A rooftop above a city block. Figures spread along the street show where the man might be; the light running along them shows how fast he is going." />
            <p className="pd__cap" data-copy-key="simCopy.pinItDown.diagram.mainCaption">{C.diagram.mainCaption}</p>
          </div>

          <div className="pd__side">
            <div className="row pd__tabs">
              <button className={`btn btn--xs${view === "curves" ? " is-on" : ""}`} onClick={() => setView("curves")}>
                <span data-copy-key="simCopy.pinItDown.diagTabs.curves">{C.diagTabs.curves}</span>
              </button>
              <button className={`btn btn--xs${view === "odds" ? " is-on" : ""}`} onClick={() => setView("odds")}>
                <span data-copy-key="simCopy.pinItDown.diagTabs.odds">{C.diagTabs.odds}</span>
              </button>
            </div>
            {view === "curves"
              ? <canvas ref={curvesRef} width={520} height={430} className="pd__diag" role="img"
                  aria-label="Two bell curves: squeezing the position curve widens the momentum curve." />
              : <canvas ref={oddsRef} width={520} height={430} className="pd__diag" role="img"
                  aria-label="His chance of cutting the man off, against how tightly he pins the position." />}
            <p className="pd__cap" data-copy-key={view === "curves" ? "simCopy.pinItDown.diagCaptions.curves" : "simCopy.pinItDown.diagCaptions.odds"}>
              {view === "curves" ? C.diagCaptions.curves : C.diagCaptions.odds}
            </p>
          </div>
        </div>

        {sfx && (
          <div className="pd__voice">
            <span className="pd__who" data-copy-key="simCopy.pinItDown.voice.who">{C.voice.who}</span>
            <span key={sfx.stamp} className="sfx sfx--fire pd__sfx" data-copy-key={sfx.copyKey}>{sfx.text}</span>
            {line && <p className="pd__line" data-copy-key={line.copyKey}>{line.text}</p>}
          </div>
        )}

        <Pocket label={C.pocket.label} labelKey="simCopy.pinItDown.pocket.label">
          <p data-copy-key="simCopy.pinItDown.pocket.p1">{C.pocket.p1}</p>
          <p data-copy-key="simCopy.pinItDown.pocket.p2">{C.pocket.p2}</p>
          <p data-copy-key="simCopy.pinItDown.pocket.p3">{C.pocket.p3}</p>
          <p className="pd__quirk" data-copy-key="simCopy.pinItDown.pocket.p4">{C.pocket.p4}</p>
        </Pocket>

        <ViolationExplainer violation={violation} onDismiss={() => setViolation(null)} />

        <style>{`
          .pd { display: grid; gap: 1rem; width: 100%; }
          @media (min-width: 62rem) { .pd { grid-template-columns: 1.65fr 1fr; align-items: start; } }
          /* room for the figure, who hangs above the panel's top-left corner */
          .pd__main { position: relative; min-width: 0; padding-top: 3.6rem; }
          .pd__perch { position: absolute; top: -2.6rem; left: -1.1rem; z-index: 2; pointer-events: none; line-height: 0; }
          .pd__perch canvas { display: block; }
          @media (max-width: 46rem) {
            .pd__main { padding-top: 2.4rem; }
            .pd__perch { top: -1.6rem; left: -0.5rem; }
            .pd__perch canvas { width: 112px !important; height: auto !important; }
          }
          .pd__scene { width: 100%; height: auto; display: block; border-radius: var(--radius); }
          .pd__side { display: grid; gap: 0.5rem; align-content: start; min-width: 0; }
          .pd__tabs { gap: 0.3rem; }
          .btn--xs { font-size: 0.66rem; padding: 0.3rem 0.55rem; min-height: 34px; }
          .btn.is-on { background: var(--cyan); color: var(--ink); border-color: var(--cyan); }
          .btn--break.is-on { background: var(--magenta); color: var(--ink); }
          .pd__diag { width: 100%; height: auto; display: block; }
          .pd__cap {
            font-family: var(--font-mono); font-size: 0.6rem; letter-spacing: 0.12em;
            text-transform: uppercase; color: var(--paper-dim); margin: 0.35rem 0 0; text-align: center;
          }
          .pd__slab { display: grid; gap: 0.25rem; max-width: 30rem; }
          .pd__slab > span {
            font-family: var(--font-mono); font-size: 0.62rem; letter-spacing: 0.13em;
            text-transform: uppercase; color: var(--paper-dim);
            display: flex; justify-content: space-between; gap: 1rem;
          }
          .pd__slab > span b { color: #d6283a; }
          .pd__voice {
            border: 2px solid #d6283a; border-radius: var(--radius);
            background: rgba(214,40,58,0.07); padding: 1rem 1.1rem 0.9rem;
            margin-top: 1.1rem; max-width: 40rem;
          }
          .pd__who {
            font-family: var(--font-mono); font-size: 0.6rem; letter-spacing: 0.18em;
            text-transform: uppercase; color: #d6283a; display: block; margin-bottom: 0.4rem;
          }
          .pd__sfx { display: inline-block; }
          .pd__line { margin: 0.55rem 0 0; font-size: 1rem; line-height: 1.55; }
          .pd__quirk {
            border-left: 3px solid var(--magenta); padding-left: 0.75rem;
            color: var(--paper-dim); font-size: 0.9rem;
          }
        `}</style>
      </SimShell>
    </Predict>
  );
}
