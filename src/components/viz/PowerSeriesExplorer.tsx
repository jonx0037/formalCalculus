import { useState, useMemo, useCallback, useRef, useEffect, type ChangeEvent } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { powerSeriesEvaluate } from './shared/series';
import { getPowerSeriesPresets, makeBinomialPreset } from '../../data/power-taylor-series-data';
import type { PowerSeriesPreset } from '../../data/power-taylor-series-data';
import { functionColors } from './shared/colorScales';

// ── Presets ─────────────────────────────────────────────────

const basePresets = getPowerSeriesPresets();
// Filter to the 5 main presets for the explorer (skip cos, x/n², n!)
const EXPLORER_PRESETS: PowerSeriesPreset[] = [
  basePresets.find((p) => p.name === 'ln1px')!,
  basePresets.find((p) => p.name === 'exponential')!,
  basePresets.find((p) => p.name === 'geometric')!,
  basePresets.find((p) => p.name === 'sin')!,
  basePresets.find((p) => p.name === 'binomial')!,
];

const margin = { top: 20, right: 30, bottom: 40, left: 50 };
const PARTIAL_SUM_COLOR = '#F59E0B';   // orange
const CONVERGENCE_GREEN = '#BBF7D0';
const DIVERGENCE_RED = '#FECACA';
const GRID_PTS = 400;

export default function PowerSeriesExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();
  const height = Math.min(width * 0.6, 460);

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [n, setN] = useState(5);
  const [alpha, setAlpha] = useState(0.5);
  const [playing, setPlaying] = useState(false);
  const [probeX, setProbeX] = useState<number | null>(null);
  const animRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Build active preset (binomial uses sub-slider for α)
  const preset = useMemo(() => {
    const p = EXPLORER_PRESETS[selectedIdx];
    if (p.name === 'binomial') return makeBinomialPreset(alpha);
    return p;
  }, [selectedIdx, alpha]);

  // x-axis range: extend beyond R for context
  const xRange = useMemo<[number, number]>(() => {
    const R = preset.radius;
    const c = preset.center;
    if (!isFinite(R)) return [c - 6, c + 6];
    if (R === 0) return [c - 1, c + 1];
    return [c - R * 1.8, c + R * 1.8];
  }, [preset]);

  // Compute curve data: target function + partial sum on grid
  const curves = useMemo(() => {
    const [xMin, xMax] = xRange;
    const step = (xMax - xMin) / GRID_PTS;
    const targetPts: { x: number; y: number }[] = [];
    const partialPts: { x: number; y: number }[] = [];

    for (let i = 0; i <= GRID_PTS; i++) {
      const x = xMin + i * step;
      const fVal = preset.targetFunction(x);
      const sVal = powerSeriesEvaluate(preset.coefficients, preset.center, x, n);

      // Clamp to prevent SVG blow-up
      const yClamp = (v: number) => (isFinite(v) && Math.abs(v) < 200 ? v : NaN);

      targetPts.push({ x, y: yClamp(fVal) });
      partialPts.push({ x, y: yClamp(sVal) });
    }

    return { targetPts, partialPts };
  }, [preset, n, xRange]);

  // Probe values
  const probeValues = useMemo(() => {
    if (probeX === null) return null;
    const fVal = preset.targetFunction(probeX);
    const sVal = powerSeriesEvaluate(preset.coefficients, preset.center, probeX, n);
    return {
      x: probeX,
      fx: fVal,
      sn: sVal,
      error: Math.abs(fVal - sVal),
    };
  }, [probeX, preset, n]);

  // Animation play/pause
  useEffect(() => {
    if (playing) {
      animRef.current = setInterval(() => {
        setN((prev) => (prev >= 30 ? 1 : prev + 1));
      }, 300);
    } else {
      if (animRef.current) clearInterval(animRef.current);
    }
    return () => {
      if (animRef.current) clearInterval(animRef.current);
    };
  }, [playing]);

  const handlePresetChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    setSelectedIdx(Number(e.target.value));
    setProbeX(null);
    setPlaying(false);
    setN(5);
  }, []);

  // ── D3 rendering ──────────────────────────────────────────

  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (width <= 0 || height <= 0) return;

      const innerW = width - margin.left - margin.right;
      const innerH = height - margin.top - margin.bottom;

      const g = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const [xMin, xMax] = xRange;
      const xScale = d3.scaleLinear().domain([xMin, xMax]).range([0, innerW]);

      // Y extent from both curves
      const allY = [...curves.targetPts, ...curves.partialPts]
        .map((d) => d.y)
        .filter((v) => isFinite(v));
      const yExtentRaw = d3.extent(allY);
      const yExtent = (yExtentRaw[0] !== undefined ? yExtentRaw : [-1, 1]) as [number, number];
      const yPad = ((yExtent[1] - yExtent[0]) * 0.1) || 1;
      const yScale = d3
        .scaleLinear()
        .domain([yExtent[0] - yPad, yExtent[1] + yPad])
        .range([innerH, 0]);

      // ── Convergence region bands ──────────────────────────
      const R = preset.radius;
      const c = preset.center;

      if (isFinite(R) && R > 0) {
        // Green band: (c-R, c+R)
        const leftBound = Math.max(xMin, c - R);
        const rightBound = Math.min(xMax, c + R);
        g.append('rect')
          .attr('x', xScale(leftBound))
          .attr('y', 0)
          .attr('width', xScale(rightBound) - xScale(leftBound))
          .attr('height', innerH)
          .style('fill', CONVERGENCE_GREEN)
          .style('opacity', 0.3);

        // Red bands: outside R
        if (c - R > xMin) {
          g.append('rect')
            .attr('x', 0)
            .attr('y', 0)
            .attr('width', xScale(c - R))
            .attr('height', innerH)
            .style('fill', DIVERGENCE_RED)
            .style('opacity', 0.25);
        }
        if (c + R < xMax) {
          g.append('rect')
            .attr('x', xScale(c + R))
            .attr('y', 0)
            .attr('width', innerW - xScale(c + R))
            .attr('height', innerH)
            .style('fill', DIVERGENCE_RED)
            .style('opacity', 0.25);
        }

        // Vertical dashed lines at endpoints
        [c - R, c + R].forEach((ep) => {
          if (ep >= xMin && ep <= xMax) {
            g.append('line')
              .attr('x1', xScale(ep))
              .attr('x2', xScale(ep))
              .attr('y1', 0)
              .attr('y2', innerH)
              .style('stroke', '#9CA3AF')
              .style('stroke-dasharray', '4 3')
              .style('stroke-width', 1);
          }
        });
      } else if (!isFinite(R)) {
        // R = ∞: entire band is green
        g.append('rect')
          .attr('x', 0)
          .attr('y', 0)
          .attr('width', innerW)
          .attr('height', innerH)
          .style('fill', CONVERGENCE_GREEN)
          .style('opacity', 0.15);
      }

      // Center marker (dashed vertical)
      g.append('line')
        .attr('x1', xScale(c))
        .attr('x2', xScale(c))
        .attr('y1', 0)
        .attr('y2', innerH)
        .style('stroke', '#6B7280')
        .style('stroke-dasharray', '2 4')
        .style('stroke-width', 1);

      // ── Line generators ───────────────────────────────────
      const line = d3
        .line<{ x: number; y: number }>()
        .defined((d) => isFinite(d.y))
        .x((d) => xScale(d.x))
        .y((d) => yScale(d.y));

      // Target function f(x)
      g.append('path')
        .datum(curves.targetPts)
        .attr('d', line)
        .style('fill', 'none')
        .style('stroke', functionColors[0])
        .style('stroke-width', 2.5);

      // Partial sum S_n(x)
      g.append('path')
        .datum(curves.partialPts)
        .attr('d', line)
        .style('fill', 'none')
        .style('stroke', PARTIAL_SUM_COLOR)
        .style('stroke-width', 2)
        .style('stroke-dasharray', '6 3');

      // ── Probe marker ──────────────────────────────────────
      if (probeX !== null && probeValues) {
        const px = xScale(probeX);
        // Vertical guide line
        g.append('line')
          .attr('x1', px)
          .attr('x2', px)
          .attr('y1', 0)
          .attr('y2', innerH)
          .style('stroke', '#6B7280')
          .style('stroke-dasharray', '2 2')
          .style('stroke-width', 0.8);

        // f(x₀) dot
        if (isFinite(probeValues.fx)) {
          g.append('circle')
            .attr('cx', px)
            .attr('cy', yScale(probeValues.fx))
            .attr('r', 4)
            .style('fill', functionColors[0]);
        }
        // S_n(x₀) dot
        if (isFinite(probeValues.sn) && Math.abs(probeValues.sn) < 200) {
          g.append('circle')
            .attr('cx', px)
            .attr('cy', yScale(probeValues.sn))
            .attr('r', 4)
            .style('fill', PARTIAL_SUM_COLOR);
        }
      }

      // ── Axes ──────────────────────────────────────────────
      const xAxis = d3.axisBottom(xScale).ticks(Math.max(4, Math.floor(innerW / 80)));
      const yAxis = d3.axisLeft(yScale).ticks(Math.max(3, Math.floor(innerH / 60)));

      g.append('g')
        .attr('transform', `translate(0,${innerH})`)
        .call(xAxis)
        .style('color', 'var(--color-text-muted)');

      g.append('g')
        .call(yAxis)
        .style('color', 'var(--color-text-muted)');

      // ── Click handler for probe ───────────────────────────
      g.append('rect')
        .attr('width', innerW)
        .attr('height', innerH)
        .style('fill', 'transparent')
        .style('cursor', 'crosshair')
        .on('click', (event: MouseEvent) => {
          const [mx] = d3.pointer(event);
          const xVal = xScale.invert(mx);
          setProbeX(xVal);
        });
    },
    [curves, width, height, xRange, preset, probeX, probeValues],
  );

  // ── JSX ───────────────────────────────────────────────────

  const R = preset.radius;
  const rLabel = isFinite(R) ? R.toFixed(R === Math.round(R) ? 0 : 2) : '∞';

  return (
    <div ref={containerRef} className="w-full my-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <select
          className="text-sm border rounded px-2 py-1"
          style={{ color: 'var(--color-text)', backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)' }}
          value={selectedIdx}
          onChange={handlePresetChange}
        >
          {EXPLORER_PRESETS.map((p, i) => (
            <option key={p.name} value={i}>{p.label}</option>
          ))}
        </select>

        {/* α slider for binomial series */}
        {EXPLORER_PRESETS[selectedIdx].name === 'binomial' && (
          <label className="flex items-center gap-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
            α = {alpha.toFixed(2)}
            <input
              type="range"
              min="-2"
              max="2"
              step="0.1"
              value={alpha}
              onChange={(e) => setAlpha(Number(e.target.value))}
              className="w-20"
            />
          </label>
        )}

        <label className="flex items-center gap-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          n = {n}
          <input
            type="range"
            min="1"
            max="30"
            value={n}
            onChange={(e) => setN(Number(e.target.value))}
            className="w-28"
          />
        </label>

        <button
          className="text-sm px-3 py-1 rounded border"
          style={{
            color: playing ? 'white' : 'var(--color-text)',
            backgroundColor: playing ? functionColors[0] : 'transparent',
            borderColor: 'var(--color-border)',
          }}
          onClick={() => setPlaying((p) => !p)}
        >
          {playing ? '⏸ Pause' : '▶ Play'}
        </button>
      </div>

      {/* SVG */}
      <svg ref={svgRef} width={width} height={height} />

      {/* Legend & probe readout */}
      <div className="flex flex-wrap gap-4 mt-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
        <span><span style={{ color: functionColors[0] }}>━</span> f(x)</span>
        <span><span style={{ color: PARTIAL_SUM_COLOR }}>╌╌</span> S<sub>{n}</sub>(x)</span>
        <span className="font-medium" style={{ color: 'var(--color-text)' }}>
          R = {rLabel}
        </span>
        {probeValues && isFinite(probeValues.fx) && (
          <>
            <span>x₀ = {probeValues.x.toFixed(3)}</span>
            <span>f(x₀) = {probeValues.fx.toFixed(6)}</span>
            <span>S<sub>{n}</sub>(x₀) = {isFinite(probeValues.sn) ? probeValues.sn.toFixed(6) : 'diverges'}</span>
            <span>|error| = {isFinite(probeValues.error) ? probeValues.error.toExponential(2) : '—'}</span>
          </>
        )}
        {!probeValues && (
          <span style={{ fontStyle: 'italic' }}>Click the chart to probe a point</span>
        )}
      </div>
    </div>
  );
}
