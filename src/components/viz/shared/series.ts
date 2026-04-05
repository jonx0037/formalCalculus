/**
 * Shared utility module for the Sequences, Series & Approximation track (Track 5).
 * Created by Topic 17 (series-convergence). Will be extended by Topics 18–20
 * (power series, Fourier series, approximation theory).
 *
 * Builds on limits.ts — importing generateSequence and computeEpsilonN, because
 * series convergence IS sequence convergence of the partial-sum sequence.
 *
 * All functions are pure and deterministic — no Math.random().
 */

// ── Interfaces ──────────────────────────────────────────────

export interface PartialSumResult {
  n: number;
  Sn: number;
  an: number;
  error: number | null;
}

export interface RatioTestDiagnostic {
  n: number;
  ratio: number;
}

export interface RootTestDiagnostic {
  n: number;
  root: number;
}

export interface ConvergenceVerdict {
  converges: boolean | null;
  diagnostic: number | null;
  label: string;
}

// ── Partial-sum computation ─────────────────────────────────

/**
 * Compute the first maxN partial sums of a series defined by its term function.
 *
 * The partial sum S_n = a_1 + a_2 + ... + a_n is accumulated incrementally.
 * If exactSum is provided, the error |S_n - S| is computed at each step.
 */
export function computePartialSums(
  term: (n: number) => number,
  maxN: number,
  exactSum?: number,
): PartialSumResult[] {
  const results: PartialSumResult[] = [];
  let Sn = 0;

  for (let n = 1; n <= maxN; n++) {
    const an = term(n);
    Sn += an;
    results.push({
      n,
      Sn,
      an,
      error: exactSum !== undefined ? Math.abs(Sn - exactSum) : null,
    });
  }

  return results;
}

// ── Convergence tests ───────────────────────────────────────

/**
 * Apply the divergence test (nth-term test): check if a_n → 0.
 *
 * If lim a_n ≠ 0, the series diverges. If a_n → 0, the test is inconclusive.
 * We check the last 20% of terms — if they don't approach zero, diverges.
 */
export function divergenceTest(
  term: (n: number) => number,
  maxN: number = 200,
): ConvergenceVerdict {
  const tailStart = Math.max(1, Math.floor(maxN * 0.8));
  const tailTerms: number[] = [];

  for (let n = tailStart; n <= maxN; n++) {
    tailTerms.push(Math.abs(term(n)));
  }

  if (tailTerms.length === 0) {
    return { converges: null, diagnostic: null, label: 'Inconclusive (no terms)' };
  }

  const avgTail = tailTerms.reduce((s, v) => s + v, 0) / tailTerms.length;

  // If the average of |a_n| in the tail is still > 0.01, terms don't approach 0
  if (avgTail > 0.01) {
    return {
      converges: false,
      diagnostic: avgTail,
      label: `Diverges: aₙ ↛ 0 (avg tail ≈ ${avgTail.toFixed(4)})`,
    };
  }

  return {
    converges: null,
    diagnostic: avgTail,
    label: `Inconclusive: aₙ → 0 (avg tail ≈ ${avgTail.toExponential(2)})`,
  };
}

/**
 * Apply the ratio test: compute |a_{n+1}/a_n| for n = 1..maxN.
 *
 * L < 1 → converges absolutely; L > 1 → diverges; L = 1 → inconclusive.
 * We estimate L from the average of the last 20% of diagnostic values.
 */
export function ratioTest(
  term: (n: number) => number,
  maxN: number = 200,
): { diagnostics: RatioTestDiagnostic[]; verdict: ConvergenceVerdict } {
  const diagnostics: RatioTestDiagnostic[] = [];

  for (let n = 1; n < maxN; n++) {
    const an = Math.abs(term(n));
    const an1 = Math.abs(term(n + 1));

    if (an > 1e-15) {
      diagnostics.push({ n, ratio: an1 / an });
    }
  }

  if (diagnostics.length < 5) {
    return {
      diagnostics,
      verdict: { converges: null, diagnostic: null, label: 'Inconclusive (insufficient data)' },
    };
  }

  // Estimate L from the tail
  const tailCount = Math.max(5, Math.floor(diagnostics.length * 0.2));
  const tail = diagnostics.slice(-tailCount);
  const L = tail.reduce((s, d) => s + d.ratio, 0) / tail.length;

  let verdict: ConvergenceVerdict;
  if (L < 0.99) {
    verdict = { converges: true, diagnostic: L, label: `Converges: L ≈ ${L.toFixed(4)} < 1` };
  } else if (L > 1.01) {
    verdict = { converges: false, diagnostic: L, label: `Diverges: L ≈ ${L.toFixed(4)} > 1` };
  } else {
    verdict = { converges: null, diagnostic: L, label: `Inconclusive: L ≈ ${L.toFixed(4)} ≈ 1` };
  }

  return { diagnostics, verdict };
}

/**
 * Apply the root test: compute |a_n|^{1/n} for n = 1..maxN.
 *
 * L < 1 → converges absolutely; L > 1 → diverges; L = 1 → inconclusive.
 */
export function rootTest(
  term: (n: number) => number,
  maxN: number = 200,
): { diagnostics: RootTestDiagnostic[]; verdict: ConvergenceVerdict } {
  const diagnostics: RootTestDiagnostic[] = [];

  for (let n = 1; n <= maxN; n++) {
    const absAn = Math.abs(term(n));
    if (absAn > 0) {
      diagnostics.push({ n, root: Math.pow(absAn, 1 / n) });
    }
  }

  if (diagnostics.length < 5) {
    return {
      diagnostics,
      verdict: { converges: null, diagnostic: null, label: 'Inconclusive (insufficient data)' },
    };
  }

  const tailCount = Math.max(5, Math.floor(diagnostics.length * 0.2));
  const tail = diagnostics.slice(-tailCount);
  const L = tail.reduce((s, d) => s + d.root, 0) / tail.length;

  let verdict: ConvergenceVerdict;
  if (L < 0.99) {
    verdict = { converges: true, diagnostic: L, label: `Converges: L ≈ ${L.toFixed(4)} < 1` };
  } else if (L > 1.01) {
    verdict = { converges: false, diagnostic: L, label: `Diverges: L ≈ ${L.toFixed(4)} > 1` };
  } else {
    verdict = { converges: null, diagnostic: L, label: `Inconclusive: L ≈ ${L.toFixed(4)} ≈ 1` };
  }

  return { diagnostics, verdict };
}

/**
 * Compute the integral test approximation using the trapezoidal rule.
 *
 * For f positive, continuous, and decreasing on [1, ∞):
 * ∫₁^N f(x)dx ≤ Σf(n) ≤ f(1) + ∫₁^N f(x)dx
 *
 * Returns both the integral estimate and partial sum so we can compare.
 */
export function integralTestApprox(
  f: (x: number) => number,
  maxN: number,
  steps: number = 1000,
): { integralValue: number; partialSum: number; ratio: number } {
  // Trapezoidal rule on [1, maxN]
  const h = (maxN - 1) / steps;
  let integral = 0.5 * (f(1) + f(maxN));
  for (let i = 1; i < steps; i++) {
    integral += f(1 + i * h);
  }
  integral *= h;

  // Partial sum
  let partialSum = 0;
  for (let n = 1; n <= maxN; n++) {
    partialSum += f(n);
  }

  const ratio = partialSum / (integral || 1);

  return { integralValue: integral, partialSum, ratio };
}

// ── Riemann rearrangement ───────────────────────────────────

/**
 * Construct a Riemann rearrangement of a conditionally convergent series
 * that converges to a specified target value.
 *
 * Algorithm: alternate between adding positive terms until the partial sum
 * exceeds the target, then adding negative terms until it drops below.
 * Because both the positive and negative subseries diverge to ±∞ (conditional
 * convergence), and the terms tend to 0, the overshoots shrink and the
 * rearranged partial sums converge to the target.
 */
export function riemannRearrangement(
  positiveTerms: (k: number) => number,
  negativeTerms: (k: number) => number,
  target: number,
  maxTerms: number,
): { terms: number[]; partialSums: number[] } {
  const terms: number[] = [];
  const partialSums: number[] = [];
  let sum = 0;
  let posIdx = 1;
  let negIdx = 1;

  for (let i = 0; i < maxTerms; i++) {
    if (sum <= target) {
      // Add positive terms until we exceed the target
      const t = positiveTerms(posIdx);
      posIdx++;
      terms.push(t);
      sum += t;
    } else {
      // Add negative terms until we drop below the target
      const t = -Math.abs(negativeTerms(negIdx));
      negIdx++;
      terms.push(t);
      sum += t;
    }
    partialSums.push(sum);
  }

  return { terms, partialSums };
}

// ── Benchmark series ────────────────────────────────────────

/**
 * Compute the geometric series sum 1/(1-r) or the partial sum (1-r^{n+1})/(1-r).
 * Returns null if |r| >= 1 (the infinite series diverges).
 */
export function geometricSeriesSum(
  r: number,
  n?: number,
): number | null {
  if (n !== undefined) {
    // Partial sum: (1 - r^{n+1}) / (1 - r) for r ≠ 1
    if (Math.abs(r - 1) < 1e-15) return n + 1;
    return (1 - Math.pow(r, n + 1)) / (1 - r);
  }

  // Infinite sum: converges only if |r| < 1
  if (Math.abs(r) >= 1) return null;
  return 1 / (1 - r);
}

/**
 * Classify a p-series: Σ 1/n^p converges iff p > 1.
 */
export function pSeriesConverges(p: number): boolean {
  return p > 1;
}

// ── Power series utilities (Topic 18) ──────────────────────

/**
 * Compute the radius of convergence of a power series
 * given its coefficient function aₙ.
 * Uses the Cauchy-Hadamard formula: 1/R = limsup |aₙ|^{1/n}.
 * Falls back to ratio test if root test is inconclusive.
 */
export function radiusOfConvergence(
  coefficients: (n: number) => number,
  maxTerms: number = 200,
): { radius: number; method: 'root' | 'ratio'; diagnostics: number[] } {
  // Cauchy-Hadamard via root test on coefficients
  const rootDiags: number[] = [];
  for (let n = 1; n <= maxTerms; n++) {
    const absAn = Math.abs(coefficients(n));
    if (absAn > 0 && isFinite(absAn)) {
      rootDiags.push(Math.pow(absAn, 1 / n));
    } else if (absAn === 0) {
      rootDiags.push(0);
    } else {
      // Infinity coefficient → R = 0
      return { radius: 0, method: 'root', diagnostics: rootDiags };
    }
  }

  // Estimate limsup from the tail
  const tailCount = Math.max(10, Math.floor(rootDiags.length * 0.2));
  const tail = rootDiags.slice(-tailCount);

  if (tail.length === 0) {
    return { radius: Infinity, method: 'root', diagnostics: rootDiags };
  }

  // limsup: take the max of the tail as an approximation
  const limsup = Math.max(...tail);

  if (limsup < 1e-12) {
    return { radius: Infinity, method: 'root', diagnostics: rootDiags };
  }

  if (!isFinite(limsup) || limsup > 1e12) {
    return { radius: 0, method: 'root', diagnostics: rootDiags };
  }

  const rootRadius = 1 / limsup;

  // Check if root test gave a clear answer (not ≈ inconclusive)
  const spread = Math.max(...tail) - Math.min(...tail);
  if (spread < 0.1 * limsup) {
    return { radius: rootRadius, method: 'root', diagnostics: rootDiags };
  }

  // Fallback: ratio test on coefficients
  const ratioDiags: number[] = [];
  for (let n = 1; n < maxTerms; n++) {
    const absAn = Math.abs(coefficients(n));
    const absAn1 = Math.abs(coefficients(n + 1));
    if (absAn > 1e-15 && isFinite(absAn) && isFinite(absAn1)) {
      ratioDiags.push(absAn / absAn1);  // R = lim |aₙ/aₙ₊₁|
    }
  }

  if (ratioDiags.length < 10) {
    return { radius: rootRadius, method: 'root', diagnostics: rootDiags };
  }

  const ratioTail = ratioDiags.slice(-tailCount);
  const ratioAvg = ratioTail.reduce((s, v) => s + v, 0) / ratioTail.length;

  if (!isFinite(ratioAvg) || ratioAvg > 1e12) {
    return { radius: Infinity, method: 'ratio', diagnostics: ratioDiags };
  }
  if (ratioAvg < 1e-12) {
    return { radius: 0, method: 'ratio', diagnostics: ratioDiags };
  }

  return { radius: ratioAvg, method: 'ratio', diagnostics: ratioDiags };
}

/**
 * Evaluate a power series partial sum Sₙ(x) = Σ_{k=0}^{n} aₖ (x - c)^k.
 *
 * Uses Horner's method: a₀ + dx·(a₁ + dx·(a₂ + ... + dx·aₙ)).
 * This evaluates in O(n) with one multiplication per step and reduces
 * overflow risk compared to computing (x-c)^k directly.
 */
export function powerSeriesEvaluate(
  coefficients: (k: number) => number,
  center: number,
  x: number,
  n: number,
): number {
  const dx = x - center;
  let sum = 0;

  for (let k = n; k >= 0; k--) {
    const ak = coefficients(k);
    if (!isFinite(ak)) return ak;
    sum = ak + sum * dx;
    if (!isFinite(sum)) return sum;
  }

  return sum;
}

/**
 * Compute the differentiated power series coefficients.
 * If aₙ are the original coefficients, returns bₙ = (n+1) aₙ₊₁.
 */
export function differentiateCoefficients(
  coefficients: (n: number) => number,
): (n: number) => number {
  return (n: number) => (n + 1) * coefficients(n + 1);
}

/**
 * Compute the integrated power series coefficients.
 * If aₙ are the original coefficients, returns bₙ = aₙ₋₁/n for n ≥ 1, b₀ = 0.
 */
export function integrateCoefficients(
  coefficients: (n: number) => number,
): (n: number) => number {
  return (n: number) => {
    if (n === 0) return 0;
    return coefficients(n - 1) / n;
  };
}

// ── Fourier series utilities (Topic 19) ──────────────────────

export interface FourierCoefficientArrays {
  a: number[];
  b: number[];
}

/**
 * Compute the Fourier coefficients aₙ and bₙ of a function f
 * on [-π, π] using the composite trapezoidal rule.
 *
 * The trapezoidal rule is exponentially accurate for smooth periodic
 * functions — a fact that is itself a consequence of Fourier analysis
 * (the error depends on the Fourier coefficient decay of the integrand).
 *
 * @param f - The function to decompose
 * @param maxN - Maximum harmonic number (default: 50)
 * @param numQuadPoints - Quadrature points (default: 512)
 * @returns { a: number[], b: number[] } where a[n] = aₙ and b[n] = bₙ
 */
export function fourierCoefficients(
  f: (x: number) => number,
  maxN: number = 50,
  numQuadPoints: number = 512,
): FourierCoefficientArrays {
  const M = numQuadPoints;
  const h = (2 * Math.PI) / M;

  // Precompute function values at quadrature nodes
  const fVals: number[] = [];
  for (let j = 0; j < M; j++) {
    fVals.push(f(-Math.PI + j * h));
  }

  const a: number[] = [];
  const b: number[] = [];

  for (let n = 0; n <= maxN; n++) {
    let aSum = 0;
    let bSum = 0;
    for (let j = 0; j < M; j++) {
      const x = -Math.PI + j * h;
      aSum += fVals[j] * Math.cos(n * x);
      bSum += fVals[j] * Math.sin(n * x);
    }
    // Trapezoidal rule: (h/π) Σ f(xⱼ) cos(nxⱼ) = (2/M) Σ ...
    // Factor of 1/π comes from the inner product normalization
    a.push((aSum * h) / Math.PI);
    b.push((bSum * h) / Math.PI);
  }

  return { a, b };
}

/**
 * Evaluate the Fourier partial sum Sₙ(x) given coefficient arrays.
 *
 * Sₙ(x) = a₀/2 + Σ_{k=1}^{n} (aₖ cos(kx) + bₖ sin(kx))
 *
 * @param a - Cosine coefficients (a[0] = a₀, a[1] = a₁, ...)
 * @param b - Sine coefficients (b[0] unused, b[1] = b₁, ...)
 * @param x - Point at which to evaluate
 * @param n - Number of harmonics to include
 * @returns Sₙ(x)
 */
export function fourierPartialSum(
  a: number[],
  b: number[],
  x: number,
  n: number,
): number {
  let sum = (a[0] ?? 0) / 2;
  const limit = Math.min(n, a.length - 1, b.length - 1);

  for (let k = 1; k <= limit; k++) {
    sum += (a[k] ?? 0) * Math.cos(k * x) + (b[k] ?? 0) * Math.sin(k * x);
  }

  return sum;
}

/**
 * Compute the Dirichlet kernel Dₙ(t) = sin((n + 1/2)t) / (2 sin(t/2)).
 *
 * At t = 0 (and multiples of 2π), L'Hôpital gives Dₙ(0) = (2n + 1)/2.
 * This kernel appears in the convolution representation of Fourier
 * partial sums: Sₙ(x) = (1/π) ∫ f(t) Dₙ(x − t) dt.
 *
 * @param n - Kernel order
 * @param t - Evaluation point
 * @returns Dₙ(t)
 */
export function dirichletKernel(n: number, t: number): number {
  const halfT = t / 2;

  // Guard: near t = 0 or t = 2kπ, use L'Hôpital limiting value
  if (Math.abs(Math.sin(halfT)) < 1e-12) {
    return (2 * n + 1) / 2;
  }

  return Math.sin((n + 0.5) * t) / (2 * Math.sin(halfT));
}

// ── Approximation theory utilities (Topic 20) ─────────────────

/**
 * Evaluate the nth Bernstein polynomial of f at x.
 * B_n(f; x) = Σ_{k=0}^{n} f(k/n) · C(n,k) · x^k · (1−x)^{n−k}
 *
 * For n ≤ 60, uses direct computation with log-space binomial
 * coefficients to avoid overflow. For larger n, the same approach
 * remains stable because we compute each basis term in log space
 * and only exponentiate at the end.
 *
 * @param f - The function to approximate (defined on [0, 1])
 * @param n - Bernstein polynomial degree (n ≥ 1)
 * @param x - Evaluation point in [0, 1]
 * @returns B_n(f; x)
 */
export function bernsteinPolynomial(
  f: (x: number) => number,
  n: number,
  x: number,
): number {
  if (n < 1) return f(x);

  // Boundary cases: avoid 0^0 issues
  if (x <= 0) return f(0);
  if (x >= 1) return f(1);

  let result = 0;

  // Compute each term using log-space to avoid overflow of C(n,k)
  // log(b_{k,n}(x)) = logC(n,k) + k·log(x) + (n−k)·log(1−x)
  const logX = Math.log(x);
  const log1mX = Math.log(1 - x);

  // Build log(C(n,k)) incrementally: logC(n,0) = 0, logC(n,k) = logC(n,k-1) + log(n-k+1) - log(k)
  let logBinom = 0;

  for (let k = 0; k <= n; k++) {
    if (k > 0) {
      logBinom += Math.log(n - k + 1) - Math.log(k);
    }
    const logBasis = logBinom + k * logX + (n - k) * log1mX;
    result += f(k / n) * Math.exp(logBasis);
  }

  return result;
}

/**
 * Evaluate the kth Bernstein basis polynomial of degree n at x.
 * b_{k,n}(x) = C(n,k) · x^k · (1−x)^{n−k}
 *
 * These basis polynomials form a partition of unity on [0, 1]:
 * Σ_{k=0}^{n} b_{k,n}(x) = 1 for all x ∈ [0, 1].
 *
 * @param k - Basis index (0 ≤ k ≤ n)
 * @param n - Polynomial degree
 * @param x - Evaluation point in [0, 1]
 * @returns b_{k,n}(x)
 */
export function bernsteinBasis(
  k: number,
  n: number,
  x: number,
): number {
  if (k < 0 || k > n) return 0;
  if (x <= 0) return k === 0 ? 1 : 0;
  if (x >= 1) return k === n ? 1 : 0;

  // Log-space computation for stability
  let logBinom = 0;
  for (let i = 1; i <= k; i++) {
    logBinom += Math.log(n - k + i) - Math.log(i);
  }

  const logBasis = logBinom + k * Math.log(x) + (n - k) * Math.log(1 - x);
  return Math.exp(logBasis);
}

/**
 * Compute the Chebyshev nodes of the first kind on [−1, 1].
 * x_k = cos((2k − 1)π / (2n)) for k = 1, …, n.
 *
 * These are the zeros of T_n(x) and the optimal interpolation nodes
 * that minimize the Lebesgue constant.
 *
 * @param n - Number of nodes (n ≥ 1)
 * @returns Array of n Chebyshev nodes in decreasing order
 */
export function chebyshevNodes(n: number): number[] {
  const nodes: number[] = [];
  for (let k = 1; k <= n; k++) {
    nodes.push(Math.cos(((2 * k - 1) * Math.PI) / (2 * n)));
  }
  return nodes;
}

/**
 * Evaluate the Chebyshev polynomial T_n(x) = cos(n · arccos(x)).
 *
 * Uses the three-term recurrence T_{n+1}(x) = 2x·T_n(x) − T_{n−1}(x)
 * with T_0(x) = 1, T_1(x) = x, which is numerically stable and
 * avoids computing arccos.
 *
 * @param n - Polynomial degree (n ≥ 0)
 * @param x - Evaluation point in [−1, 1]
 * @returns T_n(x)
 */
export function chebyshevPolynomial(n: number, x: number): number {
  if (n === 0) return 1;
  if (n === 1) return x;

  let prev2 = 1;   // T_0
  let prev1 = x;   // T_1

  for (let k = 2; k <= n; k++) {
    const curr = 2 * x * prev1 - prev2;
    prev2 = prev1;
    prev1 = curr;
  }

  return prev1;
}

// ── Re-exports for convenience ──────────────────────────────

export { generateSequence, computeEpsilonN } from './limits';
