import { uid, type Doc, type Layer } from "./studio-core";

/**
 * Presets seed a LAYER STACK, they are not fixed layouts. Once a preset loads,
 * everything in it can be dragged, restyled or deleted — so adding a new post
 * type is data, not code.
 */

const T = (o: Partial<Extract<Layer, { type: "text" }>>): Layer => ({
  id: uid(), name: "Text", type: "text", x: 0.09, y: 0.1, rotation: 0, opacity: 1,
  text: "Text", font: "head", size: 96, color: "paper", align: "left",
  tracking: 0, caps: false, lineHeight: 1.05, maxWidth: 0.82, ...o,
} as Layer);

const base = (halftone: Partial<Doc["halftone"]> = {}): Omit<Doc, "layers"> => ({
  size: "square",
  bg: "ink",
  halftone: {
    on: true, pitch: 26, angle: 45, shape: "circle", color: "cyan",
    coverage: "corner", cx: 0.88, cy: 0.12, radius: 0.72, intensity: 0.55, invert: false,
    ...halftone,
  },
});

export const PRESETS: Record<string, { label: string; make: () => Doc }> = {
  announce: {
    label: "New issue",
    make: () => ({
      ...base(),
      layers: [
        T({ name: "Kicker", text: "Quantum Panels · Issue 04", font: "mono", size: 22, color: "yellow", caps: true, tracking: 6, y: 0.16 }),
        T({ name: "Title", text: "Entanglement", size: 128, y: 0.24, lineHeight: 1.02 }),
        T({ name: "Character", text: "Cloak & Dagger", font: "body", size: 46, color: "cyan", italic: true, y: 0.43 }),
        T({ name: "Line", text: "Two halves of one system. Correlation is not connection.", font: "body", size: 40, color: "dim", y: 0.51, lineHeight: 1.35 }),
        { id: uid(), name: "Rule", type: "rule", x: 0.15, y: 0.83, rotation: 0, opacity: 1, length: 0.12, thickness: 6, color: "magenta" },
        T({ name: "CTA", text: "New issue Monday", font: "mono", size: 22, color: "paper", caps: true, tracking: 6, y: 0.87 }),
        { id: uid(), name: "Logo", type: "logo", x: 0.86, y: 0.88, rotation: 0, opacity: 1, size: 96 },
      ],
    }),
  },
  quote: {
    label: "Pull quote",
    make: () => ({
      ...base({ coverage: "radial", cx: 0.5, cy: 0.5, radius: 0.85, intensity: 0.3, pitch: 30 }),
      layers: [
        T({ name: "Quote", text: "“Correlation is not connection.”", font: "body", size: 88, color: "paper", align: "center", x: 0.5, y: 0.36, maxWidth: 0.8, lineHeight: 1.22 }),
        { id: uid(), name: "Rule", type: "rule", x: 0.5, y: 0.57, rotation: 0, opacity: 1, length: 0.09, thickness: 5, color: "magenta" },
        T({ name: "Character", text: "Cloak & Dagger", font: "body", size: 42, color: "cyan", italic: true, align: "center", x: 0.5, y: 0.61 }),
        T({ name: "Issue", text: "Issue 04", font: "mono", size: 24, color: "dim", caps: true, tracking: 6, align: "center", x: 0.5, y: 0.66 }),
        { id: uid(), name: "Logo", type: "logo", x: 0.5, y: 0.86, rotation: 0, opacity: 1, size: 92 },
      ],
    }),
  },
  concept: {
    label: "Concept card",
    make: () => ({
      ...base({ color: "magenta", cx: 0.12, cy: 0.9, radius: 0.78, intensity: 0.42, pitch: 24 }),
      layers: [
        { id: uid(), name: "Panel", type: "panel", x: 0.5, y: 0.45, rotation: 0, opacity: 1, w: 0.82, h: 0.5, fill: "ink2", stroke: "gutter", thickness: 4, fold: true },
        T({ name: "Issue no.", text: "04", font: "display", size: 96, color: "yellow", x: 0.16, y: 0.26 }),
        T({ name: "Title", text: "Entanglement", size: 88, x: 0.16, y: 0.39, maxWidth: 0.66 }),
        T({ name: "Character", text: "Cloak & Dagger", font: "body", size: 42, color: "cyan", italic: true, x: 0.16, y: 0.5 }),
        T({ name: "Line", text: "Correlation is not connection.", font: "body", size: 38, color: "dim", x: 0.16, y: 0.56, maxWidth: 0.62, lineHeight: 1.35 }),
        { id: uid(), name: "Logo", type: "logo", x: 0.85, y: 0.88, rotation: 0, opacity: 1, size: 92 },
      ],
    }),
  },
  teaser: {
    label: "Next week",
    make: () => ({
      ...base({ coverage: "band", cx: 0.5, cy: 0.5, radius: 0.35, intensity: 0.5 }),
      layers: [
        T({ name: "Kicker", text: "Next week", font: "mono", size: 24, color: "yellow", caps: true, tracking: 8, align: "center", x: 0.5, y: 0.3 }),
        { id: uid(), name: "Bracket L", type: "bracket", x: 0.2, y: 0.47, rotation: 0, opacity: 1, size: 150, color: "cyan", flip: false },
        { id: uid(), name: "Bracket R", type: "bracket", x: 0.8, y: 0.47, rotation: 0, opacity: 1, size: 150, color: "cyan", flip: true },
        T({ name: "Title", text: "No-signalling", size: 110, color: "paper", align: "center", x: 0.5, y: 0.42, maxWidth: 0.5 }),
        T({ name: "Hook", text: "Try to send a message with entanglement. Watch it fail.", font: "body", size: 40, color: "dim", align: "center", x: 0.5, y: 0.62, maxWidth: 0.68, lineHeight: 1.35 }),
        { id: uid(), name: "Logo", type: "logo", x: 0.5, y: 0.86, rotation: 0, opacity: 1, size: 88 },
      ],
    }),
  },
  spotlight: {
    label: "Sim spotlight",
    make: () => ({
      ...base({ coverage: "corner", cx: 0.1, cy: 0.1, radius: 0.6, intensity: 0.4 }),
      layers: [
        T({ name: "Kicker", text: "This week's simulation", font: "mono", size: 22, color: "cyan", caps: true, tracking: 6, y: 0.09 }),
        { id: uid(), name: "Screenshot", type: "panel", x: 0.5, y: 0.44, rotation: 0, opacity: 1, w: 0.84, h: 0.46, fill: "ink2", stroke: "cyan", thickness: 3, fold: false },
        T({ name: "Drop image here", text: "Add an image layer and drag it over this panel", font: "mono", size: 20, color: "dim", align: "center", x: 0.5, y: 0.43, maxWidth: 0.5, caps: true, tracking: 4 }),
        T({ name: "Title", text: "Both paths", size: 84, x: 0.09, y: 0.72 }),
        T({ name: "Line", text: "Sometimes taking both routes means arriving nowhere.", font: "body", size: 38, color: "dim", y: 0.81, maxWidth: 0.72, lineHeight: 1.3 }),
        { id: uid(), name: "Logo", type: "logo", x: 0.86, y: 0.9, rotation: 0, opacity: 1, size: 84 },
      ],
    }),
  },
  milestone: {
    label: "Milestone",
    make: () => ({
      ...base({ coverage: "radial", cx: 0.5, cy: 0.42, radius: 0.7, intensity: 0.6, shape: "square", pitch: 34 }),
      layers: [
        { id: uid(), name: "Burst", type: "burst", x: 0.5, y: 0.4, rotation: -6, opacity: 1, text: "Ten issues!", size: 92, color: "yellow" },
        T({ name: "Line", text: "Ten weeks of comics being wrong about quantum physics in interesting ways.", font: "body", size: 44, color: "paper", align: "center", x: 0.5, y: 0.55, maxWidth: 0.74, lineHeight: 1.3 }),
        T({ name: "CTA", text: "Read the archive", font: "mono", size: 24, color: "cyan", caps: true, tracking: 6, align: "center", x: 0.5, y: 0.72 }),
        { id: uid(), name: "Logo", type: "logo", x: 0.5, y: 0.86, rotation: 0, opacity: 1, size: 92 },
      ],
    }),
  },
};

export const blank = (): Doc => ({
  size: "square", bg: "ink",
  halftone: { on: false, pitch: 26, angle: 45, shape: "circle", color: "cyan", coverage: "corner", cx: 0.5, cy: 0.5, radius: 0.7, intensity: 0.5, invert: false },
  layers: [],
});
