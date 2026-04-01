/**
 * Data module for the Improper Integrals & Special Functions topic.
 * Provides preset configurations for all five visualization components:
 *  - ImproperIntegralExplorer (Type I and Type II presets)
 *  - ComparisonTestExplorer
 *  - GammaFunctionExplorer
 *  - GaussianIntegralExplorer (no presets needed — parameterized by sliders)
 *  - StirlingExplorer
 *
 * All functions are pure and deterministic.
 */

import { gammaFunction, stirlingApproximation } from '../components/viz/shared/integration';

// ── Interfaces ──────────────────────────────────────────────

export interface ImproperIntegralPreset {
  name: string;
  /** Display label using Unicode math symbols */
  label: string;
  /** The function to integrate */
  f: (x: number) => number;
  /** Type I (unbounded interval) or Type II (unbounded integrand) */
  type: 'I' | 'II';
  /** Location of singularity for Type II */
  singularity?: number;
  /** Left endpoint */
  defaultA: number;
  /** Right endpoint or starting limit */
  defaultB: number;
  /** Exact value of the integral (null if divergent) */
  exactValue: number | null;
  /** Whether the integral converges */
  converges: boolean;
  /** The p exponent if this is a 1/x^p example */
  pTestExponent?: number;
  /** Brief explanation */
  notes?: string;
}

export interface ComparisonPreset {
  name: string;
  /** Display label */
  label: string;
  /** The function being tested */
  f: (x: number) => number;
  /** The bounding function (g >= f for direct comparison) */
  g: (x: number) => number;
  /** Display label for f */
  fLabel: string;
  /** Display label for g */
  gLabel: string;
  /** Integration domain [a, b] where b may be large */
  domain: [number, number];
  /** Type of comparison test */
  testType: 'direct' | 'limit';
  /** Limit ratio L = lim f/g for limit comparison */
  limitRatio?: number;
  /** Result of the convergence test */
  convergenceResult: 'converges' | 'diverges';
  /** Exact integral of f (if known) */
  exactF?: number;
  /** Exact integral of g (if known) */
  exactG?: number;
}

export interface GammaPreset {
  name: string;
  /** The parameter s */
  s: number;
  /** Exact value of Gamma(s) */
  exactValue: number;
  /** Whether s is a positive integer + 1 (i.e., Gamma(s) = (s-1)!) */
  isFactorial: boolean;
  /** Display label */
  label: string;
}

export interface StirlingDataPoint {
  n: number;
  factorial: number;
  stirling: number;
  improvedStirling: number;
  relativeError: number;
  logFactorial: number;
  logStirling: number;
}

// ── Type I Presets ───────────────────────────────────────────

export const TYPE_I_PRESETS: ImproperIntegralPreset[] = [
  {
    name: 'one-over-x-squared',
    label: 'f(x) = 1/x\u00B2',
    f: (x: number) => 1 / (x * x),
    type: 'I',
    defaultA: 1,
    defaultB: 50,
    exactValue: 1,
    converges: true,
    pTestExponent: 2,
    notes: 'p = 2 > 1, so the integral converges to 1/(p\u22121) = 1',
  },
  {
    name: 'one-over-x',
    label: 'f(x) = 1/x',
    f: (x: number) => 1 / x,
    type: 'I',
    defaultA: 1,
    defaultB: 50,
    exactValue: null,
    converges: false,
    pTestExponent: 1,
    notes: 'p = 1 is the borderline case: \u222B 1/x dx = ln(b) \u2192 \u221E',
  },
  {
    name: 'exp-neg-x',
    label: 'f(x) = e\u207B\u02E3',
    f: (x: number) => Math.exp(-x),
    type: 'I',
    defaultA: 0,
    defaultB: 50,
    exactValue: 1,
    converges: true,
    notes: 'Exponential decay: \u222B\u2080\u221E e\u207B\u02E3 dx = 1',
  },
  {
    name: 'one-over-sqrt-x',
    label: 'f(x) = 1/\u221Ax',
    f: (x: number) => 1 / Math.sqrt(x),
    type: 'I',
    defaultA: 1,
    defaultB: 50,
    exactValue: null,
    converges: false,
    pTestExponent: 0.5,
    notes: 'p = 1/2 < 1: too slow to decay, integral diverges',
  },
  {
    name: 'one-over-one-plus-x-squared',
    label: 'f(x) = 1/(1+x\u00B2)',
    f: (x: number) => 1 / (1 + x * x),
    type: 'I',
    defaultA: 1,
    defaultB: 50,
    exactValue: Math.PI / 4,
    converges: true,
    notes: '\u222B\u2081\u221E 1/(1+x\u00B2) dx = \u03C0/2 \u2212 \u03C0/4 = \u03C0/4',
  },
];

// ── Type II Presets ──────────────────────────────────────────

export const TYPE_II_PRESETS: ImproperIntegralPreset[] = [
  {
    name: 'one-over-sqrt-x-01',
    label: 'f(x) = 1/\u221Ax on (0,1]',
    f: (x: number) => 1 / Math.sqrt(x),
    type: 'II',
    singularity: 0,
    defaultA: 0,
    defaultB: 1,
    exactValue: 2,
    converges: true,
    pTestExponent: 0.5,
    notes: 'p = 1/2 < 1: the integral converges to 2',
  },
  {
    name: 'one-over-x-01',
    label: 'f(x) = 1/x on (0,1]',
    f: (x: number) => 1 / x,
    type: 'II',
    singularity: 0,
    defaultA: 0,
    defaultB: 1,
    exactValue: null,
    converges: false,
    pTestExponent: 1,
    notes: 'p = 1 is the borderline case: \u222B 1/x dx = \u2212ln(\u03B5) \u2192 \u221E',
  },
  {
    name: 'one-over-x-two-thirds-01',
    label: 'f(x) = 1/x\u00B2\u2033\u00B3 on (0,1]',
    f: (x: number) => 1 / Math.pow(x, 2 / 3),
    type: 'II',
    singularity: 0,
    defaultA: 0,
    defaultB: 1,
    exactValue: 3,
    converges: true,
    pTestExponent: 2 / 3,
    notes: 'p = 2/3 < 1: converges to 1/(1\u2212p) = 3',
  },
  {
    name: 'ln-x-01',
    label: 'f(x) = ln(x) on (0,1]',
    f: (x: number) => Math.log(x),
    type: 'II',
    singularity: 0,
    defaultA: 0,
    defaultB: 1,
    exactValue: -1,
    converges: true,
    notes: '\u222B\u2080\u00B9 ln(x) dx = [x ln(x) \u2212 x]\u2080\u00B9 = \u22121 (ln(x) \u2192 \u2212\u221E but x ln(x) \u2192 0)',
  },
];

// ── Comparison Test Presets ──────────────────────────────────

export const COMPARISON_PRESETS: ComparisonPreset[] = [
  {
    name: 'arctan-vs-inv-x-sq',
    label: '1/(1+x\u00B2) \u2264 1/x\u00B2',
    f: (x: number) => 1 / (1 + x * x),
    g: (x: number) => 1 / (x * x),
    fLabel: 'f(x) = 1/(1+x\u00B2)',
    gLabel: 'g(x) = 1/x\u00B2',
    domain: [1, 50],
    testType: 'direct',
    convergenceResult: 'converges',
    exactF: Math.PI / 4,
    exactG: 1,
  },
  {
    name: 'x-over-x3-plus-1',
    label: 'x/(x\u00B3+1) ~ 1/x\u00B2',
    f: (x: number) => x / (x * x * x + 1),
    g: (x: number) => 1 / (x * x),
    fLabel: 'f(x) = x/(x\u00B3+1)',
    gLabel: 'g(x) = 1/x\u00B2',
    domain: [1, 50],
    testType: 'limit',
    limitRatio: 1,
    convergenceResult: 'converges',
    exactG: 1,
  },
  {
    name: 'sin-sq-over-x-sq',
    label: 'sin\u00B2(x)/x\u00B2 \u2264 1/x\u00B2',
    f: (x: number) => Math.sin(x) * Math.sin(x) / (x * x),
    g: (x: number) => 1 / (x * x),
    fLabel: 'f(x) = sin\u00B2(x)/x\u00B2',
    gLabel: 'g(x) = 1/x\u00B2',
    domain: [1, 50],
    testType: 'direct',
    convergenceResult: 'converges',
    exactG: 1,
  },
  {
    name: 'inv-sqrt-vs-inv-x',
    label: '1/x \u2264 1/\u221Ax (wrong direction)',
    f: (x: number) => 1 / x,
    g: (x: number) => 1 / Math.sqrt(x),
    fLabel: 'f(x) = 1/x',
    gLabel: 'g(x) = 1/\u221Ax',
    domain: [1, 50],
    testType: 'direct',
    convergenceResult: 'diverges',
  },
];

// ── Gamma Factorial Points ──────────────────────────────────

export const GAMMA_FACTORIAL_POINTS: GammaPreset[] = [
  { name: 'gamma-half', s: 0.5, exactValue: Math.sqrt(Math.PI), isFactorial: false, label: '\u0393(1/2) = \u221A\u03C0' },
  { name: 'gamma-1', s: 1, exactValue: 1, isFactorial: true, label: '\u0393(1) = 0! = 1' },
  { name: 'gamma-3-half', s: 1.5, exactValue: Math.sqrt(Math.PI) / 2, isFactorial: false, label: '\u0393(3/2) = \u221A\u03C0/2' },
  { name: 'gamma-2', s: 2, exactValue: 1, isFactorial: true, label: '\u0393(2) = 1! = 1' },
  { name: 'gamma-5-half', s: 2.5, exactValue: 3 * Math.sqrt(Math.PI) / 4, isFactorial: false, label: '\u0393(5/2) = 3\u221A\u03C0/4' },
  { name: 'gamma-3', s: 3, exactValue: 2, isFactorial: true, label: '\u0393(3) = 2! = 2' },
  { name: 'gamma-4', s: 4, exactValue: 6, isFactorial: true, label: '\u0393(4) = 3! = 6' },
  { name: 'gamma-5', s: 5, exactValue: 24, isFactorial: true, label: '\u0393(5) = 4! = 24' },
];

// ── Stirling Data ───────────────────────────────────────────

function computeStirlingData(): StirlingDataPoint[] {
  const data: StirlingDataPoint[] = [];
  for (let n = 1; n <= 50; n++) {
    const gResult = gammaFunction(n + 1);
    const sResult = stirlingApproximation(n);
    data.push({
      n,
      factorial: gResult.value,
      stirling: sResult.value,
      improvedStirling: sResult.improvedValue,
      relativeError: sResult.relativeError,
      logFactorial: gResult.logValue,
      logStirling: sResult.logValue,
    });
  }
  return data;
}

export const STIRLING_DATA: StirlingDataPoint[] = computeStirlingData();
