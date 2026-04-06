/**
 * Data presets for the Linear Systems & Matrix Exponential topic (Topic 22).
 * All functions are pure and deterministic — no Math.random().
 *
 * Provides typed presets for:
 *  - System presets: 7 canonical 2×2 phase portrait types
 *  - Forced system presets: 3 non-homogeneous systems with forcing
 *  - Training dynamics presets: 3 quadratic loss configurations
 */

// ── Interfaces ─────────────────────────────────────────────

export interface SystemPreset {
  name: string;
  /** Human-readable label */
  label: string;
  /** 2×2 system matrix entries */
  A: [[number, number], [number, number]];
  classification:
    | 'stable-node'
    | 'unstable-node'
    | 'saddle'
    | 'stable-spiral'
    | 'unstable-spiral'
    | 'center'
    | 'degenerate';
  eigenvalues: { real: number[]; imag: number[] };
  /** Eigenvectors as column arrays (when real) */
  eigenvectors?: number[][];
  trace: number;
  determinant: number;
  description: string;
  tags: string[];
}

export interface ForcedSystemPreset {
  name: string;
  label: string;
  A: [[number, number], [number, number]];
  /** Forcing function g(t) → [g1, g2] */
  g: (t: number) => [number, number];
  /** LaTeX-renderable label for the forcing */
  gLabel: string;
  domain: { t: [number, number] };
  description: string;
}

export interface TrainingDynamicsPreset {
  name: string;
  label: string;
  /** Hessian eigenvalues [λ₁, λ₂] */
  eigenvalues: [number, number];
  conditionNumber: number;
  description: string;
}

// ── System presets ─────────────────────────────────────────

export function getSystemPresets(): SystemPreset[] {
  return [
    {
      name: 'stable-node',
      label: 'Stable Node',
      A: [[-1, 2], [0, -3]],
      classification: 'stable-node',
      eigenvalues: { real: [-1, -3], imag: [0, 0] },
      eigenvectors: [[1, 0], [1, -1]],
      trace: -4,
      determinant: 3,
      description:
        'Both eigenvalues negative (λ₁ = −1, λ₂ = −3). All trajectories converge to the origin along the slow eigendirection.',
      tags: ['stable', 'real-eigenvalues', 'node'],
    },
    {
      name: 'unstable-node',
      label: 'Unstable Node',
      A: [[2, 1], [0, 1]],
      classification: 'unstable-node',
      eigenvalues: { real: [2, 1], imag: [0, 0] },
      eigenvectors: [[1, 0], [1, -1]],
      trace: 3,
      determinant: 2,
      description:
        'Both eigenvalues positive (λ₁ = 2, λ₂ = 1). All trajectories diverge from the origin along the fast eigendirection.',
      tags: ['unstable', 'real-eigenvalues', 'node'],
    },
    {
      name: 'saddle',
      label: 'Saddle Point',
      A: [[1, 0], [0, -2]],
      classification: 'saddle',
      eigenvalues: { real: [1, -2], imag: [0, 0] },
      eigenvectors: [[1, 0], [0, 1]],
      trace: -1,
      determinant: -2,
      description:
        'Eigenvalues of opposite sign (λ₁ = 1, λ₂ = −2). Trajectories approach along the stable eigendirection and diverge along the unstable one.',
      tags: ['unstable', 'real-eigenvalues', 'saddle'],
    },
    {
      name: 'stable-spiral',
      label: 'Stable Spiral',
      A: [[-0.5, -2], [2, -0.5]],
      classification: 'stable-spiral',
      eigenvalues: { real: [-0.5, -0.5], imag: [2, -2] },
      trace: -1,
      determinant: 4.25,
      description:
        'Complex eigenvalues with negative real part (λ = −0.5 ± 2i). Trajectories spiral inward toward the origin.',
      tags: ['stable', 'complex-eigenvalues', 'spiral'],
    },
    {
      name: 'unstable-spiral',
      label: 'Unstable Spiral',
      A: [[0.3, -1.5], [1.5, 0.3]],
      classification: 'unstable-spiral',
      eigenvalues: { real: [0.3, 0.3], imag: [1.5, -1.5] },
      trace: 0.6,
      determinant: 2.34,
      description:
        'Complex eigenvalues with positive real part (λ = 0.3 ± 1.5i). Trajectories spiral outward from the origin.',
      tags: ['unstable', 'complex-eigenvalues', 'spiral'],
    },
    {
      name: 'center',
      label: 'Center',
      A: [[0, -2], [2, 0]],
      classification: 'center',
      eigenvalues: { real: [0, 0], imag: [2, -2] },
      trace: 0,
      determinant: 4,
      description:
        'Pure imaginary eigenvalues (λ = ±2i). Trajectories are closed ellipses — perpetual oscillation with no decay or growth.',
      tags: ['marginally-stable', 'complex-eigenvalues', 'center'],
    },
    {
      name: 'degenerate',
      label: 'Degenerate (Defective) Node',
      A: [[2, 1], [0, 2]],
      classification: 'degenerate',
      eigenvalues: { real: [2, 2], imag: [0, 0] },
      eigenvectors: [[1, 0]],
      trace: 4,
      determinant: 4,
      description:
        'Repeated eigenvalue (λ = 2) with only one eigenvector. Trajectories exhibit te^{λt} growth tangent to the single eigendirection.',
      tags: ['unstable', 'repeated-eigenvalue', 'defective'],
    },
  ];
}

// ── Forced system presets ──────────────────────────────────

export function getForcedSystemPresets(): ForcedSystemPreset[] {
  return [
    {
      name: 'harmonic-sinusoidal',
      label: 'Harmonic Oscillator + Sinusoidal Forcing',
      A: [[0, 1], [-4, 0]],
      g: (t: number): [number, number] => [0, Math.cos(2.5 * t)],
      gLabel: 'g(t) = (0, \\cos(2.5t))^T',
      domain: { t: [0, 15] },
      description:
        'Undamped oscillator (ω = 2) driven near resonance (Ω = 2.5). The beating pattern reveals the frequency mismatch.',
    },
    {
      name: 'stable-step',
      label: 'Stable Node + Step Input',
      A: [[-2, 0], [0, -1]],
      g: (t: number): [number, number] => (t >= 1 ? [1, 0.5] : [0, 0]),
      gLabel: 'g(t) = (1, 0.5)^T \\cdot \\mathbf{1}_{t \\geq 1}',
      domain: { t: [0, 8] },
      description:
        'Stable node (λ = −2, −1) with a step forcing that turns on at t = 1. The system transitions from the origin to a new steady state.',
    },
    {
      name: 'spiral-impulse',
      label: 'Stable Spiral + Impulse',
      A: [[-0.3, -1], [1, -0.3]],
      g: (t: number): [number, number] => {
        // Approximate delta function as narrow Gaussian
        const sigma = 0.1;
        const pulse = Math.exp(-((t - 2) ** 2) / (2 * sigma * sigma)) / (sigma * Math.sqrt(2 * Math.PI));
        return [pulse, 0];
      },
      gLabel: 'g(t) \\approx (\\delta(t-2), 0)^T',
      domain: { t: [0, 20] },
      description:
        'Stable spiral (α = −0.3, β ≈ 1) kicked by an impulse at t = 2. The response is a decaying oscillation — the impulse response of the system.',
    },
  ];
}

// ── Training dynamics presets ──────────────────────────────

export function getTrainingDynamicsPresets(): TrainingDynamicsPreset[] {
  return [
    {
      name: 'well-conditioned',
      label: 'Well-Conditioned (κ ≈ 2)',
      eigenvalues: [1, 2],
      conditionNumber: 2,
      description:
        'Nearly isotropic loss landscape. Both eigencomponents converge at similar rates, and gradient descent is efficient even with a fixed learning rate.',
    },
    {
      name: 'moderate',
      label: 'Moderate (κ = 10)',
      eigenvalues: [1, 10],
      conditionNumber: 10,
      description:
        'Mildly anisotropic. The fast direction (λ = 10) converges 10× faster than the slow direction (λ = 1). The loss curve shows a two-phase decay.',
    },
    {
      name: 'ill-conditioned',
      label: 'Ill-Conditioned (κ = 100)',
      eigenvalues: [0.1, 10],
      conditionNumber: 100,
      description:
        'Severely anisotropic loss landscape. The fast mode converges in ~10 steps; the slow mode takes ~1000 steps. This is why preconditioning (Newton\'s method, Adam) matters.',
    },
  ];
}
