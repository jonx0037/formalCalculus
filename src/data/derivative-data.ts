/**
 * Function presets for the Derivative & Chain Rule topic.
 * Shared across SecantToTangentExplorer, LinearApproximationExplorer,
 * DifferentiabilityExplorer, ChainRuleCompositionExplorer, and
 * BackpropGraphExplorer.
 */

// ── Precomputed Weierstrass power tables ────────────────────

const WEIERSTRASS_A_POWERS: number[] = [];
const WEIERSTRASS_B_POWERS: number[] = [];

{
  let aPow = 1;
  let bPow = 1;
  for (let k = 0; k < 50; k++) {
    WEIERSTRASS_A_POWERS.push(aPow);
    WEIERSTRASS_B_POWERS.push(bPow);
    aPow *= 0.5;
    bPow *= 7;
  }
}

// ── Interfaces ──────────────────────────────────────────────

export interface DerivativeFunctionPreset {
  name: string;
  label: string;
  fn: (x: number) => number;
  derivative: (x: number) => number;
  derivativeLabel: string;
  domain: [number, number];
  defaultA: number;
}

export interface ChainRulePreset {
  name: string;
  label: string;
  inner: (x: number) => number;
  innerPrime: (x: number) => number;
  innerLabel: string;
  outer: (u: number) => number;
  outerPrime: (u: number) => number;
  outerLabel: string;
  domain: [number, number];
}

export interface ActivationPreset {
  name: string;
  label: string;
  sigma: (z: number) => number;
  sigmaPrime: (z: number) => number;
  formulaLabel: string;
}

export interface DifferentiabilityPreset {
  name: string;
  label: string;
  fn: (x: number) => number;
  type: 'smooth' | 'corner' | 'cusp' | 'weierstrass';
  a: number;
  explanation: string;
}

export interface WeierstrassParams {
  a: number;
  b: number;
  maxTerms: number;
}

// ── Function presets ────────────────────────────────────────

/**
 * Five function presets for the SecantToTangent and LinearApproximation explorers.
 * Each includes the exact derivative for comparison with secant slopes.
 */
export function getFunctionPresets(): DerivativeFunctionPreset[] {
  return [
    {
      name: 'x-squared',
      label: 'f(x) = x²',
      fn: (x: number) => x * x,
      derivative: (x: number) => 2 * x,
      derivativeLabel: "f'(x) = 2x",
      domain: [-2, 4],
      defaultA: 1,
    },
    {
      name: 'sin',
      label: 'f(x) = sin(x)',
      fn: Math.sin,
      derivative: Math.cos,
      derivativeLabel: "f'(x) = cos(x)",
      domain: [-Math.PI, 2 * Math.PI],
      defaultA: Math.PI / 4,
    },
    {
      name: 'sqrt',
      label: 'f(x) = √x',
      fn: Math.sqrt,
      derivative: (x: number) => 1 / (2 * Math.sqrt(x)),
      derivativeLabel: "f'(x) = 1/(2√x)",
      domain: [0.01, 5],
      defaultA: 1,
    },
    {
      name: 'exp',
      label: 'f(x) = eˣ',
      fn: Math.exp,
      derivative: Math.exp,
      derivativeLabel: "f'(x) = eˣ",
      domain: [-2, 3],
      defaultA: 1,
    },
    {
      name: 'reciprocal',
      label: 'f(x) = 1/x',
      fn: (x: number) => 1 / x,
      derivative: (x: number) => -1 / (x * x),
      derivativeLabel: "f'(x) = -1/x²",
      domain: [0.2, 4],
      defaultA: 1,
    },
  ];
}

// ── Chain rule presets ──────────────────────────────────────

/**
 * Three composition pairs for the ChainRuleCompositionExplorer.
 * Each defines inner g(x) and outer f(u), with exact derivatives.
 */
export function getChainRulePresets(): ChainRulePreset[] {
  return [
    {
      name: 'sin-of-x-squared',
      label: 'sin(x²)',
      inner: (x: number) => x * x,
      innerPrime: (x: number) => 2 * x,
      innerLabel: 'g(x) = x²',
      outer: Math.sin,
      outerPrime: Math.cos,
      outerLabel: 'f(u) = sin(u)',
      domain: [-2, 2],
    },
    {
      name: 'exp-of-sin',
      label: 'eˢⁱⁿ⁽ˣ⁾',
      inner: Math.sin,
      innerPrime: Math.cos,
      innerLabel: 'g(x) = sin(x)',
      outer: Math.exp,
      outerPrime: Math.exp,
      outerLabel: 'f(u) = eᵘ',
      domain: [-Math.PI, Math.PI],
    },
    {
      name: 'ln-of-x-squared-plus-1',
      label: 'ln(x² + 1)',
      inner: (x: number) => x * x + 1,
      innerPrime: (x: number) => 2 * x,
      innerLabel: 'g(x) = x² + 1',
      outer: Math.log,
      outerPrime: (u: number) => 1 / u,
      outerLabel: 'f(u) = ln(u)',
      domain: [-3, 3],
    },
  ];
}

// ── Activation presets ──────────────────────────────────────

/**
 * Three activation functions for the BackpropGraphExplorer.
 * Each includes the exact derivative for gradient computation.
 */
export function getActivationPresets(): ActivationPreset[] {
  return [
    {
      name: 'sigmoid',
      label: 'Sigmoid',
      sigma: (z: number) => 1 / (1 + Math.exp(-z)),
      sigmaPrime: (z: number) => {
        const s = 1 / (1 + Math.exp(-z));
        return s * (1 - s);
      },
      formulaLabel: 'σ(z) = 1/(1 + e⁻ᶻ)',
    },
    {
      name: 'tanh',
      label: 'Tanh',
      sigma: Math.tanh,
      sigmaPrime: (z: number) => {
        const t = Math.tanh(z);
        return 1 - t * t;
      },
      formulaLabel: 'σ(z) = tanh(z)',
    },
    {
      name: 'relu',
      label: 'ReLU',
      sigma: (z: number) => Math.max(0, z),
      sigmaPrime: (z: number) => (z > 0 ? 1 : 0),
      formulaLabel: 'σ(z) = max(0, z)',
    },
  ];
}

// ── Differentiability presets ───────────────────────────────

/**
 * Four presets for the DifferentiabilityExplorer, showcasing
 * smooth, corner, cusp, and Weierstrass-type behavior.
 */
export function getDifferentiabilityPresets(): DifferentiabilityPreset[] {
  return [
    {
      name: 'smooth',
      label: 'Smooth: x²',
      fn: (x: number) => x * x,
      type: 'smooth',
      a: 0,
      explanation:
        'f(x) = x² is differentiable everywhere. Both left and right difference quotients converge to f\'(0) = 0.',
    },
    {
      name: 'corner',
      label: 'Corner: |x|',
      fn: Math.abs,
      type: 'corner',
      a: 0,
      explanation:
        'f(x) = |x| has a corner at x = 0. The left derivative is −1 and the right derivative is +1 — they disagree, so f\'(0) does not exist.',
    },
    {
      name: 'cusp',
      label: 'Cusp: x²ᐟ³',
      fn: (x: number) => Math.pow(Math.abs(x), 2 / 3),
      type: 'cusp',
      a: 0,
      explanation:
        'f(x) = |x|^{2/3} has a cusp at x = 0. The difference quotient |h|^{2/3}/h = |h|^{-1/3} → ±∞ as h → 0, so the derivative is infinite.',
    },
    {
      name: 'weierstrass',
      label: 'Weierstrass function',
      fn: (x: number) => {
        // Partial sum with a=0.5, b=7, 30 terms using precomputed powers
        let sum = 0;
        for (let k = 0; k < 30; k++) {
          sum += WEIERSTRASS_A_POWERS[k] * Math.cos(WEIERSTRASS_B_POWERS[k] * Math.PI * x);
        }
        return sum;
      },
      type: 'weierstrass',
      a: 0,
      explanation:
        'The Weierstrass function W(x) = Σ aⁿcos(bⁿπx) is continuous everywhere but differentiable nowhere. Difference quotients oscillate without settling.',
    },
  ];
}

// ── Weierstrass parameters ──────────────────────────────────

export function getWeierstrassParams(): WeierstrassParams {
  return { a: 0.5, b: 7, maxTerms: 50 };
}
