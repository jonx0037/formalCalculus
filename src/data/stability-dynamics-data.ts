/**
 * Data presets for the Stability & Dynamical Systems topic (Topic 23).
 * All functions are pure and deterministic — no Math.random().
 *
 * Provides typed presets for:
 *  - Nonlinear system presets: 6 canonical 2D nonlinear systems
 *  - Lyapunov function presets: 3 energy-based stability demonstrations
 *  - Bifurcation presets: 3 parameter-dependent systems
 *  - Training stability presets: 3 loss landscape configurations
 */

// ── Interfaces ─────────────────────────────────────────────

export interface NonlinearSystemPreset {
  name: string;
  /** Human-readable label */
  label: string;
  /** System RHS: (y1, y2, params) → [dy1/dt, dy2/dt] */
  f: (y1: number, y2: number, params: Record<string, number>) => [number, number];
  /** Default parameter values */
  defaultParams: Record<string, number>;
  /** Slider ranges for each parameter */
  paramRanges: Record<string, [number, number]>;
  /** LaTeX labels for parameter sliders */
  paramLabels: Record<string, string>;
  /** Phase plane domain */
  domain: { y1: [number, number]; y2: [number, number] };
  /** Axis label for y1 */
  y1Label: string;
  /** Axis label for y2 */
  y2Label: string;
  description: string;
}

export interface LyapunovPreset {
  name: string;
  label: string;
  /** Lyapunov function V(y1, y2) */
  V: (y1: number, y2: number) => number;
  /** Orbital derivative dV/dt = ∇V · f */
  Vdot: (y1: number, y2: number) => number;
  /** System RHS: (y1, y2) → [dy1/dt, dy2/dt] */
  f: (y1: number, y2: number) => [number, number];
  /** LaTeX description of V */
  VLabel: string;
  /** Phase plane domain */
  domain: { y1: [number, number]; y2: [number, number] };
  description: string;
}

export interface BifurcationPreset {
  name: string;
  label: string;
  type: 'saddle-node' | 'hopf-supercritical' | 'hopf-subcritical';
  /** System RHS: (y1, y2, μ) → [dy1/dt, dy2/dt] */
  f: (y1: number, y2: number, mu: number) => [number, number];
  /** Analytically computed equilibria as function of μ */
  equilibria: (mu: number) => Array<{ y: [number, number]; stable: boolean }>;
  /** Parameter range [μ_min, μ_max] */
  muRange: [number, number];
  /** Default μ value */
  muDefault: number;
  /** LaTeX label for parameter */
  muLabel: string;
  /** Phase plane domain */
  domain: { y1: [number, number]; y2: [number, number] };
  description: string;
}

export interface TrainingStabilityPreset {
  name: string;
  label: string;
  /** Loss function L(x, y) */
  loss: (x: number, y: number) => number;
  /** Gradient ∇L = [∂L/∂x, ∂L/∂y] */
  gradLoss: (x: number, y: number) => [number, number];
  /** Hessian eigenvalues at the critical point */
  hessianEigs: [number, number];
  /** Critical point location */
  criticalPoint: [number, number];
  classification: 'minimum' | 'saddle' | 'degenerate';
  /** Domain for visualization */
  domain: { x: [number, number]; y: [number, number] };
  description: string;
}

// ── Nonlinear system presets ──────────────────────────────

export function getNonlinearSystemPresets(): NonlinearSystemPreset[] {
  return [
    {
      name: 'lotka-volterra',
      label: 'Lotka-Volterra (Predator-Prey)',
      f: (y1, y2, p) => [
        p.alpha * y1 - p.beta * y1 * y2,
        p.delta * y1 * y2 - p.gamma * y2,
      ],
      defaultParams: { alpha: 1.0, beta: 0.5, delta: 0.25, gamma: 0.5 },
      paramRanges: { alpha: [0.1, 3], beta: [0.1, 2], delta: [0.05, 1], gamma: [0.1, 2] },
      paramLabels: { alpha: '\\alpha', beta: '\\beta', delta: '\\delta', gamma: '\\gamma' },
      domain: { y1: [0, 6], y2: [0, 6] },
      y1Label: 'x (prey)',
      y2Label: 'y (predator)',
      description:
        'Classic predator-prey model. The nonzero equilibrium (γ/δ, α/β) is a center in the linearization — closed orbits in the nonlinear system.',
    },
    {
      name: 'van-der-pol',
      label: 'Van der Pol Oscillator',
      f: (y1, y2, p) => [
        y2,
        p.mu * (1 - y1 * y1) * y2 - y1,
      ],
      defaultParams: { mu: 1.0 },
      paramRanges: { mu: [0.01, 5] },
      paramLabels: { mu: '\\mu' },
      domain: { y1: [-4, 4], y2: [-6, 6] },
      y1Label: 'x',
      y2Label: 'ẋ',
      description:
        'Self-sustained oscillator. For μ > 0, the origin is an unstable spiral and a stable limit cycle exists. As μ increases, the limit cycle develops relaxation-oscillation character.',
    },
    {
      name: 'damped-pendulum',
      label: 'Damped Pendulum',
      f: (y1, y2, p) => [
        y2,
        -Math.sin(y1) - p.b * y2,
      ],
      defaultParams: { b: 0.3 },
      paramRanges: { b: [0, 2] },
      paramLabels: { b: 'b' },
      domain: { y1: [-2 * Math.PI, 2 * Math.PI], y2: [-4, 4] },
      y1Label: 'θ',
      y2Label: 'ω',
      description:
        'Pendulum with friction. Stable equilibria at (2nπ, 0), saddle points at ((2n+1)π, 0). Separatrices connect the saddles — heteroclinic orbits.',
    },
    {
      name: 'sir',
      label: 'SIR Epidemic Model',
      f: (y1, y2, p) => [
        -p.beta * y1 * y2,
        p.beta * y1 * y2 - p.gamma * y2,
      ],
      defaultParams: { beta: 0.4, gamma: 0.1 },
      paramRanges: { beta: [0.05, 1], gamma: [0.01, 0.5] },
      paramLabels: { beta: '\\beta', gamma: '\\gamma' },
      domain: { y1: [0, 1], y2: [0, 0.5] },
      y1Label: 'S (susceptible)',
      y2Label: 'I (infected)',
      description:
        'Epidemic model. R₀ = βS₀/γ determines whether the epidemic spreads (R₀ > 1) or dies out (R₀ < 1). The S-nullcline at S = γ/β is the threshold.',
    },
    {
      name: 'saddle-node-2d',
      label: 'Saddle-Node Normal Form (2D)',
      f: (y1, y2, p) => [
        p.mu - y1 * y1,
        -y2,
      ],
      defaultParams: { mu: 0.5 },
      paramRanges: { mu: [-1, 2] },
      paramLabels: { mu: '\\mu' },
      domain: { y1: [-2.5, 2.5], y2: [-2.5, 2.5] },
      y1Label: 'x₁',
      y2Label: 'x₂',
      description:
        'Saddle-node bifurcation in 2D. For μ > 0: a stable node and a saddle. At μ = 0: they merge. For μ < 0: no equilibria — all trajectories escape.',
    },
    {
      name: 'hopf-normal-form',
      label: 'Hopf Bifurcation Normal Form',
      f: (y1, y2, p) => [
        p.mu * y1 - y2 - y1 * (y1 * y1 + y2 * y2),
        y1 + p.mu * y2 - y2 * (y1 * y1 + y2 * y2),
      ],
      defaultParams: { mu: 0.2 },
      paramRanges: { mu: [-0.5, 1] },
      paramLabels: { mu: '\\mu' },
      domain: { y1: [-2, 2], y2: [-2, 2] },
      y1Label: 'x₁',
      y2Label: 'x₂',
      description:
        'Supercritical Hopf bifurcation. For μ < 0: stable spiral at origin. At μ = 0: non-hyperbolic center. For μ > 0: unstable spiral + stable limit cycle of radius √μ.',
    },
  ];
}

// ── Lyapunov function presets ────────────────────────────

export function getLyapunovPresets(): LyapunovPreset[] {
  return [
    {
      name: 'quadratic',
      label: 'Quadratic: V = y₁² + y₂²',
      V: (y1, y2) => y1 * y1 + y2 * y2,
      Vdot: (y1, y2) => 2 * y1 * (-y1 + y2) + 2 * y2 * (-y1 - y2),
      f: (y1, y2) => [-y1 + y2, -y1 - y2],
      VLabel: 'V(y_1, y_2) = y_1^2 + y_2^2',
      domain: { y1: [-3, 3], y2: [-3, 3] },
      description:
        'A stable spiral with V = y₁² + y₂². The orbital derivative V̇ = -2y₁² - 2y₂² < 0 confirms asymptotic stability.',
    },
    {
      name: 'pendulum-energy',
      label: 'Pendulum Energy: V = ½ω² + (1 - cos θ)',
      V: (y1, y2) => 0.5 * y2 * y2 + (1 - Math.cos(y1)),
      Vdot: (y1, y2) => -0.3 * y2 * y2,
      f: (y1, y2) => [y2, -Math.sin(y1) - 0.3 * y2],
      VLabel: 'V(\\theta, \\omega) = \\tfrac{1}{2}\\omega^2 + (1 - \\cos\\theta)',
      domain: { y1: [-Math.PI, Math.PI], y2: [-3, 3] },
      description:
        'Total mechanical energy of the damped pendulum. V̇ = -bω² ≤ 0. By LaSalle\'s principle, trajectories converge to (0, 0) since ω = 0 is not invariant.',
    },
    {
      name: 'lyapunov-equation',
      label: 'Lyapunov Equation: V = yᵀPy',
      V: (y1, y2) => {
        // P solves Aᵀ P + PA = -I for A = [[-1, 2], [-3, -2]]
        // P ≈ [[1.5, 0.1], [0.1, 0.65]]
        return 1.5 * y1 * y1 + 0.2 * y1 * y2 + 0.65 * y2 * y2;
      },
      Vdot: (y1, y2) => -(y1 * y1 + y2 * y2),
      f: (y1, y2) => [-y1 + 2 * y2, -3 * y1 - 2 * y2],
      VLabel: 'V(\\mathbf{y}) = \\mathbf{y}^T P \\mathbf{y}',
      domain: { y1: [-3, 3], y2: [-3, 3] },
      description:
        'Quadratic Lyapunov function from the Lyapunov equation. A = [[-1, 2; -3, -2]] is Hurwitz (eigenvalues ≈ -1.5 ± 2.18i). V̇ = -yᵀQy = -(y₁² + y₂²) < 0.',
    },
  ];
}

// ── Bifurcation presets ──────────────────────────────────

export function getBifurcationPresets(): BifurcationPreset[] {
  return [
    {
      name: 'saddle-node',
      label: 'Saddle-Node: ẋ = μ − x²',
      type: 'saddle-node',
      f: (y1, _y2, mu) => [
        mu - y1 * y1,
        -_y2,
      ],
      equilibria: (mu) => {
        if (mu < 0) return [];
        if (mu === 0) return [{ y: [0, 0] as [number, number], stable: false }];
        const sq = Math.sqrt(mu);
        return [
          { y: [sq, 0] as [number, number], stable: true },
          { y: [-sq, 0] as [number, number], stable: false },
        ];
      },
      muRange: [-1, 2],
      muDefault: 0.5,
      muLabel: '\\mu',
      domain: { y1: [-2.5, 2.5], y2: [-2.5, 2.5] },
      description:
        'Canonical saddle-node bifurcation. For μ > 0: stable node at x = √μ, saddle at x = −√μ. At μ = 0: half-stable equilibrium. For μ < 0: no equilibria.',
    },
    {
      name: 'hopf-supercritical',
      label: 'Supercritical Hopf',
      type: 'hopf-supercritical',
      f: (y1, y2, mu) => [
        mu * y1 - y2 - y1 * (y1 * y1 + y2 * y2),
        y1 + mu * y2 - y2 * (y1 * y1 + y2 * y2),
      ],
      equilibria: (mu) => {
        // Origin is always an equilibrium
        return [{ y: [0, 0] as [number, number], stable: mu < 0 }];
      },
      muRange: [-0.5, 1],
      muDefault: 0,
      muLabel: '\\mu',
      domain: { y1: [-2, 2], y2: [-2, 2] },
      description:
        'At μ = 0, eigenvalues cross the imaginary axis. For μ > 0, the origin destabilizes and a stable limit cycle of radius √μ is born.',
    },
    {
      name: 'hopf-subcritical',
      label: 'Subcritical Hopf',
      type: 'hopf-subcritical',
      f: (y1, y2, mu) => [
        mu * y1 - y2 + y1 * (y1 * y1 + y2 * y2),
        y1 + mu * y2 + y2 * (y1 * y1 + y2 * y2),
      ],
      equilibria: (mu) => {
        return [{ y: [0, 0] as [number, number], stable: mu < 0 }];
      },
      muRange: [-1, 0.5],
      muDefault: -0.3,
      muLabel: '\\mu',
      domain: { y1: [-2, 2], y2: [-2, 2] },
      description:
        'Subcritical Hopf: the unstable limit cycle exists for μ < 0 and shrinks into the origin at μ = 0. For μ > 0, the origin is unstable with no nearby attractor — trajectories escape.',
    },
  ];
}

// ── Training stability presets ───────────────────────────

export function getTrainingStabilityPresets(): TrainingStabilityPreset[] {
  return [
    {
      name: 'local-minimum',
      label: 'Local Minimum (PD Hessian)',
      loss: (x, y) => 0.5 * (2 * x * x + 0.5 * y * y),
      gradLoss: (x, y) => [2 * x, 0.5 * y],
      hessianEigs: [2, 0.5],
      criticalPoint: [0, 0],
      classification: 'minimum',
      domain: { x: [-3, 3], y: [-3, 3] },
      description:
        'Positive-definite Hessian: both eigenvalues > 0 (λ₁ = 2, λ₂ = 0.5). Gradient descent converges — this is an asymptotically stable equilibrium of the gradient flow.',
    },
    {
      name: 'saddle-point',
      label: 'Saddle Point (Indefinite Hessian)',
      loss: (x, y) => 0.5 * (x * x - y * y),
      gradLoss: (x, y) => [x, -y],
      hessianEigs: [1, -1],
      criticalPoint: [0, 0],
      classification: 'saddle',
      domain: { x: [-3, 3], y: [-3, 3] },
      description:
        'Indefinite Hessian: eigenvalues of opposite sign (λ₁ = 1, λ₂ = −1). The gradient flow has a saddle — the y-axis is the unstable manifold. SGD noise helps escape.',
    },
    {
      name: 'degenerate-minimum',
      label: 'Degenerate Minimum (PSD Hessian)',
      loss: (x, y) => 0.5 * (2 * x * x + 0.01 * y * y),
      gradLoss: (x, y) => [2 * x, 0.01 * y],
      hessianEigs: [2, 0.01],
      criticalPoint: [0, 0],
      classification: 'degenerate',
      domain: { x: [-3, 3], y: [-3, 3] },
      description:
        'Near-degenerate Hessian: eigenvalues [2, 0.01]. The y-direction is nearly flat — gradient descent converges but the slow eigencomponent takes ~200× longer. This is the practical bottleneck in high-dimensional optimization.',
    },
  ];
}
