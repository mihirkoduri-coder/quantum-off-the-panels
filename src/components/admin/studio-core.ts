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
export type Layer = TextLayer | ImageLayer | LogoLayer | BracketLayer | RuleLayer | BurstLayer | PanelLayer;

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

/** the QP mark, drawn from primitives so it stays sharp at any export scale */
function drawLogo(ctx: CanvasRenderingContext2D, h: number) {
  const s = h / 96;
  ctx.save();
  ctx.scale(s, s);
  const poly = (pts: [number, number][]) => {
    ctx.beginPath();
    pts.forEach(([a, b], i) => (i ? ctx.lineTo(a, b) : ctx.moveTo(a, b)));
    ctx.closePath();
  };
  ctx.fillStyle = PALETTE.ink2;
  poly([[22, 0], [58, 0], [58, 72], [22, 72], [0, 36]]); ctx.fill();
  poly([[70, 12], [112, 12], [134, 48], [112, 84], [70, 84]]); ctx.fill();
  ctx.strokeStyle = PALETTE.gutter; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(22, 0); ctx.lineTo(58, 0); ctx.lineTo(58, 72); ctx.lineTo(22, 72); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(112, 12); ctx.lineTo(70, 12); ctx.lineTo(70, 84); ctx.lineTo(112, 84); ctx.stroke();
  const g = ctx.createLinearGradient(0, 0, 0, 90);
  g.addColorStop(0, PALETTE.magenta); g.addColorStop(1, "rgba(255,61,139,0.15)");
  ctx.fillStyle = g; ctx.fillRect(62, 0, 4, 90);
  ctx.strokeStyle = PALETTE.cyan; ctx.lineWidth = 9; ctx.lineJoin = "miter"; ctx.lineCap = "butt";
  ctx.beginPath(); ctx.moveTo(26, -6); ctx.lineTo(0, 36); ctx.lineTo(26, 78); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(108, 6); ctx.lineTo(134, 48); ctx.lineTo(108, 90); ctx.stroke();
  ctx.fillStyle = PALETTE.paper;
  ctx.font = `400 40px ${FONTS.display.css}`;
  ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
  ctx.fillText("Q", 40, 50); ctx.fillText("P", 92, 62);
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
      ctx.save(); ctx.translate(-l.size * 0.7, -l.size * 0.47);
      drawLogo(ctx, l.size); ctx.restore();
      return { x: -l.size * 0.7, y: -l.size * 0.47, w: l.size * 1.4, h: l.size * 0.94 };
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
