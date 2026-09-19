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
import { drawHand, drawEyes, drawLogo, LOGO_NATURAL } from "../../lib/motif-canvas";

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

// GlowHand/WatchingEyes canvas renderers now live in src/lib/motif-canvas.ts,
// shared with the public stamp sheet's downloadable stickers — see that file
// for the extraction rationale.

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
    case "logo": {
      // l.size is the mark's HEIGHT (this layer's own long-standing
      // convention); drawLogo takes WIDTH, same as drawHand/drawEyes, so
      // convert via the natural aspect ratio rather than change what the
      // Studio's own "Size" slider means.
      const w = l.size * (LOGO_NATURAL.w / LOGO_NATURAL.h);
      drawLogo(ctx, w); // already centred on its own local origin
      return { x: -w / 2, y: -l.size / 2, w, h: l.size };
    }
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
