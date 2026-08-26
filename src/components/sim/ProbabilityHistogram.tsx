import { useEffect, useRef } from "react";

interface Props {
  labels: string[];
  probs: number[] | Float64Array;
  /** phase per basis state, radians. Drives the magenta ring. Omit if phase isn't the point. */
  phases?: number[] | Float64Array;
  height?: number;
  /** true while a measurement has collapsed the state — the survivor gets the yellow rule */
  collapsedTo?: number | null;
}

/**
 * THE SIGNATURE COMPONENT.
 *
 * A comic halftone screen renders tone by varying dot size. So does this:
 * dot radius encodes probability. It is the same technique doing the same job,
 * which is why the whole site is built out of it.
 *
 * Bars are drawn too — dots alone aren't precise enough to read values off.
 * The dots carry the intuition, the bar carries the number.
 */
export default function ProbabilityHistogram({
  labels,
  probs,
  phases,
  height = 200,
  collapsedTo = null,
}: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    const css = getComputedStyle(document.documentElement);
    const ink = css.getPropertyValue("--ink").trim() || "#0b0e1a";
    const cyan = css.getPropertyValue("--cyan").trim() || "#22c4f0";
    const magenta = css.getPropertyValue("--magenta").trim() || "#ff3d8b";
    const yellow = css.getPropertyValue("--yellow").trim() || "#ffd23f";
    const dim = css.getPropertyValue("--paper-dim").trim() || "#9aa0b8";
    const gutter = css.getPropertyValue("--gutter").trim() || "#2b3358";

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = cv.clientWidth;
    const h = height;
    cv.width = w * dpr;
    cv.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const padL = 8, padR = 8, padB = 26, padT = 10;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;
    const n = labels.length;
    const slot = plotW / n;
    const barW = Math.min(slot * 0.62, 64);

    // baseline
    ctx.strokeStyle = gutter;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padL, padT + plotH);
    ctx.lineTo(padL + plotW, padT + plotH);
    ctx.stroke();

    for (let i = 0; i < n; i++) {
      const p = Math.max(0, Math.min(1, probs[i] ?? 0));
      const cx = padL + slot * (i + 0.5);
      const barH = p * plotH;
      const x0 = cx - barW / 2;
      const y0 = padT + plotH - barH;

      // ---- halftone fill: dot radius ∝ probability ----
      // pitch stays constant, radius grows. exactly how a tone screen works.
      const pitch = 7;
      const maxR = pitch * 0.46;
      const r = Math.sqrt(p) * maxR; // sqrt so *area* tracks probability
      if (r > 0.25 && barH > 1) {
        ctx.fillStyle = cyan;
        ctx.save();
        ctx.beginPath();
        ctx.rect(x0, y0, barW, barH);
        ctx.clip();
        for (let yy = padT; yy < padT + plotH + pitch; yy += pitch) {
          const off = ((yy / pitch) | 0) % 2 ? pitch / 2 : 0; // staggered rows
          for (let xx = x0 - pitch; xx < x0 + barW + pitch; xx += pitch) {
            ctx.beginPath();
            ctx.arc(xx + off, yy, r, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.restore();
      }

      // ---- bar outline: the readable number ----
      ctx.strokeStyle = p > 0.001 ? cyan : gutter;
      ctx.lineWidth = 2;
      ctx.strokeRect(x0, y0, barW, Math.max(barH, 1));

      // ---- collapse marker ----
      if (collapsedTo === i) {
        ctx.strokeStyle = yellow;
        ctx.lineWidth = 3;
        ctx.strokeRect(x0 - 3, y0 - 3, barW + 6, Math.max(barH, 1) + 6);
      }

      // ---- phase ring: magenta arc above the bar ----
      if (phases && p > 0.004) {
        const ph = phases[i] ?? 0;
        const ringR = 7;
        const ry = Math.max(y0 - 12, padT + 7);
        ctx.strokeStyle = magenta;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, ry, ringR, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx, ry);
        ctx.lineTo(cx + Math.cos(-ph) * ringR, ry + Math.sin(-ph) * ringR);
        ctx.stroke();
      }

      // ---- label ----
      ctx.fillStyle = collapsedTo === i ? yellow : dim;
      ctx.font = `${collapsedTo === i ? "700 " : ""}11px "Space Mono", monospace`;
      ctx.textAlign = "center";
      ctx.fillText(labels[i], cx, padT + plotH + 16);
    }
  }, [labels, probs, phases, height, collapsedTo]);

  const summary = labels
    .map((l, i) => `${l}: ${((probs[i] ?? 0) * 100).toFixed(1)}%`)
    .join(", ");

  return (
    <div style={{ width: "100%" }}>
      <canvas
        ref={ref}
        style={{ width: "100%", height, display: "block" }}
        role="img"
        aria-label={`Probability distribution. ${summary}`}
      />
      <p className="vh">{summary}</p>
    </div>
  );
}
