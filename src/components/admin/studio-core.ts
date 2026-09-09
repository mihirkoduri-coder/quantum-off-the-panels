/**
 * STUDIO CORE — document model + renderer.
 *
 * One draw() renders the preview and the export; only the scale differs, so
 * the preview is the export rather than an approximation of it.
 *
 * Positions are stored as FRACTIONS of the canvas (0..1), not pixels, so a
 * layout survives switching between square and story. Font sizes are px against
 * a 1080-wide baseline — both target sizes are 1080 wide, so they carry over.
 */

export const PALETTE = {
  paper: "#ECE7D9",
  cyan: "#22C4F0",
  magenta: "#FF3D8B",
  yellow: "#FFD23F",
  dim: "#9AA0B8",
  ink: "#0B0E1A",
  ink2: "#131829",
  gutter: "#2B3358",
} as const;
export type ColorKey = keyof typeof PALETTE;

export const FONTS = {
  display: { label: "Bungee", css: 'Bungee, Archivo, sans-serif', weight: "400" },
  head: { label: "Archivo", css: "Archivo, sans-serif", weight: "900" },
  body: { label: "Newsreader", css: "Newsreader, Georgia, serif", weight: "400" },
  mono: { label: "Space Mono", css: '"Space Mono", monospace', weight: "700" },
} as const;
export type FontKey = keyof typeof FONTS;

export const SIZES = {
  square: { w: 1080, h: 1080, label: "Square 1080×1080" },
  story: { w: 1080, h: 1920, label: "Story 1080×1920" },
} as const;
export type SizeKey = keyof typeof SIZES;

// ── layers ────────────────────────────────────────────────────────────────

interface Base {
  id: string;
  name: string;
  x: number;        // 0..1 of width
  y: number;        // 0..1 of height
  rotation: number; // degrees
  opacity: number;  // 0..1
  locked?: boolean;
}

export interface TextLayer extends Base {
  type: "text";
  text: string;
  font: FontKey;
  size: number;          // px at 1080 wide
  color: ColorKey;
  align: "left" | "center" | "right";
  tracking: number;      // px
  caps: boolean;
  lineHeight: number;    // multiple of size
  maxWidth: number;      // 0..1 of width
  italic?: boolean;
}
export interface ImageLayer extends Base {
  type: "image";
  src: string;           // data URL, so presets survive a reload
  scale: number;         // 0..2 of natural width relative to canvas width
  rounded: number;       // corner radius px
}
export interface LogoLayer extends Base { type: "logo"; size: number; }
export interface BracketLayer extends Base { type: "bracket"; size: number; color: ColorKey; flip: boolean; }
export interface RuleLayer extends Base { type: "rule"; length: number; thickness: number; color: ColorKey; }
export interface BurstLayer extends Base { type: "burst"; text: string; size: number; color: ColorKey; }
export interface PanelLayer extends Base {
  type: "panel"; w: number; h: number; fill: ColorKey | "none"; stroke: ColorKey; thickness: number; fold: boolean;
}
/** the decorative margin-burst shapes from Base.astro/about.astro, not the
 *  comic-lettering "burst" above — kept as a separate layer type since they
 *  share a name in casual conversation but nothing in how they're drawn. */
export type StarStyle = "jagged" | "star8" | "scallop7" | "scallop5";
export interface StarLayer extends Base { type: "star"; style: StarStyle; size: number; color: ColorKey; shadowColor: ColorKey; }
/** src/components/sim/motifs.tsx's GlowHand — a photo-traced halftone dot
 *  field, not a drawable shape, so `alive` is a fixed opacity pair rather
 *  than the live component's animated breathing (a static export has no
 *  "over time" to animate). */
export interface HandLayer extends Base { type: "hand"; size: number; alive: boolean; }
/** src/components/sim/motifs.tsx's WatchingEyes. `axis` mirrors the sim's
 *  own axisDeg — which question the pupils are turned toward. */
export interface EyesLayer extends Base { type: "eyes"; size: number; open: boolean; axis: number; }
export type Layer =
  | TextLayer | ImageLayer | LogoLayer | BracketLayer | RuleLayer | BurstLayer | PanelLayer | StarLayer
  | HandLayer | EyesLayer;

export interface Halftone {
  on: boolean;
  pitch: number;
  angle: number;
  shape: "circle" | "square" | "line";
  color: ColorKey;
  coverage: "corner" | "radial" | "band" | "full";
  cx: number; cy: number;   // 0..1 origin
  radius: number;           // 0..2 of width
  intensity: number;        // 0..1
  invert: boolean;
}

export interface Doc {
  size: SizeKey;
  bg: ColorKey;
  halftone: Halftone;
  layers: Layer[];
}

export const uid = () => Math.random().toString(36).slice(2, 9);

// ── drawing helpers ───────────────────────────────────────────────────────

export function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    const words = para.split(/\s+/).filter(Boolean);
    if (!words.length) { out.push(""); continue; }
    let cur = "";
    for (const w of words) {
      const t = cur ? `${cur} ${w}` : w;
      if (ctx.measureText(t).width > maxW && cur) { out.push(cur); cur = w; }
      else cur = t;
    }
    out.push(cur);
  }
  return out;
}

function fontString(l: TextLayer) {
  const f = FONTS[l.font];
  return `${l.italic ? "italic " : ""}${f.weight} ${l.size}px ${f.css}`;
}

function drawHalftone(ctx: CanvasRenderingContext2D, W: number, H: number, h: Halftone) {
  if (!h.on || h.intensity <= 0) return;
  const cx = h.cx * W, cy = h.cy * H, R = Math.max(1, h.radius * W);
  const a = (h.angle * Math.PI) / 180;
  const ca = Math.cos(a), sa = Math.sin(a);
  const n = Math.ceil(Math.hypot(W, H) / h.pitch) + 2;
  ctx.save();
  ctx.fillStyle = PALETTE[h.color];
  ctx.strokeStyle = PALETTE[h.color];
  for (let i = -n; i < n; i++) {
    for (let j = -n; j < n; j++) {
      const u = i * h.pitch, v = j * h.pitch;
      const x = u * ca - v * sa + W / 2;
      const y = u * sa + v * ca + H / 2;
      if (x < -h.pitch || y < -h.pitch || x > W + h.pitch || y > H + h.pitch) continue;

      let t: number;
      const d = Math.hypot(x - cx, y - cy) / R;
      if (h.coverage === "full") t = 1;
      else if (h.coverage === "band") t = Math.max(0, 1 - Math.abs(y - cy) / R);
      else t = Math.max(0, 1 - d);              // corner + radial share the falloff
      if (h.invert) t = 1 - t;
      if (t <= 0.001) continue;

      const r = h.pitch * 0.46 * Math.sqrt(t) * h.intensity;
      if (r < 0.35) continue;
      if (h.shape === "circle") {
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      } else if (h.shape === "square") {
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      } else {
        ctx.lineWidth = r * 1.1;
        ctx.beginPath();
        ctx.moveTo(x - h.pitch * 0.5 * ca, y - h.pitch * 0.5 * sa);
        ctx.lineTo(x + h.pitch * 0.5 * ca, y + h.pitch * 0.5 * sa);
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}

// the same outline data as the header mark's Q/P glyphs (src/layouts/Base.astro)
// — extracted once as SVG path `d` strings so canvas draws the identical
// letterforms via Path2D instead of falling back to a live webfont.
const QP_GLYPH_D = {
  q: "M445 -90H291Q255 -90 255 -54V1Q178 13 135.0 40.0Q92 67 75.0 107.5Q58 148 58 198V530Q58 576 72.0 613.5Q86 651 120.0 678.0Q154 705 214.5 720.0Q275 735 369 735Q463 735 523.5 720.0Q584 705 618.0 678.0Q652 651 665.5 613.5Q679 576 679 530V198Q679 148 662.0 107.5Q645 67 602.5 39.5Q560 12 481 1V-54Q481 -90 445 -90ZM285 220Q285 200 300.0 186.5Q315 173 369 173Q424 173 438.5 186.5Q453 200 453 220V493Q453 513 438.5 526.0Q424 539 369 539Q315 539 300.0 526.0Q285 513 285 493Z",
  p: "M260 0H105Q69 0 69 36V684Q69 720 105 720H411Q502 720 553.5 695.5Q605 671 626.0 627.0Q647 583 647 525V397Q647 339 626.0 295.0Q605 251 553.5 226.5Q502 202 411 202H296V36Q296 0 260 0ZM294 533V382H384Q413 382 422.0 397.0Q431 412 431 431V484Q431 504 422.0 518.5Q413 533 384 533Z",
};
let qGlyph: Path2D | null = null;
let pGlyph: Path2D | null = null;

/**
 * The QP mark — folded panels, brackets on the fold, gutter between, and the
 * two-plate "Q"/"P" registration. Matches the header logo (Base.astro) shape
 * for shape; built from canvas primitives + Path2D so it stays sharp at any
 * export scale rather than screenshotting the live SVG.
 */
function drawLogo(ctx: CanvasRenderingContext2D, h: number) {
  const s = h / 149.04; // natural mark height, before scale
  ctx.save();
  ctx.scale(s, s);
  ctx.translate(-155, -100); // natural centre → local origin

  const poly = (pts: [number, number][]) => {
    ctx.beginPath();
    pts.forEach(([a, b], i) => (i ? ctx.lineTo(a, b) : ctx.moveTo(a, b)));
    ctx.closePath();
  };
  ctx.fillStyle = PALETTE.ink2;
  poly([[90, 34], [142, 34], [142, 138], [90, 138], [58, 86]]); ctx.fill();
  poly([[160, 62], [220, 62], [252, 114], [220, 166], [160, 166]]); ctx.fill();

  ctx.strokeStyle = PALETTE.gutter; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(90, 34); ctx.lineTo(142, 34); ctx.lineTo(142, 138); ctx.lineTo(90, 138); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(220, 62); ctx.lineTo(160, 62); ctx.lineTo(160, 166); ctx.lineTo(220, 166); ctx.stroke();

  const g = ctx.createLinearGradient(0, 34, 0, 166);
  g.addColorStop(0, PALETTE.magenta); g.addColorStop(1, "rgba(255,61,139,0.15)");
  ctx.fillStyle = g; ctx.fillRect(149, 34, 5, 132);

  ctx.lineCap = "butt"; ctx.lineJoin = "miter"; ctx.lineWidth = 12;
  ctx.strokeStyle = PALETTE.cyan;
  ctx.beginPath(); ctx.moveTo(95.24, 25.48); ctx.lineTo(58, 86); ctx.lineTo(95.24, 146.52); ctx.stroke();
  ctx.strokeStyle = PALETTE.yellow;
  ctx.beginPath(); ctx.moveTo(214.76, 53.48); ctx.lineTo(252, 114); ctx.lineTo(214.76, 174.52); ctx.stroke();

  // glyphs: an offset colour plate under a paper-coloured top layer, same
  // two-plate registration trick as burst lettering elsewhere in this file
  if (!qGlyph) { qGlyph = new Path2D(QP_GLYPH_D.q); pGlyph = new Path2D(QP_GLYPH_D.p); }
  const glyph = (path: Path2D, tx: number, ty: number, sc: number, color: string, dx: number, dy: number, alpha: number) => {
    ctx.save();
    ctx.translate(tx + dx, ty + dy);
    ctx.scale(sc, -sc); // font outline y-up → canvas y-down
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fill(path);
    ctx.restore();
  };
  glyph(qGlyph, 83.816, 109.040, 0.064, PALETTE.magenta, 4, 4, 0.85);
  glyph(qGlyph, 83.816, 109.040, 0.064, PALETTE.paper, 0, 0, 1);
  glyph(pGlyph!, 175.412, 138.480, 0.068, PALETTE.cyan, 4, 4, 0.85);
  glyph(pGlyph!, 175.412, 138.480, 0.068, PALETTE.paper, 0, 0, 1);

  ctx.globalAlpha = 1;
  ctx.fillStyle = PALETTE.yellow;
  ctx.beginPath(); ctx.arc(136, 26, 3.6, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(168, 174, 3.6, 0, Math.PI * 2); ctx.fill();

  ctx.restore();
}

// the same four decorative burst outlines used sitewide (Base.astro's
// margin bursts burst--a/c/d/e, about.astro's photo frame) — jagged/star8
// are point lists, scallop7/scallop5 are the cubic-bezier "d" strings,
// each tagged with its own natural radius (its source viewBox's half-
// extent) so drawStar can scale any of them to a requested pixel size.
const STAR_SHAPES: Record<StarStyle, { r: number; pts?: [number, number][]; d?: string }> = {
  jagged: {
    r: 58,
    pts: [[0, -58], [6.5, -22.1], [31.4, -48.8], [17.4, -15.1], [52.8, -24.1], [22.8, -3.3], [57.4, 8.3], [20.9, 9.6],
      [43.8, 38.0], [12.4, 19.3], [16.3, 55.7], [0, 23.0], [-16.3, 55.7], [-12.4, 19.3], [-43.8, 38.0], [-20.9, 9.6],
      [-57.4, 8.3], [-22.8, -3.3], [-52.8, -24.1], [-17.4, -15.1], [-31.4, -48.8], [-6.5, -22.1]],
  },
  star8: {
    r: 50,
    pts: [[0, -50], [5.4, -12.9], [35.4, -35.4], [12.9, -5.4], [50, 0], [12.9, 5.4], [35.4, 35.4], [5.4, 12.9],
      [0, 50], [-5.4, 12.9], [-35.4, 35.4], [-12.9, 5.4], [-50, 0], [-12.9, -5.4], [-35.4, -35.4], [-5.4, -12.9]],
  },
  scallop7: {
    r: 44,
    d: "M0,-24 C9.8,-38.8 24.2,-31.8 18.8,-15.0 C36.4,-16.5 40.0,-0.9 23.4,5.3 C35.6,18.2 25.6,30.7 10.4,21.6 C8.0,39.2 -8.0,39.2 -10.4,21.6 C-25.6,30.7 -35.6,18.2 -23.4,5.3 C-40.0,-0.9 -36.4,-16.5 -18.8,-15.0 C-24.2,-31.8 -9.8,-38.8 0,-24 Z",
  },
  scallop5: {
    r: 48,
    d: "M0,-17 C14.9,-41.4 34.8,-27.0 16.2,-5.3 C44.0,1.4 36.4,24.7 10.0,13.8 C12.3,42.3 -12.3,42.3 -10.0,13.8 C-36.4,24.7 -44.0,1.4 -16.2,-5.3 C-34.8,-27.0 -14.9,-41.4 0,-17 Z",
  },
};
export const STAR_STYLES = Object.keys(STAR_SHAPES) as StarStyle[];

const starPath2D: Partial<Record<StarStyle, Path2D>> = {};
function starOutline(style: StarStyle): Path2D {
  let path = starPath2D[style];
  if (!path) {
    const shape = STAR_SHAPES[style];
    if (shape.d) {
      path = new Path2D(shape.d);
    } else {
      path = new Path2D();
      shape.pts!.forEach(([x, y], i) => (i ? path!.lineTo(x, y) : path!.moveTo(x, y)));
      path.closePath();
    }
    starPath2D[style] = path;
  }
  return path;
}

/**
 * One of the site's four decorative burst shapes, scaled to `size` px. Same
 * two-plate registration as the logo/burst lettering: a hard offset copy in
 * `shadowColor`, then a halftone-dot-filled, stroked plate in `color` on
 * top — never a flat single-colour fill, that's not how any burst on the
 * site is drawn.
 */
function drawStar(ctx: CanvasRenderingContext2D, style: StarStyle, size: number, color: ColorKey, shadowColor: ColorKey) {
  const shape = STAR_SHAPES[style];
  const s = size / (2 * shape.r);
  const path = starOutline(style);
  ctx.save();
  ctx.scale(s, s);

  ctx.save();
  ctx.translate(5, 5);
  ctx.fillStyle = PALETTE[shadowColor];
  ctx.fill(path);
  ctx.restore();

  ctx.save();
  ctx.clip(path);
  ctx.fillStyle = PALETTE[color];
  const pitch = 7, dotR = 1.2;
  const n = Math.ceil((shape.r + 10) / pitch);
  for (let i = -n; i <= n; i++) {
    for (let j = -n; j <= n; j++) {
      ctx.beginPath();
      ctx.arc(i * pitch, j * pitch, dotR, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();

  ctx.strokeStyle = PALETTE[color];
  ctx.lineWidth = 2.5;
  ctx.lineJoin = "round";
  ctx.stroke(path);

  ctx.restore();
}

// GlowHand's exact dot field (src/components/sim/motifs.tsx), extracted
// from its baked <circle> list rather than retraced — this is a photo
// trace, not a generated pattern, so there is no formula to regenerate it
// from. Natural frame: 401×284 (the sim's own viewBox), always cyan (a
// motif referencing a specific week's sim stays on that sim's own colour,
// same reasoning "logo" never takes a colour prop).
const HAND_DOTS: [number, number, number][] = [[60,145,5.7],[54,152,5.2],[47,158,4.7],[41,165,5.2],[34,171,5.7],[28,178,5.7],[86,132,5.7],[80,139,5.2],[73,145,4.7],[67,152,4.7],[60,158,4.7],[54,165,4.7],[47,171,4],[41,178,4],[34,184,4],[28,191,4.7],[21,197,5.2],[15,204,5.7],[125,106,5.7],[119,113,5.7],[112,119,5.2],[106,126,5.2],[99,132,4.7],[93,139,4.7],[86,145,4.7],[80,152,4.7],[73,158,5.2],[67,165,5.2],[60,171,5.2],[54,178,4],[47,184,3.3],[41,191,3.3],[34,197,3.3],[28,204,3.3],[21,210,3.3],[15,217,5.2],[151,93,5.2],[145,100,4.7],[138,106,4.7],[132,113,4.7],[125,119,4.7],[119,126,4.7],[112,132,5.2],[106,139,5.2],[99,145,5.2],[93,152,5.7],[86,158,5.7],[80,165,5.2],[73,171,5.2],[67,178,5.2],[60,184,5.2],[54,191,4.7],[47,197,3.3],[28,217,2.3],[21,223,2.3],[15,230,4],[8,236,5.2],[177,80,5.7],[171,87,5.2],[164,93,4.7],[158,100,4.7],[151,106,4.7],[145,113,5.2],[138,119,5.2],[132,126,5.2],[125,132,5.7],[119,139,5.7],[112,145,5.2],[106,152,5.7],[99,158,5.2],[93,165,5.2],[86,171,4.7],[80,178,3.3],[73,184,4],[67,191,4.7],[60,197,5.2],[54,204,4.7],[47,210,4],[210,61,5.7],[203,67,5.2],[197,74,4.7],[190,80,4.7],[184,87,4],[177,93,4.7],[171,100,4.7],[164,106,4.7],[158,113,5.2],[151,119,5.2],[145,126,5.2],[138,132,5.2],[132,139,5.7],[125,145,5.2],[119,152,5.2],[112,158,4],[106,165,3.3],[99,171,2.3],[73,197,2.3],[67,204,4.7],[60,210,4.7],[54,217,5.2],[47,223,4],[21,249,3.3],[229,54,5.7],[223,61,5.2],[216,67,4.7],[210,74,4.7],[203,80,4.7],[197,87,4.7],[190,93,5.2],[184,100,5.2],[177,106,4.7],[171,113,5.2],[164,119,5.2],[158,126,5.2],[151,132,5.2],[145,139,5.2],[138,145,4.7],[132,152,4],[125,158,2.3],[67,217,2.3],[60,223,5.2],[54,230,4.7],[47,236,3.3],[41,243,5.2],[255,41,5.7],[249,48,5.2],[242,54,4.7],[236,61,4.7],[229,67,5.2],[223,74,5.2],[216,80,5.2],[210,87,5.2],[203,93,5.2],[197,100,5.2],[190,106,5.2],[184,113,5.2],[177,119,5.2],[171,126,4.7],[164,132,4.7],[158,139,4.7],[151,145,4],[145,152,4],[67,230,3.3],[60,236,4.7],[54,243,4.7],[47,249,3.3],[41,256,5.7],[275,35,5.7],[268,41,5.2],[262,48,5.2],[255,54,5.2],[249,61,5.2],[242,67,5.2],[236,74,5.2],[229,80,5.2],[223,87,5.2],[216,93,5.2],[210,100,5.2],[203,106,5.2],[197,113,5.7],[190,119,5.2],[184,126,4.7],[177,132,4],[171,139,3.3],[164,145,2.3],[158,152,3.3],[99,210,5.2],[93,217,4],[86,223,2.3],[67,243,3.3],[60,249,4],[54,256,3.3],[47,262,4],[294,28,5.7],[288,35,5.2],[281,41,5.2],[275,48,5.7],[268,54,5.7],[262,61,5.7],[255,67,5.7],[249,74,5.2],[242,80,5.2],[236,87,5.7],[229,93,5.2],[223,100,5.2],[216,106,5.2],[210,113,5.2],[203,119,5.2],[197,126,5.2],[190,132,4.7],[184,139,3.3],[177,145,3.3],[164,158,2.3],[145,178,3.3],[86,236,5.2],[80,243,2.3],[60,262,4],[54,269,5.2],[314,22,5.7],[307,28,5.2],[301,35,5.2],[294,41,5.7],[288,48,5.7],[281,54,5.7],[275,61,5.7],[268,67,5.7],[229,106,5.7],[223,113,5.2],[216,119,5.2],[210,126,5.2],[203,132,5.2],[197,139,4.7],[190,145,4],[184,152,3.3],[177,158,2.3],[138,197,4.7],[333,15,5.7],[327,22,5.2],[320,28,5.7],[314,35,5.7],[307,41,5.7],[288,61,5.7],[281,67,5.7],[275,74,5.7],[268,80,5.7],[262,87,5.7],[255,93,5.7],[249,100,5.7],[242,106,5.7],[236,113,5.7],[229,119,5.2],[223,126,5.2],[216,132,5.2],[210,139,5.2],[203,145,5.2],[197,152,4.7],[190,158,3.3],[184,165,2.3],[138,210,5.2],[353,9,5.2],[346,15,5.2],[340,22,5.2],[333,28,5.7],[327,35,5.7],[320,41,5.7],[307,54,5.7],[301,61,5.7],[294,67,5.7],[288,74,5.7],[281,80,5.7],[275,87,5.7],[268,93,5.2],[262,100,5.2],[255,106,5.2],[249,113,5.7],[242,119,5.7],[236,126,5.2],[229,132,5.7],[223,139,5.2],[216,145,5.2],[210,152,5.2],[203,158,5.2],[197,165,4],[190,171,2.3],[184,178,2.3],[177,184,4],[171,191,3.3],[366,9,5.7],[359,15,3.3],[353,22,4.7],[346,28,5.7],[340,35,5.7],[327,48,5.7],[320,54,5.7],[314,61,5.7],[307,67,5.7],[301,74,5.7],[294,80,5.2],[288,87,5.2],[281,93,5.2],[275,100,5.2],[268,106,5.7],[262,113,5.2],[255,119,5.7],[249,126,5.7],[242,132,5.7],[236,139,5.2],[229,145,5.2],[223,152,5.2],[216,158,5.2],[210,165,4.7],[203,171,3.3],[197,178,2.3],[190,184,2.3],[184,191,3.3],[177,197,3.3],[171,204,3.3],[164,210,2.3],[373,15,5.7],[366,22,4],[353,35,4.7],[346,41,5.7],[340,48,5.7],[333,54,5.7],[327,61,5.2],[320,67,5.2],[314,74,5.2],[307,80,4.7],[301,87,4],[294,93,2.3],[281,106,4],[275,113,4.7],[268,119,5.2],[262,126,5.7],[255,132,5.7],[249,139,5.7],[242,145,5.2],[236,152,5.2],[229,158,5.2],[223,165,5.2],[216,171,4.7],[210,178,2.3],[203,184,2.3],[197,191,2.3],[190,197,3.3],[184,204,3.3],[177,210,3.3],[171,217,4],[164,223,4],[158,230,2.3],[145,243,4],[373,28,4],[366,35,2.3],[359,41,2.3],[353,48,5.2],[346,54,5.2],[340,61,5.2],[333,67,5.2],[327,74,5.2],[320,80,4.7],[314,87,4],[307,93,3.3],[301,100,2.3],[294,106,2.3],[288,113,4],[281,119,5.2],[275,126,4.7],[268,132,3.3],[262,139,4.7],[255,145,5.2],[249,152,5.2],[242,158,4.7],[236,165,4],[229,171,4],[223,178,3.3],[216,184,2.3],[210,191,2.3],[203,197,2.3],[197,204,3.3],[190,210,4],[184,217,2.3],[177,223,3.3],[171,230,3.3],[164,236,3.3],[158,243,3.3],[151,249,2.3],[145,256,5.2],[379,35,5.2],[373,41,2.3],[359,54,4],[353,61,5.2],[346,67,5.2],[340,74,5.2],[333,80,5.2],[327,87,4.7],[320,93,4],[314,100,2.3],[301,113,4.7],[249,165,5.7],[242,171,5.7],[229,184,5.2],[223,191,5.2],[216,197,5.2],[210,204,4.7],[203,210,3.3],[197,217,4],[190,223,3.3],[184,230,2.3],[177,236,2.3],[171,243,3.3],[164,249,4.7],[158,256,4],[151,262,4],[386,41,5.7],[379,48,4],[359,67,5.2],[353,74,5.7],[346,80,5.2],[340,87,4.7],[333,93,2.3],[320,106,2.3],[203,223,4.7],[197,230,3.3],[190,236,2.3],[184,243,2.3],[177,249,4.7],[171,256,5.2],[164,262,5.2],[158,269,4],[386,54,4.7],[379,61,2.3],[366,74,4.7],[359,80,4.7],[353,87,4],[333,106,4],[197,243,5.2],[190,249,4.7],[184,256,4.7],[177,262,5.2],[171,269,4.7],[164,275,3.3],[392,61,5.7],[386,67,3.3],[373,80,2.3],[366,87,3.3],[184,269,5.7],[177,275,5.2],[392,74,5.2],[366,100,3.3],[392,87,4.7],[379,100,4.7]];

/** GlowHand: blurred glow pass, then sharp ink pass, same dots both times —
 *  blurring the dots (not a filled silhouette) keeps the creases between
 *  fingers dark instead of the glow flattening the hand into a slab. */
function drawHand(ctx: CanvasRenderingContext2D, size: number, alive: boolean) {
  const s = size / 401;
  ctx.save();
  ctx.scale(s, s);
  ctx.translate(-200.5, -142); // centre the 401×284 viewBox on the layer origin

  const glowAlpha = alive ? 0.5 : 0.14;
  const inkAlpha = alive ? 1 : 0.28;

  ctx.save();
  ctx.filter = "blur(9px)";
  ctx.globalAlpha = glowAlpha;
  ctx.fillStyle = PALETTE.cyan;
  HAND_DOTS.forEach(([x, y, r]) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); });
  ctx.restore();

  ctx.globalAlpha = inkAlpha;
  ctx.fillStyle = PALETTE.cyan;
  HAND_DOTS.forEach(([x, y, r]) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); });
  ctx.globalAlpha = 1;

  ctx.restore();
}

// WatchingEyes' exact geometry (src/components/sim/motifs.tsx): the eye-
// lens outlines and closed-lid outlines as Path2D (built from the same "Q"
// paths, not retraced), and the same lensDots() generator producing the
// same 214-dot fill — copied rather than re-derived so the shape this
// draws is provably the one the sim actually shows, not a lookalike.
const EYE_PATH_L = "M58,42 Q84,19 110,42 Q84,65 58,42 Z";
const EYE_PATH_R = "M130,42 Q156,19 182,42 Q156,65 130,42 Z";
const LID_PATH_L = "M58,42 Q84,38 110,42 Q84,46 58,42 Z";
const LID_PATH_R = "M130,42 Q156,38 182,42 Q156,46 130,42 Z";

function lensDots(cx: number, cy: number, halfW: number, halfH: number, pitch: number) {
  const dots: { x: number; y: number; r: number }[] = [];
  const rowPitch = pitch * 0.87;
  const rows = Math.ceil(halfH / rowPitch) + 1;
  const cols = Math.ceil(halfW / pitch) + 1;
  for (let row = -rows; row <= rows; row++) {
    const y = row * rowPitch;
    const rowOffset = row % 2 !== 0 ? pitch / 2 : 0;
    for (let col = -cols; col <= cols; col++) {
      const x = col * pitch + rowOffset;
      const fx = x / halfW, fy = y / halfH;
      const d2 = fx * fx + fy * fy;
      if (d2 > 1) continue;
      const r = pitch * 0.44 * Math.sqrt(1 - d2);
      if (r < 0.35) continue;
      dots.push({ x: cx + x, y: cy + y, r: Math.round(r * 100) / 100 });
    }
  }
  return dots;
}
const EYE_DOTS = [...lensDots(84, 42, 26, 23, 4.4), ...lensDots(156, 42, 26, 23, 4.4)];

let eyeClipL: Path2D | null = null, eyeClipR: Path2D | null = null;
let lidL: Path2D | null = null, lidR: Path2D | null = null;

function drawEyeDots(ctx: CanvasRenderingContext2D, clip: Path2D, blur: boolean, alpha: number) {
  ctx.save();
  ctx.clip(clip);
  if (blur) ctx.filter = "blur(2.4px)";
  ctx.globalAlpha = alpha;
  ctx.fillStyle = PALETTE.cyan;
  EYE_DOTS.forEach((d) => { ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); ctx.fill(); });
  ctx.restore();
}

function drawEyes(ctx: CanvasRenderingContext2D, size: number, open: boolean, axisDeg: number) {
  if (!eyeClipL) {
    eyeClipL = new Path2D(EYE_PATH_L); eyeClipR = new Path2D(EYE_PATH_R);
    lidL = new Path2D(LID_PATH_L); lidR = new Path2D(LID_PATH_R);
  }
  const s = size / 240;
  ctx.save();
  ctx.scale(s, s);
  ctx.translate(-120, -42); // centre the 240×84 viewBox on the layer origin

  if (!open) {
    ctx.fillStyle = PALETTE.ink;
    ctx.strokeStyle = PALETTE.gutter;
    ctx.lineWidth = 2;
    ctx.fill(lidL!); ctx.stroke(lidL!);
    ctx.fill(lidR!); ctx.stroke(lidR!);
    ctx.restore();
    return;
  }

  drawEyeDots(ctx, eyeClipL!, true, 0.55);
  drawEyeDots(ctx, eyeClipR!, true, 0.55);
  drawEyeDots(ctx, eyeClipL!, false, 0.92);
  drawEyeDots(ctx, eyeClipR!, false, 0.92);
  ctx.globalAlpha = 1;

  const rad = (axisDeg * Math.PI) / 180;
  const slit = (cx: number, clip: Path2D) => {
    ctx.save();
    ctx.clip(clip);
    ctx.translate(cx, 42);
    ctx.rotate(rad);
    ctx.fillStyle = PALETTE.paper;
    ctx.beginPath();
    if ((ctx as any).roundRect) (ctx as any).roundRect(-4, -26, 8, 52, 4);
    else ctx.rect(-4, -26, 8, 52);
    ctx.fill();
    ctx.restore();
  };
  slit(84, eyeClipL!);
  slit(156, eyeClipR!);

  ctx.restore();
}

export interface Box { x: number; y: number; w: number; h: number }

/**
 * Draw one layer at the origin of an already-translated/rotated context, and
 * return its local bounding box. The box feeds hit-testing for dragging, so it
 * has to come from the same code that draws — measuring separately drifts.
 */
function drawLayer(
  ctx: CanvasRenderingContext2D, l: Layer, W: number, images: Record<string, HTMLImageElement>,
): Box {
  switch (l.type) {
    case "text": {
      ctx.font = fontString(l);
      ctx.letterSpacing = `${l.tracking}px`;
      const body = l.caps ? l.text.toUpperCase() : l.text;
      const maxW = Math.max(40, l.maxWidth * W);
      const lines = wrap(ctx, body, maxW);
      const lh = l.size * l.lineHeight;
      const widest = lines.reduce((m, s) => Math.max(m, ctx.measureText(s).width), 0);
      ctx.fillStyle = PALETTE[l.color];
      ctx.textAlign = l.align;
      ctx.textBaseline = "top";
      const ox = l.align === "center" ? 0 : l.align === "right" ? 0 : 0;
      lines.forEach((s, i) => ctx.fillText(s, ox, i * lh));
      ctx.letterSpacing = "0px";
      const h = Math.max(lh * lines.length, l.size);
      const x = l.align === "center" ? -widest / 2 : l.align === "right" ? -widest : 0;
      return { x, y: 0, w: widest, h };
    }
    case "image": {
      const img = images[l.src];
      if (!img || !img.complete || !img.naturalWidth) return { x: -60, y: -60, w: 120, h: 120 };
      const w = l.scale * W;
      const h = (img.naturalHeight / img.naturalWidth) * w;
      ctx.save();
      if (l.rounded > 0) {
        ctx.beginPath();
        (ctx as any).roundRect?.(-w / 2, -h / 2, w, h, l.rounded);
        if ((ctx as any).roundRect) ctx.clip();
      }
      ctx.drawImage(img, -w / 2, -h / 2, w, h);
      ctx.restore();
      return { x: -w / 2, y: -h / 2, w, h };
    }
    case "logo":
      drawLogo(ctx, l.size); // already centred on its own local origin
      return { x: -l.size * 0.651, y: -l.size * 0.5, w: l.size * 1.302, h: l.size };
    case "bracket": {
      const s = l.size;
      ctx.strokeStyle = PALETTE[l.color];
      ctx.lineWidth = s * 0.13; ctx.lineCap = "butt"; ctx.lineJoin = "miter";
      const d = l.flip ? -1 : 1;
      ctx.beginPath();
      ctx.moveTo(d * s * 0.28, -s * 0.5);
      ctx.lineTo(-d * s * 0.28, 0);
      ctx.lineTo(d * s * 0.28, s * 0.5);
      ctx.stroke();
      return { x: -s * 0.4, y: -s * 0.55, w: s * 0.8, h: s * 1.1 };
    }
    case "rule": {
      const w = l.length * W;
      ctx.fillStyle = PALETTE[l.color];
      ctx.fillRect(-w / 2, -l.thickness / 2, w, l.thickness);
      return { x: -w / 2, y: -l.thickness / 2 - 8, w, h: l.thickness + 16 };
    }
    case "burst": {
      ctx.font = `400 ${l.size}px ${FONTS.display.css}`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      const t = l.text.toUpperCase();
      const w = ctx.measureText(t).width;
      // inked comic lettering: hard outline, then an offset colour plate
      ctx.lineJoin = "round";
      ctx.strokeStyle = PALETTE.ink; ctx.lineWidth = l.size * 0.22;
      ctx.strokeText(t, 0, 0);
      ctx.fillStyle = PALETTE.magenta; ctx.fillText(t, l.size * 0.06, l.size * 0.06);
      ctx.strokeText(t, 0, 0);
      ctx.fillStyle = PALETTE[l.color]; ctx.fillText(t, 0, 0);
      return { x: -w / 2 - 10, y: -l.size * 0.6, w: w + 20, h: l.size * 1.2 };
    }
    case "star":
      drawStar(ctx, l.style, l.size, l.color, l.shadowColor);
      return { x: -l.size / 2 - 8, y: -l.size / 2 - 8, w: l.size + 16, h: l.size + 16 };
    case "hand": {
      drawHand(ctx, l.size, l.alive);
      const h = l.size * (284 / 401);
      return { x: -l.size / 2, y: -h / 2, w: l.size, h };
    }
    case "eyes": {
      drawEyes(ctx, l.size, l.open, l.axis);
      const h = l.size * (84 / 240);
      return { x: -l.size / 2, y: -h / 2, w: l.size, h };
    }
    case "panel": {
      const w = l.w * W, h = l.h * W;
      const pts: [number, number][] = l.fold
        ? [[-w / 2 + h * 0.18, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2 + h * 0.18, h / 2], [-w / 2, 0]]
        : [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]];
      ctx.beginPath();
      pts.forEach(([a, b], i) => (i ? ctx.lineTo(a, b) : ctx.moveTo(a, b)));
      ctx.closePath();
      if (l.fill !== "none") { ctx.fillStyle = PALETTE[l.fill]; ctx.fill(); }
      if (l.thickness > 0) { ctx.strokeStyle = PALETTE[l.stroke]; ctx.lineWidth = l.thickness; ctx.stroke(); }
      return { x: -w / 2, y: -h / 2, w, h };
    }
  }
}

/** Draw the whole document. Returns each layer's screen-space box for hit-testing. */
export function draw(
  ctx: CanvasRenderingContext2D, doc: Doc, images: Record<string, HTMLImageElement>,
): Record<string, Box> {
  const { w: W, h: H } = SIZES[doc.size];
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = PALETTE[doc.bg];
  ctx.fillRect(0, 0, W, H);
  drawHalftone(ctx, W, H, doc.halftone);

  const boxes: Record<string, Box> = {};
  for (const l of doc.layers) {
    ctx.save();
    ctx.globalAlpha = l.opacity;
    ctx.translate(l.x * W, l.y * H);
    if (l.rotation) ctx.rotate((l.rotation * Math.PI) / 180);
    const b = drawLayer(ctx, l, W, images);
    ctx.restore();
    boxes[l.id] = { x: l.x * W + b.x, y: l.y * H + b.y, w: b.w, h: b.h };
  }
  return boxes;
}
