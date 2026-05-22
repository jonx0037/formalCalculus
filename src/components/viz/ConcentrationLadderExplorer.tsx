/**
 * ConcentrationLadderExplorer — Topic 35 §§8-9.
 *
 * Single-panel four-curve plot comparing
 *   - empirical tail P(|X̄_n - μ| ≥ ε)   (Monte Carlo)
 *   - Markov on |X|                       (often vacuous, included for contrast)
 *   - Chebyshev σ²/(n ε²)
 *   - Hoeffding 2 exp(−2 n ε²)
 *
 * On a log y-axis the Hoeffding bound is a straight line of slope −2n; the
 * empirical tail tracks it; Chebyshev curves more slowly; Markov sits high
 * and flat. The reader sees the polynomial-vs-exponential gap visually.
 *
 * Interactions:
 *   - Distribution dropdown (Bernoulli, Uniform[0,1], Beta-scaled, two-point)
 *   - p slider (Bernoulli / two-point)
 *   - n slider (sample size, 50 to 5000)
 *   - Log / linear y-axis toggle
 *
 * Data source: `getConcentrationLadder` from
 * `src/data/probability-and-union-bound-data.ts`.
 */

import { useMemo, useState } from 'react';
import * as d3 from 'd3';
import { useD3 } from './shared/useD3';
import { useResizeObserver } from './shared/useResizeObserver';
import {
  getConcentrationLadder,
  type ConcentrationLadder,
} from '../../data/probability-and-union-bound-data';

const PANEL_WIDTH = 580;
const PANEL_HEIGHT = 360;
const margin = { top: 20, right: 28, bottom: 38, left: 56 };

const COLOR_AXIS = '#64748b';
const COLOR_EMPIRICAL = '#0f172a';
const COLOR_MARKOV = '#9ca3af';
const COLOR_CHEBYSHEV = '#f97316';
const COLOR_HOEFFDING = '#dc2626';

type DistributionId = 'bernoulli' | 'uniform-01' | 'beta-scaled' | 'two-point';

const DISTRIBUTIONS: Array<{ id: DistributionId; label: string; needsP: boolean }> = [
  { id: 'bernoulli', label: 'Bernoulli(p)', needsP: true },
  { id: 'uniform-01', label: 'Uniform[0, 1]', needsP: false },
  { id: 'beta-scaled', label: 'Beta(2, 2)', needsP: false },
  { id: 'two-point', label: 'Two-point on {0,1}', needsP: true },
];

export default function ConcentrationLadderExplorer() {
  const { ref: containerRef } = useResizeObserver<HTMLDivElement>();
  const [distId, setDistId] = useState<DistributionId>('bernoulli');
  const [p, setP] = useState<number>(0.5);
  const [n, setN] = useState<number>(200);
  const [yLog, setYLog] = useState<boolean>(true);

  const tGrid = useMemo(() => {
    const grid: number[] = [];
    for (let i = 1; i <= 60; i++) grid.push((i * 0.5) / 60);
    return grid;
  }, []);

  const ladder: ConcentrationLadder = useMemo(
    () => getConcentrationLadder(distId, n, tGrid, { p }, 13, 4000),
    [distId, n, tGrid, p],
  );

  // Where to drop the vertical reference line for the side-by-side readout.
  const [tProbe, setTProbe] = useState<number>(0.1);

  const findClosest = (
    pts: ConcentrationLadder['empirical'],
    t: number,
  ): { t: number; p: number } => {
    let best = pts[0];
    let bestDist = Math.abs(pts[0].t - t);
    for (const pt of pts) {
      const d = Math.abs(pt.t - t);
      if (d < bestDist) {
        bestDist = d;
        best = pt;
      }
    }
    return best;
  };

  const empProbe = findClosest(ladder.empirical, tProbe);
  const markovProbe = findClosest(ladder.markov, tProbe);
  const chebProbe = findClosest(ladder.chebyshev, tProbe);
  const hoeffProbe = findClosest(ladder.hoeffding, tProbe);

  const ref = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      const innerW = PANEL_WIDTH - margin.left - margin.right;
      const innerH = PANEL_HEIGHT - margin.top - margin.bottom;
      svg.attr('viewBox', `0 0 ${PANEL_WIDTH} ${PANEL_HEIGHT}`);
      const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      const xScale = d3.scaleLinear().domain([0, tGrid[tGrid.length - 1]]).range([0, innerW]);
      const yScale = yLog
        ? d3.scaleLog().domain([1e-7, 1.5]).range([innerH, 0]).clamp(true)
        : d3.scaleLinear().domain([0, 1.05]).range([innerH, 0]);

      // Axes
      const xAxis = d3.axisBottom(xScale).ticks(6).tickFormat(d3.format('.2f'));
      const yAxis = yLog
        ? d3.axisLeft(yScale).ticks(6, d3.format('.0e'))
        : d3.axisLeft(yScale).ticks(6).tickFormat(d3.format('.2f'));

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
        .attr('y', innerH + 30)
        .attr('text-anchor', 'middle')
        .style('fill', 'var(--color-text-muted)')
        .style('font-size', '10px')
        .text('ε');

      g.append('text')
        .attr('x', -innerH / 2)
        .attr('y', -42)
        .attr('text-anchor', 'middle')
        .attr('transform', 'rotate(-90)')
        .style('fill', 'var(--color-text-muted)')
        .style('font-size', '10px')
        .text('P(|X̄ - μ| ≥ ε)');

      // Helper: draw a curve, clamping its y values into the visible range.
      const drawCurve = (
        pts: { t: number; p: number }[],
        color: string,
        dash: string | null,
        width = 2,
      ) => {
        const path = d3
          .line<{ t: number; p: number }>()
          .x((d) => xScale(d.t))
          .y((d) => yScale(Math.max(d.p, yLog ? 1e-7 : 0)));
        const pathStr = path(pts);
        const el = g.append('path').attr('d', pathStr ?? '').style('fill', 'none').style('stroke', color).style('stroke-width', width);
        if (dash) el.style('stroke-dasharray', dash);
        return el;
      };

      drawCurve(ladder.markov, COLOR_MARKOV, '4 3', 1.5);
      drawCurve(ladder.chebyshev, COLOR_CHEBYSHEV, null, 2);
      drawCurve(ladder.hoeffding, COLOR_HOEFFDING, null, 2);

      // Empirical: scatter dots for visual contrast with the smooth curves.
      g.selectAll('circle.emp')
        .data(ladder.empirical)
        .enter()
        .append('circle')
        .attr('class', 'emp')
        .attr('cx', (d) => xScale(d.t))
        .attr('cy', (d) => yScale(Math.max(d.p, yLog ? 1e-7 : 0)))
        .attr('r', 2.5)
        .style('fill', COLOR_EMPIRICAL);

      // t-probe vertical line.
      g.append('line')
        .attr('x1', xScale(tProbe))
        .attr('x2', xScale(tProbe))
        .attr('y1', 0)
        .attr('y2', innerH)
        .style('stroke', '#7c3aed')
        .style('stroke-width', 1)
        .style('stroke-dasharray', '2 2')
        .style('opacity', 0.7);

      // Invisible overlay rect to capture click/drag for moving the probe.
      g.append('rect')
        .attr('width', innerW)
        .attr('height', innerH)
        .style('fill', 'transparent')
        .style('cursor', 'col-resize')
        .on('click', function (event) {
          const [mx] = d3.pointer(event);
          const t = xScale.invert(mx);
          setTProbe(Math.min(Math.max(t, tGrid[0]), tGrid[tGrid.length - 1]));
        });
    },
    [ladder, yLog, tProbe, tGrid],
  );

  const selectedDist = DISTRIBUTIONS.find((d) => d.id === distId);

  return (
    <div
      ref={containerRef}
      className="my-6 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900"
    >
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <span className="font-semibold">Distribution:</span>
          <select
            value={distId}
            onChange={(e) => setDistId(e.target.value as DistributionId)}
            className="rounded-md border border-gray-200 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800"
          >
            {DISTRIBUTIONS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
        </label>

        {selectedDist?.needsP && (
          <label className="flex items-center gap-2 text-sm">
            <span className="font-semibold">p =</span>
            <input
              type="range"
              min={0.05}
              max={0.95}
              step={0.05}
              value={p}
              onChange={(e) => setP(parseFloat(e.target.value))}
              className="w-32"
              aria-label="bernoulli parameter p"
            />
            <span className="w-10 font-mono text-right">{p.toFixed(2)}</span>
          </label>
        )}

        <label className="flex items-center gap-2 text-sm">
          <span className="font-semibold">n =</span>
          <input
            type="range"
            min={50}
            max={2000}
            step={50}
            value={n}
            onChange={(e) => setN(parseInt(e.target.value, 10))}
            className="w-32"
            aria-label="sample size n"
          />
          <span className="w-12 font-mono text-right">{n}</span>
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={yLog}
            onChange={(e) => setYLog(e.target.checked)}
          />
          <span className="font-semibold">log y-axis</span>
        </label>
      </div>

      <svg
        ref={ref}
        width="100%"
        height={PANEL_HEIGHT}
        style={{ maxWidth: PANEL_WIDTH, display: 'block' }}
        role="img"
        aria-label="empirical tail vs. Markov, Chebyshev, Hoeffding bounds"
      />

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-4 rounded-full" style={{ backgroundColor: COLOR_EMPIRICAL }} />
            <span>empirical (Monte Carlo)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-1 w-4" style={{ backgroundColor: COLOR_MARKOV, borderTop: `2px dashed ${COLOR_MARKOV}` }} />
            <span>Markov on |X| (often vacuous)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-1 w-4" style={{ backgroundColor: COLOR_CHEBYSHEV }} />
            <span>Chebyshev σ² / (n ε²)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-1 w-4" style={{ backgroundColor: COLOR_HOEFFDING }} />
            <span>Hoeffding 2 exp(−2 n ε²)</span>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
          <dt className="text-gray-500">At ε ≈ {tProbe.toFixed(2)}:</dt>
          <dd></dd>
          <dt className="text-gray-500">empirical</dt>
          <dd className="font-mono">{empProbe.p.toExponential(2)}</dd>
          <dt className="text-gray-500">Markov</dt>
          <dd className="font-mono">{markovProbe.p.toExponential(2)}</dd>
          <dt className="text-gray-500">Chebyshev</dt>
          <dd className="font-mono">{chebProbe.p.toExponential(2)}</dd>
          <dt className="text-gray-500">Hoeffding</dt>
          <dd className="font-mono">{hoeffProbe.p.toExponential(2)}</dd>
        </dl>
      </div>
      <p className="mt-3 text-xs text-gray-500">
        Click anywhere on the plot to move the dashed vertical probe and read off the four
        bounds. On the log axis, Hoeffding is a straight line of slope −2n; the empirical
        tail tracks it; Chebyshev decays polynomially; Markov is approximately constant.
      </p>
    </div>
  );
}
