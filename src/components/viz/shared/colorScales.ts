import * as d3 from 'd3';

/**
 * Function-related colors for calculus visualizations.
 * - primary: main function curve
 * - secondary: secondary function or limit value
 * - tangent: tangent/secant lines
 */
export const functionColors = ['#2563EB', '#DC2626', '#059669'] as const;

/**
 * Region fill colors for integration, epsilon bands, etc.
 */
export const regionColors = {
  epsilonBand: '#BFDBFE',
  deltaBand: '#FDE68A',
  integralFill: '#BBF7D0',
  errorFill: '#FECACA',
} as const;

/**
 * Domain color scale — maps track domain strings to distinct colors.
 * Used for curriculum graph and topic cards.
 */
export const domainColorScale = d3
  .scaleOrdinal<string>()
  .domain([
    'limits-continuity',
    'single-variable',
    'multivar-differential',
    'multivar-integral',
    'series-approximation',
    'odes',
    'measure-integration',
    'functional-analysis',
  ])
  .range([
    '#2563EB', // blue
    '#059669', // emerald
    '#7C3AED', // violet
    '#D97706', // amber
    '#DC2626', // red
    '#0891B2', // cyan
    '#4F46E5', // indigo
    '#BE185D', // pink
  ]);

/**
 * Convergence rate colors for comparing convergence speeds.
 */
export const convergenceColors = {
  sublinear: '#D97706',
  linear: '#2563EB',
  superlinear: '#059669',
  quadratic: '#DC2626',
} as const;
