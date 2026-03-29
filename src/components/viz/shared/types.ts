/** Core geometric types */
export interface Point2D {
  x: number;
  y: number;
}

export interface Interval {
  a: number;
  b: number;
}

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Calculus-specific types */
export interface Partition {
  points: number[];
  n: number;
}

export interface RiemannSum {
  partition: Partition;
  rule: 'left' | 'right' | 'midpoint' | 'trapezoidal' | 'simpson';
  value: number;
}

export interface TaylorApproximation {
  center: number;
  degree: number;
  coefficients: number[];
}

export interface EpsilonDelta {
  epsilon: number;
  delta: number;
  x0: number;
  L: number;
}

export interface EpsilonN {
  epsilon: number;
  N: number;
  L: number;
}

export interface VectorField2D {
  u: (x: number, y: number) => number;
  v: (x: number, y: number) => number;
}

export interface ODESolution {
  t: number[];
  y: number[][];
  method: string;
}

/** Curriculum graph types */
export interface DAGNode {
  id: string;
  label: string;
  domain: string;
  status: 'published' | 'planned';
  url: string;
}

export interface DAGEdge {
  source: string;
  target: string;
}
