/**
 * Sequence presets for the Sequences, Limits & Convergence topic.
 * Shared across SequenceGalleryExplorer and EpsilonNExplorer.
 */

export interface SequencePreset {
  name: string;
  label: string;
  fn: (n: number) => number;
  limit: number;
  mlNote: string;
  convergenceRate: 'sublinear' | 'linear' | 'superlinear' | 'quadratic' | 'none';
}

/**
 * Returns the preset sequences used by visualization components.
 * Lightweight constant data — eager evaluation is fine.
 */
export function getSequencePresets(): SequencePreset[] {
  return [
    {
      name: '1/n',
      label: 'a_n = 1/n',
      fn: (n: number) => 1 / n,
      limit: 0,
      mlNote: 'Learning rate schedule: η_t = c/t gives O(1/√t) SGD convergence',
      convergenceRate: 'sublinear',
    },
    {
      name: '(1+1/n)^n',
      label: 'a_n = (1+1/n)^n',
      fn: (n: number) => Math.pow(1 + 1 / n, n),
      limit: Math.E,
      mlNote: 'Euler\'s number e appears in softmax, cross-entropy, and natural exponential families',
      convergenceRate: 'sublinear',
    },
    {
      name: '0.9^n',
      label: 'a_n = 0.9^n',
      fn: (n: number) => Math.pow(0.9, n),
      limit: 0,
      mlNote: 'Geometric decay — momentum coefficient in Adam, discount factor in RL',
      convergenceRate: 'linear',
    },
    {
      name: '(-1)^n/n',
      label: 'a_n = (-1)^n / n',
      fn: (n: number) => Math.pow(-1, n) / n,
      limit: 0,
      mlNote: 'Oscillating convergence — SGD with noisy gradients oscillates around the minimum',
      convergenceRate: 'sublinear',
    },
    {
      name: 'n²/(n²+1)',
      label: 'a_n = n²/(n²+1)',
      fn: (n: number) => (n * n) / (n * n + 1),
      limit: 1,
      mlNote: 'Saturation — training accuracy approaches 1 but never reaches it exactly',
      convergenceRate: 'sublinear',
    },
  ];
}
