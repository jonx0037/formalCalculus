/**
 * BellmanIterationExplorer — Topic 29, Section 10 (ML Connections).
 *
 * The first ML-algorithm-as-viz in the curriculum. Runs value iteration
 * on a small 3-state MDP to concretely demonstrate that the Bellman
 * optimality operator is a contraction in the sup-norm with constant γ,
 * so Banach's fixed-point theorem applies and value iteration converges
 * to the unique optimal value function V* from any initialization.
 *
 * Two panels:
 *  - Left: bar chart of the current V_n with dashed target markers at V*.
 *  - Right: log-scale convergence plot of ‖V_n − V*‖∞ vs. iteration number
 *    with the theoretical contraction bound γⁿ · ‖V₀ − V*‖∞ overlaid.
 *
 * Controls: γ slider, Step button, Run/Stop toggle, Reset button.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useD3 } from './shared/useD3';
import { useResizeObserver } from './shared/useResizeObserver';
import {
  getBellmanScenario,
  type BellmanScenario,
} from '../../data/metric-spaces-data';

// ── Constants ─────────────────────────────────────────────────

const MAX_ITERATIONS = 40;
const STEP_INTERVAL_MS = 350;
const CONVERGENCE_TOL = 1e-10;

const BAR_COLOR = '#2563EB'; // blue
const TARGET_COLOR = '#059669'; // emerald
const CONVERGENCE_COLOR = '#2563EB'; // blue — actual distance
const BOUND_COLOR = '#F97316'; // orange — theoretical bound

const leftMargin = { top: 24, right: 16, bottom: 40, left: 46 };
const rightMargin = { top: 24, right: 16, bottom: 40, left: 52 };

// ── Helpers ───────────────────────────────────────────────────

/** Apply one Bellman optimality update:
 *    (T* V)(s) = max_a [R(s, a) + γ · Σ_s' P(s'|s, a) V(s')]
 *
 * Returns a new length-|states| vector; does not mutate the input.
 */
function bellmanOptimalityStep(
  v: number[],
  scenario: BellmanScenario,
  gamma: number,
): number[] {
  const S = scenario.states.length;
  const A = scenario.actions.length;
  const next: number[] = new Array(S);
  for (let s = 0; s < S; s++) {
    let best = -Infinity;
    for (let a = 0; a < A; a++) {
      let q = scenario.rewards[s][a];
      for (let sp = 0; sp < S; sp++) {
        q += gamma * scenario.transitions[s][a][sp] * v[sp];
      }
      if (q > best) best = q;
    }
    next[s] = best;
  }
  return next;
}

/** Greedy action at each state w.r.t. V. */
function greedyPolicy(
  v: number[],
  scenario: BellmanScenario,
  gamma: number,
): number[] {
  const S = scenario.states.length;
  const A = scenario.actions.length;
  const policy: number[] = new Array(S);
  for (let s = 0; s < S; s++) {
    let bestA = 0;
    let bestQ = -Infinity;
    for (let a = 0; a < A; a++) {
      let q = scenario.rewards[s][a];
      for (let sp = 0; sp < S; sp++) {
        q += gamma * scenario.transitions[s][a][sp] * v[sp];
      }
      if (q > bestQ) {
        bestQ = q;
        bestA = a;
      }
    }
    policy[s] = bestA;
  }
  return policy;
}

/** Compute V* by running value iteration to a tight tolerance. */
function computeVStar(scenario: BellmanScenario, gamma: number): number[] {
  const S = scenario.states.length;
  let v = new Array(S).fill(0);
  for (let iter = 0; iter < 5000; iter++) {
    const next = bellmanOptimalityStep(v, scenario, gamma);
    let delta = 0;
    for (let s = 0; s < S; s++) {
      const d = Math.abs(next[s] - v[s]);
      if (d > delta) delta = d;
    }
    v = next;
    if (delta < 1e-14) break;
  }
  return v;
}

/** Sup-norm ‖a − b‖∞. */
function supNormDistance(a: number[], b: number[]): number {
  let m = 0;
  for (let i = 0; i < a.length; i++) {
    const d = Math.abs(a[i] - b[i]);
    if (d > m) m = d;
  }
  return m;
}

// ── Main component ────────────────────────────────────────────

export default function BellmanIterationExplorer() {
  const { ref: containerRef, width: containerWidth } =
    useResizeObserver<HTMLDivElement>();

  const scenario = useMemo(() => getBellmanScenario('three-state-mdp'), []);
  const numStates = scenario.states.length;

  const [gamma, setGamma] = useState(scenario.defaultGamma);
  const [V, setV] = useState<number[]>(() => new Array(numStates).fill(0));
  const [history, setHistory] = useState<number[][]>(() => [
    new Array(numStates).fill(0),
  ]);
  const [running, setRunning] = useState(false);
  const runningRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  // V* recomputes whenever gamma changes.
  const vStar = useMemo(
    () => computeVStar(scenario, gamma),
    [scenario, gamma],
  );

  // Greedy policy at V*, for the info panel.
  const optimalPolicy = useMemo(
    () => greedyPolicy(vStar, scenario, gamma),
    [vStar, scenario, gamma],
  );

  const stopAnimation = useCallback(() => {
    runningRef.current = false;
    setRunning(false);
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Apply one step manually.
  const doStep = useCallback(() => {
    setV((currV) => {
      const next = bellmanOptimalityStep(currV, scenario, gamma);
      setHistory((h) => {
        if (h.length >= MAX_ITERATIONS + 1) return h;
        return [...h, next];
      });
      return next;
    });
  }, [scenario, gamma]);

  // Reset state.
  const handleReset = useCallback(() => {
    stopAnimation();
    const zero = new Array(numStates).fill(0);
    setV(zero);
    setHistory([zero.slice()]);
  }, [numStates, stopAnimation]);

  // When gamma changes, reset so the displayed history matches the shown V*.
  useEffect(() => {
    stopAnimation();
    const zero = new Array(numStates).fill(0);
    setV(zero);
    setHistory([zero.slice()]);
  }, [gamma, numStates, stopAnimation]);

  // Auto-run effect: ticks once per STEP_INTERVAL_MS while running.
  useEffect(() => {
    if (!running) return;
    runningRef.current = true;
    const tick = () => {
      if (!runningRef.current) return;
      setV((currV) => {
        const next = bellmanOptimalityStep(currV, scenario, gamma);
        setHistory((h) => {
          if (h.length >= MAX_ITERATIONS + 1) return h;
          return [...h, next];
        });
        if (supNormDistance(next, vStar) < CONVERGENCE_TOL) {
          runningRef.current = false;
          setRunning(false);
        }
        return next;
      });
      if (runningRef.current) {
        timerRef.current = window.setTimeout(tick, STEP_INTERVAL_MS);
      }
    };
    // Stop condition for max iterations: history.length is in the dep
    // array, so this check uses a fresh value on every re-run of the
    // effect — no stale closure.
    if (history.length >= MAX_ITERATIONS) {
      runningRef.current = false;
      setRunning(false);
      return;
    }
    timerRef.current = window.setTimeout(tick, STEP_INTERVAL_MS);
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      runningRef.current = false;
    };
  }, [running, scenario, gamma, vStar, history.length]);

  // Cleanup timer on unmount.
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  // ── Layout ──────────────────────────────────────────────────
  const stacked = containerWidth > 0 && containerWidth < 720;
  const totalWidth = Math.min(containerWidth || 0, 920);
  const panelH = stacked ? 280 : 340;
  const leftW = stacked ? totalWidth : Math.floor(totalWidth * 0.45);
  const rightW = stacked ? totalWidth : totalWidth - leftW;

  // ── Left panel: bar chart ───────────────────────────────────
  const leftSvgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (leftW <= 0 || panelH <= 0) return;
      const innerW = leftW - leftMargin.left - leftMargin.right;
      const innerH = panelH - leftMargin.top - leftMargin.bottom;
      if (innerW <= 0 || innerH <= 0) return;

      const g = svg
        .append('g')
        .attr('transform', `translate(${leftMargin.left},${leftMargin.top})`);

      let yMin = 0;
      let yMax = 0;
      for (const val of V) {
        if (val < yMin) yMin = val;
        if (val > yMax) yMax = val;
      }
      for (const val of vStar) {
        if (val < yMin) yMin = val;
        if (val > yMax) yMax = val;
      }
      yMin -= 1;
      yMax += 2;

      const xScale = d3
        .scaleBand<string>()
        .domain(scenario.states)
        .range([0, innerW])
        .padding(0.3);
      const yScale = d3.scaleLinear().domain([yMin, yMax]).range([innerH, 0]);

      // Axes
      g.append('g')
        .attr('transform', `translate(0,${yScale(0)})`)
        .call(d3.axisBottom(xScale))
        .selectAll('text')
        .style('font-size', '11px')
        .attr('dy', yScale(0) < innerH - 15 ? '2em' : '1em');
      g.append('g')
        .call(d3.axisLeft(yScale).ticks(6))
        .selectAll('text')
        .style('font-size', '10px');

      // Title
      g.append('text')
        .attr('x', innerW / 2)
        .attr('y', -8)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('font-weight', '600')
        .style('fill', 'var(--color-text-primary, #1f2937)')
        .text('Value function V(s)');

      // Bars for current V
      V.forEach((val, s) => {
        const x = xScale(scenario.states[s]) ?? 0;
        const y0 = yScale(0);
        const yVal = yScale(val);
        g.append('rect')
          .attr('x', x)
          .attr('y', Math.min(y0, yVal))
          .attr('width', xScale.bandwidth())
          .attr('height', Math.abs(yVal - y0))
          .attr('fill', BAR_COLOR)
          .attr('fill-opacity', 0.85);
        g.append('text')
          .attr('x', x + xScale.bandwidth() / 2)
          .attr('y', yVal - 4)
          .attr('text-anchor', 'middle')
          .style('font-size', '11px')
          .style('font-weight', '600')
          .style('fill', BAR_COLOR)
          .text(val.toFixed(2));
      });

      // Dashed target lines for V*
      vStar.forEach((val, s) => {
        const x = xScale(scenario.states[s]) ?? 0;
        const y = yScale(val);
        g.append('line')
          .attr('x1', x - 4)
          .attr('x2', x + xScale.bandwidth() + 4)
          .attr('y1', y)
          .attr('y2', y)
          .attr('stroke', TARGET_COLOR)
          .attr('stroke-width', 2)
          .attr('stroke-dasharray', '4,3');
      });

      // Legend
      const legendY = innerH + 24;
      g.append('rect')
        .attr('x', 0)
        .attr('y', legendY - 10)
        .attr('width', 12)
        .attr('height', 10)
        .attr('fill', BAR_COLOR)
        .attr('fill-opacity', 0.85);
      g.append('text')
        .attr('x', 16)
        .attr('y', legendY - 1)
        .style('font-size', '10px')
        .style('fill', 'var(--color-text-secondary, #6b7280)')
        .text('V_n');
      g.append('line')
        .attr('x1', 52)
        .attr('x2', 70)
        .attr('y1', legendY - 4)
        .attr('y2', legendY - 4)
        .attr('stroke', TARGET_COLOR)
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '4,3');
      g.append('text')
        .attr('x', 74)
        .attr('y', legendY - 1)
        .style('font-size', '10px')
        .style('fill', 'var(--color-text-secondary, #6b7280)')
        .text('V*');
    },
    [leftW, panelH, V, vStar, scenario],
  );

  // ── Right panel: convergence plot (log scale) ───────────────
  const rightSvgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (rightW <= 0 || panelH <= 0) return;
      const innerW = rightW - rightMargin.left - rightMargin.right;
      const innerH = panelH - rightMargin.top - rightMargin.bottom;
      if (innerW <= 0 || innerH <= 0) return;

      const g = svg
        .append('g')
        .attr('transform', `translate(${rightMargin.left},${rightMargin.top})`);

      // Data: actual distance and theoretical bound at each step.
      // Floor errors at 1e-12 so log scale never blows up.
      const d0 = supNormDistance(history[0] ?? new Array(numStates).fill(0), vStar);
      const pts: Array<{ n: number; err: number; bound: number }> = history.map(
        (vn, i) => {
          const raw = supNormDistance(vn, vStar);
          const err = Math.max(raw, 1e-12);
          const bound = Math.max(Math.pow(gamma, i) * d0, 1e-12);
          return { n: i, err, bound };
        },
      );

      const xDomainMax = pts.length - 1 > MAX_ITERATIONS ? pts.length - 1 : MAX_ITERATIONS;
      const xScale = d3.scaleLinear().domain([0, xDomainMax]).range([0, innerW]);
      // y-domain: from max err or bound down to 1e-12, log scale
      let maxY = 1e-3;
      for (const p of pts) {
        if (p.err > maxY) maxY = p.err;
        if (p.bound > maxY) maxY = p.bound;
      }
      const yScale = d3
        .scaleLog()
        .domain([1e-12, maxY * 2])
        .range([innerH, 0])
        .clamp(true);

      // Axes
      g.append('g')
        .attr('transform', `translate(0,${innerH})`)
        .call(d3.axisBottom(xScale).ticks(8))
        .selectAll('text')
        .style('font-size', '10px');
      g.append('g')
        .call(
          d3
            .axisLeft(yScale)
            .ticks(6)
            .tickFormat(d3.format('.0e') as (d: d3.NumberValue) => string),
        )
        .selectAll('text')
        .style('font-size', '9px');

      // Title
      g.append('text')
        .attr('x', innerW / 2)
        .attr('y', -8)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('font-weight', '600')
        .style('fill', 'var(--color-text-primary, #1f2937)')
        .text('‖V_n − V*‖∞ (log scale)');

      // x and y labels
      g.append('text')
        .attr('x', innerW / 2)
        .attr('y', innerH + 32)
        .attr('text-anchor', 'middle')
        .style('font-size', '10px')
        .style('fill', 'var(--color-text-secondary, #6b7280)')
        .text('iteration n');

      // Theoretical bound line (orange dashed)
      const lineGenBound = d3
        .line<{ n: number; bound: number }>()
        .x((d) => xScale(d.n))
        .y((d) => yScale(d.bound));
      g.append('path')
        .datum(pts)
        .attr('d', lineGenBound)
        .attr('fill', 'none')
        .attr('stroke', BOUND_COLOR)
        .attr('stroke-width', 1.8)
        .attr('stroke-dasharray', '5,3');

      // Actual error line (blue)
      const lineGenErr = d3
        .line<{ n: number; err: number }>()
        .x((d) => xScale(d.n))
        .y((d) => yScale(d.err));
      g.append('path')
        .datum(pts)
        .attr('d', lineGenErr)
        .attr('fill', 'none')
        .attr('stroke', CONVERGENCE_COLOR)
        .attr('stroke-width', 2);
      // Dots for each actual data point
      pts.forEach((p) => {
        g.append('circle')
          .attr('cx', xScale(p.n))
          .attr('cy', yScale(p.err))
          .attr('r', 2.5)
          .attr('fill', CONVERGENCE_COLOR);
      });

      // Legend
      const legendX = innerW - 130;
      const legendY = 10;
      g.append('line')
        .attr('x1', legendX)
        .attr('x2', legendX + 20)
        .attr('y1', legendY)
        .attr('y2', legendY)
        .attr('stroke', CONVERGENCE_COLOR)
        .attr('stroke-width', 2);
      g.append('text')
        .attr('x', legendX + 24)
        .attr('y', legendY + 3)
        .style('font-size', '10px')
        .style('fill', 'var(--color-text-secondary, #6b7280)')
        .text('‖V_n − V*‖∞');
      g.append('line')
        .attr('x1', legendX)
        .attr('x2', legendX + 20)
        .attr('y1', legendY + 14)
        .attr('y2', legendY + 14)
        .attr('stroke', BOUND_COLOR)
        .attr('stroke-width', 1.8)
        .attr('stroke-dasharray', '5,3');
      g.append('text')
        .attr('x', legendX + 24)
        .attr('y', legendY + 17)
        .style('font-size', '10px')
        .style('fill', 'var(--color-text-secondary, #6b7280)')
        .text('γⁿ · ‖V₀ − V*‖∞');
    },
    [rightW, panelH, history, vStar, gamma, numStates],
  );

  // ── Render ──────────────────────────────────────────────────
  const currentErr = supNormDistance(V, vStar);
  const iterCount = history.length - 1;
  const theoreticalAtN =
    Math.pow(gamma, iterCount) *
    supNormDistance(history[0] ?? new Array(numStates).fill(0), vStar);

  return (
    <div
      ref={containerRef}
      className="my-8 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
    >
      {/* Controls */}
      <div className="mb-3 flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
          <span className="font-medium">
            Discount γ:
          </span>
          <input
            type="range"
            min={0}
            max={0.99}
            step={0.01}
            value={gamma}
            onChange={(e) => setGamma(Number(e.target.value))}
            className="w-40"
          />
          <span className="w-12 font-mono text-xs">{gamma.toFixed(2)}</span>
        </label>

        <button
          type="button"
          onClick={doStep}
          disabled={running}
          className="rounded border border-zinc-300 bg-white px-3 py-1 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
        >
          Step
        </button>
        <button
          type="button"
          onClick={() => (running ? stopAnimation() : setRunning(true))}
          className={`rounded px-3 py-1 text-sm font-medium text-white ${
            running
              ? 'bg-red-600 hover:bg-red-700'
              : 'bg-emerald-600 hover:bg-emerald-700'
          }`}
        >
          {running ? 'Stop' : 'Run'}
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="rounded border border-zinc-300 bg-white px-3 py-1 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
        >
          Reset
        </button>
      </div>

      {/* Two SVG panels */}
      <div
        className={stacked ? 'flex flex-col gap-3' : 'flex flex-row gap-3'}
        style={{ width: totalWidth || '100%' }}
      >
        <svg
          ref={leftSvgRef}
          width={leftW}
          height={panelH}
          role="img"
          aria-label="Bar chart showing current V(s) and target V*(s) for each MDP state"
          style={{
            background: 'var(--color-bg-surface, #fafafa)',
            borderRadius: '6px',
          }}
        />
        <svg
          ref={rightSvgRef}
          width={rightW}
          height={panelH}
          role="img"
          aria-label="Log-scale convergence plot of sup-norm distance to V* with theoretical gamma^n bound overlay"
          style={{
            background: 'var(--color-bg-surface, #fafafa)',
            borderRadius: '6px',
          }}
        />
      </div>

      {/* Info panel */}
      <div className="mt-3 flex flex-wrap gap-4 rounded border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800/60">
        <div>
          <span className="font-semibold text-zinc-700 dark:text-zinc-300">n:</span>{' '}
          <span className="font-mono">{iterCount}</span>
        </div>
        <div>
          <span className="font-semibold text-zinc-700 dark:text-zinc-300">
            ‖V_n − V*‖∞:
          </span>{' '}
          <span className="font-mono">
            {currentErr < 1e-12 ? '< 1e−12' : currentErr.toExponential(3)}
          </span>
        </div>
        <div>
          <span className="font-semibold text-zinc-700 dark:text-zinc-300">
            γⁿ bound:
          </span>{' '}
          <span className="font-mono">{theoreticalAtN.toExponential(3)}</span>
        </div>
        <div>
          <span className="font-semibold text-zinc-700 dark:text-zinc-300">
            π*:
          </span>{' '}
          <span className="font-mono">
            {scenario.states
              .map(
                (s, i) => `${s}→${scenario.actions[optimalPolicy[i]]}`,
              )
              .join(', ')}
          </span>
        </div>
      </div>

      <p className="mt-2 text-xs italic text-zinc-500 dark:text-zinc-400">
        {scenario.description} The Bellman optimality operator T* is a γ-contraction
        in the sup-norm, so Banach's theorem guarantees V_n → V* at the geometric rate γⁿ.
      </p>
    </div>
  );
}
