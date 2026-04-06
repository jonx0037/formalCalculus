import { useState, useMemo } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { adaptiveRK45 } from './shared/odes';
import { getMethodComparisonPresets } from '../../data/numerical-odes-data';

// ── Constants ─────────────────────────────────────────────────

// Use a curated subset of method-comparison presets that show
// adaptive-stepping behavior most clearly.
const ALL_PRESETS = getMethodComparisonPresets();
const PRESET_NAMES_FOR_ADAPTIVE = [
  'logistic-growth',
  'harmonic-oscillator',
  'finite-time-blowup',
];
const PRESETS = ALL_PRESETS.filter((p) => PRESET_NAMES_FOR_ADAPTIVE.includes(p.name));

const SOLUTION_COLOR = '#059669'; // green (matches RK45 in MethodComparisonExplorer)
const REJECTED_COLOR = '#DC2626'; // red

const SLIDER_STEPS = 200;
const LOG_TOL_MIN = -10;
const LOG_TOL_MAX = -2;

// ── Main component ──────────────────────────────────────────

export default function AdaptiveStepExplorer() {
  const { ref: containerRef, width: containerWidth } =
    useResizeObserver<HTMLDivElement>();

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [logTol, setLogTol] = useState(-6);

  const preset = PRESETS[selectedIdx];
  const tol = Math.pow(10, logTol);

  // Layout
  const totalWidth = Math.min(containerWidth, 900);
  const solutionHeight = Math.min(totalWidth * 0.42, 280);
  const stepBarHeight = Math.min(totalWidth * 0.18, 110);
  const margin = { top: 18, right: 24, bottom: 38, left: 56 };

  // ── Compute adaptive solution ──────────────────────────────

  const solution = useMemo(
    () => adaptiveRK45(preset.f, preset.t0, preset.y0, preset.tEnd, tol),
    [preset, tol],
  );

  // Min/max step size for the step-size color scale
  const stepStats = useMemo(() => {
    if (solution.stepSizes.length === 0) {
      return { min: tol, max: tol, mean: tol };
    }
    const min = Math.min(...solution.stepSizes);
    const max = Math.max(...solution.stepSizes);
    const mean =
      solution.stepSizes.reduce((a, b) => a + b, 0) / solution.stepSizes.length;
    return { min, max, mean };
  }, [solution, tol]);

  // ── D3: Solution panel ────────────────────────────────────

  const solutionRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (totalWidth === 0) return;

      const innerW = totalWidth - margin.left - margin.right;
      const innerH = solutionHeight - margin.top - margin.bottom;

      const g = svg
        .attr('width', totalWidth)
        .attr('height', solutionHeight)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const xScale = d3
        .scaleLinear()
        .domain([preset.t0, preset.tEnd])
        .range([0, innerW]);
      const yScale = d3
        .scaleLinear()
        .domain(preset.domain.y)
        .range([innerH, 0]);

      // Axes
      g.append('g')
        .attr('transform', `translate(0,${innerH})`)
        .call(d3.axisBottom(xScale).ticks(6))
        .selectAll('text')
        .style('font-size', '10px');
      g.append('g')
        .call(d3.axisLeft(yScale).ticks(6))
        .selectAll('text')
        .style('font-size', '10px');

      g.append('text')
        .attr('x', innerW / 2)
        .attr('y', innerH + 32)
        .attr('text-anchor', 'middle')
        .style('font-size', '11px')
        .style('fill', 'var(--color-text-muted)')
        .text('t');
      g.append('text')
        .attr('x', -innerH / 2)
        .attr('y', -42)
        .attr('text-anchor', 'middle')
        .attr('transform', 'rotate(-90)')
        .style('font-size', '11px')
        .style('fill', 'var(--color-text-muted)')
        .text('y(t)');

      // Clip
      g.append('defs')
        .append('clipPath')
        .attr('id', 'as-sol-clip')
        .append('rect')
        .attr('width', innerW)
        .attr('height', innerH);
      const plotArea = g.append('g').attr('clip-path', 'url(#as-sol-clip)');

      // Solution curve
      const lineGen = d3
        .line<[number, number]>()
        .defined((d) => isFinite(d[1]))
        .x((d) => xScale(d[0]))
        .y((d) => yScale(d[1]));

      const pts: [number, number][] = solution.t.map((t, i) => [t, solution.y[i]]);
      plotArea
        .append('path')
        .datum(pts)
        .attr('d', lineGen)
        .style('fill', 'none')
        .style('stroke', SOLUTION_COLOR)
        .style('stroke-width', 1.8)
        .style('opacity', 0.95);

      // Accepted-step markers
      plotArea
        .selectAll(null)
        .data(pts)
        .enter()
        .append('circle')
        .attr('cx', (d) => xScale(d[0]))
        .attr('cy', (d) => yScale(d[1]))
        .attr('r', 2.5)
        .style('fill', SOLUTION_COLOR);

      // Rejected-step markers along the t-axis (red triangles)
      const rejY = preset.domain.y[0] + 0.05 * (preset.domain.y[1] - preset.domain.y[0]);
      plotArea
        .selectAll(null)
        .data(solution.rejectedSteps)
        .enter()
        .append('path')
        .attr(
          'd',
          d3.symbol<number>().type(d3.symbolTriangle).size(45),
        )
        .attr('transform', (t) => `translate(${xScale(t)},${yScale(rejY)})`)
        .style('fill', REJECTED_COLOR)
        .style('opacity', 0.85);
    },
    [totalWidth, solutionHeight, preset, solution],
  );

  // ── D3: Step-size bar chart ───────────────────────────────

  const stepBarRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (totalWidth === 0 || solution.stepSizes.length === 0) return;

      const innerW = totalWidth - margin.left - margin.right;
      const innerH = stepBarHeight - margin.top - margin.bottom;

      const g = svg
        .attr('width', totalWidth)
        .attr('height', stepBarHeight)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const xScale = d3
        .scaleLinear()
        .domain([preset.t0, preset.tEnd])
        .range([0, innerW]);

      // Y-axis: step size on log scale
      const yScale = d3
        .scaleLog()
        .domain([
          Math.max(stepStats.min * 0.5, 1e-12),
          Math.max(stepStats.max * 2, stepStats.min * 10),
        ])
        .range([innerH, 0]);

      // X-axis (sparse)
      g.append('g')
        .attr('transform', `translate(0,${innerH})`)
        .call(d3.axisBottom(xScale).ticks(6))
        .selectAll('text')
        .style('font-size', '10px');
      g.append('g')
        .call(d3.axisLeft(yScale).ticks(3, '.0e'))
        .selectAll('text')
        .style('font-size', '9px');

      g.append('text')
        .attr('x', innerW / 2)
        .attr('y', innerH + 32)
        .attr('text-anchor', 'middle')
        .style('font-size', '11px')
        .style('fill', 'var(--color-text-muted)')
        .text('t');
      g.append('text')
        .attr('x', -innerH / 2)
        .attr('y', -42)
        .attr('text-anchor', 'middle')
        .attr('transform', 'rotate(-90)')
        .style('font-size', '10px')
        .style('fill', 'var(--color-text-muted)')
        .text('h (step size)');

      // Color scale: small h = red, large h = blue
      const colorScale = d3
        .scaleSequential<string>()
        .domain([Math.log10(stepStats.max), Math.log10(stepStats.min)])
        .interpolator(d3.interpolateRdBu);

      // Bars: variable-width rectangles spanning each accepted step
      for (let i = 0; i < solution.stepSizes.length; i++) {
        const tStart = solution.t[i];
        const tEnd = solution.t[i + 1];
        const h = solution.stepSizes[i];
        const x1 = xScale(tStart);
        const x2 = xScale(tEnd);
        const yTop = yScale(h);

        g.append('rect')
          .attr('x', x1)
          .attr('y', yTop)
          .attr('width', Math.max(x2 - x1 - 0.5, 0.5))
          .attr('height', innerH - yTop)
          .style('fill', colorScale(Math.log10(h)))
          .style('opacity', 0.85);
      }
    },
    [totalWidth, stepBarHeight, preset, solution, stepStats],
  );

  // ── Render ────────────────────────────────────────────────

  return (
    <div ref={containerRef} className="flex flex-col gap-3 my-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <label
          className="flex items-center gap-1.5 font-medium"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Problem:
          <select
            value={selectedIdx}
            onChange={(e) => setSelectedIdx(parseInt(e.target.value))}
            className="rounded px-2 py-1 text-sm"
            style={{
              background: 'var(--color-surface-alt)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
            }}
          >
            {PRESETS.map((p, i) => (
              <option key={p.name} value={i}>
                {p.label}
              </option>
            ))}
          </select>
        </label>

        <label
          className="flex items-center gap-1.5"
          style={{ color: 'var(--color-text-muted)' }}
        >
          tol = {tol.toExponential(0)}
          <input
            type="range"
            min={LOG_TOL_MIN}
            max={LOG_TOL_MAX}
            step={(LOG_TOL_MAX - LOG_TOL_MIN) / SLIDER_STEPS}
            value={logTol}
            onChange={(e) => setLogTol(parseFloat(e.target.value))}
            className="w-44"
          />
        </label>

        <span style={{ color: 'var(--color-text-muted)' }}>
          accepted: <b style={{ color: SOLUTION_COLOR }}>{solution.totalSteps}</b>{' '}
          rejected: <b style={{ color: REJECTED_COLOR }}>{solution.totalRejections}</b>
        </span>
      </div>

      {/* Solution panel */}
      <svg
        ref={solutionRef}
        className="rounded"
        style={{
          border: '1px solid var(--color-border)',
          background: 'var(--color-viz-bg)',
        }}
      />

      {/* Step-size bar chart */}
      <svg
        ref={stepBarRef}
        className="rounded"
        style={{
          border: '1px solid var(--color-border)',
          background: 'var(--color-viz-bg)',
        }}
      />

      <p className="text-xs italic" style={{ color: 'var(--color-text-muted)' }}>
        {preset.description} The bar chart below the solution shows the step
        size <em>h</em> the adaptive solver chose at each step — wider bars where
        the solution is smooth, narrower bars (and a redder tint) where it changes
        rapidly. Red triangles mark steps that were rejected and retried with a
        smaller <em>h</em>.
      </p>
    </div>
  );
}
