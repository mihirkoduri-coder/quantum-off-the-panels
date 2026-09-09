import { useCallback, useEffect, useRef, useState } from "react";
import {
  draw, uid, PALETTE, FONTS, SIZES,
  type Doc, type Layer, type Box, type ColorKey, type FontKey, type SizeKey,
} from "./studio-core";
import { PRESETS, blank } from "./presets";

/**
 * A layer editor, not a template filler. Presets seed a stack; everything is
 * then draggable and restylable. The preview canvas IS the export canvas at a
 * different scale, and dragging happens in canvas coordinates, so what you
 * place is exactly what downloads.
 */

const SNAP = 0.011;                        // ≈12px at 1080 wide — tight enough to be deliberate, loose enough to catch
const GUIDES = [0.09, 0.5, 0.91];          // margins and centre

const LS_KEY = "qp:studio:v1";

export default function PostStudio() {
  const [doc, setDoc] = useState<Doc>(() => PRESETS.announce.make());
  const [sel, setSel] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [snapped, setSnapped] = useState<{ x: boolean; y: boolean }>({ x: false, y: false });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boxes = useRef<Record<string, Box>>({});
  const images = useRef<Record<string, HTMLImageElement>>({});
  const dragging = useRef<null | { id: string; dx: number; dy: number }>(null);
  const [imgTick, setImgTick] = useState(0);

  // Canvas silently falls back to a default face if a webfont has not loaded,
  // and that failure is invisible until you open the downloaded file.
  useEffect(() => {
    const needed = [
      "400 96px Bungee", "900 96px Archivo",
      "italic 46px Newsreader", "400 40px Newsreader", '700 22px "Space Mono"',
    ];
    Promise.all(needed.map((f) => (document as any).fonts.load(f)))
      .then(() => (document as any).fonts.ready)
      .then(() => setReady(true))
      .catch(() => setReady(true));
  }, []);

  // decode any image layers, then redraw once they are actually usable
  useEffect(() => {
    doc.layers.forEach((l) => {
      if (l.type !== "image" || images.current[l.src]) return;
      const img = new Image();
      img.onload = () => setImgTick((t) => t + 1);
      img.src = l.src;
      images.current[l.src] = img;
    });
  }, [doc.layers]);

  const render = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv || !ready) return;
    const { w, h } = SIZES[doc.size];
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    boxes.current = draw(ctx, doc, images.current);
  }, [doc, ready, imgTick]);

  useEffect(render, [render]);

  const selected = doc.layers.find((l) => l.id === sel) ?? null;

  const update = (id: string, patch: Partial<Layer>) =>
    setDoc((d) => ({ ...d, layers: d.layers.map((l) => (l.id === id ? { ...l, ...patch } as Layer : l)) }));

  const setHalf = (patch: Partial<Doc["halftone"]>) =>
    setDoc((d) => ({ ...d, halftone: { ...d.halftone, ...patch } }));

  // ── pointer: hit-test topmost, then drag in canvas space ────────────────
  const toCanvas = (e: React.PointerEvent) => {
    const cv = canvasRef.current!;
    const r = cv.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * cv.width, y: ((e.clientY - r.top) / r.height) * cv.height };
  };

  const onDown = (e: React.PointerEvent) => {
    const p = toCanvas(e);
    const { w: W, h: H } = SIZES[doc.size];
    for (let i = doc.layers.length - 1; i >= 0; i--) {
      const l = doc.layers[i];
      if (l.locked) continue;
      const b = boxes.current[l.id];
      if (!b) continue;
      const pad = 8;
      if (p.x >= b.x - pad && p.x <= b.x + b.w + pad && p.y >= b.y - pad && p.y <= b.y + b.h + pad) {
        setSel(l.id);
        dragging.current = { id: l.id, dx: p.x / W - l.x, dy: p.y / H - l.y };
        (e.target as Element).setPointerCapture(e.pointerId);
        return;
      }
    }
    setSel(null);
  };

  const onMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const p = toCanvas(e);
    const { w: W, h: H } = SIZES[doc.size];
    let nx = p.x / W - dragging.current.dx;
    let ny = p.y / H - dragging.current.dy;
    let sx = false, sy = false;
    for (const g of GUIDES) {
      if (Math.abs(nx - g) < SNAP) { nx = g; sx = true; }
      if (Math.abs(ny - g) < SNAP) { ny = g; sy = true; }
    }
    setSnapped({ x: sx, y: sy });
    update(dragging.current.id, { x: +nx.toFixed(4), y: +ny.toFixed(4) } as Partial<Layer>);
  };

  const onUp = () => { dragging.current = null; setSnapped({ x: false, y: false }); };

  // nudge + delete
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (!sel) return;
      const t = e.target as HTMLElement;
      if (t && /INPUT|TEXTAREA|SELECT/.test(t.tagName)) return;
      const l = doc.layers.find((x) => x.id === sel);
      if (!l) return;
      const step = e.shiftKey ? 0.02 : 0.004;
      const moves: Record<string, [number, number]> = {
        ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step],
      };
      if (moves[e.key]) {
        e.preventDefault();
        update(sel, { x: +(l.x + moves[e.key][0]).toFixed(4), y: +(l.y + moves[e.key][1]).toFixed(4) } as Partial<Layer>);
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        setDoc((d) => ({ ...d, layers: d.layers.filter((x) => x.id !== sel) }));
        setSel(null);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [sel, doc.layers]);

  // ── layer ops ───────────────────────────────────────────────────────────
  const addLayer = (type: Layer["type"]) => {
    const common = { id: uid(), x: 0.5, y: 0.5, rotation: 0, opacity: 1 };
    const made: Record<string, Layer> = {
      text: { ...common, name: "Text", type: "text", text: "New text", font: "head", size: 84, color: "paper", align: "center", tracking: 0, caps: false, lineHeight: 1.1, maxWidth: 0.8 },
      logo: { ...common, name: "Logo", type: "logo", size: 92 },
      bracket: { ...common, name: "Bracket", type: "bracket", size: 140, color: "cyan", flip: false },
      rule: { ...common, name: "Rule", type: "rule", length: 0.2, thickness: 6, color: "magenta" },
      burst: { ...common, name: "Burst", type: "burst", text: "Krakk!", size: 88, color: "yellow" },
      panel: { ...common, name: "Panel", type: "panel", w: 0.6, h: 0.4, fill: "ink2", stroke: "gutter", thickness: 4, fold: false },
      image: { ...common, name: "Image", type: "image", src: "", scale: 0.5, rounded: 0 },
    } as any;
    const l = made[type];
    setDoc((d) => ({ ...d, layers: [...d.layers, l] }));
    setSel(l.id);
  };

  const move = (id: string, dir: -1 | 1) =>
    setDoc((d) => {
      const i = d.layers.findIndex((l) => l.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= d.layers.length) return d;
      const ls = [...d.layers];
      [ls[i], ls[j]] = [ls[j], ls[i]];
      return { ...d, layers: ls };
    });

  const duplicate = (id: string) =>
    setDoc((d) => {
      const l = d.layers.find((x) => x.id === id);
      if (!l) return d;
      const copy = { ...l, id: uid(), x: l.x + 0.03, y: l.y + 0.03, name: `${l.name} copy` } as Layer;
      return { ...d, layers: [...d.layers, copy] };
    });

  const onUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      const src = String(rd.result);
      const l: Layer = { id: uid(), name: f.name.slice(0, 18), type: "image", x: 0.5, y: 0.5, rotation: 0, opacity: 1, src, scale: 0.6, rounded: 0 };
      setDoc((d) => ({ ...d, layers: [...d.layers, l] }));
      setSel(l.id);
    };
    rd.readAsDataURL(f);
    e.target.value = "";
  };

  const exportPng = (scale = 2) => {
    const { w, h } = SIZES[doc.size];
    const off = document.createElement("canvas");
    off.width = w * scale; off.height = h * scale;
    const ctx = off.getContext("2d");
    if (!ctx) return;
    ctx.scale(scale, scale);
    draw(ctx, doc, images.current);        // same renderer, bigger canvas
    off.toBlob((b) => {
      if (!b) return;
      const url = URL.createObjectURL(b);
      const a = document.createElement("a");
      a.href = url; a.download = `qp-${doc.size}-${Date.now()}.png`; a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  };

  const save = () => { try { localStorage.setItem(LS_KEY, JSON.stringify(doc)); } catch {} };
  const load = () => { try { const s = localStorage.getItem(LS_KEY); if (s) { setDoc(JSON.parse(s)); setSel(null); } } catch {} };

  // ── UI bits ─────────────────────────────────────────────────────────────
  const Swatches = ({ value, onChange }: { value: string; onChange: (c: ColorKey) => void }) => (
    <div className="sw">
      {(Object.keys(PALETTE) as ColorKey[]).map((k) => (
        <button key={k} className={`sw__c${value === k ? " is-on" : ""}`}
          style={{ background: PALETTE[k] }} title={k} onClick={() => onChange(k)} />
      ))}
    </div>
  );

  const Num = ({ label, value, min, max, step = 1, onChange }: any) => (
    <label className="ps__f ps__f--row">
      <span>{label}</span>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(+e.target.value)} />
      <b>{typeof value === "number" ? (step < 1 ? value.toFixed(2) : Math.round(value)) : value}</b>
    </label>
  );

  return (
    <div className="ps">
      {/* ── left: document + layers ─────────────────────────────────── */}
      <div className="ps__col">
        <section className="ps__sec">
          <h3>Start from</h3>
          <div className="ps__wrapbtn">
            {Object.entries(PRESETS).map(([k, p]) => (
              <button key={k} className="btn btn--sm" onClick={() => { setDoc(p.make()); setSel(null); }}>{p.label}</button>
            ))}
            <button className="btn btn--sm" onClick={() => { setDoc(blank()); setSel(null); }}>Blank</button>
          </div>
        </section>

        <section className="ps__sec">
          <h3>Canvas</h3>
          <div className="ps__wrapbtn">
            {(Object.keys(SIZES) as SizeKey[]).map((k) => (
              <button key={k} className={`btn btn--sm${doc.size === k ? " is-on" : ""}`}
                onClick={() => setDoc((d) => ({ ...d, size: k }))}>{SIZES[k].label}</button>
            ))}
          </div>
          <label className="ps__f"><span>Background</span>
            <Swatches value={doc.bg} onChange={(c) => setDoc((d) => ({ ...d, bg: c }))} /></label>
        </section>

        <section className="ps__sec">
          <h3>
            Halftone
            <button className="btn btn--xs" onClick={() => setHalf({ on: !doc.halftone.on })}>
              {doc.halftone.on ? "on" : "off"}
            </button>
          </h3>
          {doc.halftone.on && (
            <>
              <div className="ps__wrapbtn">
                {(["corner", "radial", "band", "full"] as const).map((c) => (
                  <button key={c} className={`btn btn--xs${doc.halftone.coverage === c ? " is-on" : ""}`}
                    onClick={() => setHalf({ coverage: c })}>{c}</button>
                ))}
              </div>
              <div className="ps__wrapbtn">
                {(["circle", "square", "line"] as const).map((s) => (
                  <button key={s} className={`btn btn--xs${doc.halftone.shape === s ? " is-on" : ""}`}
                    onClick={() => setHalf({ shape: s })}>{s}</button>
                ))}
                <button className={`btn btn--xs${doc.halftone.invert ? " is-on" : ""}`}
                  onClick={() => setHalf({ invert: !doc.halftone.invert })}>invert</button>
              </div>
              <Num label="Pitch" value={doc.halftone.pitch} min={8} max={70} onChange={(v: number) => setHalf({ pitch: v })} />
              <Num label="Angle" value={doc.halftone.angle} min={0} max={90} onChange={(v: number) => setHalf({ angle: v })} />
              <Num label="Spread" value={doc.halftone.radius} min={0.1} max={2} step={0.01} onChange={(v: number) => setHalf({ radius: v })} />
              <Num label="Intensity" value={doc.halftone.intensity} min={0} max={1} step={0.01} onChange={(v: number) => setHalf({ intensity: v })} />
              <Num label="Origin X" value={doc.halftone.cx} min={0} max={1} step={0.01} onChange={(v: number) => setHalf({ cx: v })} />
              <Num label="Origin Y" value={doc.halftone.cy} min={0} max={1} step={0.01} onChange={(v: number) => setHalf({ cy: v })} />
              <label className="ps__f"><span>Colour</span>
                <Swatches value={doc.halftone.color} onChange={(c) => setHalf({ color: c })} /></label>
            </>
          )}
        </section>

        <section className="ps__sec">
          <h3>Add</h3>
          <div className="ps__wrapbtn">
            {(["text", "panel", "rule", "bracket", "burst", "logo"] as const).map((t) => (
              <button key={t} className="btn btn--sm" onClick={() => addLayer(t)}>{t}</button>
            ))}
            <label className="btn btn--sm ps__upload">
              image<input type="file" accept="image/*" onChange={onUpload} hidden />
            </label>
          </div>
        </section>

        <section className="ps__sec">
          <h3>Layers <span className="dim">top of list = front</span></h3>
          <ul className="ps__layers">
            {[...doc.layers].reverse().map((l) => (
              <li key={l.id} className={`ps__layer${sel === l.id ? " is-on" : ""}`}>
                <button className="ps__layerName" onClick={() => setSel(l.id)}>
                  <span className="ps__layerType">{l.type}</span>{l.name}
                </button>
                <span className="ps__layerOps">
                  <button onClick={() => move(l.id, 1)} title="forward">↑</button>
                  <button onClick={() => move(l.id, -1)} title="back">↓</button>
                  <button onClick={() => duplicate(l.id)} title="duplicate">⧉</button>
                  <button onClick={() => { setDoc((d) => ({ ...d, layers: d.layers.filter((x) => x.id !== l.id) })); setSel(null); }} title="delete">✕</button>
                </span>
              </li>
            ))}
            {doc.layers.length === 0 && <li className="dim ps__empty">No layers yet.</li>}
          </ul>
        </section>
      </div>

      {/* ── middle: canvas ──────────────────────────────────────────── */}
      <div className="ps__stageWrap">
        <div className={`ps__stage ps__stage--${doc.size}`}>
          <canvas
            ref={canvasRef} className="ps__canvas"
            onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
          />
          {(snapped.x || snapped.y) && <span className="ps__snap">snapped</span>}
        </div>
        <div className="ps__actions">
          <button className="btn btn--go" onClick={() => exportPng(2)} disabled={!ready}>
            {ready ? "Download PNG (2×)" : "Loading fonts…"}
          </button>
          <button className="btn" onClick={() => exportPng(1)} disabled={!ready}>1×</button>
          <button className="btn" onClick={save}>Save</button>
          <button className="btn" onClick={load}>Load</button>
        </div>
        <p className="ps__hint dim">
          Click a layer on the canvas to select it, drag to move. Arrow keys nudge,
          shift+arrow moves further, delete removes. Layers snap to the margins
          and the centre line.
        </p>
      </div>

      {/* ── right: selected layer ───────────────────────────────────── */}
      <div className="ps__col">
        <section className="ps__sec">
          <h3>{selected ? `Selected · ${selected.type}` : "Nothing selected"}</h3>
          {!selected && <p className="dim ps__empty">Click something on the canvas.</p>}

          {selected && (
            <>
              <label className="ps__f"><span>Layer name</span>
                <input value={selected.name} onChange={(e) => update(selected.id, { name: e.target.value } as any)} /></label>

              {selected.type === "text" && (
                <>
                  <label className="ps__f"><span>Text</span>
                    <textarea rows={3} value={selected.text}
                      onChange={(e) => update(selected.id, { text: e.target.value } as any)} /></label>
                  <div className="ps__wrapbtn">
                    {(Object.keys(FONTS) as FontKey[]).map((f) => (
                      <button key={f} className={`btn btn--xs${selected.font === f ? " is-on" : ""}`}
                        onClick={() => update(selected.id, { font: f } as any)}>{FONTS[f].label}</button>
                    ))}
                  </div>
                  <div className="ps__wrapbtn">
                    {(["left", "center", "right"] as const).map((a) => (
                      <button key={a} className={`btn btn--xs${selected.align === a ? " is-on" : ""}`}
                        onClick={() => update(selected.id, { align: a } as any)}>{a}</button>
                    ))}
                    <button className={`btn btn--xs${selected.caps ? " is-on" : ""}`}
                      onClick={() => update(selected.id, { caps: !selected.caps } as any)}>CAPS</button>
                    <button className={`btn btn--xs${selected.italic ? " is-on" : ""}`}
                      onClick={() => update(selected.id, { italic: !selected.italic } as any)}>italic</button>
                  </div>
                  <Num label="Size" value={selected.size} min={14} max={220} onChange={(v: number) => update(selected.id, { size: v } as any)} />
                  <Num label="Line height" value={selected.lineHeight} min={0.85} max={2} step={0.01} onChange={(v: number) => update(selected.id, { lineHeight: v } as any)} />
                  <Num label="Tracking" value={selected.tracking} min={-4} max={24} step={0.5} onChange={(v: number) => update(selected.id, { tracking: v } as any)} />
                  <Num label="Max width" value={selected.maxWidth} min={0.15} max={1} step={0.01} onChange={(v: number) => update(selected.id, { maxWidth: v } as any)} />
                  <label className="ps__f"><span>Colour</span>
                    <Swatches value={selected.color} onChange={(c) => update(selected.id, { color: c } as any)} /></label>
                </>
              )}

              {selected.type === "image" && (
                <>
                  <Num label="Scale" value={selected.scale} min={0.05} max={1.6} step={0.01} onChange={(v: number) => update(selected.id, { scale: v } as any)} />
                  <Num label="Corner radius" value={selected.rounded} min={0} max={120} onChange={(v: number) => update(selected.id, { rounded: v } as any)} />
                </>
              )}

              {selected.type === "logo" && (
                <Num label="Size" value={selected.size} min={40} max={300} onChange={(v: number) => update(selected.id, { size: v } as any)} />
              )}

              {selected.type === "bracket" && (
                <>
                  <Num label="Size" value={selected.size} min={40} max={420} onChange={(v: number) => update(selected.id, { size: v } as any)} />
                  <button className={`btn btn--xs${selected.flip ? " is-on" : ""}`}
                    onClick={() => update(selected.id, { flip: !selected.flip } as any)}>flip</button>
                  <label className="ps__f"><span>Colour</span>
                    <Swatches value={selected.color} onChange={(c) => update(selected.id, { color: c } as any)} /></label>
                </>
              )}

              {selected.type === "rule" && (
                <>
                  <Num label="Length" value={selected.length} min={0.02} max={1} step={0.01} onChange={(v: number) => update(selected.id, { length: v } as any)} />
                  <Num label="Thickness" value={selected.thickness} min={1} max={40} onChange={(v: number) => update(selected.id, { thickness: v } as any)} />
                  <label className="ps__f"><span>Colour</span>
                    <Swatches value={selected.color} onChange={(c) => update(selected.id, { color: c } as any)} /></label>
                </>
              )}

              {selected.type === "burst" && (
                <>
                  <label className="ps__f"><span>Word</span>
                    <input value={selected.text} onChange={(e) => update(selected.id, { text: e.target.value } as any)} /></label>
                  <Num label="Size" value={selected.size} min={30} max={220} onChange={(v: number) => update(selected.id, { size: v } as any)} />
                  <label className="ps__f"><span>Colour</span>
                    <Swatches value={selected.color} onChange={(c) => update(selected.id, { color: c } as any)} /></label>
                </>
              )}

              {selected.type === "panel" && (
                <>
                  <Num label="Width" value={selected.w} min={0.05} max={1.2} step={0.01} onChange={(v: number) => update(selected.id, { w: v } as any)} />
                  <Num label="Height" value={selected.h} min={0.05} max={1.6} step={0.01} onChange={(v: number) => update(selected.id, { h: v } as any)} />
                  <Num label="Border" value={selected.thickness} min={0} max={20} onChange={(v: number) => update(selected.id, { thickness: v } as any)} />
                  <button className={`btn btn--xs${selected.fold ? " is-on" : ""}`}
                    onClick={() => update(selected.id, { fold: !selected.fold } as any)}>folded edge</button>
                  <label className="ps__f"><span>Fill</span>
                    <Swatches value={selected.fill as string} onChange={(c) => update(selected.id, { fill: c } as any)} /></label>
                  <label className="ps__f"><span>Border colour</span>
                    <Swatches value={selected.stroke} onChange={(c) => update(selected.id, { stroke: c } as any)} /></label>
                </>
              )}

              <Num label="Rotation" value={selected.rotation} min={-45} max={45} onChange={(v: number) => update(selected.id, { rotation: v } as any)} />
              <Num label="Opacity" value={selected.opacity} min={0} max={1} step={0.01} onChange={(v: number) => update(selected.id, { opacity: v } as any)} />
              <div className="ps__wrapbtn">
                <button className="btn btn--xs" onClick={() => update(selected.id, { x: 0.5 } as any)}>centre X</button>
                <button className="btn btn--xs" onClick={() => update(selected.id, { y: 0.5 } as any)}>centre Y</button>
              </div>
            </>
          )}
        </section>
      </div>

      <style>{`
        .ps { display: grid; gap: 1.25rem; align-items: start; }
        @media (min-width: 78rem) { .ps { grid-template-columns: 19rem minmax(0,1fr) 19rem; } }
        .ps__col { display: grid; gap: 1rem; align-content: start; }
        .ps__sec {
          border: var(--panel-line) solid var(--gutter); border-radius: var(--radius);
          background: var(--ink-2); padding: 0.85rem;
        }
        .ps__sec h3 {
          font-family: var(--font-mono); font-size: 0.66rem; letter-spacing: 0.14em;
          text-transform: uppercase; color: var(--yellow); margin: 0 0 0.6rem;
          display: flex; justify-content: space-between; align-items: center; gap: 0.5rem;
        }
        .ps__sec h3 .dim { letter-spacing: 0.08em; }
        .ps__wrapbtn { display: flex; gap: 0.3rem; flex-wrap: wrap; margin-bottom: 0.55rem; }
        .btn--sm { font-size: 0.72rem; padding: 0.4rem 0.6rem; min-height: 34px; }
        .btn--xs { font-size: 0.66rem; padding: 0.3rem 0.5rem; min-height: 30px; }
        .btn.is-on { background: var(--cyan); color: var(--ink); border-color: var(--cyan); }
        .ps__f { display: grid; gap: 0.25rem; margin-bottom: 0.5rem; }
        .ps__f > span {
          font-family: var(--font-mono); font-size: 0.6rem; letter-spacing: 0.12em;
          text-transform: uppercase; color: var(--paper-dim);
        }
        .ps__f--row { grid-template-columns: 5.5rem 1fr 2.4rem; align-items: center; gap: 0.5rem; }
        .ps__f--row b { font-family: var(--font-mono); font-size: 0.68rem; color: var(--yellow); text-align: right; }
        .ps__f input[type=text], .ps__f input:not([type]), .ps__f textarea {
          background: var(--ink); color: var(--paper);
          border: var(--panel-line) solid var(--gutter); border-radius: var(--radius);
          padding: 0.45rem 0.55rem; font-family: var(--font-body); font-size: 0.95rem;
          width: 100%; resize: vertical;
        }
        .sw { display: flex; gap: 0.25rem; flex-wrap: wrap; }
        .sw__c {
          width: 26px; height: 26px; border-radius: 3px; cursor: pointer;
          border: 2px solid var(--gutter);
        }
        .sw__c.is-on { border-color: var(--paper); }
        .ps__layers { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.2rem; max-height: 17rem; overflow: auto; }
        .ps__layer { display: flex; align-items: center; gap: 0.3rem; border-radius: var(--radius); }
        .ps__layer.is-on { background: var(--ink-3); outline: 1px solid var(--cyan); }
        .ps__layerName {
          flex: 1; text-align: left; background: none; border: none; cursor: pointer;
          color: var(--paper); font-size: 0.8rem; padding: 0.35rem 0.4rem;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .ps__layerType {
          font-family: var(--font-mono); font-size: 0.55rem; letter-spacing: 0.1em;
          text-transform: uppercase; color: var(--paper-dim); margin-right: 0.4rem;
        }
        .ps__layerOps { display: flex; gap: 0.1rem; }
        .ps__layerOps button {
          background: none; border: none; color: var(--paper-dim); cursor: pointer;
          font-size: 0.75rem; padding: 0.25rem 0.3rem; min-width: 26px; min-height: 30px;
        }
        .ps__layerOps button:hover { color: var(--cyan); }
        .ps__empty { font-size: 0.82rem; }
        .ps__upload { display: inline-flex; align-items: center; cursor: pointer; }
        .ps__stageWrap { display: grid; gap: 0.7rem; }
        .ps__stage {
          border: var(--panel-line) dashed var(--gutter); border-radius: var(--radius);
          padding: 0.8rem; display: grid; place-items: center; background: var(--ink);
          position: relative;
        }
        .ps__canvas {
          display: block; max-width: 100%; height: auto; touch-action: none;
          box-shadow: 0 0 0 1px var(--gutter); cursor: grab;
        }
        .ps__canvas:active { cursor: grabbing; }
        .ps__stage--square .ps__canvas { max-height: 60vh; }
        .ps__stage--story .ps__canvas { max-height: 74vh; }
        .ps__snap {
          position: absolute; top: 0.5rem; left: 0.5rem;
          font-family: var(--font-mono); font-size: 0.6rem; letter-spacing: 0.12em;
          text-transform: uppercase; color: var(--ink); background: var(--yellow);
          padding: 0.15rem 0.4rem; border-radius: 2px;
        }
        .ps__actions { display: flex; gap: 0.4rem; flex-wrap: wrap; }
        .ps__hint { font-size: 0.8rem; margin: 0; }
      `}</style>
    </div>
  );
}
