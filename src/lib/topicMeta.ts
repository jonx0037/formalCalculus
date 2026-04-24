/**
 * Shared constants for topic metadata presentation — single source of truth
 * for the domain labels and difficulty badge classes used by TopicLayout,
 * ConnectionsSection, and ConnectionCard. Extracted so adding a new domain
 * or tweaking badge colors is a one-file change.
 */

export type Domain =
  | 'limits-continuity'
  | 'single-variable'
  | 'multivar-differential'
  | 'multivar-integral'
  | 'series-approximation'
  | 'odes'
  | 'measure-integration'
  | 'functional-analysis';

export type Difficulty = 'foundational' | 'intermediate' | 'advanced';

export const DOMAIN_LABELS: Record<Domain, string> = {
  'limits-continuity': 'Limits & Continuity',
  'single-variable': 'Single-Variable Calculus',
  'multivar-differential': 'Multivariable Differential',
  'multivar-integral': 'Multivariable Integral',
  'series-approximation': 'Series & Approximation',
  odes: 'ODEs',
  'measure-integration': 'Measure & Integration',
  'functional-analysis': 'Functional Analysis',
};

export function domainLabel(domain: string): string {
  return DOMAIN_LABELS[domain as Domain] ?? domain;
}

export const DIFFICULTY_BADGE_CLASSES: Record<Difficulty, string> = {
  foundational:
    'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-200 dark:border-green-700',
  intermediate:
    'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-700',
  advanced:
    'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/30 dark:text-purple-200 dark:border-purple-700',
};
