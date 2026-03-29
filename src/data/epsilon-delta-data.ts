/**
 * Function presets for the Epsilon-Delta & Continuity topic.
 * Shared across EpsilonDeltaExplorer, ContinuityTypesExplorer,
 * IVTExplorer, and LipschitzExplorer.
 */

export interface FunctionPreset {
  name: string;
  label: string;
  fn: (x: number) => number;
  a: number;
  L: number;
  domain: [number, number];
  deltaFormula: string;
  computeDelta: (epsilon: number) => number;
  continuousAtA: boolean;
  lipschitzK: number | null;
}

export interface DiscontinuityPreset {
  name: string;
  label: string;
  type: 'continuous' | 'removable' | 'jump' | 'essential';
  fn: (x: number) => number;
  a: number;
  leftLimit: number | null;
  rightLimit: number | null;
  fOfA: number | null;
  explanation: string;
}

export interface IVTPreset {
  name: string;
  fn: (x: number) => number;
  domain: [number, number];
  label: string;
}

export interface LipschitzPreset {
  name: string;
  fn: (x: number) => number;
  domain: [number, number];
  label: string;
  K: number | null;
  isLipschitz: boolean;
}

/**
 * Function presets for the EpsilonDeltaExplorer.
 * Each preset defines a function, the point a, the limit L,
 * and an exact or conservative delta formula.
 */
export function getFunctionPresets(): FunctionPreset[] {
  return [
    {
      name: '2x+1',
      label: 'f(x) = 2x + 1',
      fn: (x: number) => 2 * x + 1,
      a: 1,
      L: 3,
      domain: [-1, 3],
      deltaFormula: 'ε/2',
      computeDelta: (epsilon: number) => epsilon / 2,
      continuousAtA: true,
      lipschitzK: 2,
    },
    {
      name: 'x²',
      label: 'f(x) = x²',
      fn: (x: number) => x * x,
      a: 2,
      L: 4,
      domain: [0, 4],
      deltaFormula: 'min(1, ε/5)',
      computeDelta: (epsilon: number) => Math.min(1, epsilon / 5),
      continuousAtA: true,
      lipschitzK: null,
    },
    {
      name: 'sin(x)/x',
      label: 'f(x) = sin(x)/x',
      fn: (x: number) => (Math.abs(x) < 1e-12 ? 1 : Math.sin(x) / x),
      a: 0,
      L: 1,
      domain: [-4, 4],
      deltaFormula: '≈ ε (numerical)',
      computeDelta: (epsilon: number) => Math.min(1, epsilon * 0.8),
      continuousAtA: false,
      lipschitzK: null,
    },
    {
      name: '√x',
      label: 'f(x) = √x',
      fn: (x: number) => Math.sqrt(Math.max(0, x)),
      a: 1,
      L: 1,
      domain: [0, 4],
      deltaFormula: 'min(1, 2ε)',
      computeDelta: (epsilon: number) => Math.min(1, 2 * epsilon),
      continuousAtA: true,
      lipschitzK: null,
    },
    {
      name: '1/x',
      label: 'f(x) = 1/x',
      fn: (x: number) => 1 / x,
      a: 1,
      L: 1,
      domain: [0.2, 3],
      deltaFormula: 'min(1/2, ε/2)',
      computeDelta: (epsilon: number) => Math.min(0.5, epsilon / 2),
      continuousAtA: true,
      lipschitzK: null,
    },
  ];
}

/**
 * Discontinuity presets for the ContinuityTypesExplorer.
 * Four types: continuous, removable, jump, essential.
 */
export function getDiscontinuityPresets(): DiscontinuityPreset[] {
  return [
    {
      name: 'Continuous',
      label: 'f(x) = x²',
      type: 'continuous',
      fn: (x: number) => x * x,
      a: 1,
      leftLimit: 1,
      rightLimit: 1,
      fOfA: 1,
      explanation: 'All three conditions hold: f(1) = 1, the limit exists and equals 1, and f(1) equals the limit.',
    },
    {
      name: 'Removable',
      label: 'f(x) = sin(x)/x',
      type: 'removable',
      fn: (x: number) => {
        if (Math.abs(x) < 1e-12) return 0; // f(0) = 0, but limit is 1
        return Math.sin(x) / x;
      },
      a: 0,
      leftLimit: 1,
      rightLimit: 1,
      fOfA: 0,
      explanation: 'The limit exists and equals 1, but f(0) = 0 ≠ 1. Redefining f(0) = 1 would remove the discontinuity.',
    },
    {
      name: 'Jump',
      label: 'f(x) = ⌊x⌋ (floor)',
      type: 'jump',
      fn: (x: number) => Math.floor(x),
      a: 1,
      leftLimit: 0,
      rightLimit: 1,
      fOfA: 1,
      explanation: 'Both one-sided limits exist, but they disagree: lim from left = 0, lim from right = 1. No single δ works.',
    },
    {
      name: 'Essential',
      label: 'f(x) = sin(1/x)',
      type: 'essential',
      fn: (x: number) => {
        if (Math.abs(x) < 1e-12) return 0;
        return Math.sin(1 / x);
      },
      a: 0,
      leftLimit: null,
      rightLimit: null,
      fOfA: 0,
      explanation: 'The function oscillates between -1 and 1 infinitely often near x = 0. Neither one-sided limit exists.',
    },
  ];
}

/**
 * IVT presets for the IVTExplorer.
 */
export function getIVTPresets(): IVTPreset[] {
  return [
    {
      name: 'x³ - 2x - 2',
      fn: (x: number) => x * x * x - 2 * x - 2,
      domain: [0, 3],
      label: 'f(x) = x³ − 2x − 2',
    },
    {
      name: 'cos(x)',
      fn: (x: number) => Math.cos(x),
      domain: [0, Math.PI],
      label: 'f(x) = cos(x)',
    },
    {
      name: 'x·sin(x)',
      fn: (x: number) => x * Math.sin(x),
      domain: [0, 4 * Math.PI],
      label: 'f(x) = x·sin(x)',
    },
  ];
}

/**
 * Lipschitz presets for the LipschitzExplorer.
 */
export function getLipschitzPresets(): LipschitzPreset[] {
  return [
    {
      name: 'sin(x)',
      fn: (x: number) => Math.sin(x),
      domain: [-Math.PI, Math.PI],
      label: 'f(x) = sin(x)',
      K: 1,
      isLipschitz: true,
    },
    {
      name: 'x²',
      fn: (x: number) => x * x,
      domain: [-2, 2],
      label: 'f(x) = x² on [−2, 2]',
      K: 4,
      isLipschitz: true,
    },
    {
      name: '√x',
      fn: (x: number) => Math.sqrt(Math.max(0, x)),
      domain: [0, 2],
      label: 'f(x) = √x on [0, 2]',
      K: null,
      isLipschitz: false,
    },
  ];
}
