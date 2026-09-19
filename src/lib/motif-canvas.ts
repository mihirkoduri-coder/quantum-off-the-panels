/**
 * Canvas renderers for the two character motifs (src/components/sim/
 * motifs.tsx's GlowHand and WatchingEyes), shared between the Studio
 * (src/components/admin/studio-core.ts) and the public stamp sheet's
 * downloadable stickers (src/components/StampSheet.tsx). One copy of the
 * dot data and drawing code — extracted here specifically so a second
 * consumer didn't mean a second, driftable copy of either.
 *
 * These colours are the dark theme's values, hardcoded rather than read
 * from CSS custom properties: a canvas fillStyle can't resolve a var(),
 * and a downloaded sticker or Studio layer should look like the sim always
 * looks, not flip with whatever theme the viewer happens to have on.
 */

import { W_NATURAL, W_OUTLINE, W_LID, W_LIGHT, nearestAngle, type Dot } from "../components/sim/watcher-dots";

const CYAN = "#22C4F0";
const YELLOW = "#FFD23F";
const LIGHT_WHITE = "#EAFBFF";
const MAGENTA = "#FF3D8B";
const PAPER = "#ECE7D9";
const INK2 = "#131829";
const GUTTER = "#2B3358";

export const HAND_NATURAL = { w: 401, h: 284 };
export const EYES_NATURAL = W_NATURAL;
// aspect ratio only (130.2:100 == 1.302:1) — see drawLogo for where that
// ratio comes from.
export const LOGO_NATURAL = { w: 130.2, h: 100 };

// GlowHand's exact dot field, extracted from its baked <circle> list rather
// than retraced — this is a photo trace, not a generated pattern, so there
// is no formula to regenerate it from. Always cyan: a motif referencing a
// specific week's sim stays on that sim's own colour.
const HAND_DOTS: [number, number, number][] = [[60,145,5.7],[54,152,5.2],[47,158,4.7],[41,165,5.2],[34,171,5.7],[28,178,5.7],[86,132,5.7],[80,139,5.2],[73,145,4.7],[67,152,4.7],[60,158,4.7],[54,165,4.7],[47,171,4],[41,178,4],[34,184,4],[28,191,4.7],[21,197,5.2],[15,204,5.7],[125,106,5.7],[119,113,5.7],[112,119,5.2],[106,126,5.2],[99,132,4.7],[93,139,4.7],[86,145,4.7],[80,152,4.7],[73,158,5.2],[67,165,5.2],[60,171,5.2],[54,178,4],[47,184,3.3],[41,191,3.3],[34,197,3.3],[28,204,3.3],[21,210,3.3],[15,217,5.2],[151,93,5.2],[145,100,4.7],[138,106,4.7],[132,113,4.7],[125,119,4.7],[119,126,4.7],[112,132,5.2],[106,139,5.2],[99,145,5.2],[93,152,5.7],[86,158,5.7],[80,165,5.2],[73,171,5.2],[67,178,5.2],[60,184,5.2],[54,191,4.7],[47,197,3.3],[28,217,2.3],[21,223,2.3],[15,230,4],[8,236,5.2],[177,80,5.7],[171,87,5.2],[164,93,4.7],[158,100,4.7],[151,106,4.7],[145,113,5.2],[138,119,5.2],[132,126,5.2],[125,132,5.7],[119,139,5.7],[112,145,5.2],[106,152,5.7],[99,158,5.2],[93,165,5.2],[86,171,4.7],[80,178,3.3],[73,184,4],[67,191,4.7],[60,197,5.2],[54,204,4.7],[47,210,4],[210,61,5.7],[203,67,5.2],[197,74,4.7],[190,80,4.7],[184,87,4],[177,93,4.7],[171,100,4.7],[164,106,4.7],[158,113,5.2],[151,119,5.2],[145,126,5.2],[138,132,5.2],[132,139,5.7],[125,145,5.2],[119,152,5.2],[112,158,4],[106,165,3.3],[99,171,2.3],[73,197,2.3],[67,204,4.7],[60,210,4.7],[54,217,5.2],[47,223,4],[21,249,3.3],[229,54,5.7],[223,61,5.2],[216,67,4.7],[210,74,4.7],[203,80,4.7],[197,87,4.7],[190,93,5.2],[184,100,5.2],[177,106,4.7],[171,113,5.2],[164,119,5.2],[158,126,5.2],[151,132,5.2],[145,139,5.2],[138,145,4.7],[132,152,4],[125,158,2.3],[67,217,2.3],[60,223,5.2],[54,230,4.7],[47,236,3.3],[41,243,5.2],[255,41,5.7],[249,48,5.2],[242,54,4.7],[236,61,4.7],[229,67,5.2],[223,74,5.2],[216,80,5.2],[210,87,5.2],[203,93,5.2],[197,100,5.2],[190,106,5.2],[184,113,5.2],[177,119,5.2],[171,126,4.7],[164,132,4.7],[158,139,4.7],[151,145,4],[145,152,4],[67,230,3.3],[60,236,4.7],[54,243,4.7],[47,249,3.3],[41,256,5.7],[275,35,5.7],[268,41,5.2],[262,48,5.2],[255,54,5.2],[249,61,5.2],[242,67,5.2],[236,74,5.2],[229,80,5.2],[223,87,5.2],[216,93,5.2],[210,100,5.2],[203,106,5.2],[197,113,5.7],[190,119,5.2],[184,126,4.7],[177,132,4],[171,139,3.3],[164,145,2.3],[158,152,3.3],[99,210,5.2],[93,217,4],[86,223,2.3],[67,243,3.3],[60,249,4],[54,256,3.3],[47,262,4],[294,28,5.7],[288,35,5.2],[281,41,5.2],[275,48,5.7],[268,54,5.7],[262,61,5.7],[255,67,5.7],[249,74,5.2],[242,80,5.2],[236,87,5.7],[229,93,5.2],[223,100,5.2],[216,106,5.2],[210,113,5.2],[203,119,5.2],[197,126,5.2],[190,132,4.7],[184,139,3.3],[177,145,3.3],[164,158,2.3],[145,178,3.3],[86,236,5.2],[80,243,2.3],[60,262,4],[54,269,5.2],[314,22,5.7],[307,28,5.2],[301,35,5.2],[294,41,5.7],[288,48,5.7],[281,54,5.7],[275,61,5.7],[268,67,5.7],[229,106,5.7],[223,113,5.2],[216,119,5.2],[210,126,5.2],[203,132,5.2],[197,139,4.7],[190,145,4],[184,152,3.3],[177,158,2.3],[138,197,4.7],[333,15,5.7],[327,22,5.2],[320,28,5.7],[314,35,5.7],[307,41,5.7],[288,61,5.7],[281,67,5.7],[275,74,5.7],[268,80,5.7],[262,87,5.7],[255,93,5.7],[249,100,5.7],[242,106,5.7],[236,113,5.7],[229,119,5.2],[223,126,5.2],[216,132,5.2],[210,139,5.2],[203,145,5.2],[197,152,4.7],[190,158,3.3],[184,165,2.3],[138,210,5.2],[353,9,5.2],[346,15,5.2],[340,22,5.2],[333,28,5.7],[327,35,5.7],[320,41,5.7],[307,54,5.7],[301,61,5.7],[294,67,5.7],[288,74,5.7],[281,80,5.7],[275,87,5.7],[268,93,5.2],[262,100,5.2],[255,106,5.2],[249,113,5.7],[242,119,5.7],[236,126,5.2],[229,132,5.7],[223,139,5.2],[216,145,5.2],[210,152,5.2],[203,158,5.2],[197,165,4],[190,171,2.3],[184,178,2.3],[177,184,4],[171,191,3.3],[366,9,5.7],[359,15,3.3],[353,22,4.7],[346,28,5.7],[340,35,5.7],[327,48,5.7],[320,54,5.7],[314,61,5.7],[307,67,5.7],[301,74,5.7],[294,80,5.2],[288,87,5.2],[281,93,5.2],[275,100,5.2],[268,106,5.7],[262,113,5.2],[255,119,5.7],[249,126,5.7],[242,132,5.7],[236,139,5.2],[229,145,5.2],[223,152,5.2],[216,158,5.2],[210,165,4.7],[203,171,3.3],[197,178,2.3],[190,184,2.3],[184,191,3.3],[177,197,3.3],[171,204,3.3],[164,210,2.3],[373,15,5.7],[366,22,4],[353,35,4.7],[346,41,5.7],[340,48,5.7],[333,54,5.7],[327,61,5.2],[320,67,5.2],[314,74,5.2],[307,80,4.7],[301,87,4],[294,93,2.3],[281,106,4],[275,113,4.7],[268,119,5.2],[262,126,5.7],[255,132,5.7],[249,139,5.7],[242,145,5.2],[236,152,5.2],[229,158,5.2],[223,165,5.2],[216,171,4.7],[210,178,2.3],[203,184,2.3],[197,191,2.3],[190,197,3.3],[184,204,3.3],[177,210,3.3],[171,217,4],[164,223,4],[158,230,2.3],[145,243,4],[373,28,4],[366,35,2.3],[359,41,2.3],[353,48,5.2],[346,54,5.2],[340,61,5.2],[333,67,5.2],[327,74,5.2],[320,80,4.7],[314,87,4],[307,93,3.3],[301,100,2.3],[294,106,2.3],[288,113,4],[281,119,5.2],[275,126,4.7],[268,132,3.3],[262,139,4.7],[255,145,5.2],[249,152,5.2],[242,158,4.7],[236,165,4],[229,171,4],[223,178,3.3],[216,184,2.3],[210,191,2.3],[203,197,2.3],[197,204,3.3],[190,210,4],[184,217,2.3],[177,223,3.3],[171,230,3.3],[164,236,3.3],[158,243,3.3],[151,249,2.3],[145,256,5.2],[379,35,5.2],[373,41,2.3],[359,54,4],[353,61,5.2],[346,67,5.2],[340,74,5.2],[333,80,5.2],[327,87,4.7],[320,93,4],[314,100,2.3],[301,113,4.7],[249,165,5.7],[242,171,5.7],[229,184,5.2],[223,191,5.2],[216,197,5.2],[210,204,4.7],[203,210,3.3],[197,217,4],[190,223,3.3],[184,230,2.3],[177,236,2.3],[171,243,3.3],[164,249,4.7],[158,256,4],[151,262,4],[386,41,5.7],[379,48,4],[359,67,5.2],[353,74,5.7],[346,80,5.2],[340,87,4.7],[333,93,2.3],[320,106,2.3],[203,223,4.7],[197,230,3.3],[190,236,2.3],[184,243,2.3],[177,249,4.7],[171,256,5.2],[164,262,5.2],[158,269,4],[386,54,4.7],[379,61,2.3],[366,74,4.7],[359,80,4.7],[353,87,4],[333,106,4],[197,243,5.2],[190,249,4.7],[184,256,4.7],[177,262,5.2],[171,269,4.7],[164,275,3.3],[392,61,5.7],[386,67,3.3],[373,80,2.3],[366,87,3.3],[184,269,5.7],[177,275,5.2],[392,74,5.2],[366,100,3.3],[392,87,4.7],[379,100,4.7]];

/** GlowHand: blurred glow pass, then sharp ink pass, same dots both times —
 *  blurring the dots (not a filled silhouette) keeps the creases between
 *  fingers dark instead of the glow flattening the hand into a slab. */
export function drawHand(ctx: CanvasRenderingContext2D, size: number, alive: boolean) {
  const s = size / HAND_NATURAL.w;
  ctx.save();
  ctx.scale(s, s);
  ctx.translate(-HAND_NATURAL.w / 2, -HAND_NATURAL.h / 2); // centre on the layer origin

  const glowAlpha = alive ? 0.5 : 0.14;
  const inkAlpha = alive ? 1 : 0.28;

  ctx.save();
  ctx.filter = "blur(9px)";
  ctx.globalAlpha = glowAlpha;
  ctx.fillStyle = CYAN;
  HAND_DOTS.forEach(([x, y, r]) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); });
  ctx.restore();

  ctx.globalAlpha = inkAlpha;
  ctx.fillStyle = CYAN;
  HAND_DOTS.forEach(([x, y, r]) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); });
  ctx.globalAlpha = 1;

  ctx.restore();
}

// WatchingEyes' exact geometry: the hood outline, closed-lid bars, and the
// three pre-screened eye-light patterns, all imported from watcher-dots.ts
// rather than retraced — same dot data the SVG sim component draws, so the
// sticker/Studio layer is provably the same shape the sim actually shows.
function drawDots(ctx: CanvasRenderingContext2D, d: Dot[], fill: string, alpha: number) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = fill;
  d.forEach(([x, y, r]) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); });
}

export function drawEyes(ctx: CanvasRenderingContext2D, size: number, open: boolean, axisDeg: number) {
  const s = size / EYES_NATURAL.w;
  ctx.save();
  ctx.scale(s, s);
  ctx.translate(-EYES_NATURAL.w / 2, -EYES_NATURAL.h / 2); // centre on the layer origin

  // outline is always drawn — dim when closed, at full ink when open —
  // same layering the SVG's .we__ink opacity rule uses
  drawDots(ctx, W_OUTLINE, YELLOW, open ? 1 : 0.55);

  if (!open) {
    drawDots(ctx, W_LID, YELLOW, 1);
  } else {
    const lit = W_LIGHT[nearestAngle(axisDeg)] ?? W_LIGHT[0];
    drawDots(ctx, lit.cy, CYAN, 1);
    drawDots(ctx, lit.wh, LIGHT_WHITE, 1);
  }

  ctx.globalAlpha = 1;
  ctx.restore();
}

// the same outline data as the header mark's Q/P glyphs (src/layouts/
// Base.astro) — extracted once as SVG path `d` strings so canvas draws the
// identical letterforms via Path2D instead of falling back to a live webfont.
const QP_GLYPH_D = {
  q: "M445 -90H291Q255 -90 255 -54V1Q178 13 135.0 40.0Q92 67 75.0 107.5Q58 148 58 198V530Q58 576 72.0 613.5Q86 651 120.0 678.0Q154 705 214.5 720.0Q275 735 369 735Q463 735 523.5 720.0Q584 705 618.0 678.0Q652 651 665.5 613.5Q679 576 679 530V198Q679 148 662.0 107.5Q645 67 602.5 39.5Q560 12 481 1V-54Q481 -90 445 -90ZM285 220Q285 200 300.0 186.5Q315 173 369 173Q424 173 438.5 186.5Q453 200 453 220V493Q453 513 438.5 526.0Q424 539 369 539Q315 539 300.0 526.0Q285 513 285 493Z",
  p: "M260 0H105Q69 0 69 36V684Q69 720 105 720H411Q502 720 553.5 695.5Q605 671 626.0 627.0Q647 583 647 525V397Q647 339 626.0 295.0Q605 251 553.5 226.5Q502 202 411 202H296V36Q296 0 260 0ZM294 533V382H384Q413 382 422.0 397.0Q431 412 431 431V484Q431 504 422.0 518.5Q413 533 384 533Z",
};
let qGlyph: Path2D | null = null;
let pGlyph: Path2D | null = null;

/**
 * The QP mark — folded panels, brackets on the fold, gutter between, and the
 * two-plate "Q"/"P" registration. Matches the header logo (Base.astro) for
 * shape; built from canvas primitives + Path2D so it stays sharp at any
 * export scale rather than screenshotting the live SVG. `size` is WIDTH,
 * same convention as drawHand/drawEyes above, converted internally to the
 * height this was originally authored against.
 */
export function drawLogo(ctx: CanvasRenderingContext2D, size: number) {
  const h = size / (LOGO_NATURAL.w / LOGO_NATURAL.h);
  const s = h / 149.04; // natural mark height, before scale
  ctx.save();
  ctx.scale(s, s);
  ctx.translate(-155, -100); // natural centre → local origin

  const poly = (pts: [number, number][]) => {
    ctx.beginPath();
    pts.forEach(([a, b], i) => (i ? ctx.lineTo(a, b) : ctx.moveTo(a, b)));
    ctx.closePath();
  };
  ctx.fillStyle = INK2;
  poly([[90, 34], [142, 34], [142, 138], [90, 138], [58, 86]]); ctx.fill();
  poly([[160, 62], [220, 62], [252, 114], [220, 166], [160, 166]]); ctx.fill();

  ctx.strokeStyle = GUTTER; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(90, 34); ctx.lineTo(142, 34); ctx.lineTo(142, 138); ctx.lineTo(90, 138); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(220, 62); ctx.lineTo(160, 62); ctx.lineTo(160, 166); ctx.lineTo(220, 166); ctx.stroke();

  const g = ctx.createLinearGradient(0, 34, 0, 166);
  g.addColorStop(0, MAGENTA); g.addColorStop(1, "rgba(255,61,139,0.15)");
  ctx.fillStyle = g; ctx.fillRect(149, 34, 5, 132);

  ctx.lineCap = "butt"; ctx.lineJoin = "miter"; ctx.lineWidth = 12;
  ctx.strokeStyle = CYAN;
  ctx.beginPath(); ctx.moveTo(95.24, 25.48); ctx.lineTo(58, 86); ctx.lineTo(95.24, 146.52); ctx.stroke();
  ctx.strokeStyle = YELLOW;
  ctx.beginPath(); ctx.moveTo(214.76, 53.48); ctx.lineTo(252, 114); ctx.lineTo(214.76, 174.52); ctx.stroke();

  // glyphs: an offset colour plate under a paper-coloured top layer, same
  // two-plate registration trick as burst lettering elsewhere in the Studio
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
  glyph(qGlyph, 83.816, 109.040, 0.064, MAGENTA, 4, 4, 0.85);
  glyph(qGlyph, 83.816, 109.040, 0.064, PAPER, 0, 0, 1);
  glyph(pGlyph!, 175.412, 138.480, 0.068, CYAN, 4, 4, 0.85);
  glyph(pGlyph!, 175.412, 138.480, 0.068, PAPER, 0, 0, 1);

  ctx.globalAlpha = 1;
  ctx.fillStyle = YELLOW;
  ctx.beginPath(); ctx.arc(136, 26, 3.6, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(168, 174, 3.6, 0, Math.PI * 2); ctx.fill();

  ctx.restore();
}
