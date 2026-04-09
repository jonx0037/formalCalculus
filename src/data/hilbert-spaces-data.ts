/**
 * Data presets and scenario definitions for the Inner Product &
 * Hilbert Spaces topic (Topic 31).
 *
 * All functions are pure and deterministic — no Math.random().
 * Follows the lazy-getter pattern of `banach-spaces-data.ts`.
 *
 * Four viz components consume this module:
 *  - `ProjectionExplorer`              — via `computeProjection()`
 *  - `GramSchmidtExplorer`             — via `computeGramSchmidt()`
 *  - `SpectralDecompositionExplorer`    — via `computeSpectralDecomposition()`
 *  - `RKHSExplorer`                    — via `getKernelSpecs()`
 */

// ── Inner product examples ──────────────────────────────────────

/** A named inner product example for the exposition. */
export interface InnerProductExample {
  /** Human-readable name. */
  name: string;
  /** The space on which the inner product is defined. */
  space: string;
  /** Human-readable formula for the inner product (Unicode, not LaTeX). */
  formula: string;
  /** Human-readable formula for the induced norm (Unicode, not LaTeX). */
  inducedNorm: string;
  /** Whether the space is complete under this inner product. */
  isComplete: boolean;
}

const INNER_PRODUCT_EXAMPLES: InnerProductExample[] = [
  {
    name: 'Euclidean',
    space: 'ℝⁿ',
    formula: '⟨x, y⟩ = Σ xᵢyᵢ',
    inducedNorm: '‖x‖₂ = √(Σ xᵢ²)',
    isComplete: true,
  },
  {
    name: 'L² inner product',
    space: 'L²[a,b]',
    formula: '⟨f, g⟩ = ∫ₐᵇ f(x)g(x) dx',
    inducedNorm: '‖f‖₂ = √(∫ₐᵇ |f(x)|² dx)',
    isComplete: true,
  },
  {
    name: 'ℓ² inner product',
    space: 'ℓ²',
    formula: '⟨x, y⟩ = Σₙ xₙyₙ',
    inducedNorm: '‖x‖₂ = √(Σₙ |xₙ|²)',
    isComplete: true,
  },
  {
    name: 'Weighted Euclidean',
    space: 'ℝⁿ',
    formula: '⟨x, y⟩_w = Σ wᵢxᵢyᵢ  (wᵢ > 0)',
    inducedNorm: '‖x‖_w = √(Σ wᵢxᵢ²)',
    isComplete: true,
  },
];

export function getInnerProductExamples(): InnerProductExample[] {
  return INNER_PRODUCT_EXAMPLES;
}

// ── Kernel specifications for RKHSExplorer ──────────────────────

/** A kernel function with evaluation and metadata. */
export interface KernelSpec {
  /** Stable string id. */
  id: string;
  /** Human-readable name. */
  name: string;
  /** Human-readable formula (Unicode, not LaTeX). */
  formula: string;
  /** Evaluate K(x, y) with optional parameters. */
  evaluate: (x: number, y: number, params?: Record<string, number>) => number;
  /** Tunable parameters with their defaults and ranges. */
  params: { name: string; default: number; min: number; max: number }[];
  /** Brief description of the associated RKHS. */
  rkhsDescription: string;
}

const KERNEL_SPECS: KernelSpec[] = [
  {
    id: 'gaussian',
    name: 'Gaussian (RBF)',
    formula: 'K(x,y) = exp(−‖x−y‖²/(2σ²))',
    evaluate: (x, y, params) => {
      const sigma = params?.sigma ?? 1;
      const diff = x - y;
      return Math.exp(-(diff * diff) / (2 * sigma * sigma));
    },
    params: [{ name: 'sigma', default: 1, min: 0.1, max: 5 }],
    rkhsDescription: 'Infinite-dimensional RKHS of smooth functions. Universally approximating.',
  },
  {
    id: 'polynomial2',
    name: 'Polynomial (d=2)',
    formula: 'K(x,y) = (1 + xy)²',
    evaluate: (x, y) => (1 + x * y) ** 2,
    params: [],
    rkhsDescription: 'Finite-dimensional: polynomials of degree ≤ 2.',
  },
  {
    id: 'polynomial3',
    name: 'Polynomial (d=3)',
    formula: 'K(x,y) = (1 + xy)³',
    evaluate: (x, y) => (1 + x * y) ** 3,
    params: [],
    rkhsDescription: 'Finite-dimensional: polynomials of degree ≤ 3.',
  },
  {
    id: 'linear',
    name: 'Linear',
    formula: 'K(x,y) = xy',
    evaluate: (x, y) => x * y,
    params: [],
    rkhsDescription: 'RKHS of linear functions through the origin.',
  },
];

export function getKernelSpecs(): KernelSpec[] {
  return KERNEL_SPECS;
}

export function getKernelSpec(id: string): KernelSpec {
  return KERNEL_SPECS.find((k) => k.id === id) ?? KERNEL_SPECS[0];
}

export const KERNEL_IDS = ['gaussian', 'polynomial2', 'polynomial3', 'linear'] as const;
export type KernelId = (typeof KERNEL_IDS)[number];

// ── Spectral decomposition for SpectralDecompositionExplorer ────

/** Eigendecomposition of a 2×2 symmetric matrix. */
export interface SpectralData {
  /** Matrix entries [a11, a12, a21, a22] with a12 = a21. */
  matrix: [number, number, number, number];
  /** Eigenvalues in descending order of absolute value. */
  eigenvalues: [number, number];
  /** Eigenvectors as unit column vectors [[v1x, v1y], [v2x, v2y]]. */
  eigenvectors: [[number, number], [number, number]];
}

/**
 * Compute the eigendecomposition of a 2×2 symmetric matrix.
 * Input: [a11, a12, a21, a22] with a12 = a21 (symmetry enforced).
 *
 * Uses the closed-form solution of the characteristic equation:
 * λ = (trace ± √(trace² − 4·det)) / 2
 */
export function computeSpectralDecomposition(
  matrix: [number, number, number, number],
): SpectralData {
  const [a11, a12, a21, a22] = matrix;
  // Enforce symmetry by averaging off-diagonal entries
  const b12 = (a12 + a21) / 2;

  const trace = a11 + a22;
  const det = a11 * a22 - b12 * b12;
  const disc = Math.sqrt(Math.max(0, trace * trace - 4 * det));

  let lambda1 = (trace + disc) / 2;
  let lambda2 = (trace - disc) / 2;

  // Eigenvector for lambda1
  let v1: [number, number];
  if (Math.abs(b12) > 1e-14) {
    v1 = [lambda1 - a22, b12];
  } else if (a11 >= a22) {
    v1 = [1, 0];
  } else {
    v1 = [0, 1];
  }
  const n1 = Math.sqrt(v1[0] * v1[0] + v1[1] * v1[1]);
  if (n1 > 1e-14) {
    v1[0] /= n1;
    v1[1] /= n1;
  }

  // Orthogonal eigenvector for lambda2
  const v2: [number, number] = [-v1[1], v1[0]];

  // Sort by descending |λ|
  if (Math.abs(lambda2) > Math.abs(lambda1)) {
    [lambda1, lambda2] = [lambda2, lambda1];
    return {
      matrix: [a11, b12, b12, a22],
      eigenvalues: [lambda1, lambda2],
      eigenvectors: [v2, v1],
    };
  }

  return {
    matrix: [a11, b12, b12, a22],
    eigenvalues: [lambda1, lambda2],
    eigenvectors: [v1, v2],
  };
}

// ── Gram-Schmidt wrapper for viz ────────────────────────────────

/**
 * Step-by-step Gram-Schmidt for visualization.
 * Returns intermediate states so the explorer can animate each step.
 */
export interface GramSchmidtStep {
  /** Index of the input vector being processed. */
  inputIndex: number;
  /** The original input vector. */
  original: number[];
  /** Projections subtracted in this step: [coefficient, onb vector index]. */
  projections: Array<{ coeff: number; onbIndex: number; projVector: number[] }>;
  /** The orthogonalized (but not yet normalized) vector. */
  orthogonalized: number[];
  /** The normalized result (or null if linearly dependent). */
  normalized: number[] | null;
}

/**
 * Compute Gram-Schmidt with full step-by-step trace.
 * Each step records the projections subtracted and the intermediate vectors.
 */
export function computeGramSchmidtSteps(vectors: number[][]): GramSchmidtStep[] {
  if (vectors.length === 0) return [];
  const n = vectors[0].length;
  const onb: number[][] = [];
  const steps: GramSchmidtStep[] = [];

  for (let idx = 0; idx < vectors.length; idx++) {
    const v = vectors[idx];
    const u = [...v];
    const projections: GramSchmidtStep['projections'] = [];

    for (let k = 0; k < onb.length; k++) {
      const ek = onb[k];
      let coeff = 0;
      for (let i = 0; i < n; i++) coeff += u[i] * ek[i];
      const projVector = ek.map((ei) => coeff * ei);
      projections.push({ coeff, onbIndex: k, projVector });
      for (let i = 0; i < n; i++) u[i] -= coeff * ek[i];
    }

    let normVal = 0;
    for (let i = 0; i < n; i++) normVal += u[i] * u[i];
    normVal = Math.sqrt(normVal);

    let normalized: number[] | null = null;
    if (normVal > 1e-12) {
      normalized = u.map((ui) => ui / normVal);
      onb.push(normalized);
    }

    steps.push({
      inputIndex: idx,
      original: [...v],
      projections,
      orthogonalized: [...u],
      normalized,
    });
  }

  return steps;
}

// ── Projection wrapper for viz ──────────────────────────────────

/**
 * Compute orthogonal projection of x onto the subspace spanned by
 * `subspaceBasis` (not necessarily orthonormal — Gram-Schmidt is
 * applied internally).
 */
export function computeProjection(
  x: number[],
  subspaceBasis: number[][],
): { projection: number[]; residual: number[]; distance: number } {
  const n = x.length;
  // Orthonormalize the basis
  const onb: number[][] = [];
  for (const v of subspaceBasis) {
    const u = [...v];
    for (const ek of onb) {
      let c = 0;
      for (let i = 0; i < n; i++) c += u[i] * ek[i];
      for (let i = 0; i < n; i++) u[i] -= c * ek[i];
    }
    let norm = 0;
    for (let i = 0; i < n; i++) norm += u[i] * u[i];
    norm = Math.sqrt(norm);
    if (norm > 1e-12) {
      for (let i = 0; i < n; i++) u[i] /= norm;
      onb.push(u);
    }
  }

  // Project
  const projection = new Array<number>(n).fill(0);
  for (const ek of onb) {
    let c = 0;
    for (let i = 0; i < n; i++) c += x[i] * ek[i];
    for (let i = 0; i < n; i++) projection[i] += c * ek[i];
  }

  const residual = x.map((xi, i) => xi - projection[i]);
  let dist = 0;
  for (let i = 0; i < n; i++) dist += residual[i] * residual[i];
  dist = Math.sqrt(dist);

  return { projection, residual, distance: dist };
}

// ── RKHS representer theorem solver ─────────────────────────────

/**
 * Solve the representer theorem: given training points {(x_i, y_i)}
 * and a kernel K, find f*(x) = Σ α_i K(x_i, x) minimizing
 * Σ (f(x_i) − y_i)² + λ ‖f‖²_H.
 *
 * The solution is α = (K + λI)⁻¹ y where K_ij = K(x_i, x_j).
 */
export function solveRepresenter(
  trainX: number[],
  trainY: number[],
  kernel: (x: number, y: number) => number,
  lambda = 0.01,
): { alpha: number[]; rkhsNormSq: number } {
  const n = trainX.length;
  if (n === 0) return { alpha: [], rkhsNormSq: 0 };

  // Build kernel matrix K₀ (symmetric) and regularized K₀ + λI
  const K0: number[][] = [];
  const K: number[][] = [];
  for (let i = 0; i < n; i++) {
    K0[i] = [];
    K[i] = [];
    for (let j = i; j < n; j++) {
      const val = kernel(trainX[i], trainX[j]);
      K0[i][j] = val;
      K[i][j] = val + (i === j ? lambda : 0);
      if (i !== j) {
        K0[j] = K0[j] || [];
        K0[j][i] = val;
        K[j] = K[j] || [];
        K[j][i] = val;
      }
    }
  }

  // Solve via Gaussian elimination with partial pivoting (n ≤ 8)
  const A = K.map((row) => [...row]);
  const b = [...trainY];

  for (let col = 0; col < n; col++) {
    // Pivot
    let maxVal = Math.abs(A[col][col]);
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(A[row][col]) > maxVal) {
        maxVal = Math.abs(A[row][col]);
        maxRow = row;
      }
    }
    if (maxRow !== col) {
      [A[col], A[maxRow]] = [A[maxRow], A[col]];
      [b[col], b[maxRow]] = [b[maxRow], b[col]];
    }

    // Eliminate below
    const pivot = A[col][col];
    if (Math.abs(pivot) < 1e-14) continue;
    for (let row = col + 1; row < n; row++) {
      const factor = A[row][col] / pivot;
      for (let j = col; j < n; j++) A[row][j] -= factor * A[col][j];
      b[row] -= factor * b[col];
    }
  }

  // Back-substitute
  const alpha = new Array<number>(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = b[i];
    for (let j = i + 1; j < n; j++) sum -= A[i][j] * alpha[j];
    alpha[i] = Math.abs(A[i][i]) > 1e-14 ? sum / A[i][i] : 0;
  }

  // RKHS norm: ‖f‖²_H = αᵀ K₀ α (reuse cached kernel matrix)
  let rkhsNormSq = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      rkhsNormSq += alpha[i] * alpha[j] * K0[i][j];
    }
  }

  return { alpha, rkhsNormSq };
}
