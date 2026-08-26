import { useEffect, useRef } from "react";

interface Props {
  vector: { x: number; y: number; z: number };
  size?: number;
  /** camera azimuth in radians — let a slider drive this if the sim needs rotation */
  azimuth?: number;
  label?: string;
}

/**
 * Bloch sphere via plain 2D canvas projection. No three.js: the dependency
 * costs ~150kb and buys nothing we need here, and this version scales down
 * to a phone without touch-orbit conflicts against page scroll.
 */
export default function BlochSphere({ vector, size = 240, azimuth = 0.6, label }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    const css = getComputedStyle(document.documentElement);
    const cyan = css.getPropertyValue("--cyan").trim() || "#22c4f0";
    const magenta = css.getPropertyValue("--magenta").trim() || "#ff3d8b";
    const yellow = css.getPropertyValue("--yellow").trim() || "#ffd23f";
    const gutter = css.getPropertyValue("--gutter").trim() || "#2b3358";
    const dim = css.getPropertyValue("--paper-dim").trim() || "#9aa0b8";

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = size * dpr;
    cv.height = size * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);

    const cx = size / 2;
    const cy = size / 2;
    const R = size * 0.38;
    const tilt = 0.42; // fixed elevation — keeps z readable as "up"

    // project a 3D unit-sphere point to screen
    const proj = (x: number, y: number, z: number) => {
      const xr = x * Math.cos(azimuth) - y * Math.sin(azimuth);
      const yr = x * Math.sin(azimuth) + y * Math.cos(azimuth);
      return {
        sx: cx + xr * R,
        sy: cy - z * R * Math.cos(tilt) + yr * R * Math.sin(tilt),
        depth: yr,
      };
    };

    // outline
    ctx.strokeStyle = gutter;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.stroke();

    // equator + meridian
    const ring = (fn: (t: number) => [number, number, number], dashed: boolean) => {
      ctx.setLineDash(dashed ? [3, 4] : []);
      ctx.strokeStyle = gutter;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i <= 64; i++) {
        const t = (i / 64) * Math.PI * 2;
        const [x, y, z] = fn(t);
        const p = proj(x, y, z);
        i ? ctx.lineTo(p.sx, p.sy) : ctx.moveTo(p.sx, p.sy);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    };
    ring((t) => [Math.cos(t), Math.sin(t), 0], true);
    ring((t) => [Math.cos(t), 0, Math.sin(t)], true);

    // poles
    const p0 = proj(0, 0, 1);
    const p1 = proj(0, 0, -1);
    ctx.fillStyle = dim;
    ctx.font = '11px "Space Mono", monospace';
    ctx.textAlign = "center";
    ctx.fillText("|0⟩", p0.sx, p0.sy - 8);
    ctx.fillText("|1⟩", p1.sx, p1.sy + 16);

    // the state vector
    const { x, y, z } = vector;
    const len = Math.sqrt(x * x + y * y + z * z);
    const tip = proj(x, y, z);
    const origin = proj(0, 0, 0);

    ctx.strokeStyle = len < 0.98 ? magenta : cyan; // shrinking = decohering
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(origin.sx, origin.sy);
    ctx.lineTo(tip.sx, tip.sy);
    ctx.stroke();

    ctx.fillStyle = len < 0.98 ? magenta : cyan;
    ctx.beginPath();
    ctx.arc(tip.sx, tip.sy, 6, 0, Math.PI * 2);
    ctx.fill();

    // shadow on the equatorial plane — helps read the 3D
    const sh = proj(x, y, 0);
    ctx.strokeStyle = yellow;
    ctx.globalAlpha = 0.45;
    ctx.setLineDash([2, 3]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(tip.sx, tip.sy);
    ctx.lineTo(sh.sx, sh.sy);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }, [vector, size, azimuth]);

  const { x, y, z } = vector;
  const len = Math.sqrt(x * x + y * y + z * z);

  return (
    <canvas
      ref={ref}
      style={{ width: size, height: size, maxWidth: "100%" }}
      role="img"
      aria-label={
        label ??
        `Bloch sphere. Vector at x ${x.toFixed(2)}, y ${y.toFixed(2)}, z ${z.toFixed(2)}. Length ${len.toFixed(2)}.`
      }
    />
  );
}
