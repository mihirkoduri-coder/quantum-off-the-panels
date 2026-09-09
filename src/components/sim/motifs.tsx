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
// WEEK 2 — eyes rendered in the same halftone-dot technique as the
// glowing hand above: dot area stands in for brightness, not a filled
// silhouette, so the two motifs read as the same print language rather
// than one being a photo-traced dot field and the other a plain vector
// icon sitting next to it. Eyes that open only when a question is
// asked, with the pupil aligned to the axis of that question. Closed
// means nothing was learned, which is the entire point of the week.
// ─────────────────────────────────────────────────────────────

const EYE_L = "M58,42 Q84,19 110,42 Q84,65 58,42 Z";
const EYE_R = "M130,42 Q156,19 182,42 Q156,65 130,42 Z";
const LID_L = "M58,42 Q84,38 110,42 Q84,46 58,42 Z";
const LID_R = "M130,42 Q156,38 182,42 Q156,46 130,42 Z";

/** Halftone dot-fill for a symmetric lens shape — same idea as the
 *  hand's traced ink (dot area = brightness), generated rather than
 *  traced since there's no photograph to trace a cartoon eye from the
 *  way there was for a hand. Radius falls off from the shape's OWN
 *  center, so it reads as a shaded lens rather than a circular spotlight
 *  cropped by a lens-shaped window. */
function lensDots(cx: number, cy: number, halfW: number, halfH: number, pitch: number) {
  const dots: { x: number; y: number; r: number }[] = [];
  const rowPitch = pitch * 0.87; // staggered rows, same hex-ish grid the histogram/burst dots use
  const rows = Math.ceil(halfH / rowPitch) + 1;
  const cols = Math.ceil(halfW / pitch) + 1;
  for (let row = -rows; row <= rows; row++) {
    const y = row * rowPitch;
    const rowOffset = row % 2 !== 0 ? pitch / 2 : 0;
    for (let col = -cols; col <= cols; col++) {
      const x = col * pitch + rowOffset;
      const fx = x / halfW;
      const fy = y / halfH;
      const d2 = fx * fx + fy * fy;
      if (d2 > 1) continue;
      const r = pitch * 0.44 * Math.sqrt(1 - d2);
      if (r < 0.35) continue;
      dots.push({ x: cx + x, y: cy + y, r: Math.round(r * 100) / 100 });
    }
  }
  return dots;
}

// same geometry the old solid EYE_L/EYE_R paths described — center, half-
// width, half-height — just filled with dots instead of a flat shape.
const EYE_DOTS = [
  ...lensDots(84, 42, 26, 23, 4.4),
  ...lensDots(156, 42, 26, 23, 4.4),
];

export function WatchingEyes({
  open,
  axisDeg = 0,
  denied = false,
}: {
  open: boolean;
  /** rotation of the pupil, degrees from vertical — matches the question's axis */
  axisDeg?: number;
  /** the reader tried to watch without asking: a refusal twitch */
  denied?: boolean;
}) {
  return (
    <div className={`we${open ? " is-open" : ""}${denied ? " is-denied" : ""}`} aria-hidden="true">
      <svg viewBox="0 0 240 84" width="100%" style={{ maxWidth: 300 }}>
        <defs>
          <radialGradient id="we-shroud">
            <stop offset="0%" stopColor="var(--ink-3)" stopOpacity="0.95" />
            <stop offset="100%" stopColor="var(--ink-3)" stopOpacity="0" />
          </radialGradient>
          <filter id="we-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="2.4" />
          </filter>
          <clipPath id="we-clipL"><path d={EYE_L} /></clipPath>
          <clipPath id="we-clipR"><path d={EYE_R} /></clipPath>
          {/* both eyes' halftone screen, defined once and reused twice below
              (blurred for the glow, sharp for the ink) — same technique
              GlowHand uses for exactly the same reason: a filled silhouette
              blurs into a slab, but blurring the dots themselves keeps the
              glow reading as light coming off a textured surface. */}
          <g id="we-ink" fill="var(--cyan)">
            {EYE_DOTS.map((d, i) => <circle key={i} cx={d.x} cy={d.y} r={d.r} />)}
          </g>
        </defs>

        <ellipse cx="120" cy="42" rx="112" ry="36" fill="url(#we-shroud)" />

        {/* closed lids */}
        <g className="we__lids">
          <path d={LID_L} fill="var(--ink)" stroke="var(--gutter)" strokeWidth="2" />
          <path d={LID_R} fill="var(--ink)" stroke="var(--gutter)" strokeWidth="2" />
        </g>

        {/* open eyes */}
        <g className="we__eyes">
          <g clipPath="url(#we-clipL)"><use href="#we-ink" filter="url(#we-glow)" className="we__glow" /></g>
          <g clipPath="url(#we-clipR)"><use href="#we-ink" filter="url(#we-glow)" className="we__glow" /></g>
          <g clipPath="url(#we-clipL)"><use href="#we-ink" className="we__ink" /></g>
          <g clipPath="url(#we-clipR)"><use href="#we-ink" className="we__ink" /></g>
          <g clipPath="url(#we-clipL)">
            <rect x="80" y="16" width="8" height="52" rx="4" fill="var(--paper)"
              transform={`rotate(${axisDeg} 84 42)`} className="we__slit" />
          </g>
          <g clipPath="url(#we-clipR)">
            <rect x="152" y="16" width="8" height="52" rx="4" fill="var(--paper)"
              transform={`rotate(${axisDeg} 156 42)`} className="we__slit" />
          </g>
        </g>
      </svg>

      <style>{`
        .we { line-height: 0; display: grid; justify-items: center; pointer-events: none; }
        .we__eyes { opacity: 0; transform-origin: 120px 42px; transform: scaleY(0.12); transition: opacity 120ms ease, transform 160ms cubic-bezier(0.2,1.5,0.4,1); }
        .we__lids { opacity: 1; transition: opacity 120ms ease; }
        .we.is-open .we__eyes { opacity: 1; transform: scaleY(1); }
        .we.is-open .we__lids { opacity: 0; }
        .we__slit { transition: transform 260ms cubic-bezier(0.2,0.9,0.3,1); }
        .we__glow { opacity: 0.55; }
        .we__ink { opacity: 0.92; }
        .we.is-denied .we__lids { animation: we-refuse 260ms ease-in-out 2; }
        @keyframes we-refuse {
          0%,100% { transform: translateX(0); }
          25% { transform: translateX(-3px); }
          75% { transform: translateX(3px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .we__eyes, .we__slit { transition: none; }
          .we.is-denied .we__lids { animation: none; }
        }
      `}</style>
    </div>
  );
}
