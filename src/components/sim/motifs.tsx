/**
 * Character motifs.
 *
 * Original geometry — no traced art, no costume elements, no insignia. These
 * are generic visual vocabulary (a glowing hand, glowing eyes, motion streaks)
 * that read as an allusion because of the surrounding argument, not because
 * they copy a design. They also do a job: each one reports the state of its
 * simulation, so they're mechanism rather than decoration.
 *
 * Rendered in halftone where it fits, so they belong to the same print
 * language as the probability bars.
 */

import { W_VB, W_EYE_Y, W_OUTLINE, W_LID, W_LIGHT, nearestAngle, type Dot } from "./watcher-dots";

// ─────────────────────────────────────────────────────────────
// WEEK 1 — a glowing hand, dotted like everything else on the site.
// alive: the qubit is still in superposition. dim: it has collapsed.
// ─────────────────────────────────────────────────────────────

export function GlowHand({ alive = true, size = 200 }: { alive?: boolean; size?: number }) {
  return (
    <div className={`gh${alive ? " is-alive" : ""}`} aria-hidden="true">
      <svg viewBox="0 0 401 284" width={size} height={size * (284 / 401)}>
        <defs>
          <filter id="gh-blur" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="9" />
          </filter>
          {/* the halftone screen itself, traced from a photograph rather than
              drawn: dot area tracks brightness, so the creases between the
              fingers are simply where the dots stop */}
          <g id="gh-ink" fill="var(--cyan)"><circle cx="60" cy="145" r="5.7"/><circle cx="54" cy="152" r="5.2"/><circle cx="47" cy="158" r="4.7"/><circle cx="41" cy="165" r="5.2"/><circle cx="34" cy="171" r="5.7"/><circle cx="28" cy="178" r="5.7"/><circle cx="86" cy="132" r="5.7"/><circle cx="80" cy="139" r="5.2"/><circle cx="73" cy="145" r="4.7"/><circle cx="67" cy="152" r="4.7"/><circle cx="60" cy="158" r="4.7"/><circle cx="54" cy="165" r="4.7"/><circle cx="47" cy="171" r="4.0"/><circle cx="41" cy="178" r="4.0"/><circle cx="34" cy="184" r="4.0"/><circle cx="28" cy="191" r="4.7"/><circle cx="21" cy="197" r="5.2"/><circle cx="15" cy="204" r="5.7"/><circle cx="125" cy="106" r="5.7"/><circle cx="119" cy="113" r="5.7"/><circle cx="112" cy="119" r="5.2"/><circle cx="106" cy="126" r="5.2"/><circle cx="99" cy="132" r="4.7"/><circle cx="93" cy="139" r="4.7"/><circle cx="86" cy="145" r="4.7"/><circle cx="80" cy="152" r="4.7"/><circle cx="73" cy="158" r="5.2"/><circle cx="67" cy="165" r="5.2"/><circle cx="60" cy="171" r="5.2"/><circle cx="54" cy="178" r="4.0"/><circle cx="47" cy="184" r="3.3"/><circle cx="41" cy="191" r="3.3"/><circle cx="34" cy="197" r="3.3"/><circle cx="28" cy="204" r="3.3"/><circle cx="21" cy="210" r="3.3"/><circle cx="15" cy="217" r="5.2"/><circle cx="151" cy="93" r="5.2"/><circle cx="145" cy="100" r="4.7"/><circle cx="138" cy="106" r="4.7"/><circle cx="132" cy="113" r="4.7"/><circle cx="125" cy="119" r="4.7"/><circle cx="119" cy="126" r="4.7"/><circle cx="112" cy="132" r="5.2"/><circle cx="106" cy="139" r="5.2"/><circle cx="99" cy="145" r="5.2"/><circle cx="93" cy="152" r="5.7"/><circle cx="86" cy="158" r="5.7"/><circle cx="80" cy="165" r="5.2"/><circle cx="73" cy="171" r="5.2"/><circle cx="67" cy="178" r="5.2"/><circle cx="60" cy="184" r="5.2"/><circle cx="54" cy="191" r="4.7"/><circle cx="47" cy="197" r="3.3"/><circle cx="28" cy="217" r="2.3"/><circle cx="21" cy="223" r="2.3"/><circle cx="15" cy="230" r="4.0"/><circle cx="8" cy="236" r="5.2"/><circle cx="177" cy="80" r="5.7"/><circle cx="171" cy="87" r="5.2"/><circle cx="164" cy="93" r="4.7"/><circle cx="158" cy="100" r="4.7"/><circle cx="151" cy="106" r="4.7"/><circle cx="145" cy="113" r="5.2"/><circle cx="138" cy="119" r="5.2"/><circle cx="132" cy="126" r="5.2"/><circle cx="125" cy="132" r="5.7"/><circle cx="119" cy="139" r="5.7"/><circle cx="112" cy="145" r="5.2"/><circle cx="106" cy="152" r="5.7"/><circle cx="99" cy="158" r="5.2"/><circle cx="93" cy="165" r="5.2"/><circle cx="86" cy="171" r="4.7"/><circle cx="80" cy="178" r="3.3"/><circle cx="73" cy="184" r="4.0"/><circle cx="67" cy="191" r="4.7"/><circle cx="60" cy="197" r="5.2"/><circle cx="54" cy="204" r="4.7"/><circle cx="47" cy="210" r="4.0"/><circle cx="210" cy="61" r="5.7"/><circle cx="203" cy="67" r="5.2"/><circle cx="197" cy="74" r="4.7"/><circle cx="190" cy="80" r="4.7"/><circle cx="184" cy="87" r="4.0"/><circle cx="177" cy="93" r="4.7"/><circle cx="171" cy="100" r="4.7"/><circle cx="164" cy="106" r="4.7"/><circle cx="158" cy="113" r="5.2"/><circle cx="151" cy="119" r="5.2"/><circle cx="145" cy="126" r="5.2"/><circle cx="138" cy="132" r="5.2"/><circle cx="132" cy="139" r="5.7"/><circle cx="125" cy="145" r="5.2"/><circle cx="119" cy="152" r="5.2"/><circle cx="112" cy="158" r="4.0"/><circle cx="106" cy="165" r="3.3"/><circle cx="99" cy="171" r="2.3"/><circle cx="73" cy="197" r="2.3"/><circle cx="67" cy="204" r="4.7"/><circle cx="60" cy="210" r="4.7"/><circle cx="54" cy="217" r="5.2"/><circle cx="47" cy="223" r="4.0"/><circle cx="21" cy="249" r="3.3"/><circle cx="229" cy="54" r="5.7"/><circle cx="223" cy="61" r="5.2"/><circle cx="216" cy="67" r="4.7"/><circle cx="210" cy="74" r="4.7"/><circle cx="203" cy="80" r="4.7"/><circle cx="197" cy="87" r="4.7"/><circle cx="190" cy="93" r="5.2"/><circle cx="184" cy="100" r="5.2"/><circle cx="177" cy="106" r="4.7"/><circle cx="171" cy="113" r="5.2"/><circle cx="164" cy="119" r="5.2"/><circle cx="158" cy="126" r="5.2"/><circle cx="151" cy="132" r="5.2"/><circle cx="145" cy="139" r="5.2"/><circle cx="138" cy="145" r="4.7"/><circle cx="132" cy="152" r="4.0"/><circle cx="125" cy="158" r="2.3"/><circle cx="67" cy="217" r="2.3"/><circle cx="60" cy="223" r="5.2"/><circle cx="54" cy="230" r="4.7"/><circle cx="47" cy="236" r="3.3"/><circle cx="41" cy="243" r="5.2"/><circle cx="255" cy="41" r="5.7"/><circle cx="249" cy="48" r="5.2"/><circle cx="242" cy="54" r="4.7"/><circle cx="236" cy="61" r="4.7"/><circle cx="229" cy="67" r="5.2"/><circle cx="223" cy="74" r="5.2"/><circle cx="216" cy="80" r="5.2"/><circle cx="210" cy="87" r="5.2"/><circle cx="203" cy="93" r="5.2"/><circle cx="197" cy="100" r="5.2"/><circle cx="190" cy="106" r="5.2"/><circle cx="184" cy="113" r="5.2"/><circle cx="177" cy="119" r="5.2"/><circle cx="171" cy="126" r="4.7"/><circle cx="164" cy="132" r="4.7"/><circle cx="158" cy="139" r="4.7"/><circle cx="151" cy="145" r="4.0"/><circle cx="145" cy="152" r="4.0"/><circle cx="67" cy="230" r="3.3"/><circle cx="60" cy="236" r="4.7"/><circle cx="54" cy="243" r="4.7"/><circle cx="47" cy="249" r="3.3"/><circle cx="41" cy="256" r="5.7"/><circle cx="275" cy="35" r="5.7"/><circle cx="268" cy="41" r="5.2"/><circle cx="262" cy="48" r="5.2"/><circle cx="255" cy="54" r="5.2"/><circle cx="249" cy="61" r="5.2"/><circle cx="242" cy="67" r="5.2"/><circle cx="236" cy="74" r="5.2"/><circle cx="229" cy="80" r="5.2"/><circle cx="223" cy="87" r="5.2"/><circle cx="216" cy="93" r="5.2"/><circle cx="210" cy="100" r="5.2"/><circle cx="203" cy="106" r="5.2"/><circle cx="197" cy="113" r="5.7"/><circle cx="190" cy="119" r="5.2"/><circle cx="184" cy="126" r="4.7"/><circle cx="177" cy="132" r="4.0"/><circle cx="171" cy="139" r="3.3"/><circle cx="164" cy="145" r="2.3"/><circle cx="158" cy="152" r="3.3"/><circle cx="99" cy="210" r="5.2"/><circle cx="93" cy="217" r="4.0"/><circle cx="86" cy="223" r="2.3"/><circle cx="67" cy="243" r="3.3"/><circle cx="60" cy="249" r="4.0"/><circle cx="54" cy="256" r="3.3"/><circle cx="47" cy="262" r="4.0"/><circle cx="294" cy="28" r="5.7"/><circle cx="288" cy="35" r="5.2"/><circle cx="281" cy="41" r="5.2"/><circle cx="275" cy="48" r="5.7"/><circle cx="268" cy="54" r="5.7"/><circle cx="262" cy="61" r="5.7"/><circle cx="255" cy="67" r="5.7"/><circle cx="249" cy="74" r="5.2"/><circle cx="242" cy="80" r="5.2"/><circle cx="236" cy="87" r="5.7"/><circle cx="229" cy="93" r="5.2"/><circle cx="223" cy="100" r="5.2"/><circle cx="216" cy="106" r="5.2"/><circle cx="210" cy="113" r="5.2"/><circle cx="203" cy="119" r="5.2"/><circle cx="197" cy="126" r="5.2"/><circle cx="190" cy="132" r="4.7"/><circle cx="184" cy="139" r="3.3"/><circle cx="177" cy="145" r="3.3"/><circle cx="164" cy="158" r="2.3"/><circle cx="145" cy="178" r="3.3"/><circle cx="86" cy="236" r="5.2"/><circle cx="80" cy="243" r="2.3"/><circle cx="60" cy="262" r="4.0"/><circle cx="54" cy="269" r="5.2"/><circle cx="314" cy="22" r="5.7"/><circle cx="307" cy="28" r="5.2"/><circle cx="301" cy="35" r="5.2"/><circle cx="294" cy="41" r="5.7"/><circle cx="288" cy="48" r="5.7"/><circle cx="281" cy="54" r="5.7"/><circle cx="275" cy="61" r="5.7"/><circle cx="268" cy="67" r="5.7"/><circle cx="229" cy="106" r="5.7"/><circle cx="223" cy="113" r="5.2"/><circle cx="216" cy="119" r="5.2"/><circle cx="210" cy="126" r="5.2"/><circle cx="203" cy="132" r="5.2"/><circle cx="197" cy="139" r="4.7"/><circle cx="190" cy="145" r="4.0"/><circle cx="184" cy="152" r="3.3"/><circle cx="177" cy="158" r="2.3"/><circle cx="138" cy="197" r="4.7"/><circle cx="333" cy="15" r="5.7"/><circle cx="327" cy="22" r="5.2"/><circle cx="320" cy="28" r="5.7"/><circle cx="314" cy="35" r="5.7"/><circle cx="307" cy="41" r="5.7"/><circle cx="288" cy="61" r="5.7"/><circle cx="281" cy="67" r="5.7"/><circle cx="275" cy="74" r="5.7"/><circle cx="268" cy="80" r="5.7"/><circle cx="262" cy="87" r="5.7"/><circle cx="255" cy="93" r="5.7"/><circle cx="249" cy="100" r="5.7"/><circle cx="242" cy="106" r="5.7"/><circle cx="236" cy="113" r="5.7"/><circle cx="229" cy="119" r="5.2"/><circle cx="223" cy="126" r="5.2"/><circle cx="216" cy="132" r="5.2"/><circle cx="210" cy="139" r="5.2"/><circle cx="203" cy="145" r="5.2"/><circle cx="197" cy="152" r="4.7"/><circle cx="190" cy="158" r="3.3"/><circle cx="184" cy="165" r="2.3"/><circle cx="138" cy="210" r="5.2"/><circle cx="353" cy="9" r="5.2"/><circle cx="346" cy="15" r="5.2"/><circle cx="340" cy="22" r="5.2"/><circle cx="333" cy="28" r="5.7"/><circle cx="327" cy="35" r="5.7"/><circle cx="320" cy="41" r="5.7"/><circle cx="307" cy="54" r="5.7"/><circle cx="301" cy="61" r="5.7"/><circle cx="294" cy="67" r="5.7"/><circle cx="288" cy="74" r="5.7"/><circle cx="281" cy="80" r="5.7"/><circle cx="275" cy="87" r="5.7"/><circle cx="268" cy="93" r="5.2"/><circle cx="262" cy="100" r="5.2"/><circle cx="255" cy="106" r="5.2"/><circle cx="249" cy="113" r="5.7"/><circle cx="242" cy="119" r="5.7"/><circle cx="236" cy="126" r="5.2"/><circle cx="229" cy="132" r="5.7"/><circle cx="223" cy="139" r="5.2"/><circle cx="216" cy="145" r="5.2"/><circle cx="210" cy="152" r="5.2"/><circle cx="203" cy="158" r="5.2"/><circle cx="197" cy="165" r="4.0"/><circle cx="190" cy="171" r="2.3"/><circle cx="184" cy="178" r="2.3"/><circle cx="177" cy="184" r="4.0"/><circle cx="171" cy="191" r="3.3"/><circle cx="366" cy="9" r="5.7"/><circle cx="359" cy="15" r="3.3"/><circle cx="353" cy="22" r="4.7"/><circle cx="346" cy="28" r="5.7"/><circle cx="340" cy="35" r="5.7"/><circle cx="327" cy="48" r="5.7"/><circle cx="320" cy="54" r="5.7"/><circle cx="314" cy="61" r="5.7"/><circle cx="307" cy="67" r="5.7"/><circle cx="301" cy="74" r="5.7"/><circle cx="294" cy="80" r="5.2"/><circle cx="288" cy="87" r="5.2"/><circle cx="281" cy="93" r="5.2"/><circle cx="275" cy="100" r="5.2"/><circle cx="268" cy="106" r="5.7"/><circle cx="262" cy="113" r="5.2"/><circle cx="255" cy="119" r="5.7"/><circle cx="249" cy="126" r="5.7"/><circle cx="242" cy="132" r="5.7"/><circle cx="236" cy="139" r="5.2"/><circle cx="229" cy="145" r="5.2"/><circle cx="223" cy="152" r="5.2"/><circle cx="216" cy="158" r="5.2"/><circle cx="210" cy="165" r="4.7"/><circle cx="203" cy="171" r="3.3"/><circle cx="197" cy="178" r="2.3"/><circle cx="190" cy="184" r="2.3"/><circle cx="184" cy="191" r="3.3"/><circle cx="177" cy="197" r="3.3"/><circle cx="171" cy="204" r="3.3"/><circle cx="164" cy="210" r="2.3"/><circle cx="373" cy="15" r="5.7"/><circle cx="366" cy="22" r="4.0"/><circle cx="353" cy="35" r="4.7"/><circle cx="346" cy="41" r="5.7"/><circle cx="340" cy="48" r="5.7"/><circle cx="333" cy="54" r="5.7"/><circle cx="327" cy="61" r="5.2"/><circle cx="320" cy="67" r="5.2"/><circle cx="314" cy="74" r="5.2"/><circle cx="307" cy="80" r="4.7"/><circle cx="301" cy="87" r="4.0"/><circle cx="294" cy="93" r="2.3"/><circle cx="281" cy="106" r="4.0"/><circle cx="275" cy="113" r="4.7"/><circle cx="268" cy="119" r="5.2"/><circle cx="262" cy="126" r="5.7"/><circle cx="255" cy="132" r="5.7"/><circle cx="249" cy="139" r="5.7"/><circle cx="242" cy="145" r="5.2"/><circle cx="236" cy="152" r="5.2"/><circle cx="229" cy="158" r="5.2"/><circle cx="223" cy="165" r="5.2"/><circle cx="216" cy="171" r="4.7"/><circle cx="210" cy="178" r="2.3"/><circle cx="203" cy="184" r="2.3"/><circle cx="197" cy="191" r="2.3"/><circle cx="190" cy="197" r="3.3"/><circle cx="184" cy="204" r="3.3"/><circle cx="177" cy="210" r="3.3"/><circle cx="171" cy="217" r="4.0"/><circle cx="164" cy="223" r="4.0"/><circle cx="158" cy="230" r="2.3"/><circle cx="145" cy="243" r="4.0"/><circle cx="373" cy="28" r="4.0"/><circle cx="366" cy="35" r="2.3"/><circle cx="359" cy="41" r="2.3"/><circle cx="353" cy="48" r="5.2"/><circle cx="346" cy="54" r="5.2"/><circle cx="340" cy="61" r="5.2"/><circle cx="333" cy="67" r="5.2"/><circle cx="327" cy="74" r="5.2"/><circle cx="320" cy="80" r="4.7"/><circle cx="314" cy="87" r="4.0"/><circle cx="307" cy="93" r="3.3"/><circle cx="301" cy="100" r="2.3"/><circle cx="294" cy="106" r="2.3"/><circle cx="288" cy="113" r="4.0"/><circle cx="281" cy="119" r="5.2"/><circle cx="275" cy="126" r="4.7"/><circle cx="268" cy="132" r="3.3"/><circle cx="262" cy="139" r="4.7"/><circle cx="255" cy="145" r="5.2"/><circle cx="249" cy="152" r="5.2"/><circle cx="242" cy="158" r="4.7"/><circle cx="236" cy="165" r="4.0"/><circle cx="229" cy="171" r="4.0"/><circle cx="223" cy="178" r="3.3"/><circle cx="216" cy="184" r="2.3"/><circle cx="210" cy="191" r="2.3"/><circle cx="203" cy="197" r="2.3"/><circle cx="197" cy="204" r="3.3"/><circle cx="190" cy="210" r="4.0"/><circle cx="184" cy="217" r="2.3"/><circle cx="177" cy="223" r="3.3"/><circle cx="171" cy="230" r="3.3"/><circle cx="164" cy="236" r="3.3"/><circle cx="158" cy="243" r="3.3"/><circle cx="151" cy="249" r="2.3"/><circle cx="145" cy="256" r="5.2"/><circle cx="379" cy="35" r="5.2"/><circle cx="373" cy="41" r="2.3"/><circle cx="359" cy="54" r="4.0"/><circle cx="353" cy="61" r="5.2"/><circle cx="346" cy="67" r="5.2"/><circle cx="340" cy="74" r="5.2"/><circle cx="333" cy="80" r="5.2"/><circle cx="327" cy="87" r="4.7"/><circle cx="320" cy="93" r="4.0"/><circle cx="314" cy="100" r="2.3"/><circle cx="301" cy="113" r="4.7"/><circle cx="249" cy="165" r="5.7"/><circle cx="242" cy="171" r="5.7"/><circle cx="229" cy="184" r="5.2"/><circle cx="223" cy="191" r="5.2"/><circle cx="216" cy="197" r="5.2"/><circle cx="210" cy="204" r="4.7"/><circle cx="203" cy="210" r="3.3"/><circle cx="197" cy="217" r="4.0"/><circle cx="190" cy="223" r="3.3"/><circle cx="184" cy="230" r="2.3"/><circle cx="177" cy="236" r="2.3"/><circle cx="171" cy="243" r="3.3"/><circle cx="164" cy="249" r="4.7"/><circle cx="158" cy="256" r="4.0"/><circle cx="151" cy="262" r="4.0"/><circle cx="386" cy="41" r="5.7"/><circle cx="379" cy="48" r="4.0"/><circle cx="359" cy="67" r="5.2"/><circle cx="353" cy="74" r="5.7"/><circle cx="346" cy="80" r="5.2"/><circle cx="340" cy="87" r="4.7"/><circle cx="333" cy="93" r="2.3"/><circle cx="320" cy="106" r="2.3"/><circle cx="203" cy="223" r="4.7"/><circle cx="197" cy="230" r="3.3"/><circle cx="190" cy="236" r="2.3"/><circle cx="184" cy="243" r="2.3"/><circle cx="177" cy="249" r="4.7"/><circle cx="171" cy="256" r="5.2"/><circle cx="164" cy="262" r="5.2"/><circle cx="158" cy="269" r="4.0"/><circle cx="386" cy="54" r="4.7"/><circle cx="379" cy="61" r="2.3"/><circle cx="366" cy="74" r="4.7"/><circle cx="359" cy="80" r="4.7"/><circle cx="353" cy="87" r="4.0"/><circle cx="333" cy="106" r="4.0"/><circle cx="197" cy="243" r="5.2"/><circle cx="190" cy="249" r="4.7"/><circle cx="184" cy="256" r="4.7"/><circle cx="177" cy="262" r="5.2"/><circle cx="171" cy="269" r="4.7"/><circle cx="164" cy="275" r="3.3"/><circle cx="392" cy="61" r="5.7"/><circle cx="386" cy="67" r="3.3"/><circle cx="373" cy="80" r="2.3"/><circle cx="366" cy="87" r="3.3"/><circle cx="184" cy="269" r="5.7"/><circle cx="177" cy="275" r="5.2"/><circle cx="392" cy="74" r="5.2"/><circle cx="366" cy="100" r="3.3"/><circle cx="392" cy="87" r="4.7"/><circle cx="379" cy="100" r="4.7"/></g>
        </defs>
        {/* glow is the same dots blurred — a filled silhouette would light up
            the gaps between the fingers and flatten the hand into a slab */}
        <use href="#gh-ink" filter="url(#gh-blur)" className="gh__glow" />
        <use href="#gh-ink" className="gh__ink" />
      </svg>

      <style>{`
        .gh { pointer-events: none; line-height: 0; }
        .gh__glow { opacity: 0.14; transition: opacity 450ms ease; }
        .gh__ink  { opacity: 0.28; transition: opacity 450ms ease; }
        .gh.is-alive .gh__glow { opacity: 0.5; animation: gh-breathe 3.6s ease-in-out infinite; }
        .gh.is-alive .gh__ink  { opacity: 1; }
        @keyframes gh-breathe { 0%,100% { opacity: 0.34; } 50% { opacity: 0.62; } }
        @media (prefers-reduced-motion: reduce) {
          .gh.is-alive .gh__glow { animation: none; }
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// WEEK 2 — Uatu's hood, in the same halftone-dot technique as the
// glowing hand above: dot area stands in for brightness, not a filled
// silhouette, so the two motifs read as the same print language rather
// than one being a photo-traced dot field and the other a plain vector
// icon sitting next to it. Traced from a silhouette, same rule as the
// hand: this is photographed data, not a formula, so it's ported
// verbatim from watcher-dots.ts rather than regenerated.
//
// The eye-light only fans out when a question is asked, angled to match
// that question's axis. Closed means nothing was learned, which is the
// entire point of the week. Only three axes are ever asked, so the light
// is pre-screened for each rather than rotated at runtime — rotating a
// dot screen would resample it into mush.
// ─────────────────────────────────────────────────────────────

const dots = (d: Dot[], fill: string, cls?: string, op?: number) => (
  <g fill={fill} className={cls} opacity={op}>
    {d.map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} />)}
  </g>
);

export function WatchingEyes({
  open,
  axisDeg = 0,
  denied = false,
  size = 260,
}: {
  open: boolean;
  /** the question's measurement axis, degrees from vertical — picks which
   *  of the three pre-screened light patterns lights up */
  axisDeg?: number;
  /** the reader tried to watch without asking: a refusal twitch */
  denied?: boolean;
  size?: number;
}) {
  const lit = W_LIGHT[nearestAngle(axisDeg)] ?? W_LIGHT[0];
  return (
    <div className={`we${open ? " is-open" : ""}${denied ? " is-denied" : ""}`} aria-hidden="true">
      <svg viewBox={W_VB} width="100%" style={{ maxWidth: size }}>
        {dots(W_OUTLINE, "var(--yellow)", "we__ink")}
        {dots(W_LID, "var(--yellow)", "we__lid")}
        <g className="we__light">
          {dots(lit.cy, "var(--cyan)")}
          {dots(lit.wh, "#EAFBFF")}
        </g>
      </svg>

      <style>{`
        .we { line-height: 0; display: grid; justify-items: center; pointer-events: none; }
        .we__ink { opacity: 0.55; transition: opacity 260ms ease; }
        .we.is-open .we__ink { opacity: 1; }
        .we__lid { transition: opacity 140ms ease; }
        .we.is-open .we__lid { opacity: 0; transition-duration: 90ms; }
        .we__light {
          opacity: 0;
          transform: scaleY(0.06);
          transform-box: view-box;
          transform-origin: 50% ${W_EYE_Y}px;
          transition: opacity 140ms ease, transform 300ms cubic-bezier(0.2, 1.5, 0.35, 1);
        }
        .we.is-open .we__light { opacity: 1; transform: scaleY(1); }
        .we.is-denied { animation: we-refuse 240ms ease-in-out 2; }
        @keyframes we-refuse {
          0%,100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .we__light { transition: opacity 140ms ease; transform: scaleY(1); }
          .we.is-denied { animation: none; }
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// WEEK 3 — the three-tier bolt at the heart of the accelerator, as a
// frame motif. Same polygon the sim's own track canvas draws (see
// coreBolt in flash-art.ts) so the panel corner and the ring agree —
// this is just that same shape as static SVG rather than re-derived.
// alive: the copies are mid-run. dim: idle, waiting for Run.
// ─────────────────────────────────────────────────────────────

export function FlashBolt({ size = 150, alive = true }: { size?: number; alive?: boolean }) {
  const P: [number, number][] = [[0.46, -1.34], [-0.06, -0.58], [0.3, -0.72], [-0.22, 0.04], [0.14, -0.1],
             [-0.46, 1.34], [0.06, 0.58], [-0.3, 0.72], [0.22, -0.04], [-0.14, 0.1]];
  const S = 70;
  const d = "M" + P.map(([x, y]) => `${(x * S).toFixed(1)},${(y * S).toFixed(1)}`).join(" L") + " Z";
  return (
    <div className={`fb${alive ? " is-alive" : ""}`} aria-hidden="true">
      <svg viewBox="-60 -115 120 230" width={size} height={size * (230 / 120)}>
        <defs>
          <linearGradient id="fb-g" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--yellow)" />
            <stop offset="100%" stopColor="#ff8a2b" />
          </linearGradient>
          <filter id="fb-blur" x="-80%" y="-40%" width="260%" height="180%">
            <feGaussianBlur stdDeviation="9" />
          </filter>
        </defs>
        <g transform="rotate(-12.6)">
          <path className="fb__glow" d={d} fill="var(--yellow)" filter="url(#fb-blur)" />
          <path d={d} fill="url(#fb-g)" stroke="#8c1109" strokeWidth="5" strokeLinejoin="miter" />
        </g>
      </svg>
      <style>{`
        .fb { pointer-events: none; line-height: 0; }
        .fb__glow { opacity: 0.12; transition: opacity 400ms ease; }
        .fb.is-alive .fb__glow { opacity: 0.4; animation: fb-charge 3.2s ease-in-out infinite; }
        @keyframes fb-charge { 0%,100% { opacity: 0.26; } 50% { opacity: 0.5; } }
        @media (prefers-reduced-motion: reduce) { .fb.is-alive .fb__glow { animation: none; } }
      `}</style>
    </div>
  );
}
