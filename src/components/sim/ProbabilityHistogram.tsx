import { useEffect, useRef } from "react";

interface Props {
  labels: string[];
  probs: number[] | Float64Array;
  /** phase per basis state, radians. Drives the magenta ring. */
  phases?: number[] | Float64Array;
  height?: number;
  /** index of the surviving outcome once a measurement has happened */
  collapsedTo?: number | null;
  /**
   * SHIMMER: the outcome is unresolved. Dots churn, edges breathe, rings spin.
   * Nothing is hidden — the odds stay fully legible — but nothing is *settled*.
   * That is the visual difference between "unknown" and "undecided", and the
   * whole point of the week 1 sim rests on it.
   */
  shimmer?: boolean;
  /** 0 = calm shimmer, 1 = violently destabilising (used when a peek fails) */
  turbulence?: number;
}

/**
 * THE SIGNATURE COMPONENT.
 *
 * A comic halftone screen renders tone by varying dot size. So does this:
 * dot area encodes probability. Bars are drawn too — dots alone aren't precise
 * enough to read values off. Dots carry intuition, the bar carries the number.
 */
export default function ProbabilityHistogram({
  labels,
  probs,
  phases,
  height = 200,
  collapsedTo = null,
  shimmer = false,
  turbulence = 0,
}: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const css = getComputedStyle(document.documentElement);
    const cyan = css.getPropertyValue("--cyan").trim() || "#22C4F0";
    const magenta = css.getPropertyValue("--magenta").trim() || "#FF3D8B";
    const yellow = css.getPropertyValue("--yellow").trim() || "#FFD23F";
    const dim = css.getPropertyValue("--paper-dim").trim() || "#9AA0B8";
    const gutter = css.getPropertyValue("--gutter").trim() || "#2B3358";

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = cv.clientWidth;
    const h = height;
    cv.width = w * dpr;
    cv.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const padL = 8, padR = 8, padB = 26, padT = 10;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;
    const n = labels.length;
    const slot = plotW / n;
    const barW = Math.min(slot * 0.62, 64);

    /** deterministic per-dot phase so the churn looks organic, not uniform */
    const hash = (a: number, b: number) => {
      const s = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
      return s - Math.floor(s);
    };

    const render = (time: number) => {
      ctx.clearRect(0, 0, w, h);

      const live = shimmer && !reduced;
      const turb = Math.max(0, Math.min(1, turbulence));
      const amp = live ? 1 + turb * 5 : 0;

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
        const settled = collapsedTo === i;

        const pitch = 7;
        const maxR = pitch * 0.46;
        const rBase = Math.sqrt(p) * maxR;

        if (rBase > 0.25 && barH > 1) {
          ctx.fillStyle = cyan;
          ctx.save();
          ctx.beginPath();
          ctx.rect(x0, y0, barW, barH);
          ctx.clip();
          for (let yy = padT; yy < padT + plotH + pitch; yy += pitch) {
            const rowOdd = ((yy / pitch) | 0) % 2 ? pitch / 2 : 0;
            for (let xx = x0 - pitch; xx < x0 + barW + pitch; xx += pitch) {
              let dx = 0, dy = 0, r = rBase;
              if (live) {
                // Each dot drifts on its own orbit and breathes. Radius modulates
                // AROUND the true value, so average dot area still encodes p honestly.
                const ph = hash(xx, yy) * Math.PI * 2;
                const sp = 1.1 + hash(yy, xx) * 1.6;
                dx = Math.cos(time * sp + ph) * 0.9 * amp;
                dy = Math.sin(time * sp * 0.8 + ph) * 0.9 * amp;
                r = rBase * (1 + Math.sin(time * 2.2 + ph) * 0.22 * (1 + turb * 2));
              }
              if (r <= 0.15) continue;
              ctx.beginPath();
              ctx.arc(xx + rowOdd + dx, yy + dy, r, 0, Math.PI * 2);
              ctx.fill();
            }
          }
          ctx.restore();
        }

        // Unresolved bars have a breathing, dashed top edge: they have a height,
        // but not a committed one. Collapse locks it to a hard solid line.
        const wob = live && p > 0.001 ? Math.sin(time * 1.9 + i * 2.1) * 1.1 * (1 + turb * 3) : 0;
        ctx.strokeStyle = p > 0.001 ? cyan : gutter;
        ctx.lineWidth = settled ? 3 : 2;
        if (live && p > 0.001) {
          ctx.setLineDash([5, 3]);
          ctx.lineDashOffset = -time * 14;
        }
        ctx.strokeRect(x0, y0 + wob, barW, Math.max(barH - wob, 1));
        ctx.setLineDash([]);
        ctx.lineDashOffset = 0;

        if (settled) {
          ctx.strokeStyle = yellow;
          ctx.lineWidth = 3;
          ctx.strokeRect(x0 - 3, y0 - 3, barW + 6, Math.max(barH, 1) + 6);
        }

        if (phases && p > 0.004) {
          const spin = live ? time * 0.9 : 0;
          const ph = (phases[i] ?? 0) + spin;
          const ringR = 7;
          const ry = Math.max(y0 - 12 + wob, padT + 7);
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

        ctx.fillStyle = settled ? yellow : dim;
        ctx.font = `${settled ? "700 " : ""}11px "Space Mono", monospace`;
        ctx.textAlign = "center";
        ctx.fillText(labels[i], cx, padT + plotH + 16);
      }
    };

    if (shimmer && !reduced) {
      let raf = 0;
      const t0 = performance.now();
      const loop = (now: number) => {
        render((now - t0) / 1000);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
      return () => cancelAnimationFrame(raf);
    }

    render(0);
  }, [labels, probs, phases, height, collapsedTo, shimmer, turbulence]);

  const summary =
    collapsedTo != null
      ? `Measured: ${labels[collapsedTo]}.`
      : `Unresolved. Odds — ${labels
          .map((l, i) => `${l}: ${((probs[i] ?? 0) * 100).toFixed(1)}%`)
          .join(", ")}`;

  return (
    <div style={{ width: "100%" }}>
      <canvas
        ref={ref}
        style={{ width: "100%", height, display: "block" }}
        role="img"
        aria-label={summary}
      />
      <p className="vh" aria-live="polite">{summary}</p>
    </div>
  );
}
