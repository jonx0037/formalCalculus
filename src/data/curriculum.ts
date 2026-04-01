export interface Track {
  id: string;
  title: string;
  description: string;
  domain: string;
  published: string[];
  planned: string[];
}

export const tracks: Track[] = [
  {
    id: 'limits-continuity',
    title: 'Limits & Continuity',
    description: 'The rigorous foundation — epsilon-delta definitions, convergence, completeness.',
    domain: 'limits-continuity',
    published: ['Sequences, Limits & Convergence', 'Epsilon-Delta & Continuity', 'Completeness & Compactness', 'Uniform Convergence'],
    planned: [],
  },
  {
    id: 'single-variable',
    title: 'Single-Variable Calculus',
    description: 'Differentiation, integration, and the theorems connecting them.',
    domain: 'single-variable',
    published: ['The Derivative & Chain Rule', 'Mean Value Theorem & Taylor Expansion', 'The Riemann Integral & FTC', 'Improper Integrals & Special Functions'],
    planned: [],
  },
  {
    id: 'multivar-differential',
    title: 'Multivariable Differential Calculus',
    description: 'Gradients, Jacobians, Hessians — the engine of optimization.',
    domain: 'multivar-differential',
    published: ['Partial Derivatives & the Gradient'],
    planned: [
      'The Jacobian & Multivariate Chain Rule',
      'The Hessian & Second-Order Analysis',
      'Inverse & Implicit Function Theorems',
    ],
  },
  {
    id: 'multivar-integral',
    title: 'Multivariable Integral Calculus',
    description: 'Multiple integrals, change of variables, and the big theorems of vector calculus.',
    domain: 'multivar-integral',
    published: [],
    planned: [
      'Multiple Integrals & Fubini\'s Theorem',
      'Change of Variables',
      'Line Integrals & Conservative Fields',
      'Surface Integrals & the Divergence Theorem',
    ],
  },
  {
    id: 'series-approximation',
    title: 'Sequences, Series & Approximation',
    description: 'Convergence tests, power series, Fourier analysis, and approximation theory.',
    domain: 'series-approximation',
    published: [],
    planned: [
      'Series Convergence & Tests',
      'Power Series & Taylor Series',
      'Fourier Series & Orthogonal Expansions',
      'Approximation Theory',
    ],
  },
  {
    id: 'odes',
    title: 'Ordinary Differential Equations',
    description: 'Existence theorems, linear systems, stability, and numerical methods.',
    domain: 'odes',
    published: [],
    planned: [
      'First-Order ODEs & Existence Theorems',
      'Linear Systems & Matrix Exponential',
      'Stability & Dynamical Systems',
      'Numerical Methods for ODEs',
    ],
  },
  {
    id: 'measure-integration',
    title: 'Measure & Integration',
    description: 'Sigma-algebras, Lebesgue integral, Lp spaces — the rigorous foundation of probability.',
    domain: 'measure-integration',
    published: [],
    planned: [
      'Sigma-Algebras & Measures',
      'The Lebesgue Integral',
      'Lp Spaces',
      'Radon-Nikodym & Probability Densities',
    ],
  },
  {
    id: 'functional-analysis',
    title: 'Functional Analysis Essentials',
    description: 'Metric spaces, Banach and Hilbert spaces, calculus of variations.',
    domain: 'functional-analysis',
    published: [],
    planned: [
      'Metric Spaces & Topology',
      'Normed & Banach Spaces',
      'Inner Product & Hilbert Spaces',
      'Calculus of Variations',
    ],
  },
];
