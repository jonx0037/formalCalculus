/**
 * BorelCantelliExplorer — Topic 35 §6.
 *
 * Two-panel viz:
 *   - Top:    p_n vs n on log-log scale, with partial sum ∑ p_n overlaid
 *   - Bottom: simulated trajectories of the cumulative indicator sum
 *             ∑_{k ≤ n} 1_{A_k} for nTrajectories independent realizations
 *
 * The pedagogical contrast: when ∑ p_n < ∞ (BC-I regime), the indicator-sum
 * trajectories *stabilize* to a finite count; when ∑ p_n = ∞ (BC-II,
 * assuming independence), the trajectories *diverge* linearly with the
 * partial sum.
 *
 * Interactions:
 *   - Sequence dropdown (1/n, 1/n², 1/(n log n), log(n)/n², power 1/n^α)
 *   - α slider (visible only when "power" is selected)
 *   - N slider for trajectory length
 *   - Reset re-seeds the PRNG so trajectories regenerate
 *
 * Data source: `simulateBorelCantelli` and `getProbabilitySequence` from
 * `src/data/probability-and-union-bound-data.ts`.
 */

import { useCallback, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { useD3 } from './shared/useD3';
import { useResizeObserver } from './shared/useResizeObserver';
import {
  simulateBorelCantelli,
  getProbabilitySequence,
} from '../../data/probability-and-union-bound-data';

const PANEL_HEIGHT = 220;
const margin = { top: 18, right: 32, bottom: 32, left: 52 };

const COLOR_AXIS = '#64748b';
const COLOR_PSEQ = '#c026d3';
const COLOR_PSUM = '#dc2626';
const COLOR_TRAJ = '#2563eb';
const COLOR_MEAN = '#16a34a';

type SequenceId = 'inverse-n' | 'inverse-n-squared' | 'one-over-n-log-n' | 'log-n-over-n-squared' | 'power';

const SEQUENCE_OPTIONS: Array<{ id: SequenceId; label: string; regime: 'BC-I' | 'BC-II' | 'tunable' }> = [
  { id: 'inverse-n', label: 'p_n = 1/n', regime: 'BC-II' },
  { id: 'inverse-n-squared', label: 'p_n = 1/n²', regime: 'BC-I' },
  { id: 'one-over-n-log-n', label: 'p_n = 1/(n log n)', regime: 'BC-II' },
  { id: 'log-n-over-n-squared', label: 'p_n = log(n)/n²', regime: 'BC-I' },
  { id: 'power', label: 'p_n = 1/n^α', regime: 'tunable' },
];

export default function BorelCantelliExplorer() {
  const { ref: containerRef } = useResizeObserver<HTMLDivElement>();
  const [sequenceId, setSequenceId] = useState<SequenceId>('inverse-n-squared');
  const [N, setN] = useState<number>(500);
  const [alpha, setAlpha] = useState<number>(1.0);
  const [seed, setSeed] = useState<number>(42);

  const pSequence = useMemo(
    () => getProbabilitySequence(sequenceId, N, alpha),
    [sequenceId, N, alpha],
  );

  const result = useMemo(
    () => simulateBorelCantelli(pSequence, 8, seed),
    [pSequence, seed],
  );

  const reseed = useCallback(() => setSeed((s) => s + 1), []);

  const finalPartialSum = result.partialSums[N - 1];
  const finalMean = result.meanTrajectory[N - 1];
  const finalTrajMax = result.trajectories.reduce(
    (max, t) => Math.max(max, t.indicatorSum[N - 1]),
    0,
  );

  // ── Top panel: p_n + ∑ p_n on log-log ───────────────────────
  const PANEL_WIDTH = 540;

  const topRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      const innerW = PANEL_WIDTH - margin.left - margin.right;
      const innerH = PANEL_HEIGHT - margin.top - margin.bottom;
      svg.attr('viewBox', `0 0 ${PANEL_WIDTH} ${PANEL_HEIGHT}`);
      const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      const xScale = d3.scaleLog().domain([1, N]).range([0, innerW]).clamp(true);
      const yMaxLow = d3.max(pSequence, (d, i) => (i > 0 ? d : undefined)) ?? 1;
      const yMaxHigh = Math.max(finalPartialSum, yMaxLow * 2);
      const yScale = d3.scaleLog().domain([1e-6, yMaxHigh]).range([innerH, 0]).clamp(true);

      // Axes
      const xAxis = d3.axisBottom(xScale).ticks(5, d3.format('.0s'));
      const yAxis = d3.axisLeft(yScale).ticks(5, d3.format('.1g'));
      const xAxisG = g.append('g').attr('transform', `translate(0,${innerH})`).call(xAxis);
      xAxisG.selectAll('text').style('fill', 'var(--color-text-muted)').style('font-size', '10px');
      xAxisG.selectAll('line').style('stroke', COLOR_AXIS).style('opacity', 0.4);
      xAxisG.selectAll('path').style('stroke', COLOR_AXIS);

      const yAxisG = g.append('g').call(yAxis);
      yAxisG.selectAll('text').style('fill', 'var(--color-text-muted)').style('font-size', '10px');
      yAxisG.selectAll('line').style('stroke', COLOR_AXIS).style('opacity', 0.4);
      yAxisG.selectAll('path').style('stroke', COLOR_AXIS);

      g.append('text')
        .attr('x', innerW / 2)
        .attr('y', innerH + 26)
        .attr('text-anchor', 'middle')
        .style('fill', 'var(--color-text-muted)')
        .style('font-size', '10px')
        .text('n');

      // p_n curve
      const pPath = d3
        .line<number>()
        .x((_, i) => xScale(i + 1))
        .y((d) => yScale(Math.max(d, 1e-7)));
      g.append('path')
        .attr('d', pPath(pSequence) ?? '')
        .style('fill', 'none')
        .style('stroke', COLOR_PSEQ)
        .style('stroke-width', 2);

      // Partial sum curve
      const sumPath = d3
        .line<number>()
        .x((_, i) => xScale(i + 1))
        .y((d) => yScale(Math.max(d, 1e-7)));
      g.append('path')
        .attr('d', sumPath(result.partialSums) ?? '')
        .style('fill', 'none')
        .style('stroke', COLOR_PSUM)
        .style('stroke-width', 2)
        .style('stroke-dasharray', '6 3');

      // Legend
      const legend = g.append('g').attr('transform', `translate(${innerW - 130},0)`);
      legend.append('line').attr('x1', 0).attr('x2', 16).attr('y1', 6).attr('y2', 6)
        .style('stroke', COLOR_PSEQ).style('stroke-width', 2);
      legend.append('text').attr('x', 22).attr('y', 9)
        .style('fill', 'var(--color-text)').style('font-size', '10px').text('p_n');
      legend.append('line').attr('x1', 0).attr('x2', 16).attr('y1', 22).attr('y2', 22)
        .style('stroke', COLOR_PSUM).style('stroke-width', 2).style('stroke-dasharray', '6 3');
      legend.append('text').attr('x', 22).attr('y', 25)
        .style('fill', 'var(--color-text)').style('font-size', '10px').text('∑_{k≤n} p_k');
    },
    [pSequence, result.partialSums, N, finalPartialSum],
  );

  // ── Bottom panel: indicator-sum trajectories ────────────────
  const bottomRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      const innerW = PANEL_WIDTH - margin.left - margin.right;
      const innerH = PANEL_HEIGHT - margin.top - margin.bottom;
      svg.attr('viewBox', `0 0 ${PANEL_WIDTH} ${PANEL_HEIGHT}`);
      const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      const xScale = d3.scaleLinear().domain([1, N]).range([0, innerW]);
      const yMax = Math.max(finalTrajMax, finalPartialSum, 5) * 1.05;
      const yScale = d3.scaleLinear().domain([0, yMax]).range([innerH, 0]);

      const xAxis = d3.axisBottom(xScale).ticks(6).tickFormat(d3.format('.0f'));
      const yAxis = d3.axisLeft(yScale).ticks(5).tickFormat(d3.format('.0f'));
      const xAxisG = g.append('g').attr('transform', `translate(0,${innerH})`).call(xAxis);
      xAxisG.selectAll('text').style('fill', 'var(--color-text-muted)').style('font-size', '10px');
      xAxisG.selectAll('line').style('stroke', COLOR_AXIS).style('opacity', 0.4);
      xAxisG.selectAll('path').style('stroke', COLOR_AXIS);

      const yAxisG = g.append('g').call(yAxis);
      yAxisG.selectAll('text').style('fill', 'var(--color-text-muted)').style('font-size', '10px');
      yAxisG.selectAll('line').style('stroke', COLOR_AXIS).style('opacity', 0.4);
      yAxisG.selectAll('path').style('stroke', COLOR_AXIS);

      g.append('text')
        .attr('x', innerW / 2)
        .attr('y', innerH + 26)
        .attr('text-anchor', 'middle')
        .style('fill', 'var(--color-text-muted)')
        .style('font-size', '10px')
        .text('n');

      g.append('text')
        .attr('x', -innerH / 2)
        .attr('y', -38)
        .attr('text-anchor', 'middle')
        .attr('transform', 'rotate(-90)')
        .style('fill', 'var(--color-text-muted)')
        .style('font-size', '10px')
        .text('∑_{k≤n} 1_{A_k}');

      // Trajectory paths
      const path = d3
        .line<number>()
        .x((_, i) => xScale(i + 1))
        .y((d) => yScale(d));

      result.trajectories.forEach((t) => {
        g.append('path')
          .attr('d', path(t.indicatorSum) ?? '')
          .style('fill', 'none')
          .style('stroke', COLOR_TRAJ)
          .style('stroke-width', 1.2)
          .style('opacity', 0.45);
      });

      // Mean trajectory
      g.append('path')
        .attr('d', path(result.meanTrajectory) ?? '')
        .style('fill', 'none')
        .style('stroke', COLOR_MEAN)
        .style('stroke-width', 2);

      // Partial sum reference (in dashed red)
      g.append('path')
        .attr('d', path(result.partialSums) ?? '')
        .style('fill', 'none')
        .style('stroke', COLOR_PSUM)
        .style('stroke-width', 1.5)
        .style('stroke-dasharray', '6 3');

      // Legend
      const legend = g.append('g').attr('transform', `translate(8,0)`);
      legend.append('line').attr('x1', 0).attr('x2', 16).attr('y1', 6).attr('y2', 6)
        .style('stroke', COLOR_TRAJ).style('stroke-width', 1.2).style('opacity', 0.7);
      legend.append('text').attr('x', 22).attr('y', 9)
        .style('fill', 'var(--color-text)').style('font-size', '10px').text('trajectories');
      legend.append('line').attr('x1', 0).attr('x2', 16).attr('y1', 22).attr('y2', 22)
        .style('stroke', COLOR_MEAN).style('stroke-width', 2);
      legend.append('text').attr('x', 22).attr('y', 25)
        .style('fill', 'var(--color-text)').style('font-size', '10px').text('mean');
      legend.append('line').attr('x1', 0).attr('x2', 16).attr('y1', 38).attr('y2', 38)
        .style('stroke', COLOR_PSUM).style('stroke-width', 1.5).style('stroke-dasharray', '6 3');
      legend.append('text').attr('x', 22).attr('y', 41)
        .style('fill', 'var(--color-text)').style('font-size', '10px').text('∑ p_n');
    },
    [result, N, finalTrajMax, finalPartialSum],
  );

  const selectedSeq = SEQUENCE_OPTIONS.find((s) => s.id === sequenceId);
  const effectiveRegime: 'BC-I' | 'BC-II' = sequenceId === 'power'
    ? (alpha > 1 ? 'BC-I' : 'BC-II')
    : (selectedSeq?.regime === 'tunable' ? 'BC-II' : (selectedSeq?.regime ?? 'BC-II'));

  return (
    <div
      ref={containerRef}
      className="my-6 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900"
    >
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <span className="font-semibold">Sequence:</span>
          <select
            value={sequenceId}
            onChange={(e) => setSequenceId(e.target.value as SequenceId)}
            className="rounded-md border border-gray-200 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800"
          >
            {SEQUENCE_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        {sequenceId === 'power' && (
          <label className="flex items-center gap-2 text-sm">
            <span className="font-semibold">α =</span>
            <input
              type="range"
              min={0.5}
              max={2.5}
              step={0.05}
              value={alpha}
              onChange={(e) => setAlpha(parseFloat(e.target.value))}
              className="w-32"
              aria-label="exponent alpha"
            />
            <span className="w-10 font-mono text-right">{alpha.toFixed(2)}</span>
          </label>
        )}

        <label className="flex items-center gap-2 text-sm">
          <span className="font-semibold">N =</span>
          <input
            type="range"
            min={100}
            max={2000}
            step={100}
            value={N}
            onChange={(e) => setN(parseInt(e.target.value, 10))}
            className="w-32"
            aria-label="trajectory length"
          />
          <span className="w-12 font-mono text-right">{N}</span>
        </label>

        <button
          type="button"
          onClick={reseed}
          className="rounded-md bg-gray-100 px-3 py-1 text-sm text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          Re-seed
        </button>

        <span
          className={`rounded-md px-2 py-1 text-xs font-semibold ${
            effectiveRegime === 'BC-I'
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100'
              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
          }`}
        >
          {effectiveRegime} regime ({effectiveRegime === 'BC-I' ? '∑ p_n < ∞, prob 0' : '∑ p_n = ∞, prob 1'})
        </span>
      </div>

      <svg
        ref={topRef}
        width="100%"
        height={PANEL_HEIGHT}
        style={{ maxWidth: PANEL_WIDTH, display: 'block' }}
        role="img"
        aria-label="p_n and partial sum on log-log scale"
      />
      <svg
        ref={bottomRef}
        width="100%"
        height={PANEL_HEIGHT}
        style={{ maxWidth: PANEL_WIDTH, display: 'block' }}
        role="img"
        aria-label="cumulative indicator-sum trajectories"
      />

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-sm md:grid-cols-3">
        <dt className="text-gray-500">∑_{`{k ≤ N}`} p_k</dt>
        <dd className="font-mono">{finalPartialSum.toFixed(3)}</dd>
        <dt className="text-gray-500">mean indicator-sum @ N</dt>
        <dd className="font-mono">{finalMean.toFixed(2)}</dd>
        <dt className="text-gray-500">max indicator-sum @ N</dt>
        <dd className="font-mono">{finalTrajMax}</dd>
      </dl>
      <p className="mt-3 text-xs text-gray-500">
        When ∑ p_n is bounded (BC-I), trajectories stabilize — the indicator-sum stops growing.
        When ∑ p_n diverges and the events are independent (BC-II), trajectories grow without
        bound, tracking the partial-sum curve in expectation.
      </p>
    </div>
  );
}
