import { useEffect, useRef } from "react";
import { drawHand, drawEyes, HAND_NATURAL, EYES_NATURAL } from "../lib/motif-canvas";
import type { StickerMotif } from "../data/concepts";

/**
 * A week's character motif, rendered on its own transparent canvas and
 * downloadable as a PNG — the same draw functions the Studio uses, so the
 * sticker someone saves is exactly what they've seen the sim itself show,
 * not a redrawn approximation.
 *
 * 512×512 is deliberate, not just "big enough": it's WhatsApp's and
 * Telegram's own static-sticker requirement, so the file drops straight
 * into either without cropping or resizing first.
 */
const EXPORT_SIZE = 512;
const PREVIEW_CSS_PX = 140;
const FIT_FRACTION = 0.82; // inset from the square's edge, so nothing touches the border

const NATURAL: Record<StickerMotif, { w: number; h: number }> = { hand: HAND_NATURAL, eyes: EYES_NATURAL };

/** contain-fit: the largest width (the unit drawHand/drawEyes' `size` takes)
 *  that keeps BOTH the motif's width and height inside an `avail`-square. */
function fitWidth(kind: StickerMotif, avail: number): number {
  const { w, h } = NATURAL[kind];
  return w * Math.min(avail / w, avail / h);
}

function drawSticker(ctx: CanvasRenderingContext2D, kind: StickerMotif, canvasSize: number) {
  ctx.clearRect(0, 0, canvasSize, canvasSize);
  ctx.save();
  ctx.translate(canvasSize / 2, canvasSize / 2);
  const size = fitWidth(kind, canvasSize * FIT_FRACTION);
  if (kind === "hand") drawHand(ctx, size, true);
  else drawEyes(ctx, size, true, 0);
  ctx.restore();
}

export default function Sticker({ kind, character }: { kind: StickerMotif; character: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const res = Math.round(PREVIEW_CSS_PX * dpr);
    cv.width = res;
    cv.height = res;
    const ctx = cv.getContext("2d");
    if (ctx) drawSticker(ctx, kind, res);
  }, [kind]);

  const download = () => {
    const out = document.createElement("canvas");
    out.width = EXPORT_SIZE;
    out.height = EXPORT_SIZE;
    const ctx = out.getContext("2d");
    if (!ctx) return;
    drawSticker(ctx, kind, EXPORT_SIZE);
    out.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `qp-sticker-${kind}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  };

  return (
    <div className="stk">
      <canvas ref={canvasRef} className="stk__canvas" role="img" aria-label={`${character}'s sticker`} />
      <button className="btn btn--sm stk__dl" onClick={download}>Download sticker</button>
      <style>{`
        .stk { display: grid; justify-items: center; gap: 0.5rem; }
        .stk__canvas {
          width: ${PREVIEW_CSS_PX}px; height: ${PREVIEW_CSS_PX}px;
          /* a faint checkerboard reads as "this is transparent," same idea
             any image editor uses — otherwise a cyan-on-nothing motif can
             look like a rendering bug rather than a deliberate PNG alpha */
          background-image:
            linear-gradient(45deg, var(--ink) 25%, transparent 25%, transparent 75%, var(--ink) 75%),
            linear-gradient(45deg, var(--ink) 25%, transparent 25%, transparent 75%, var(--ink) 75%);
          background-size: 14px 14px;
          background-position: 0 0, 7px 7px;
          background-color: var(--ink-2);
          border: var(--panel-line) solid var(--gutter);
          border-radius: var(--radius);
        }
        .stk__dl { font-size: 0.68rem; padding: 0.4rem 0.65rem; min-height: 34px; }
      `}</style>
    </div>
  );
}
