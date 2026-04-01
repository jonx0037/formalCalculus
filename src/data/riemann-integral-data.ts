/**
 * Data presets for the Riemann Integral & FTC topic.
 * All functions are pure and deterministic — no Math.random().
 */

// ── Interfaces ──────────────────────────────────────────────

export interface IntegrationFunctionPreset {
  name: string;
  label: string;
  f: (x: number) => number;
  F?: (x: number) => number;
  exactIntegral?: (a: number, b: number) => number;
  domain: [number, number];
  defaultA: number;
  defaultB: number;
  mlNote: string;
}

export interface DarbouxPreset {
  name: string;
  label: string;
  f: (x: number) => number;
  exactIntegral: (a: number, b: number) => number;
  domain: [number, number];
}

export interface FTCPreset {
  name: string;
  label: string;
  f: (x: number) => number;
  F: (x: number) => number;
  domain: [number, number];
  defaultA: number;
}

export interface SubstitutionPreset {
  name: string;
  label: string;
  integrand: (x: number) => number;
  f: (u: number) => number;
  g: (x: number) => number;
  g_prime: (x: number) => number;
  xDomain: [number, number];
  uDomain: [number, number];
  exactValue: number;
  uLabel: string;
}

export interface QuadraturePreset {
  name: string;
  label: string;
  f: (x: number) => number;
  f_derivatives?: {
    first?: (x: number) => number;
    second?: (x: number) => number;
    fourth?: (x: number) => number;
  };
  domain: [number, number];
  exactIntegral: number;
  notes?: string;
}

// ── Riemann Sum Presets ─────────────────────────────────────

export function getRiemannSumPresets(): IntegrationFunctionPreset[] {
  return [
    {
      name: 'x-squared',
      label: 'f(x) = x\u00B2',
      f: (x: number) => x * x,
      F: (x: number) => x * x * x / 3,
      exactIntegral: (a: number, b: number) => (b ** 3 - a ** 3) / 3,
      domain: [0, 2],
      defaultA: 0,
      defaultB: 1,
      mlNote: 'Squared error loss: L(y, \u0177) = (y - \u0177)\u00B2',
    },
    {
      name: 'sin',
      label: 'f(x) = sin(x)',
      f: Math.sin,
      F: (x: number) => -Math.cos(x),
      exactIntegral: (a: number, b: number) => -Math.cos(b) + Math.cos(a),
      domain: [0, 2 * Math.PI],
      defaultA: 0,
      defaultB: Math.PI,
      mlNote: 'Periodic activation functions in signal processing',
    },
    {
      name: 'exp',
      label: 'f(x) = e\u02E3',
      f: Math.exp,
      F: Math.exp,
      exactIntegral: (a: number, b: number) => Math.exp(b) - Math.exp(a),
      domain: [0, 2],
      defaultA: 0,
      defaultB: 1,
      mlNote: 'Softmax normalization: sum of e^(z_i)',
    },
    {
      name: 'arctan-deriv',
      label: 'f(x) = 1/(1+x\u00B2)',
      f: (x: number) => 1 / (1 + x * x),
      F: Math.atan,
      exactIntegral: (a: number, b: number) => Math.atan(b) - Math.atan(a),
      domain: [0, 5],
      defaultA: 0,
      defaultB: 1,
      mlNote: 'Cauchy density: p(x) = 1/(\u03C0(1+x\u00B2))',
    },
    {
      name: 'sqrt',
      label: 'f(x) = \u221Ax',
      f: Math.sqrt,
      F: (x: number) => (2 / 3) * Math.pow(x, 1.5),
      exactIntegral: (a: number, b: number) => (2 / 3) * (Math.pow(b, 1.5) - Math.pow(a, 1.5)),
      domain: [0, 4],
      defaultA: 0,
      defaultB: 1,
      mlNote: 'Square-root scaling in normalization layers',
    },
  ];
}

// ── Darboux Presets ─────────────────────────────────────────

export function getDarbouxPresets(): DarbouxPreset[] {
  return [
    {
      name: 'x-squared',
      label: 'f(x) = x\u00B2',
      f: (x: number) => x * x,
      exactIntegral: (a: number, b: number) => (b ** 3 - a ** 3) / 3,
      domain: [0, 1],
    },
    {
      name: 'sin',
      label: 'f(x) = sin(x)',
      f: Math.sin,
      exactIntegral: (a: number, b: number) => -Math.cos(b) + Math.cos(a),
      domain: [0, Math.PI],
    },
    {
      name: 'x-minus-x-squared',
      label: 'f(x) = x(1\u2212x)',
      f: (x: number) => x * (1 - x),
      exactIntegral: (a: number, b: number) => (b ** 2 / 2 - b ** 3 / 3) - (a ** 2 / 2 - a ** 3 / 3),
      domain: [0, 1],
    },
    {
      name: 'sqrt',
      label: 'f(x) = \u221Ax',
      f: Math.sqrt,
      exactIntegral: (a: number, b: number) => (2 / 3) * (Math.pow(b, 1.5) - Math.pow(a, 1.5)),
      domain: [0, 1],
    },
  ];
}

// ── FTC Presets ──────────────────────────────────────────────

export function getFTCPresets(): FTCPreset[] {
  return [
    {
      name: 'sin',
      label: 'f(x) = sin(x)',
      f: Math.sin,
      F: (x: number) => 1 - Math.cos(x), // F(x) = integral from 0 to x of sin(t) dt
      domain: [0, 2 * Math.PI],
      defaultA: 0,
    },
    {
      name: 'x-squared',
      label: 'f(x) = x\u00B2',
      f: (x: number) => x * x,
      F: (x: number) => x * x * x / 3,
      domain: [-1, 2],
      defaultA: 0,
    },
    {
      name: 'exp-neg',
      label: 'f(x) = e\u207B\u02E3',
      f: (x: number) => Math.exp(-x),
      F: (x: number) => 1 - Math.exp(-x), // integral from 0 to x of e^{-t} dt
      domain: [0, 4],
      defaultA: 0,
    },
    {
      name: 'cos',
      label: 'f(x) = cos(x)',
      f: Math.cos,
      F: Math.sin, // integral from 0 to x of cos(t) dt = sin(x)
      domain: [0, 2 * Math.PI],
      defaultA: 0,
    },
  ];
}

// ── Substitution Presets ────────────────────────────────────

export function getSubstitutionPresets(): SubstitutionPreset[] {
  return [
    {
      name: 'exp-x-squared',
      label: '\u222B 2x e^(x\u00B2) dx',
      integrand: (x: number) => 2 * x * Math.exp(x * x),
      f: Math.exp,
      g: (x: number) => x * x,
      g_prime: (x: number) => 2 * x,
      xDomain: [0, 1],
      uDomain: [0, 1],
      exactValue: Math.E - 1,
      uLabel: 'u = x\u00B2',
    },
    {
      name: 'sin-cos',
      label: '\u222B sin(x)cos(x) dx',
      integrand: (x: number) => Math.sin(x) * Math.cos(x),
      f: (u: number) => u,
      g: Math.sin,
      g_prime: Math.cos,
      xDomain: [0, Math.PI / 2],
      uDomain: [0, 1],
      exactValue: 0.5,
      uLabel: 'u = sin(x)',
    },
    {
      name: 'ln-x',
      label: '\u222B 1/x dx',
      integrand: (x: number) => 1 / x,
      f: (u: number) => 1 / Math.exp(u) * Math.exp(u), // f(u) = 1 after substitution: integral of 1 du
      g: Math.log,
      g_prime: (x: number) => 1 / x,
      xDomain: [1, Math.E],
      uDomain: [0, 1],
      exactValue: 1,
      uLabel: 'u = ln(x)',
    },
  ];
}

// ── Quadrature Presets ──────────────────────────────────────

export function getQuadraturePresets(): QuadraturePreset[] {
  return [
    {
      name: 'exp',
      label: 'f(x) = e\u02E3',
      f: Math.exp,
      f_derivatives: {
        first: Math.exp,
        second: Math.exp,
        fourth: Math.exp,
      },
      domain: [0, 1],
      exactIntegral: Math.E - 1,
    },
    {
      name: 'sin',
      label: 'f(x) = sin(x)',
      f: Math.sin,
      f_derivatives: {
        first: Math.cos,
        second: (x: number) => -Math.sin(x),
        fourth: Math.sin,
      },
      domain: [0, Math.PI],
      exactIntegral: 2,
    },
    {
      name: 'arctan-deriv',
      label: 'f(x) = 1/(1+x\u00B2)',
      f: (x: number) => 1 / (1 + x * x),
      domain: [0, 1],
      exactIntegral: Math.PI / 4,
    },
    {
      name: 'sqrt',
      label: 'f(x) = \u221Ax',
      f: Math.sqrt,
      f_derivatives: {
        first: (x: number) => x > 0 ? 0.5 / Math.sqrt(x) : Infinity,
        second: (x: number) => x > 0 ? -0.25 * Math.pow(x, -1.5) : -Infinity,
      },
      domain: [0, 1],
      exactIntegral: 2 / 3,
      notes: 'f\u2033 unbounded at x=0 \u2014 trapezoidal rule loses its O(h\u00B2) advantage',
    },
  ];
}

// ── Dirichlet Function Data ─────────────────────────────────

/** Precomputed demonstration data for the Dirichlet function (non-integrable). */
export const DIRICHLET_FUNCTION_DATA = {
  name: 'dirichlet',
  label: '\u2131_Q(x) (Dirichlet function)',
  description: 'f(x) = 1 if x is rational, 0 if x is irrational',
  upperSumAlways: 1, // U(f, P) = b - a = 1 for [0, 1]
  lowerSumAlways: 0, // L(f, P) = 0 for every partition
  isIntegrable: false,
  reason: 'On every subinterval, sup f = 1 (rationals dense) and inf f = 0 (irrationals dense). The gap U - L = 1 never shrinks.',
} as const;
