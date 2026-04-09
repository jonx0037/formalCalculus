/**
 * Shared functional-analysis utilities for Topics 30–32
 * (Banach Spaces, Hilbert Spaces, Calculus of Variations).
 *
 * Provides norm computation, unit-ball sampling, operator-norm
 * calculation, and dual-norm helpers that recur across the three
 * Functional Analysis Essentials visualization components.
 *
 * All functions are pure and deterministic — no Math.random().
 * Follows the same conventions as `plotting.ts`.
 */

// ── Interfaces ───────────────────────────────────────────────

/** An ℓ^p norm on ℝⁿ, parameterized by p. */
export interface LpNorm {
  /** The exponent: 1, 2, or Infinity. */
  p: number;
  /** Compute the ℓ^p norm of a vector x. */
  compute: (x: number[]) => number;
  /** Sample the unit ball boundary in ℝ² (numPoints evenly-spaced angles). */
  sampleUnitBall: (numPoints: number) => Array<{ x: number; y: number }>;
}

/** Result of an operator-norm computation for a 2×2 matrix. */
export interface OperatorNormResult {
  /** The operator norm ‖A‖_{p→q}. */
  norm: number;
  /** Singular values [σ₁, σ₂] with σ₁ ≥ σ₂ ≥ 0. */
  singularValues: [number, number];
  /** The unit vector achieving the supremum (right singular vector for p=2). */
  maximizingDirection: [number, number];
}

// ── Conjugate exponent ───────────────────────────────────────

/**
 * Compute the conjugate exponent q given p, where 1/p + 1/q = 1.
 *  - p = 1  → q = Infinity
 *  - p = 2  → q = 2
 *  - p = ∞  → q = 1
 */
export function conjugateExponent(p: number): number {
  if (p === 1) return Infinity;
  if (!Number.isFinite(p)) return 1;
  return p / (p - 1);
}

// ── Lp norm creation ─────────────────────────────────────────

/**
 * Create an LpNorm for the given p value (1, 2, or Infinity).
 * The returned object bundles a norm evaluator and a unit-ball sampler.
 */
export function createLpNorm(p: number): LpNorm {
  const compute = (x: number[]): number => {
    if (!Number.isFinite(p)) {
      // ℓ^∞ norm: max |x_i|
      let m = 0;
      for (const xi of x) {
        const a = Math.abs(xi);
        if (a > m) m = a;
      }
      return m;
    }
    if (p === 1) {
      let s = 0;
      for (const xi of x) s += Math.abs(xi);
      return s;
    }
    if (p === 2) {
      let s = 0;
      for (const xi of x) s += xi * xi;
      return Math.sqrt(s);
    }
    // General p
    let s = 0;
    for (const xi of x) s += Math.abs(xi) ** p;
    return s ** (1 / p);
  };

  const sampleUnitBall = (numPoints: number): Array<{ x: number; y: number }> => {
    const pts: Array<{ x: number; y: number }> = [];

    if (!Number.isFinite(p)) {
      // ℓ^∞ unit ball in ℝ²: the square [-1,1]×[-1,1]
      const n = Math.max(4, Math.floor(numPoints / 4));
      for (let i = 0; i <= n; i++) {
        const t = -1 + (2 * i) / n;
        pts.push({ x: t, y: 1 });  // top edge
      }
      for (let i = 0; i <= n; i++) {
        const t = 1 - (2 * i) / n;
        pts.push({ x: 1, y: t });  // right edge
      }
      for (let i = 0; i <= n; i++) {
        const t = 1 - (2 * i) / n;
        pts.push({ x: t, y: -1 }); // bottom edge
      }
      for (let i = 0; i <= n; i++) {
        const t = -1 + (2 * i) / n;
        pts.push({ x: -1, y: t }); // left edge
      }
      return pts;
    }

    if (p === 1) {
      // ℓ¹ unit ball in ℝ²: the diamond |x|+|y|=1
      const n = Math.max(4, Math.floor(numPoints / 4));
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        pts.push({ x: 1 - t, y: t });    // top-right
      }
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        pts.push({ x: -t, y: 1 - t });   // top-left
      }
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        pts.push({ x: -1 + t, y: -t });  // bottom-left
      }
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        pts.push({ x: t, y: -1 + t });   // bottom-right
      }
      return pts;
    }

    // General p (including p=2): superellipse |x|^p + |y|^p = 1
    for (let i = 0; i < numPoints; i++) {
      const theta = (2 * Math.PI * i) / numPoints;
      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);
      // Scale the (cosθ, sinθ) direction to lie on the ℓ^p unit sphere
      const r = (Math.abs(cosT) ** p + Math.abs(sinT) ** p) ** (-1 / p);
      pts.push({ x: r * cosT, y: r * sinT });
    }
    return pts;
  };

  return { p, compute, sampleUnitBall };
}

// ── 2×2 SVD ──────────────────────────────────────────────────

/** Deterministic 2×2 SVD returning [σ₁, σ₂, U, V] with σ₁ ≥ σ₂ ≥ 0. */
function svd2x2(
  a11: number, a12: number, a21: number, a22: number,
): { s1: number; s2: number; u: [number, number]; v: [number, number] } {
  // AᵀA entries
  const g11 = a11 * a11 + a21 * a21;
  const g12 = a11 * a12 + a21 * a22;
  const g22 = a12 * a12 + a22 * a22;

  // Eigenvalues of AᵀA via the characteristic polynomial
  const trace = g11 + g22;
  const det = g11 * g22 - g12 * g12;
  const disc = Math.sqrt(Math.max(0, trace * trace - 4 * det));
  const lambda1 = (trace + disc) / 2;
  const lambda2 = (trace - disc) / 2;

  const s1 = Math.sqrt(Math.max(0, lambda1));
  const s2 = Math.sqrt(Math.max(0, lambda2));

  // Right singular vector v₁ for the larger singular value.
  // Use whichever row of (AᵀA - λ₁I) has larger entries to avoid
  // catastrophic cancellation when λ₁ ≈ g₁₁ or λ₁ ≈ g₂₂.
  let vx: number, vy: number;
  if (Math.abs(g12) > 1e-14) {
    if (Math.abs(lambda1 - g11) > Math.abs(lambda1 - g22)) {
      vx = g12;
      vy = lambda1 - g11;
    } else {
      vx = lambda1 - g22;
      vy = g12;
    }
  } else if (g11 >= g22) {
    vx = 1;
    vy = 0;
  } else {
    vx = 0;
    vy = 1;
  }
  const vnorm = Math.sqrt(vx * vx + vy * vy);
  if (vnorm > 1e-14) {
    vx /= vnorm;
    vy /= vnorm;
  }

  // Left singular vector u₁ = Av₁ / σ₁
  let ux = a11 * vx + a12 * vy;
  let uy = a21 * vx + a22 * vy;
  if (s1 > 1e-14) {
    ux /= s1;
    uy /= s1;
  }

  return { s1, s2, u: [ux, uy], v: [vx, vy] };
}

// ── Operator norm ────────────────────────────────────────────

/**
 * Compute the operator norm of a 2×2 matrix A under ℓ^p → ℓ^p norms.
 *
 * @param matrix — [a11, a12, a21, a22]
 * @param inputP — p for the input norm (1, 2, or Infinity)
 * @param outputP — p for the output norm (defaults to inputP)
 */
export function computeOperatorNorm(
  matrix: [number, number, number, number],
  inputP: number,
  outputP?: number,
): OperatorNormResult {
  const [a11, a12, a21, a22] = matrix;
  const outP = outputP ?? inputP;
  const outNorm = createLpNorm(outP);
  const { s1, s2, v } = svd2x2(a11, a12, a21, a22);

  if (inputP === 2 && outP === 2) {
    // ℓ²→ℓ² operator norm = largest singular value
    return {
      norm: s1,
      singularValues: [s1, s2],
      maximizingDirection: v,
    };
  }

  if (inputP === 1 && outP === 1) {
    // ℓ¹→ℓ¹ norm = max column sum of absolute values
    const col1 = Math.abs(a11) + Math.abs(a21);
    const col2 = Math.abs(a12) + Math.abs(a22);
    const norm = Math.max(col1, col2);
    const dir: [number, number] = col1 >= col2 ? [1, 0] : [0, 1];
    return { norm, singularValues: [s1, s2], maximizingDirection: dir };
  }

  if (!Number.isFinite(inputP) && !Number.isFinite(outP)) {
    // ℓ^∞→ℓ^∞ norm = max row sum of absolute values
    const row1 = Math.abs(a11) + Math.abs(a12);
    const row2 = Math.abs(a21) + Math.abs(a22);
    const norm = Math.max(row1, row2);
    // Maximizer: sign pattern of the maximizing row, on the ℓ^∞ unit sphere
    const dir: [number, number] = row1 >= row2
      ? [Math.sign(a11) || 1, Math.sign(a12) || 1]
      : [Math.sign(a21) || 1, Math.sign(a22) || 1];
    return {
      norm,
      singularValues: [s1, s2],
      maximizingDirection: dir,
    };
  }

  // General case: numerical search over the input unit ball boundary
  const inputBall = createLpNorm(inputP).sampleUnitBall(500);
  let bestNorm = 0;
  let bestDir: [number, number] = [1, 0];
  for (const pt of inputBall) {
    const imgX = a11 * pt.x + a12 * pt.y;
    const imgY = a21 * pt.x + a22 * pt.y;
    const n = outNorm.compute([imgX, imgY]);
    if (n > bestNorm) {
      bestNorm = n;
      bestDir = [pt.x, pt.y];
    }
  }

  return {
    norm: bestNorm,
    singularValues: [s1, s2],
    maximizingDirection: bestDir,
  };
}

// ── Dual norm ────────────────────────────────────────────────

/**
 * Compute the dual norm ‖y‖_* = sup_{‖x‖_p ≤ 1} ⟨y, x⟩.
 * For ℓ^p, the dual norm is ℓ^q with 1/p + 1/q = 1.
 */
export function computeDualNorm(y: number[], p: number): number {
  const q = conjugateExponent(p);
  return createLpNorm(q).compute(y);
}

/**
 * Find the point x* on the ℓ^p unit ball where the functional
 * ⟨y, x⟩ is maximized, in ℝ².
 */
export function dualMaximizer(
  y: [number, number],
  p: number,
): { point: [number, number]; value: number } {
  if (p === 1) {
    // Dual is ℓ^∞: maximizer is sign(y) capped to ℓ¹ unit ball
    // For ℓ¹, the maximizer is the standard basis vector e_i where |y_i| is largest
    if (Math.abs(y[0]) >= Math.abs(y[1])) {
      const s = y[0] >= 0 ? 1 : -1;
      return { point: [s, 0], value: Math.abs(y[0]) };
    }
    const s = y[1] >= 0 ? 1 : -1;
    return { point: [0, s], value: Math.abs(y[1]) };
  }

  if (!Number.isFinite(p)) {
    // Dual is ℓ¹: maximizer is sign(y_i) for each component
    const sx = y[0] >= 0 ? 1 : -1;
    const sy = y[1] >= 0 ? 1 : -1;
    const val = Math.abs(y[0]) + Math.abs(y[1]);
    return { point: [sx, sy], value: val };
  }

  if (p === 2) {
    // Self-dual: maximizer is y / ‖y‖₂
    const norm = Math.sqrt(y[0] * y[0] + y[1] * y[1]);
    if (norm < 1e-14) return { point: [0, 0], value: 0 };
    return { point: [y[0] / norm, y[1] / norm], value: norm };
  }

  // General p: x*_i = sign(y_i) |y_i|^{q-1} / ‖y‖_q^{q-1}
  const q = conjugateExponent(p);
  const dualNorm = createLpNorm(q).compute(y);
  if (dualNorm < 1e-14) return { point: [0, 0], value: 0 };
  const scale = dualNorm ** (q - 1);
  const x0 = (Math.sign(y[0]) * Math.abs(y[0]) ** (q - 1)) / scale;
  const x1 = (Math.sign(y[1]) * Math.abs(y[1]) ** (q - 1)) / scale;
  return { point: [x0, x1], value: dualNorm };
}

// ═══════════════════════════════════════════════════════════════
//  Topic 31 — Inner Product & Hilbert Spaces
// ═══════════════════════════════════════════════════════════════

// ── Inner-product interfaces ────────────────────────────────────

/** An inner product on ℝⁿ with its induced norm. */
export interface InnerProduct {
  /** Compute ⟨x, y⟩. */
  compute(x: number[], y: number[]): number;
  /** Compute ‖x‖ = √⟨x, x⟩. */
  norm(x: number[]): number;
  /** Dimension of the space. */
  dim: number;
}

/** Result of projecting x onto a subspace spanned by an ONB. */
export interface ProjectionResult {
  /** The projection P_M(x). */
  projection: number[];
  /** The residual x − P_M(x). */
  residual: number[];
  /** Distance ‖x − P_M(x)‖. */
  distance: number;
  /** Fourier coefficients ⟨x, e_k⟩ for each ONB vector. */
  coefficients: number[];
}

// ── Inner product creation ──────────────────────────────────────

/**
 * Create the standard Euclidean inner product on ℝⁿ:
 * ⟨x, y⟩ = Σ x_i y_i
 */
export function createStandardInnerProduct(n: number): InnerProduct {
  return {
    compute(x: number[], y: number[]): number {
      let s = 0;
      for (let i = 0; i < n; i++) s += x[i] * y[i];
      return s;
    },
    norm(x: number[]): number {
      let s = 0;
      for (let i = 0; i < n; i++) s += x[i] * x[i];
      return Math.sqrt(s);
    },
    dim: n,
  };
}

/**
 * Create a weighted inner product on ℝⁿ:
 * ⟨x, y⟩_w = Σ w_i x_i y_i   (all w_i > 0)
 */
export function createWeightedInnerProduct(weights: number[]): InnerProduct {
  const n = weights.length;
  return {
    compute(x: number[], y: number[]): number {
      let s = 0;
      for (let i = 0; i < n; i++) s += weights[i] * x[i] * y[i];
      return s;
    },
    norm(x: number[]): number {
      let s = 0;
      for (let i = 0; i < n; i++) s += weights[i] * x[i] * x[i];
      return Math.sqrt(s);
    },
    dim: n,
  };
}

// ── Projection ──────────────────────────────────────────────────

/**
 * Project x onto the subspace spanned by an orthonormal basis `onb`.
 * Each row of `onb` is one basis vector e_k.
 * Uses the standard inner product unless `ip` is provided.
 *
 * P_M(x) = Σ ⟨x, e_k⟩ e_k
 */
export function projectOntoSubspace(
  x: number[],
  onb: number[][],
  ip?: InnerProduct,
): ProjectionResult {
  const n = x.length;
  const innerProduct = ip ?? createStandardInnerProduct(n);
  const projection = new Array<number>(n).fill(0);
  const coefficients: number[] = [];

  for (const ek of onb) {
    const ck = innerProduct.compute(x, ek);
    coefficients.push(ck);
    for (let i = 0; i < n; i++) projection[i] += ck * ek[i];
  }

  const residual = x.map((xi, i) => xi - projection[i]);
  const distance = innerProduct.norm(residual);

  return { projection, residual, distance, coefficients };
}

// ── Gram-Schmidt ────────────────────────────────────────────────

/**
 * Gram-Schmidt orthonormalization.
 * Returns an orthonormal set from linearly independent input vectors.
 * Skips (near-)zero vectors after orthogonalization (tolerance 1e-12).
 * Uses the standard inner product unless `ip` is provided.
 */
export function gramSchmidt(
  vectors: number[][],
  ip?: InnerProduct,
): number[][] {
  if (vectors.length === 0) return [];
  const n = vectors[0].length;
  const innerProduct = ip ?? createStandardInnerProduct(n);
  const result: number[][] = [];

  for (const v of vectors) {
    // Subtract projections onto all previously computed ONB vectors
    const u = [...v];
    for (const ek of result) {
      const ck = innerProduct.compute(u, ek);
      for (let i = 0; i < n; i++) u[i] -= ck * ek[i];
    }
    // Normalize
    const norm = innerProduct.norm(u);
    if (norm < 1e-12) continue; // linearly dependent — skip
    for (let i = 0; i < n; i++) u[i] /= norm;
    result.push(u);
  }

  return result;
}

// ── Parallelogram law test ──────────────────────────────────────

/**
 * Check whether a norm satisfies the parallelogram law:
 *   ‖x + y‖² + ‖x − y‖² = 2(‖x‖² + ‖y‖²)
 *
 * Returns whether the law holds within `tol` (default 1e-8)
 * across all supplied sample pairs, plus the maximum deviation.
 */
export function checkParallelogramLaw(
  norm: (x: number[]) => number,
  samplePairs: [number[], number[]][],
  tol = 1e-8,
): { satisfied: boolean; maxDeviation: number } {
  let maxDev = 0;

  for (const [x, y] of samplePairs) {
    const n = x.length;
    const xPlusY = x.map((xi, i) => xi + y[i]);
    const xMinusY = x.map((xi, i) => xi - y[i]);

    const lhs = norm(xPlusY) ** 2 + norm(xMinusY) ** 2;
    const rhs = 2 * (norm(x) ** 2 + norm(y) ** 2);
    const dev = rhs > 0 ? Math.abs(lhs - rhs) / rhs : Math.abs(lhs - rhs);
    if (dev > maxDev) maxDev = dev;
  }

  return { satisfied: maxDev <= tol, maxDeviation: maxDev };
}
