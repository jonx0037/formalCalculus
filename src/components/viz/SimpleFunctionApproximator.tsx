import { useState, useMemo } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import {
  getSimpleFunctionApproximation,
  getRiemannPartition,
  getPresetFunctions,
  type PresetFunction,
} from '../../data/sigma-algebras-data';

// ── Constants ─────────────────────────────────────────────────

// Filter presets to those with non-negative values on [0, 1] for the
// dyadic simple-function construction (which assumes f ≥ 0).
const ALL_PRESETS: PresetFunction[] = getPresetFunctions();
const PRESETS = ALL_PRESETS.filter((p) => p.name !== 'x-sin-1-over-x');

const FUNCTION_COLOR = '#111827';
const SIMPLE_COLOR = '#4F46E5'; // indigo (Lebesgue / range)
const RIEMANN_COLOR = '#2563EB'; // blue (Riemann / domain)

// Sliders: 1 → 2 levels, 8 → 256 levels
const MIN_LEVEL_EXP = 1;
const MAX_LEVEL_EXP = 8;

// ── Main component ──────────────────────────────────────────

export default function SimpleFunctionApproximator() {
  const { ref: containerRef, width: containerWidth } =
    useResizeObserver<HTMLDivElement>();

  const [presetIdx, setPresetIdx] = useState(0);
  const [levelExp, setLevelExp] = useState(4); // default 16 levels
  const [partitionMode, setPartitionMode] = useState<'range' | 'domain'>('range');

  const preset = PRESETS[presetIdx];
  const numLevels = Math.pow(2, levelExp);

  // ── Layout ────────────────────────────────────────────────

  const totalWidth = Math.min(containerWidth, 760);
  const totalHeight = Math.min(420, totalWidth * 0.55);
  const margin = { top: 24, right: 24, bottom: 38, left: 50 };

  // ── Compute approximation ─────────────────────────────────

  const approx = useMemo(
    () =>
      getSimpleFunctionApproximation(
        preset.f,
        levelExp,
        preset.maxValue,
        preset.integralExact ?? NaN,
      ),
    [preset, levelExp],
  );

  const riemann = useMemo(
    () => getRiemannPartition(preset.f, numLevels, 'midpoint'),
    [preset, numLevels],
  );

  // Densely-sampled curve
  const curve = useMemo(() => {
    const N = 400;
    const pts: Array<[number, number]> = [];
    for (let i = 0; i < N; i++) {
      const x = i / (N - 1);
      pts.push([x, preset.f(x)]);
    }
    return pts;
  }, [preset]);

  // ── D3 render ─────────────────────────────────────────────

  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (totalWidth === 0) return;

      const innerW = totalWidth - margin.left - margin.right;
      const innerH = totalHeight - margin.top - margin.bottom;

      svg.attr('width', totalWidth).attr('height', totalHeight);
      const g = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const xScale = d3.scaleLinear().domain([0, 1]).range([0, innerW]);
      const yScale = d3
        .scaleLinear()
        .domain([0, preset.maxValue * 1.05])
        .range([innerH, 0]);

      // Axes
      g.append('g')
        .attr('transform', `translate(0,${innerH})`)
        .call(d3.axisBottom(xScale).ticks(5))
        .selectAll('text')
        .style('font-size', '10px');
      g.append('g')
        .call(d3.axisLeft(yScale).ticks(5))
        .selectAll('text')
        .style('font-size', '10px');

      g.append('text')
        .attr('x', innerW / 2)
        .attr('y', innerH + 30)
        .attr('text-anchor', 'middle')
        .style('font-size', '11px')
        .style('fill', 'var(--color-text-muted)')
        .text('x');
      g.append('text')
        .attr('x', -innerH / 2)
        .attr('y', -38)
        .attr('text-anchor', 'middle')
        .attr('transform', 'rotate(-90)')
        .style('font-size', '11px')
        .style('fill', 'var(--color-text-muted)')
        .text('f(x)');

      // Title
      const title =
        partitionMode === 'range'
          ? `Lebesgue (range partition) — 2^${levelExp} = ${numLevels} dyadic levels`
          : `Riemann (domain partition) — ${numLevels} subintervals`;
      g.append('text')
        .attr('x', innerW / 2)
        .attr('y', -8)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('font-weight', '600')
        .style('fill', partitionMode === 'range' ? SIMPLE_COLOR : RIEMANN_COLOR)
        .text(title);

      // Clip
      g.append('defs')
        .append('clipPath')
        .attr('id', 'sfa-clip')
        .append('rect')
        .attr('width', innerW)
        .attr('height', innerH);
      const plot = g.append('g').attr('clip-path', 'url(#sfa-clip)');

      if (partitionMode === 'range') {
        // Lebesgue staircase: horizontal bars built from preimage sets
        for (const step of approx.steps) {
          const yVal = step.level;
          for (const iv of step.preimageSet) {
            plot
              .append('rect')
              .attr('x', xScale(iv.a))
              .attr('y', yScale(yVal))
              .attr('width', Math.max(0.5, xScale(iv.b) - xScale(iv.a)))
              .attr('height', Math.max(0.5, yScale(0) - yScale(yVal)))
              .style('fill', SIMPLE_COLOR)
              .style('fill-opacity', 0.3)
              .style('stroke', SIMPLE_COLOR)
              .style('stroke-width', 0.4);
          }
        }
      } else {
        // Riemann bars: vertical rectangles over uniform x-subintervals
        riemann.subintervals.forEach((iv, i) => {
          const h = Math.max(0, riemann.heights[i]);
          plot
            .append('rect')
            .attr('x', xScale(iv.a))
            .attr('y', yScale(h))
            .attr('width', Math.max(0.5, xScale(iv.b) - xScale(iv.a) - 0.3))
            .attr('height', Math.max(0.5, yScale(0) - yScale(h)))
            .style('fill', RIEMANN_COLOR)
            .style('fill-opacity', 0.3)
            .style('stroke', RIEMANN_COLOR)
            .style('stroke-width', 0.4);
        });
      }

      // Function curve on top
      const line = d3
        .line<[number, number]>()
        .defined((d) => Number.isFinite(d[1]))
        .x((d) => xScale(d[0]))
        .y((d) => yScale(d[1]));

      plot
        .append('path')
        .datum(curve)
        .attr('d', line)
        .style('fill', 'none')
        .style('stroke', FUNCTION_COLOR)
        .style('stroke-width', 1.8);
    },
    [
      approx,
      riemann,
      curve,
      partitionMode,
      preset,
      levelExp,
      numLevels,
      totalWidth,
      totalHeight,
      margin.left,
      margin.right,
      margin.top,
      margin.bottom,
    ],
  );

  // ── Numeric readout ───────────────────────────────────────

  const approxValue =
    partitionMode === 'range' ? approx.integralApprox : riemann.sum;
  const exact = preset.integralExact ?? NaN;
  const err = Number.isFinite(exact) ? Math.abs(approxValue - exact) : NaN;

  return (
    <div ref={containerRef} className="flex flex-col gap-3 my-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <label
          className="flex items-center gap-1.5 font-medium"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Function:
          <select
            value={presetIdx}
            onChange={(e) => setPresetIdx(parseInt(e.target.value))}
            className="rounded px-2 py-1 text-sm"
            style={{
              background: 'var(--color-surface-alt)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
            }}
            aria-label="Choose target function"
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
          levels = 2^{levelExp} = {numLevels}
          <input
            type="range"
            min={MIN_LEVEL_EXP}
            max={MAX_LEVEL_EXP}
            step={1}
            value={levelExp}
            onChange={(e) => setLevelExp(parseInt(e.target.value))}
            className="w-40"
            aria-label="Number of dyadic levels (exponent)"
          />
        </label>

        <div
          className="inline-flex rounded overflow-hidden"
          role="radiogroup"
          aria-label="Partition mode"
        >
          <button
            type="button"
            onClick={() => setPartitionMode('range')}
            className="px-3 py-1 text-xs"
            style={{
              background:
                partitionMode === 'range'
                  ? SIMPLE_COLOR
                  : 'var(--color-surface-alt)',
              color:
                partitionMode === 'range' ? '#fff' : 'var(--color-text)',
              border: '1px solid var(--color-border)',
            }}
            aria-pressed={partitionMode === 'range'}
          >
            Range (Lebesgue)
          </button>
          <button
            type="button"
            onClick={() => setPartitionMode('domain')}
            className="px-3 py-1 text-xs"
            style={{
              background:
                partitionMode === 'domain'
                  ? RIEMANN_COLOR
                  : 'var(--color-surface-alt)',
              color:
                partitionMode === 'domain' ? '#fff' : 'var(--color-text)',
              border: '1px solid var(--color-border)',
              borderLeft: 'none',
            }}
            aria-pressed={partitionMode === 'domain'}
          >
            Domain (Riemann)
          </button>
        </div>
      </div>

      {/* SVG */}
      <svg
        ref={svgRef}
        className="rounded"
        style={{
          border: '1px solid var(--color-border)',
          background: 'var(--color-viz-bg)',
        }}
        role="img"
        aria-label="Simple function approximation: dyadic staircase converging to the target function from below"
      />

      {/* Numeric readout */}
      <div
        className="text-xs flex flex-wrap gap-x-4 gap-y-1"
        style={{ color: 'var(--color-text-muted)' }}
      >
        <span
          style={{
            color: partitionMode === 'range' ? SIMPLE_COLOR : RIEMANN_COLOR,
          }}
        >
          {partitionMode === 'range' ? 'Σ c_k · λ(A_k)' : 'Riemann sum'} ={' '}
          {approxValue.toFixed(5)}
        </span>
        <span>
          Exact integral:{' '}
          {Number.isFinite(exact) ? exact.toFixed(5) : '—'}
        </span>
        {Number.isFinite(err) && (
          <span>Error: {err.toExponential(2)}</span>
        )}
      </div>

      <p className="text-xs italic" style={{ color: 'var(--color-text-muted)' }}>
        {partitionMode === 'range'
          ? `Dyadic simple function: slice the y-axis into ${numLevels} levels, and on each level, color the preimage A_k = {x : f(x) ∈ [k/${numLevels}, (k+1)/${numLevels})·max}. The simple function s(x) = Σ c_k · 1_{A_k} is the largest dyadic step function below f. As you increase the level count, s converges to f from below — this is the constructive heart of Theorem 5 (simple function approximation).`
          : `Midpoint Riemann sum: slice the x-axis into ${numLevels} equal subintervals, sample f at each midpoint, and stack vertical rectangles. Both approaches converge to the same exact integral when f is Riemann-integrable — but Lebesgue's range slicing is what extends to integrals where Riemann breaks down.`}
      </p>
    </div>
  );
}
