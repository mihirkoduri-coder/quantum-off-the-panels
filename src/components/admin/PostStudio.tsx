import { useEffect, useRef, useState } from "react";

/**
 * INSTAGRAM POST STUDIO
 *
 * One draw() function renders both the on-screen preview and the exported PNG,
 * so the preview is not an approximation of the export — it IS the export, at a
 * different scale. Anything that looks right here downloads right.
 *
 * Everything is drawn with canvas primitives rather than screenshotting the DOM:
 * html2canvas-style tools re-implement font metrics and get them subtly wrong,
 * and a wrong export is worse than an obvious failure.
 */

// ── palette (hardcoded, not CSS vars: the export must not depend on page theme)
const INK = "#0B0E1A";
const INK2 = "#131829";
const GUTTER = "#2B3358";
const PAPER = "#ECE7D9";
const DIM = "#9AA0B8";
const CYAN = "#22C4F0";
const MAGENTA = "#FF3D8B";
const YELLOW = "#FFD23F";

const SIZES = {
  square: { w: 1080, h: 1080, label: "Square 1080×1080" },
  story: { w: 1080, h: 1920, label: "Story 1080×1920" },
} as const;
type SizeKey = keyof typeof SIZES;

const TEMPLATES = {
  announce: "New issue",
  quote: "Pull quote",
  concept: "Concept card",
} as const;
type TemplateKey = keyof typeof TEMPLATES;

interface Spec {
  template: TemplateKey;
  size: SizeKey;
  issue: string;
  title: string;
  character: string;
  line: string;
  cta: string;
}

const DEFAULTS: Spec = {
  template: "announce",
  size: "square",
  issue: "04",
  title: "Entanglement",
  character: "Cloak & Dagger",
  line: "Two halves of one system. Correlation is not connection.",
  cta: "New issue Monday",
};

// ── helpers ───────────────────────────────────────────────────────────────

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const word of words) {
    const test = cur ? `${cur} ${word}` : word;
    if (ctx.measureText(test).width > maxW && cur) {
      lines.push(cur);
      cur = word;
    } else cur = test;
  }
  if (cur) lines.push(cur);
  return lines;
}

/** shrink until the text fits the given box, then return the size that worked */
function fitFont(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxW: number,
  maxLines: number,
  start: number,
  weight: string,
  family: string,
  min = 24,
): { size: number; lines: string[] } {
  let size = start;
  while (size > min) {
    ctx.font = `${weight} ${size}px ${family}`;
    const lines = wrap(ctx, text, maxW);
    // Line count alone is not enough: a single word wider than the box cannot
    // be wrapped, so it would sit on its own line and run off the frame.
    // Check the widest rendered line too.
    const widest = lines.reduce((m, l) => Math.max(m, ctx.measureText(l).width), 0);
    if (lines.length <= maxLines && widest <= maxW) return { size, lines };
    size -= 2;
  }
  ctx.font = `${weight} ${min}px ${family}`;
  return { size: min, lines: wrap(ctx, text, maxW).slice(0, maxLines) };
}

/** halftone wash — the site's print thesis, as an atmospheric corner gradient */
function halftone(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  cx: number, cy: number, radius: number,
  pitch = 26, colour = CYAN, peak = 0.5,
) {
  ctx.save();
  ctx.fillStyle = colour;
  const ang = Math.PI / 4;
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const R = Math.ceil(Math.hypot(W, H) / pitch) + 2;
  for (let i = -R; i < R; i++) {
    for (let j = -R; j < R; j++) {
      const u = i * pitch, v = j * pitch;
      const x = u * ca - v * sa + W / 2;
      const y = u * sa + v * ca + H / 2;
      if (x < -pitch || y < -pitch || x > W + pitch || y > H + pitch) continue;
      const d = Math.hypot(x - cx, y - cy) / radius;
      const t = Math.max(0, 1 - d);
      const r = pitch * 0.42 * Math.sqrt(t) * peak;
      if (r < 0.4) continue;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** the QP mark: folded panels, brackets on the folds, gutter between */
function logo(ctx: CanvasRenderingContext2D, x: number, y: number, h: number) {
  const s = h / 96;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);

  const panel = (px: number, pts: [number, number][]) => {
    ctx.beginPath();
    pts.forEach(([a, b], i) => (i ? ctx.lineTo(a, b) : ctx.moveTo(a, b)));
    ctx.closePath();
    ctx.fillStyle = INK2;
    ctx.fill();
  };
  panel(0, [[22, 0], [58, 0], [58, 72], [22, 72], [0, 36]]);
  panel(0, [[70, 12], [112, 12], [134, 48], [112, 84], [70, 84]]);

  ctx.strokeStyle = GUTTER; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(22, 0); ctx.lineTo(58, 0); ctx.lineTo(58, 72); ctx.lineTo(22, 72); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(112, 12); ctx.lineTo(70, 12); ctx.lineTo(70, 84); ctx.lineTo(112, 84); ctx.stroke();

  const g = ctx.createLinearGradient(0, 0, 0, 90);
  g.addColorStop(0, MAGENTA); g.addColorStop(1, "rgba(255,61,139,0.15)");
  ctx.fillStyle = g; ctx.fillRect(62, 0, 4, 90);

  ctx.strokeStyle = CYAN; ctx.lineWidth = 9; ctx.lineJoin = "miter"; ctx.lineCap = "butt";
  ctx.beginPath(); ctx.moveTo(26, -6); ctx.lineTo(0, 36); ctx.lineTo(26, 78); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(108, 6); ctx.lineTo(134, 48); ctx.lineTo(108, 90); ctx.stroke();

  ctx.fillStyle = PAPER;
  ctx.font = `900 40px Bungee, Archivo, sans-serif`;
  ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
  ctx.fillText("Q", 40, 50);
  ctx.fillText("P", 92, 62);
  ctx.restore();
}

function eyebrow(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, colour = DIM) {
  ctx.font = `700 22px "Space Mono", monospace`;
  ctx.fillStyle = colour;
  ctx.textAlign = "left";
  ctx.letterSpacing = "6px";
  ctx.fillText(text.toUpperCase(), x, y);
  ctx.letterSpacing = "0px";
}

// ── the one draw function ─────────────────────────────────────────────────

function draw(ctx: CanvasRenderingContext2D, spec: Spec) {
  const { w: W, h: H } = SIZES[spec.size];
  const PAD = 96;
  const story = spec.size === "story";

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = "alphabetic";

  if (spec.template === "announce") {
    halftone(ctx, W, H, W * 0.88, H * 0.12, W * 0.72, 26, CYAN, 0.55);

    let y = story ? H * 0.30 : PAD + 120;
    eyebrow(ctx, `Quantum Panels · Issue ${spec.issue}`, PAD, y, YELLOW);

    y += story ? 150 : 120;
    const t = fitFont(ctx, spec.title, W - PAD * 2, 3, story ? 150 : 132, "900", "Archivo, sans-serif");
    ctx.fillStyle = PAPER;
    ctx.textAlign = "left";
    t.lines.forEach((ln, i) => ctx.fillText(ln, PAD, y + i * t.size * 1.02));
    y += (t.lines.length - 1) * t.size * 1.02;

    y += 78;
    ctx.font = `italic 46px Newsreader, Georgia, serif`;
    ctx.fillStyle = CYAN;
    ctx.fillText(spec.character, PAD, y);

    y += 74;
    ctx.font = `300 40px Newsreader, Georgia, serif`;
    ctx.fillStyle = DIM;
    wrap(ctx, spec.line, W - PAD * 2).slice(0, 3).forEach((ln, i) => ctx.fillText(ln, PAD, y + i * 54));

    ctx.fillStyle = MAGENTA;
    ctx.fillRect(PAD, H - PAD - 132, 132, 6);
    eyebrow(ctx, spec.cta, PAD, H - PAD - 76, PAPER);
    logo(ctx, W - PAD - 150, H - PAD - 130, 96);
  }

  if (spec.template === "quote") {
    halftone(ctx, W, H, W * 0.5, H * 0.5, W * 0.85, 30, CYAN, 0.30);

    const boxW = W - PAD * 2;
    const q = fitFont(ctx, `“${spec.line}”`, boxW, story ? 7 : 5, story ? 96 : 88, "400", "Newsreader, Georgia, serif");
    const blockH = q.lines.length * q.size * 1.22;
    let y = H / 2 - blockH / 2;

    ctx.fillStyle = PAPER;
    ctx.textAlign = "center";
    q.lines.forEach((ln, i) => ctx.fillText(ln, W / 2, y + i * q.size * 1.22));
    y += blockH + 20;

    ctx.fillStyle = MAGENTA;
    ctx.fillRect(W / 2 - 48, y, 96, 5);
    y += 74;

    ctx.font = `italic 42px Newsreader, Georgia, serif`;
    ctx.fillStyle = CYAN;
    ctx.fillText(spec.character, W / 2, y);

    y += 54;
    ctx.font = `700 24px "Space Mono", monospace`;
    ctx.fillStyle = DIM;
    ctx.letterSpacing = "6px";
    ctx.fillText(`ISSUE ${spec.issue.toUpperCase()}`, W / 2, y);
    ctx.letterSpacing = "0px";

    logo(ctx, W / 2 - 75, H - PAD - 110, 92);
  }

  if (spec.template === "concept") {
    halftone(ctx, W, H, W * 0.12, H * 0.9, W * 0.78, 24, MAGENTA, 0.42);

    // a comic panel holding the concept
    const cardX = PAD, cardW = W - PAD * 2;
    const cardY = story ? H * 0.24 : PAD + 60;
    const cardH = story ? H * 0.46 : H - (PAD + 60) - (PAD + 150);
    ctx.fillStyle = INK2;
    ctx.fillRect(cardX, cardY, cardW, cardH);
    ctx.strokeStyle = GUTTER; ctx.lineWidth = 4;
    ctx.strokeRect(cardX, cardY, cardW, cardH);
    ctx.fillStyle = CYAN;
    ctx.fillRect(cardX, cardY, 8, cardH);

    let y = cardY + 92;
    ctx.textAlign = "left";
    ctx.font = `900 96px Bungee, Archivo, sans-serif`;
    ctx.fillStyle = YELLOW;
    ctx.fillText(spec.issue.padStart(2, "0"), cardX + 56, y);

    y += 96;
    const t = fitFont(ctx, spec.title, cardW - 112, 2, 88, "900", "Archivo, sans-serif");
    ctx.fillStyle = PAPER;
    t.lines.forEach((ln, i) => ctx.fillText(ln, cardX + 56, y + i * t.size * 1.05));
    y += (t.lines.length - 1) * t.size * 1.05 + 66;

    ctx.font = `italic 42px Newsreader, Georgia, serif`;
    ctx.fillStyle = CYAN;
    ctx.fillText(spec.character, cardX + 56, y);

    y += 68;
    ctx.font = `300 38px Newsreader, Georgia, serif`;
    ctx.fillStyle = DIM;
    wrap(ctx, spec.line, cardW - 112).slice(0, 4).forEach((ln, i) => ctx.fillText(ln, cardX + 56, y + i * 52));

    eyebrow(ctx, spec.cta, PAD, H - PAD - 70, PAPER);
    logo(ctx, W - PAD - 150, H - PAD - 124, 92);
  }
}

// ── component ─────────────────────────────────────────────────────────────

export default function PostStudio() {
  const [spec, setSpec] = useState<Spec>(DEFAULTS);
  const [ready, setReady] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Canvas silently substitutes a fallback face if a webfont has not loaded.
  // Wait for the real ones, and ask for each explicitly — fonts.ready alone
  // resolves before a face that has never been used on the page is fetched.
  useEffect(() => {
    let live = true;
    const needed = [
      '900 96px Bungee',
      '900 96px Archivo',
      'italic 46px Newsreader',
      '300 40px Newsreader',
      '700 22px "Space Mono"',
    ];
    Promise.all(needed.map((f) => (document as any).fonts.load(f)))
      .then(() => (document as any).fonts.ready)
      .then(() => live && setReady(true))
      .catch(() => live && setReady(true));
    return () => { live = false; };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const cv = canvasRef.current;
    if (!cv) return;
    const { w, h } = SIZES[spec.size];
    cv.width = w; cv.height = h;
    const ctx = cv.getContext("2d");
    if (ctx) draw(ctx, spec);
  }, [spec, ready]);

  const exportPng = (scale = 2) => {
    const { w, h } = SIZES[spec.size];
    const off = document.createElement("canvas");
    off.width = w * scale; off.height = h * scale;
    const ctx = off.getContext("2d");
    if (!ctx) return;
    ctx.scale(scale, scale);
    draw(ctx, spec);                       // same function, bigger canvas
    off.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `qp-${spec.template}-${spec.size}-issue${spec.issue || "x"}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  };

  const set = (k: keyof Spec) => (e: any) => setSpec((s) => ({ ...s, [k]: e.target.value }));

  return (
    <div className="ps">
      <div className="ps__form">
        <div className="ps__seg">
          {(Object.keys(TEMPLATES) as TemplateKey[]).map((k) => (
            <button key={k}
              className={`btn${spec.template === k ? " is-on" : ""}`}
              onClick={() => setSpec((s) => ({ ...s, template: k }))}>
              {TEMPLATES[k]}
            </button>
          ))}
        </div>
        <div className="ps__seg">
          {(Object.keys(SIZES) as SizeKey[]).map((k) => (
            <button key={k}
              className={`btn${spec.size === k ? " is-on" : ""}`}
              onClick={() => setSpec((s) => ({ ...s, size: k }))}>
              {SIZES[k].label}
            </button>
          ))}
        </div>

        <label className="ps__f"><span>Issue number</span>
          <input value={spec.issue} onChange={set("issue")} /></label>
        <label className="ps__f"><span>Title</span>
          <input value={spec.title} onChange={set("title")} /></label>
        <label className="ps__f"><span>Character</span>
          <input value={spec.character} onChange={set("character")} /></label>
        <label className="ps__f"><span>{spec.template === "quote" ? "The quote" : "One line"}</span>
          <textarea rows={3} value={spec.line} onChange={set("line")} /></label>
        <label className="ps__f"><span>Footer / call to action</span>
          <input value={spec.cta} onChange={set("cta")} /></label>

        <div className="ps__actions">
          <button className="btn btn--go" onClick={() => exportPng(2)} disabled={!ready}>
            {ready ? "Download PNG (2×)" : "Loading fonts…"}
          </button>
          <button className="btn" onClick={() => exportPng(1)} disabled={!ready}>1×</button>
          <button className="btn" onClick={() => setSpec(DEFAULTS)}>Reset</button>
        </div>
        <p className="ps__note">
          {/* Autofill hook: import CONCEPTS from ../../data/concepts and map a
              picked week onto issue/title/character/line if you ever want it. */}
          Preview and export run through the same draw function, so the download
          matches this exactly.
        </p>
      </div>

      <div className={`ps__stage ps__stage--${spec.size}`}>
        <canvas ref={canvasRef} className="ps__canvas" />
      </div>

      <style>{`
        .ps { display: grid; gap: 1.75rem; align-items: start; }
        @media (min-width: 60rem) { .ps { grid-template-columns: 22rem 1fr; } }
        .ps__form { display: grid; gap: 0.85rem; }
        .ps__seg { display: flex; gap: 0.4rem; flex-wrap: wrap; }
        .ps__seg .btn.is-on { background: var(--cyan); color: var(--ink); border-color: var(--cyan); }
        .ps__f { display: grid; gap: 0.3rem; }
        .ps__f > span {
          font-family: var(--font-mono); font-size: 0.66rem; letter-spacing: 0.14em;
          text-transform: uppercase; color: var(--paper-dim);
        }
        .ps__f input, .ps__f textarea {
          background: var(--ink-2); color: var(--paper);
          border: var(--panel-line) solid var(--gutter); border-radius: var(--radius);
          padding: 0.6rem 0.7rem; font-family: var(--font-body); font-size: 1rem;
          width: 100%; resize: vertical;
        }
        .ps__f input:focus, .ps__f textarea:focus { border-color: var(--cyan); outline: none; }
        .ps__actions { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.4rem; }
        .ps__note { font-size: 0.82rem; color: var(--paper-dim); margin: 0.2rem 0 0; }
        .ps__stage {
          border: var(--panel-line) dashed var(--gutter); border-radius: var(--radius);
          padding: 1rem; display: grid; place-items: center; background: var(--ink);
        }
        .ps__canvas {
          display: block; max-width: 100%; height: auto;
          box-shadow: 0 0 0 1px var(--gutter);
        }
        .ps__stage--square .ps__canvas { max-height: 62vh; }
        .ps__stage--story .ps__canvas { max-height: 78vh; }
      `}</style>
    </div>
  );
}
