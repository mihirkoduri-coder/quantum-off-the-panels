/**
 * Statevector core. Handles up to ~8 qubits comfortably in a browser.
 * Amplitudes stored as parallel Float64Arrays (re/im) indexed by basis state.
 *
 * Qubit 0 is the LEAST significant bit, so basis state |q2 q1 q0>.
 */

export type Complex = { re: number; im: number };

export const cAdd = (a: Complex, b: Complex): Complex => ({ re: a.re + b.re, im: a.im + b.im });
export const cMul = (a: Complex, b: Complex): Complex => ({
  re: a.re * b.re - a.im * b.im,
  im: a.re * b.im + a.im * b.re,
});
export const cAbs2 = (a: Complex) => a.re * a.re + a.im * a.im;
export const cPhase = (a: Complex) => Math.atan2(a.im, a.re);

/** 2x2 gate as [[a,b],[c,d]] of Complex */
export type Gate2 = [[Complex, Complex], [Complex, Complex]];

const c = (re: number, im = 0): Complex => ({ re, im });
const ISQRT2 = 1 / Math.SQRT2;

export const GATES: Record<string, Gate2> = {
  I: [[c(1), c(0)], [c(0), c(1)]],
  X: [[c(0), c(1)], [c(1), c(0)]],
  Y: [[c(0), c(0, -1)], [c(0, 1), c(0)]],
  Z: [[c(1), c(0)], [c(0), c(-1)]],
  H: [[c(ISQRT2), c(ISQRT2)], [c(ISQRT2), c(-ISQRT2)]],
  S: [[c(1), c(0)], [c(0), c(0, 1)]],
  T: [[c(1), c(0)], [c(0), c(ISQRT2, ISQRT2)]],
};

/** Rotation about X/Y/Z by angle theta — the continuous gates sliders drive. */
export const RX = (t: number): Gate2 => [
  [c(Math.cos(t / 2)), c(0, -Math.sin(t / 2))],
  [c(0, -Math.sin(t / 2)), c(Math.cos(t / 2))],
];
export const RY = (t: number): Gate2 => [
  [c(Math.cos(t / 2)), c(-Math.sin(t / 2))],
  [c(Math.sin(t / 2)), c(Math.cos(t / 2))],
];
export const RZ = (t: number): Gate2 => [
  [c(Math.cos(t / 2), -Math.sin(t / 2)), c(0)],
  [c(0), c(Math.cos(t / 2), Math.sin(t / 2))],
];

export class QuantumState {
  readonly n: number;
  readonly dim: number;
  re: Float64Array;
  im: Float64Array;

  constructor(n: number) {
    this.n = n;
    this.dim = 1 << n;
    this.re = new Float64Array(this.dim);
    this.im = new Float64Array(this.dim);
    this.re[0] = 1; // |00...0>
  }

  static from(amps: Complex[]): QuantumState {
    const n = Math.log2(amps.length);
    if (!Number.isInteger(n)) throw new Error("amplitude count must be a power of 2");
    const s = new QuantumState(n);
    amps.forEach((a, i) => {
      s.re[i] = a.re;
      s.im[i] = a.im;
    });
    return s.normalize();
  }

  clone(): QuantumState {
    const s = new QuantumState(this.n);
    s.re = this.re.slice();
    s.im = this.im.slice();
    return s;
  }

  reset(): this {
    this.re.fill(0);
    this.im.fill(0);
    this.re[0] = 1;
    return this;
  }

  amp(i: number): Complex {
    return { re: this.re[i], im: this.im[i] };
  }

  /** Apply a 2x2 gate to one qubit. */
  apply(g: Gate2, target: number): this {
    const step = 1 << target;
    for (let base = 0; base < this.dim; base++) {
      if (base & step) continue;
      const i = base;
      const j = base | step;
      const ar = this.re[i], ai = this.im[i];
      const br = this.re[j], bi = this.im[j];
      this.re[i] = g[0][0].re * ar - g[0][0].im * ai + g[0][1].re * br - g[0][1].im * bi;
      this.im[i] = g[0][0].re * ai + g[0][0].im * ar + g[0][1].re * bi + g[0][1].im * br;
      this.re[j] = g[1][0].re * ar - g[1][0].im * ai + g[1][1].re * br - g[1][1].im * bi;
      this.im[j] = g[1][0].re * ai + g[1][0].im * ar + g[1][1].re * bi + g[1][1].im * br;
    }
    return this;
  }

  /** Controlled version of any 2x2 gate. CNOT = cApply(GATES.X, ctrl, targ). */
  cApply(g: Gate2, control: number, target: number): this {
    const cBit = 1 << control;
    const tBit = 1 << target;
    for (let base = 0; base < this.dim; base++) {
      if (base & tBit) continue;
      if (!(base & cBit)) continue;
      const i = base;
      const j = base | tBit;
      const ar = this.re[i], ai = this.im[i];
      const br = this.re[j], bi = this.im[j];
      this.re[i] = g[0][0].re * ar - g[0][0].im * ai + g[0][1].re * br - g[0][1].im * bi;
      this.im[i] = g[0][0].re * ai + g[0][0].im * ar + g[0][1].re * bi + g[0][1].im * br;
      this.re[j] = g[1][0].re * ar - g[1][0].im * ai + g[1][1].re * br - g[1][1].im * bi;
      this.im[j] = g[1][0].re * ai + g[1][0].im * ar + g[1][1].re * bi + g[1][1].im * br;
    }
    return this;
  }

  /** Probability of each basis state. */
  probabilities(): Float64Array {
    const p = new Float64Array(this.dim);
    for (let i = 0; i < this.dim; i++) p[i] = this.re[i] ** 2 + this.im[i] ** 2;
    return p;
  }

  /** Marginal probability that a single qubit reads 1. */
  probOne(q: number): number {
    const bit = 1 << q;
    let p = 0;
    for (let i = 0; i < this.dim; i++) if (i & bit) p += this.re[i] ** 2 + this.im[i] ** 2;
    return p;
  }

  /**
   * Measure one qubit. Mutates the state (this is the point — collapse is real here).
   * Pass a seeded rng for reproducible demos.
   */
  measure(q: number, rng: () => number = Math.random): 0 | 1 {
    const p1 = this.probOne(q);
    const outcome: 0 | 1 = rng() < p1 ? 1 : 0;
    const bit = 1 << q;
    const norm = Math.sqrt(outcome ? p1 : 1 - p1) || 1;
    for (let i = 0; i < this.dim; i++) {
      const matches = outcome ? (i & bit) !== 0 : (i & bit) === 0;
      if (matches) {
        this.re[i] /= norm;
        this.im[i] /= norm;
      } else {
        this.re[i] = 0;
        this.im[i] = 0;
      }
    }
    return outcome;
  }

  measureAll(rng: () => number = Math.random): number[] {
    return Array.from({ length: this.n }, (_, q) => this.measure(q, rng));
  }

  /** Bloch vector for a single qubit (only meaningful for n=1 or a pure unentangled qubit). */
  bloch(q = 0): { x: number; y: number; z: number } {
    // reduced density matrix elements for qubit q
    const bit = 1 << q;
    let r00 = 0, r11 = 0, r01re = 0, r01im = 0;
    for (let i = 0; i < this.dim; i++) {
      if (i & bit) continue;
      const j = i | bit;
      const ar = this.re[i], ai = this.im[i];
      const br = this.re[j], bi = this.im[j];
      r00 += ar * ar + ai * ai;
      r11 += br * br + bi * bi;
      r01re += ar * br + ai * bi;
      r01im += ai * br - ar * bi;
    }
    return { x: 2 * r01re, y: -2 * r01im, z: r00 - r11 };
  }

  /** Purity 1 = pure state, 0.5 = maximally mixed. Drives the decoherence sim. */
  purity(q = 0): number {
    const { x, y, z } = this.bloch(q);
    return 0.5 * (1 + x * x + y * y + z * z);
  }

  normalize(): this {
    let s = 0;
    for (let i = 0; i < this.dim; i++) s += this.re[i] ** 2 + this.im[i] ** 2;
    const k = 1 / (Math.sqrt(s) || 1);
    for (let i = 0; i < this.dim; i++) {
      this.re[i] *= k;
      this.im[i] *= k;
    }
    return this;
  }

  /** "|01>" style labels, qubit 0 rightmost. */
  labels(): string[] {
    return Array.from({ length: this.dim }, (_, i) => "|" + i.toString(2).padStart(this.n, "0") + "⟩");
  }
}

/** Deterministic RNG so a "run 1000 shots" button gives the same story every reload if you want it to. */
export function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Run a prepared circuit many times and tally outcomes. */
export function sample(
  prepare: () => QuantumState,
  shots: number,
  rng: () => number = Math.random,
): Map<string, number> {
  const tally = new Map<string, number>();
  for (let i = 0; i < shots; i++) {
    const s = prepare();
    const bits = s.measureAll(rng).reverse().join("");
    tally.set(bits, (tally.get(bits) ?? 0) + 1);
  }
  return tally;
}
