/**
 * WEEK 3 ART — the accelerator, the speed blurs, the rods.
 *
 * Kept out of the component so it can be render-tested in isolation. Every
 * routine takes a plain 2D context and CSS-resolved colours, so it has no
 * React or DOM dependencies beyond the canvas itself.
 *
 * Frozen style constants live at the top: these were chosen against renders,
 * not guessed, and they are the only knobs that shipped.
 */

export const BLUR_WEIGHT = 1;     // standard
export const BOLT_COUNT = 3;      // normal lightning
export const RIDER_SIZE = 0.62;   // barely there — he is too fast to see

const TAU = Math.PI * 2;

export interface Ink {
  ink: string; ink2: string; gut: string; dim: string; cyan: string;
  mag: string; yel: string; red: string; deep: string; orange: string; hot: string;
}

export const INK: Ink = {
  ink: "#0b0e1a", ink2: "#131829", gut: "#2b3358", dim: "#9aa0b8",
  cyan: "#22c4f0", mag: "#ff3d8b", yel: "#ffd23f",
  red: "#e8342a", deep: "#8c1109", orange: "#ff8a2b", hot: "#fff3c4",
};

export type Pt = { x: number; y: number };
export type Path = (t: number) => Pt;

/** the accelerator: entry, ring, the two arcs, and the two rods */
export function rig(W: number, H: number) {
  const cx = W * 0.44, cy = H * 0.5, R = Math.min(W, H) * 0.31;
  return {
    cx, cy, R,
    split: { x: cx - R, y: cy }, merge: { x: cx + R, y: cy },
    entry: { x: W * 0.03, y: cy },
    d0: { x: W * 0.91, y: cy - H * 0.20 },
    d1: { x: W * 0.91, y: cy + H * 0.20 },
    // one copy runs over the top, the other under the bottom
    A: (t: number): Pt => ({ x: cx + Math.cos(Math.PI + t * Math.PI) * R, y: cy + Math.sin(Math.PI + t * Math.PI) * R }),
    B: (t: number): Pt => ({ x: cx + Math.cos(Math.PI - t * Math.PI) * R, y: cy + Math.sin(Math.PI - t * Math.PI) * R }),
  };
}

const noise = (i: number, s: number) => {
  const v = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453;
  return (v - Math.floor(v)) * 2 - 1;
};

/** sample a path backwards from tEnd, offset sideways by `off` */
function strand(fn: Path, tEnd: number, len: number, off: number, n: number) {
  const pts: { x: number; y: number; f: number }[] = [];
  for (let i = 0; i <= n; i++) {
    const f = i / n, u = Math.max(0, tEnd - f * len), p = fn(u);
    const a = fn(Math.min(1, u + 0.005)), b = fn(Math.max(0, u - 0.005));
    let dx = a.x - b.x, dy = a.y - b.y;
    const m = Math.hypot(dx, dy) || 1; dx /= m; dy /= m;
    pts.push({ x: p.x - dy * off, y: p.y + dx * off, f });
  }
  return pts;
}

function mix(c1: string, c2: string, t: number) {
  const h = (c: string) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
  const a = h(c1), b = h(c2);
  return `rgb(${Math.round(a[0] + (b[0] - a[0]) * t)},${Math.round(a[1] + (b[1] - a[1]) * t)},${Math.round(a[2] + (b[2] - a[2]) * t)})`;
}

/**
 * One copy: a bundle of motion-blur strands, red at the leading edge burning
 * out to yellow down the tail, with white lightning threaded through. Composites
 * additively so overlapping strands burn toward white.
 */
export function speedBlur(
  g: CanvasRenderingContext2D, fn: Path, t: number,
  o: { len?: number; grow?: number; strands?: number; spread?: number;
       head?: string; tail?: string; seed?: number; bolts?: number; alpha?: number } = {},
) {
  const len = o.len ?? 0.44;
  const grow = (o.grow ?? 1) * BLUR_WEIGHT;
  const strands = o.strands ?? 12, spread = o.spread ?? 17;
  const head = o.head ?? INK.red, tail = o.tail ?? INK.orange;
  const seed = o.seed ?? 0, bolts = o.bolts ?? BOLT_COUNT, alpha = o.alpha ?? 1;
  const width = 3.8 + 7.4 * grow, N = 34;

  g.save();
  g.lineCap = "round"; g.lineJoin = "round";
  g.globalCompositeOperation = "lighter";

  // underglow: this is what lights the track
  const glow = strand(fn, t, len * 1.15, 0, N);
  g.globalAlpha = 0.13 * alpha; g.strokeStyle = INK.deep; g.lineWidth = width * 4.6;
  g.beginPath(); glow.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); g.stroke();

  for (let s = 0; s < strands; s++) {
    const k = strands === 1 ? 0 : s / (strands - 1) - 0.5;
    const off = k * spread * (0.6 + 0.7 * grow);
    const sl = len * (0.55 + 0.45 * (1 - Math.abs(k) * 1.4) + noise(s, seed) * 0.1);
    const pts = strand(fn, t, Math.max(0.05, sl), off, N);
    const w = width * (1 - Math.abs(k) * 0.72) * (0.7 + 0.5 * Math.abs(noise(s + 7, seed)));
    for (let i = 0; i < pts.length - 1; i++) {
      const f = pts[i].f;
      g.strokeStyle = f < 0.58 ? mix(head, INK.orange, f / 0.58) : mix(INK.orange, tail, (f - 0.58) / 0.42);
      g.globalAlpha = alpha * (1 - f) ** 1.05 * (0.95 - Math.abs(k) * 0.45);
      g.lineWidth = w * (1 - f * 0.55);
      g.beginPath(); g.moveTo(pts[i].x, pts[i].y); g.lineTo(pts[i + 1].x, pts[i + 1].y); g.stroke();
    }
  }

  for (let b = 0; b < bolts; b++) {
    const pts = strand(fn, t, len * (0.7 + 0.22 * b), 0, 18);
    g.strokeStyle = b === 0 ? "#ffffff" : INK.hot;
    g.lineWidth = (1.9 + 2.1 * grow) * (1 - b * 0.16);
    g.beginPath();
    pts.forEach((p, i) => {
      const jag = i === 0 ? 0 : noise(i * 3 + b * 17, seed) * (7 + 12 * grow) * (1 - p.f * 0.5);
      const u = Math.max(0, t - p.f * len);
      const a = fn(Math.min(1, u + 0.005)), bb = fn(Math.max(0, u - 0.005));
      let dx = a.x - bb.x, dy = a.y - bb.y;
      const m = Math.hypot(dx, dy) || 1; dx /= m; dy /= m;
      g.globalAlpha = alpha * (1 - p.f) ** 0.95 * (b === 0 ? 0.95 : 0.5);
      const x = p.x - dy * jag, y = p.y + dx * jag;
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    });
    g.stroke();
  }

  const h = fn(t); g.globalAlpha = alpha;
  const rg = g.createRadialGradient(h.x, h.y, 0, h.x, h.y, 18 * grow + 9);
  rg.addColorStop(0, "rgba(255,248,220,0.95)");
  rg.addColorStop(0.3, "rgba(255,138,43,0.5)");
  rg.addColorStop(1, "rgba(232,52,42,0)");
  g.fillStyle = rg; g.beginPath(); g.arc(h.x, h.y, 18 * grow + 9, 0, TAU); g.fill();
  g.restore();
}

/** A figure at the leading edge — deliberately half-buried in the glare. */
export function rider(g: CanvasRenderingContext2D, fn: Path, t: number, scale = 1, fade = 1) {
  const s = scale * RIDER_SIZE;
  if (s <= 0 || fade <= 0.01) return;
  const p = fn(t), q = fn(Math.max(0, t - 0.02));
  g.save();
  g.translate(p.x, p.y); g.rotate(Math.atan2(p.y - q.y, p.x - q.x));
  g.globalAlpha = fade;
  g.lineCap = "round"; g.lineJoin = "round";
  g.strokeStyle = INK.deep; g.lineWidth = 3.4 * s;
  g.beginPath(); g.moveTo(-3 * s, 2 * s); g.quadraticCurveTo(-13 * s, 5 * s, -20 * s, 9 * s); g.stroke();
  g.beginPath(); g.moveTo(-1 * s, -3 * s); g.quadraticCurveTo(-11 * s, -6 * s, -17 * s, -3 * s); g.stroke();
  g.beginPath();
  g.moveTo(9 * s, -5 * s); g.quadraticCurveTo(2 * s, -7 * s, -5 * s, -3 * s);
  g.quadraticCurveTo(-7 * s, 1 * s, -3 * s, 4 * s); g.quadraticCurveTo(3 * s, 5 * s, 8 * s, 1 * s);
  g.closePath();
  g.strokeStyle = "#2b0603"; g.lineWidth = 2.4 * s; g.stroke();
  g.fillStyle = INK.red; g.fill();
  g.strokeStyle = INK.red; g.lineWidth = 4.2 * s;
  g.beginPath(); g.moveTo(1 * s, 3 * s); g.quadraticCurveTo(7 * s, 7 * s, 5 * s, 12 * s); g.stroke();
  g.beginPath(); g.moveTo(6 * s, -3 * s); g.quadraticCurveTo(13 * s, -4 * s, 15 * s, -9 * s); g.stroke();
  g.beginPath(); g.arc(11 * s, -7 * s, 4.4 * s, 0, TAU);
  g.strokeStyle = "#2b0603"; g.lineWidth = 2.2 * s; g.stroke();
  g.fillStyle = INK.red; g.fill();
  g.restore();
}

/** Three-tier bolt at the heart of the ring. Charges while the copies run. */
export function coreBolt(g: CanvasRenderingContext2D, cx: number, cy: number, R: number, charge: number, flash = 0) {
  const P = [[0.46, -1.34], [-0.06, -0.58], [0.3, -0.72], [-0.22, 0.04], [0.14, -0.1],
             [-0.46, 1.34], [0.06, 0.58], [-0.3, 0.72], [0.22, -0.04], [-0.14, 0.1]];
  g.save(); g.translate(cx, cy);
  g.scale(1 + 0.04 * Math.sin(charge * 12) + flash * 0.2, 1 + 0.04 * Math.sin(charge * 12) + flash * 0.2);
  const a = 0.08 + 0.3 * charge + flash * 0.4;
  const rg = g.createRadialGradient(0, 0, 0, 0, 0, R * 1.5);
  rg.addColorStop(0, `rgba(255,210,63,${Math.min(0.55, a)})`);
  rg.addColorStop(0.5, `rgba(255,138,43,${a * 0.3})`);
  rg.addColorStop(1, "rgba(232,52,42,0)");
  g.fillStyle = rg; g.beginPath(); g.arc(0, 0, R * 1.5, 0, TAU); g.fill();
  g.rotate(-0.22);
  const sc = R * 0.62;
  const path = () => {
    g.beginPath();
    P.forEach((p, i) => (i ? g.lineTo(p[0] * sc, p[1] * sc) : g.moveTo(p[0] * sc, p[1] * sc)));
    g.closePath();
  };
  g.lineJoin = "miter";
  g.strokeStyle = INK.deep; g.lineWidth = R * 0.055; path(); g.stroke();
  const lg = g.createLinearGradient(0, -sc * 1.3, 0, sc * 1.3);
  lg.addColorStop(0, flash > 0.1 ? "#fffbe8" : INK.yel);
  lg.addColorStop(1, INK.orange);
  g.fillStyle = lg; g.globalAlpha = 0.4 + 0.6 * charge + flash * 0.3;
  path(); g.fill();
  g.restore();
}

/** A lightning rod. Arcs when struck, keeps a scorch afterwards. */
export function catcher(
  g: CanvasRenderingContext2D, x: number, y: number,
  label: string, hot: boolean, pulse = 0, scorch = 0,
) {
  const H = 34, W = 13;
  g.save(); g.translate(x, y);
  if (hot) {
    const rg = g.createRadialGradient(0, 0, 0, 0, 0, 58);
    rg.addColorStop(0, `rgba(255,210,63,${0.3 + 0.3 * pulse})`);
    rg.addColorStop(1, "rgba(255,210,63,0)");
    g.fillStyle = rg; g.beginPath(); g.arc(0, 0, 58, 0, TAU); g.fill();
  }
  g.strokeStyle = hot ? INK.yel : INK.gut; g.lineWidth = 3; g.lineCap = "round";
  g.beginPath(); g.moveTo(-16, H); g.lineTo(16, H); g.stroke();
  g.beginPath(); g.moveTo(-10, H); g.lineTo(0, H - 8); g.lineTo(10, H); g.stroke();
  g.lineWidth = 4.5; g.beginPath(); g.moveTo(0, H - 8); g.lineTo(0, -H + 12); g.stroke();
  g.lineWidth = 3.5;
  g.beginPath(); g.moveTo(0, -H + 12); g.lineTo(-W, -H); g.stroke();
  g.beginPath(); g.moveTo(0, -H + 12); g.lineTo(W, -H); g.stroke();
  g.fillStyle = hot ? INK.hot : INK.ink2; g.strokeStyle = hot ? INK.yel : INK.gut; g.lineWidth = 2.5;
  g.beginPath(); g.arc(0, -H + 12, 5.5, 0, TAU); g.fill(); g.stroke();
  if (hot) {
    g.strokeStyle = "#fff"; g.lineWidth = 2; g.globalAlpha = 0.5 + 0.5 * pulse;
    g.beginPath(); g.moveTo(-W, -H);
    for (let i = 1; i < 6; i++) {
      const f = i / 6;
      g.lineTo(-W + 2 * W * f, -H + Math.sin(f * Math.PI) * 9 + (i % 2 ? -4 : 4));
    }
    g.lineTo(W, -H); g.stroke(); g.globalAlpha = 1;
  }
  if (scorch > 0) {
    // char the head without erasing it: the fork must still read as a fork
    g.globalAlpha = scorch * 0.78;
    g.fillStyle = "#1b0c06";
    g.beginPath(); g.ellipse(0, -H + 13, 8.5, 10, 0, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(0, -H + 25, 4.5, 11, 0, 0, TAU); g.fill();
    g.strokeStyle = "#2a1208"; g.lineWidth = 3.2;
    g.beginPath(); g.moveTo(0, -H + 12); g.lineTo(-W * 0.85, -H + 2); g.stroke();
    g.beginPath(); g.moveTo(0, -H + 12); g.lineTo(W * 0.85, -H + 2); g.stroke();
    for (let i = 0; i < 7; i++) {
      const a2 = i * 0.9 + scorch * 3, r = 9 + ((i * 37) % 11);
      g.fillStyle = `rgba(255,${120 + ((i * 53) % 90)},40,${0.55 * scorch})`;
      g.beginPath(); g.arc(Math.cos(a2) * r, -H + 14 + Math.sin(a2) * r * 0.7, 1.6, 0, TAU); g.fill();
    }
    g.globalAlpha = 1;
  }
  g.fillStyle = hot ? INK.yel : INK.dim;
  g.font = '700 14px "Space Mono", monospace';
  g.textAlign = "center"; g.textBaseline = "top";
  g.fillText(label, 0, H + 8);
  g.restore();
}

/** Phase dial: a speedometer, to keep it distinct from week 1's linear sliders. */
export function drawDial(g: CanvasRenderingContext2D, W: number, H: number, phase: number, colour: string, dead: boolean) {
  const cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.37, D = Math.PI / 180;
  g.clearRect(0, 0, W, H);
  g.strokeStyle = INK.gut; g.lineWidth = 6;
  g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.stroke();
  for (let a = 0; a < 360; a += 15) {
    const maj = a % 45 === 0;
    g.strokeStyle = maj ? INK.dim : INK.gut; g.lineWidth = maj ? 3 : 2;
    const r1 = R - (maj ? 15 : 8);
    g.beginPath();
    g.moveTo(cx + Math.cos(a * D) * r1, cy + Math.sin(a * D) * r1);
    g.lineTo(cx + Math.cos(a * D) * (R + 2), cy + Math.sin(a * D) * (R + 2));
    g.stroke();
  }
  g.globalAlpha = dead ? 0.3 : 1;
  g.strokeStyle = colour; g.lineWidth = 7; g.lineCap = "round";
  if (!dead) { g.shadowColor = colour; g.shadowBlur = 12; }
  g.beginPath(); g.moveTo(cx, cy);
  g.lineTo(cx + Math.cos(phase * D) * (R - 16), cy + Math.sin(phase * D) * (R - 16));
  g.stroke(); g.shadowBlur = 0;
  g.fillStyle = colour; g.beginPath(); g.arc(cx, cy, 8, 0, TAU); g.fill();
  g.globalAlpha = 1;
}
