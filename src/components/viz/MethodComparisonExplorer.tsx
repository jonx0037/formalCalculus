import { useState, useMemo, useCallback } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { eulerMethod, rk4Method, adaptiveRK45 } from './shared/odes';
import { getMethodComparisonPresets } from '../../data/numerical-odes-data';

// ── Constants ─────────────────────────────────────────────────

const PRESETS = getMethodComparisonPresets();

// Method colors matching the notebook palette
const EULER_COLOR = '#DC2626'; // red
const RK4_COLOR = '#2563EB'; // blue
const RK45_COLOR = '#059669'; // green
const EXACT_COLOR = '#111827'; // near-black

const SLIDER_STEPS = 200;
const LOG_H_MIN = Math.log10(0.001);
const LOG_H_MAX = Math.log10(1.0);

// ── Main component ──────────────────────────────────────────

export default function MethodComparisonExplorer() {
  const { ref: containerRef, width: containerWidth } =
    useResizeObserver<HTMLDivElement>();

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [logH, setLogH] = useState(Math.log10(PRESETS[0].defaultH));
  const [showEuler, setShowEuler] = useState(true);
  const [showRK4, setShowRK4] = useState(true);
  const [showRK45, setShowRK45] = useState(true);

  const preset = PRESETS[selectedIdx];
  const h = Math.pow(10, logH);

  // Layout
  const totalWidth = Math.min(containerWidth, 900);
  const solutionHeight = Math.min(totalWidth * 0.42, 280);
  const errorHeight = Math.min(totalWidth * 0.28, 180);
  const margin = { top: 18, right: 24, bottom: 38, left: 56 };

  // ── Compute solutions ────────────────────────────────────

  const eulerSol = useMemo(
    () => eulerMethod(preset.f, preset.t0, preset.y0, preset.tEnd, h),
    [preset, h],
  );
  const rk4Sol = useMemo(
    () => rk4Method(preset.f, preset.t0, preset.y0, preset.tEnd, h),
    [preset, h],
  );
  // Adaptive RK45 uses tolerance, not h directly. Tie its tolerance loosely
  // to the slider so the visualization stays consistent (smaller h ↔ tighter tol).
  const rk45Sol = useMemo(() => {
    const tol = h * h * 0.01; // h=0.1 → tol=1e-4; h=0.01 → tol=1e-6
    return adaptiveRK45(preset.f, preset.t0, preset.y0, preset.tEnd, tol);
  }, [preset, h]);

  // Exact solution sampled densely
  const exactCurve = useMemo(() => {
    const N = 400;
    const pts: Array<[number, number]> = [];
    for (let i = 0; i < N; i++) {
      const t = preset.t0 + (i / (N - 1)) * (preset.tEnd - preset.t0);
      pts.push([t, preset.exactSolution(t)]);
    }
    return pts;
  }, [preset]);

  // Compute errors at the numerical method's own grid points
  const eulerErr = useMemo(
    () =>
      eulerSol.t.map((t, i) => ({
        t,
        e: Math.max(Math.abs(eulerSol.y[i] - preset.exactSolution(t)), 1e-16),
      })),
    [eulerSol, preset],
  );
  const rk4Err = useMemo(
    () =>
      rk4Sol.t.map((t, i) => ({
        t,
        e: Math.max(Math.abs(rk4Sol.y[i] - preset.exactSolution(t)), 1e-16),
      })),
    [rk4Sol, preset],
  );
  const rk45Err = useMemo(
    () =>
      rk45Sol.t.map((t, i) => ({
        t,
        e: Math.max(Math.abs(rk45Sol.y[i] - preset.exactSolution(t)), 1e-16),
      })),
    [rk45Sol, preset],
  );

  // Final-error summary text
  const finalErrors = useMemo(() => {
    const last = (arr: { t: number; e: number }[]) =>
      arr.length > 0 ? arr[arr.length - 1].e : NaN;
    return {
      euler: last(eulerErr),
      rk4: last(rk4Err),
      rk45: last(rk45Err),
    };
  }, [eulerErr, rk4Err, rk45Err]);

  // Detect Euler divergence (early termination from BLOW_UP)
  const eulerDiverged =
    eulerSol.t[eulerSol.t.length - 1] < preset.tEnd - 1e-10;

  // ── Handlers ──────────────────────────────────────────────

  const handlePresetChange = useCallback((idx: number) => {
    setSelectedIdx(idx);
    setLogH(Math.log10(PRESETS[idx].defaultH));
  }, []);

  // ── D3: Solution panel (top) ──────────────────────────────

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

      // Y-domain: clamp to preset domain to avoid overflow when Euler diverges
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

      // Clip-path so curves don't overflow when y is huge (Euler blowing up)
      g.append('defs')
        .append('clipPath')
        .attr('id', 'mc-sol-clip')
        .append('rect')
        .attr('width', innerW)
        .attr('height', innerH);
      const plotArea = g.append('g').attr('clip-path', 'url(#mc-sol-clip)');

      const lineGen = d3
        .line<[number, number]>()
        .defined((d) => isFinite(d[1]))
        .x((d) => xScale(d[0]))
        .y((d) => yScale(d[1]));

      // Exact solution (dashed thin line)
      plotArea
        .append('path')
        .datum(exactCurve)
        .attr('d', lineGen)
        .style('fill', 'none')
        .style('stroke', EXACT_COLOR)
        .style('stroke-width', 1.5)
        .style('stroke-dasharray', '4,3')
        .style('opacity', 0.7);

      // Numerical method curves
      const drawMethod = (
        sol: { t: number[]; y: number[] },
        color: string,
        width: number,
      ) => {
        const pts: [number, number][] = sol.t.map((t, i) => [t, sol.y[i]]);
        plotArea
          .append('path')
          .datum(pts)
          .attr('d', lineGen)
          .style('fill', 'none')
          .style('stroke', color)
          .style('stroke-width', width)
          .style('opacity', 0.9);
        // Mark grid points so the discreteness is visible
        plotArea
          .selectAll(null)
          .data(pts)
          .enter()
          .append('circle')
          .attr('cx', (d) => xScale(d[0]))
          .attr('cy', (d) => yScale(d[1]))
          .attr('r', 2.2)
          .style('fill', color)
          .style('opacity', 0.8);
      };

      if (showEuler) drawMethod(eulerSol, EULER_COLOR, 1.7);
      if (showRK4) drawMethod(rk4Sol, RK4_COLOR, 1.7);
      if (showRK45) drawMethod(rk45Sol, RK45_COLOR, 1.7);

      // "Diverged" label if Euler blew up
      if (showEuler && eulerDiverged) {
        g.append('text')
          .attr('x', innerW - 10)
          .attr('y', 16)
          .attr('text-anchor', 'end')
          .style('font-size', '11px')
          .style('font-weight', 'bold')
          .style('fill', EULER_COLOR)
          .text(
            `Euler diverged at t ≈ ${eulerSol.t[eulerSol.t.length - 1].toFixed(2)}`,
          );
      }
    },
    [
      totalWidth,
      solutionHeight,
      preset,
      exactCurve,
      eulerSol,
      rk4Sol,
      rk45Sol,
      showEuler,
      showRK4,
      showRK45,
      eulerDiverged,
    ],
  );

  // ── D3: Error panel (bottom, log scale) ───────────────────

  const errorRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (totalWidth === 0) return;

      const innerW = totalWidth - margin.left - margin.right;
      const innerH = errorHeight - margin.top - margin.bottom;

      const g = svg
        .attr('width', totalWidth)
        .attr('height', errorHeight)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const xScale = d3
        .scaleLinear()
        .domain([preset.t0, preset.tEnd])
        .range([0, innerW]);

      // Determine y-range: collect all error magnitudes from active methods
      const allErrs: number[] = [];
      if (showEuler) allErrs.push(...eulerErr.map((d) => d.e));
      if (showRK4) allErrs.push(...rk4Err.map((d) => d.e));
      if (showRK45) allErrs.push(...rk45Err.map((d) => d.e));

      const eMin = Math.max(
        Math.min(...allErrs.filter((e) => e > 0), 1e-12),
        1e-16,
      );
      const eMax = Math.max(...allErrs, 1e-2);

      const yScale = d3
        .scaleLog()
        .domain([eMin, Math.max(eMax, eMin * 10)])
        .range([innerH, 0]);

      // Axes
      g.append('g')
        .attr('transform', `translate(0,${innerH})`)
        .call(d3.axisBottom(xScale).ticks(6))
        .selectAll('text')
        .style('font-size', '10px');
      g.append('g')
        .call(
          d3
            .axisLeft(yScale)
            .ticks(4, '.0e'),
        )
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
        .attr('y', -46)
        .attr('text-anchor', 'middle')
        .attr('transform', 'rotate(-90)')
        .style('font-size', '11px')
        .style('fill', 'var(--color-text-muted)')
        .text('|error|');

      // Clip
      g.append('defs')
        .append('clipPath')
        .attr('id', 'mc-err-clip')
        .append('rect')
        .attr('width', innerW)
        .attr('height', innerH);
      const plotArea = g.append('g').attr('clip-path', 'url(#mc-err-clip)');

      const lineGen = d3
        .line<{ t: number; e: number }>()
        .defined((d) => isFinite(d.e) && d.e > 0)
        .x((d) => xScale(d.t))
        .y((d) => yScale(d.e));

      const drawErr = (data: { t: number; e: number }[], color: string) => {
        plotArea
          .append('path')
          .datum(data)
          .attr('d', lineGen)
          .style('fill', 'none')
          .style('stroke', color)
          .style('stroke-width', 1.7)
          .style('opacity', 0.9);
      };

      if (showEuler) drawErr(eulerErr, EULER_COLOR);
      if (showRK4) drawErr(rk4Err, RK4_COLOR);
      if (showRK45) drawErr(rk45Err, RK45_COLOR);
    },
    [
      totalWidth,
      errorHeight,
      preset,
      eulerErr,
      rk4Err,
      rk45Err,
      showEuler,
      showRK4,
      showRK45,
    ],
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
            onChange={(e) => handlePresetChange(parseInt(e.target.value))}
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
          h = {h.toFixed(4)}
          <input
            type="range"
            min={LOG_H_MIN}
            max={LOG_H_MAX}
            step={(LOG_H_MAX - LOG_H_MIN) / SLIDER_STEPS}
            value={logH}
            onChange={(e) => setLogH(parseFloat(e.target.value))}
            className="w-40"
          />
        </label>

        <label
          className="flex items-center gap-1.5"
          style={{ color: EULER_COLOR }}
        >
          <input
            type="checkbox"
            checked={showEuler}
            onChange={(e) => setShowEuler(e.target.checked)}
          />
          Euler
        </label>
        <label
          className="flex items-center gap-1.5"
          style={{ color: RK4_COLOR }}
        >
          <input
            type="checkbox"
            checked={showRK4}
            onChange={(e) => setShowRK4(e.target.checked)}
          />
          RK4
        </label>
        <label
          className="flex items-center gap-1.5"
          style={{ color: RK45_COLOR }}
        >
          <input
            type="checkbox"
            checked={showRK45}
            onChange={(e) => setShowRK45(e.target.checked)}
          />
          RK45 (adaptive)
        </label>
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

      {/* Error panel */}
      <svg
        ref={errorRef}
        className="rounded"
        style={{
          border: '1px solid var(--color-border)',
          background: 'var(--color-viz-bg)',
        }}
      />

      {/* Final-error summary */}
      <div
        className="text-xs flex flex-wrap gap-4"
        style={{ color: 'var(--color-text-muted)' }}
      >
        <span>
          Final error at t = {preset.tEnd}:
        </span>
        {showEuler && (
          <span style={{ color: EULER_COLOR }}>
            Euler {finalErrors.euler.toExponential(2)}
            {eulerDiverged ? ' (diverged)' : ''}
          </span>
        )}
        {showRK4 && (
          <span style={{ color: RK4_COLOR }}>
            RK4 {finalErrors.rk4.toExponential(2)}
          </span>
        )}
        {showRK45 && (
          <span style={{ color: RK45_COLOR }}>
            RK45 {finalErrors.rk45.toExponential(2)} ({rk45Sol.totalSteps} steps,{' '}
            {rk45Sol.totalRejections} rejected)
          </span>
        )}
      </div>

      <p className="text-xs italic" style={{ color: 'var(--color-text-muted)' }}>
        {preset.description}
      </p>
    </div>
  );
}
