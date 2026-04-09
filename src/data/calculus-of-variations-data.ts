/**
 * Data presets and scenario definitions for the Calculus of Variations
 * topic (Topic 32).
 *
 * All functions are pure and deterministic — no Math.random().
 * Follows the lazy-getter pattern of `hilbert-spaces-data.ts`.
 *
 * Four viz components consume this module:
 *  - `EulerLagrangeExplorer`   — via `getFunctionalSpecs()`
 *  - `DirectMethodExplorer`    — via `getFunctionalSpecs()`, `computeFunctionalValue()`
 *  - `EigenvalueExplorer`      — via `getEigenvalueData()`, `computeRayleighQuotient()`
 *  - `BrachistochroneExplorer` — via `getClassicalExamples()`, `getCycloidParameterization()`
 */

// ── Functional specifications ─────────────────────────────────────

/** A variational functional with evaluation and metadata. */
export interface FunctionalSpec {
  /** Human-readable name. */
  name: string;
  /** LaTeX formula for the Lagrangian L(x, y, y'). */
  lagrangian: string;
  /** LaTeX formula for the Euler-Lagrange equation. */
  eulerLagrange: string;
  /** LaTeX formula for the analytic solution (if available). */
  solution: string;
  /** Evaluate J[y] = ∫ L(x, y, y') dx via numerical quadrature. */
  evaluate: (
    y: (x: number) => number,
    yPrime: (x: number) => number,
    a: number,
    b: number,
    n?: number,
  ) => number;
  /** Evaluate the Lagrangian L(x, y, y') pointwise. */
  lagrangianFn: (x: number, y: number, yp: number) => number;
  /** Domain [a, b]. */
  domain: [number, number];
  /** Fixed boundary conditions. */
  boundaryConditions: { left: number; right: number };
  /** Analytic solution function (if available). */
  solutionFn?: (x: number) => number;
  /** Derivative of analytic solution (if available). */
  solutionDerivFn?: (x: number) => number;
}

const FUNCTIONAL_SPECS: FunctionalSpec[] = [
  {
    name: 'Energy',
    lagrangian: "L = \\tfrac{1}{2}y'^2",
    eulerLagrange: "y'' = 0",
    solution: 'y(x) = (1-x) \\cdot y(0) + x \\cdot y(1)',
    lagrangianFn: (_x, _y, yp) => 0.5 * yp * yp,
    evaluate: (y, yPrime, a, b, n = 200) => {
      const dx = (b - a) / n;
      let sum = 0;
      for (let i = 0; i <= n; i++) {
        const x = a + i * dx;
        const w = i === 0 || i === n ? 0.5 : 1;
        sum += w * 0.5 * yPrime(x) ** 2 * dx;
      }
      return sum;
    },
    domain: [0, 1],
    boundaryConditions: { left: 0, right: 1 },
    solutionFn: (x) => x,
    solutionDerivFn: (_x) => 1,
  },
  {
    name: 'Arc Length',
    lagrangian: "L = \\sqrt{1 + y'^2}",
    eulerLagrange: "\\frac{y''}{(1+y'^2)^{3/2}} = 0",
    solution: 'y(x) = (1-x) \\cdot y(0) + x \\cdot y(1)',
    lagrangianFn: (_x, _y, yp) => Math.sqrt(1 + yp * yp),
    evaluate: (y, yPrime, a, b, n = 200) => {
      const dx = (b - a) / n;
      let sum = 0;
      for (let i = 0; i <= n; i++) {
        const x = a + i * dx;
        const w = i === 0 || i === n ? 0.5 : 1;
        sum += w * Math.sqrt(1 + yPrime(x) ** 2) * dx;
      }
      return sum;
    },
    domain: [0, 1],
    boundaryConditions: { left: 0, right: 1 },
    solutionFn: (x) => x,
    solutionDerivFn: (_x) => 1,
  },
  {
    name: 'Brachistochrone',
    lagrangian: "L = \\sqrt{\\frac{1+y'^2}{2gy}}",
    eulerLagrange: '2yy\'\' + y\'^2 + 1 = 0',
    solution: 'x = R(\\theta - \\sin\\theta),\\; y = R(1 - \\cos\\theta)',
    lagrangianFn: (_x, y, yp) => {
      const safeY = Math.max(y, 1e-10);
      return Math.sqrt((1 + yp * yp) / (2 * 9.81 * safeY));
    },
    evaluate: (y, yPrime, a, b, n = 200) => {
      const g = 9.81;
      const dx = (b - a) / n;
      let sum = 0;
      for (let i = 0; i <= n; i++) {
        const x = a + i * dx;
        const w = i === 0 || i === n ? 0.5 : 1;
        const yVal = Math.max(y(x), 1e-10);
        sum += w * Math.sqrt((1 + yPrime(x) ** 2) / (2 * g * yVal)) * dx;
      }
      return sum;
    },
    domain: [0, 1],
    boundaryConditions: { left: 0.001, right: 0.5 },
  },
];

export function getFunctionalSpecs(): FunctionalSpec[] {
  return FUNCTIONAL_SPECS;
}

// ── Classical examples ────────────────────────────────────────────

/** A classical calculus of variations example. */
export interface ClassicalExample {
  /** Human-readable name. */
  name: string;
  /** Brief description. */
  description: string;
  /** LaTeX Lagrangian formula. */
  lagrangian: string;
  /** LaTeX solution formula. */
  solution: string;
  /** Parametric curve (if applicable). */
  parameterization?: (t: number, params?: Record<string, number>) => [number, number];
}

const CLASSICAL_EXAMPLES: ClassicalExample[] = [
  {
    name: 'Brachistochrone',
    description: 'Curve of fastest descent under gravity — the cycloid.',
    lagrangian: "L = \\sqrt{\\frac{1+y'^2}{2gy}}",
    solution: 'x = R(\\theta - \\sin\\theta),\\; y = R(1 - \\cos\\theta)',
    parameterization: (t, params) => {
      const R = params?.R ?? 0.5;
      return [R * (t - Math.sin(t)), R * (1 - Math.cos(t))];
    },
  },
  {
    name: 'Geodesics on Sphere',
    description: 'Great circles minimize arc length on S².',
    lagrangian: "L = \\sqrt{1 + \\sin^2\\phi\\, \\theta'^2}",
    solution: '\\text{Great circle: } \\cos c = \\cos\\phi\\cos(\\theta - \\theta_0)',
  },
  {
    name: 'Catenary',
    description: 'Hanging chain minimizing potential energy — y = a cosh(x/a).',
    lagrangian: "L = y\\sqrt{1 + y'^2}",
    solution: 'y = a\\cosh(x/a)',
    parameterization: (t, params) => {
      const a = params?.a ?? 1;
      return [t, a * Math.cosh(t / a)];
    },
  },
  {
    name: 'Isoperimetric Problem',
    description: 'Maximum area for fixed perimeter — the circle.',
    lagrangian: "L = y\\sqrt{1+y'^2} - \\lambda\\sqrt{1+y'^2}",
    solution: 'x^2 + y^2 = R^2',
  },
];

export function getClassicalExamples(): ClassicalExample[] {
  return CLASSICAL_EXAMPLES;
}

// ── Cycloid parametrization ──────────────────────────────────────

/**
 * Compute the cycloid parametrization for a brachistochrone from
 * the origin to a given endpoint, with gravity pointing down.
 *
 * Returns a function t ∈ [0, θ_max] → [x(t), y(t)].
 */
export function getCycloidParameterization(
  endpoint: [number, number],
): (t: number) => [number, number] {
  const [xEnd, yEnd] = endpoint;
  // Solve R(θ - sinθ) = xEnd, R(1 - cosθ) = yEnd numerically
  // Use Newton's method on the ratio: (θ - sinθ)/(1 - cosθ) = xEnd/yEnd
  const ratio = xEnd / Math.max(yEnd, 1e-10);
  let theta = Math.PI; // initial guess
  for (let iter = 0; iter < 50; iter++) {
    const f = (theta - Math.sin(theta)) / (1 - Math.cos(theta)) - ratio;
    const num = (1 - Math.cos(theta)) * (1 - Math.cos(theta));
    const denom =
      (1 - Math.cos(theta)) ** 2 -
      (theta - Math.sin(theta)) * Math.sin(theta);
    const fp = num > 1e-14 ? denom / num : 1;
    const step = f / Math.max(Math.abs(fp), 1e-10);
    theta -= Math.sign(fp) !== 0 ? step : 0;
    theta = Math.max(0.01, Math.min(2 * Math.PI - 0.01, theta));
    if (Math.abs(f) < 1e-12) break;
  }
  const R = yEnd / (1 - Math.cos(theta));
  const thetaMax = theta;

  return (t: number): [number, number] => {
    const s = t * thetaMax;
    return [R * (s - Math.sin(s)), R * (1 - Math.cos(s))];
  };
}

// ── Sobolev function examples ────────────────────────────────────

/** An example illustrating Sobolev membership. */
export interface SobolevFunctionExample {
  /** Human-readable name. */
  name: string;
  /** Human-readable formula. */
  formula: string;
  /** Whether the function is in H¹. */
  isInH1: boolean;
  /** Whether the function is in C¹. */
  isInC1: boolean;
  /** Human-readable weak derivative formula (if in H¹). */
  weakDerivative?: string;
}

const SOBOLEV_EXAMPLES: SobolevFunctionExample[] = [
  {
    name: 'Smooth sine',
    formula: 'sin(πx)',
    isInH1: true,
    isInC1: true,
    weakDerivative: 'π cos(πx)',
  },
  {
    name: 'Tent function',
    formula: 'min(x, 1−x) on [0,1]',
    isInH1: true,
    isInC1: false,
    weakDerivative: '+1 on (0, ½), −1 on (½, 1)',
  },
  {
    name: 'Corner function |x|',
    formula: '|x| on [−1, 1]',
    isInH1: true,
    isInC1: false,
    weakDerivative: 'sgn(x)',
  },
  {
    name: 'Singular: x^(−1/3)',
    formula: 'x^(−1/3) on (0, 1]',
    isInH1: false,
    isInC1: false,
  },
];

export function getSobolevExamples(): SobolevFunctionExample[] {
  return SOBOLEV_EXAMPLES;
}

// ── Eigenvalue data ──────────────────────────────────────────────

/** Eigenvalue/eigenfunction data for −u'' = λu on [0,π]. */
export interface EigenvalueData {
  /** Mode number. */
  n: number;
  /** Exact eigenvalue λ_n = n². */
  exactEigenvalue: number;
  /** Eigenfunction sin(nx). */
  eigenfunction: (x: number) => number;
  /** Derivative n·cos(nx). */
  eigenfunctionDerivative: (x: number) => number;
}

/**
 * Generate eigenvalue data for the first `nModes` eigenmodes of −u'' = λu on [0,π].
 */
export function getEigenvalueData(nModes: number): EigenvalueData[] {
  const data: EigenvalueData[] = [];
  for (let k = 1; k <= nModes; k++) {
    data.push({
      n: k,
      exactEigenvalue: k * k,
      eigenfunction: (x) => Math.sin(k * x),
      eigenfunctionDerivative: (x) => k * Math.cos(k * x),
    });
  }
  return data;
}

// ── Rayleigh quotient ────────────────────────────────────────────

/**
 * Compute the Rayleigh quotient R[u] = ∫ u'² dx / ∫ u² dx
 * for a continuous function on [a, b] via the trapezoidal rule.
 */
export function computeRayleighQuotient(
  u: (x: number) => number,
  uPrime: (x: number) => number,
  a: number,
  b: number,
  n = 500,
): number {
  const dx = (b - a) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i <= n; i++) {
    const x = a + i * dx;
    const w = i === 0 || i === n ? 0.5 : 1;
    num += w * uPrime(x) ** 2 * dx;
    den += w * u(x) ** 2 * dx;
  }
  if (den < 1e-14) return 0;
  return num / den;
}

// ── Functional value computation ─────────────────────────────────

/**
 * Evaluate a functional J[y] for a given FunctionalSpec, wrapping the
 * spec's evaluate function with sensible defaults.
 */
export function computeFunctionalValue(
  spec: FunctionalSpec,
  y: (x: number) => number,
  yPrime: (x: number) => number,
  n = 200,
): number {
  return spec.evaluate(y, yPrime, spec.domain[0], spec.domain[1], n);
}

// ── Descent time computation (brachistochrone) ───────────────────

/**
 * Compute the descent time for a bead on a parametric curve under gravity.
 * Uses ds/dt = √(2gy) (energy conservation from rest).
 *
 * @param curvePoints — array of [x, y] points (y > 0, gravity down)
 * @param g — gravitational acceleration (default 9.81)
 */
export function computeDescentTime(
  curvePoints: [number, number][],
  g = 9.81,
): number {
  let time = 0;
  for (let i = 1; i < curvePoints.length; i++) {
    const [x0, y0] = curvePoints[i - 1];
    const [x1, y1] = curvePoints[i];
    const dx = x1 - x0;
    const dy = y1 - y0;
    const ds = Math.sqrt(dx * dx + dy * dy);
    const yMid = Math.max((y0 + y1) / 2, 1e-10);
    const speed = Math.sqrt(2 * g * yMid);
    time += ds / speed;
  }
  return time;
}
