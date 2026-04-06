import { useState, useMemo, useCallback } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { eulerMethod, rk4Method, implicitEuler } from './shared/odes';
import {
  getStiffSystemPresets,
  getStabilityRegionPresets,
} from '../../data/numerical-odes-data';

// ── Constants ─────────────────────────────────────────────────

const STIFF_PRESETS = getStiffSystemPresets();
const STABILITY_PRESETS = getStabilityRegionPresets();

// Method colors
const FE_COLOR = '#DC2626'; // forward Euler — red
const RK4_COLOR = '#2563EB'; // RK4 — blue
const IE_COLOR = '#059669'; // implicit Euler — green
const EXACT_COLOR = '#111827';

const SLIDER_STEPS = 200;
const LOG_H_MIN = -4; // h_min = 1e-4
const LOG_H_MAX = -0.3; // h_max ≈ 0.5

// Stability region grid resolution
const REGION_GRID = 80;

// ── Main component ──────────────────────────────────────────

export default function StiffnessExplorer() {
  const { ref: containerRef, width: containerWidth } =
    useResizeObserver<HTMLDivElement>();

  const [presetIdx, setPresetIdx] = useState(0); // index into STIFF_PRESETS
  const [methodForRegion, setMethodForRegion] = useState<
    'forward-euler' | 'rk4' | 'implicit-euler'
  >('forward-euler');
  const [showFE, setShowFE] = useState(true);
  const [showRK4, setShowRK4] = useState(true);
  const [showIE, setShowIE] = useState(true);
  const [logH, setLogH] = useState(-2); // h = 0.01 default

  const preset = STIFF_PRESETS[presetIdx];
  const h = Math.pow(10, logH);

  // For the stiff demos, project onto the y2 component (the fast one)
  // and integrate the scalar problem dy2/dt = -|λ_max| · y2 starting from y2_0
  // for visual clarity.
  // To keep things concrete, we use the dominant eigenvalue from the preset.
  // For linear-stiff: λ_max = 1000. For Van der Pol: ~mu. For Robertson: ~3e7.
  // We'll display y_1 (the slow component) as the "interesting" variable.

  // Layout
  const totalWidth = Math.min(containerWidth, 900);
  const leftWidth = Math.floor(totalWidth * 0.5);
  const rightWidth = totalWidth - leftWidth - 10;
  const panelHeight = Math.min(leftWidth * 0.8, 320);
  const margin = { top: 18, right: 24, bottom: 38, left: 56 };

  // Get the dominant eigenvalue magnitude from the preset's Jacobian at y0
  const dominantLambda = useMemo(() => {
    const J = preset.jacobian(preset.y0[0], preset.y0[1]);
    // Compute eigenvalues of the 2x2 matrix
    const tr = J[0][0] + J[1][1];
    const det = J[0][0] * J[1][1] - J[0][1] * J[1][0];
    const disc = tr * tr - 4 * det;
    if (disc >= 0) {
      const sq = Math.sqrt(disc);
      const l1 = (tr + sq) / 2;
      const l2 = (tr - sq) / 2;
      return Math.max(Math.abs(l1), Math.abs(l2));
    } else {
      // complex eigenvalues α ± iβ
      const alpha = tr / 2;
      const beta = Math.sqrt(-disc) / 2;
      return Math.sqrt(alpha * alpha + beta * beta);
    }
  }, [preset]);

  // Build a scalar test equation y' = -|λ_max| y for visualization,
  // since the full 2D systems are too varied to display compactly.
  // This isolates the stiffness behavior cleanly.
  const scalarF = useCallback((_t: number, y: number) => -dominantLambda * y, [
    dominantLambda,
  ]);
  const scalarDfdy = useCallback(() => -dominantLambda, [dominantLambda]);
  const exact = useCallback((t: number) => Math.exp(-dominantLambda * t), [
    dominantLambda,
  ]);

  // Integration interval — short enough that the exact solution decays visibly
  const tEnd = useMemo(() => {
    // 4 e-folding times
    return Math.min(4 / dominantLambda, preset.tRange[1]);
  }, [dominantLambda, preset]);

  // ── Compute solutions ────────────────────────────────────

  const eulerSol = useMemo(
    () => eulerMethod(scalarF, 0, 1, tEnd, h),
    [scalarF, tEnd, h],
  );
  const rk4Sol = useMemo(
    () => rk4Method(scalarF, 0, 1, tEnd, h),
    [scalarF, tEnd, h],
  );
  const ieSol = useMemo(
    () => implicitEuler(scalarF, scalarDfdy, 0, 1, tEnd, h),
    [scalarF, scalarDfdy, tEnd, h],
  );

  const exactCurve = useMemo(() => {
    const N = 200;
    const pts: Array<[number, number]> = [];
    for (let i = 0; i < N; i++) {
      const t = (i / (N - 1)) * tEnd;
      pts.push([t, exact(t)]);
    }
    return pts;
  }, [exact, tEnd]);

  // ── Stability region precomputation ────────────────────────

  const regionPreset = useMemo(
    () => STABILITY_PRESETS.find((p) => p.method === methodForRegion)!,
    [methodForRegion],
  );

  // Stability region: precompute |R(z)| on a grid in the complex plane
  // Domain: z ∈ [-4, 2] × [-3, 3]
  const regionData = useMemo(() => {
    const reMin = -4,
      reMax = 2,
      imMin = -3,
      imMax = 3;
    const data: Array<{ re: number; im: number; v: number }> = [];
    for (let i = 0; i < REGION_GRID; i++) {
      const re = reMin + (i / (REGION_GRID - 1)) * (reMax - reMin);
      for (let j = 0; j < REGION_GRID; j++) {
        const im = imMin + (j / (REGION_GRID - 1)) * (imMax - imMin);
        const v = regionPreset.stabilityModulus(re, im);
        data.push({ re, im, v });
      }
    }
    return { data, reMin, reMax, imMin, imMax };
  }, [regionPreset]);

  // Eigenvalue dot positions (in z-plane: hλ for the dominant λ_max < 0)
  const eigenDot = useMemo(() => {
    return { re: -h * dominantLambda, im: 0 };
  }, [h, dominantLambda]);

  // Is the eigenvalue inside the stability region?
  const inside = useMemo(
    () => regionPreset.stabilityModulus(eigenDot.re, eigenDot.im) <= 1,
    [regionPreset, eigenDot],
  );

  // ── D3: Solution panel (left) ─────────────────────────────

  const solRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (leftWidth === 0) return;

      const innerW = leftWidth - margin.left - margin.right;
      const innerH = panelHeight - margin.top - margin.bottom;

      const g = svg
        .attr('width', leftWidth)
        .attr('height', panelHeight)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const xScale = d3.scaleLinear().domain([0, tEnd]).range([0, innerW]);
      const yScale = d3
        .scaleLinear()
        .domain([-1.5, 1.5])
        .range([innerH, 0]);

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
        .attr('id', 'st-sol-clip')
        .append('rect')
        .attr('width', innerW)
        .attr('height', innerH);
      const plotArea = g.append('g').attr('clip-path', 'url(#st-sol-clip)');

      const lineGen = d3
        .line<[number, number]>()
        .defined((d) => isFinite(d[1]))
        .x((d) => xScale(d[0]))
        .y((d) => yScale(d[1]));

      // Exact solution
      plotArea
        .append('path')
        .datum(exactCurve)
        .attr('d', lineGen)
        .style('fill', 'none')
        .style('stroke', EXACT_COLOR)
        .style('stroke-width', 1.5)
        .style('stroke-dasharray', '4,3')
        .style('opacity', 0.7);

      const drawMethod = (
        sol: { t: number[]; y: number[] },
        color: string,
      ) => {
        const pts: [number, number][] = sol.t.map((t, i) => [t, sol.y[i]]);
        plotArea
          .append('path')
          .datum(pts)
          .attr('d', lineGen)
          .style('fill', 'none')
          .style('stroke', color)
          .style('stroke-width', 1.7)
          .style('opacity', 0.9);
        plotArea
          .selectAll(null)
          .data(pts)
          .enter()
          .append('circle')
          .attr('cx', (d) => xScale(d[0]))
          .attr('cy', (d) => yScale(d[1]))
          .attr('r', 2.2)
          .style('fill', color);
      };

      if (showFE) drawMethod(eulerSol, FE_COLOR);
      if (showRK4) drawMethod(rk4Sol, RK4_COLOR);
      if (showIE) drawMethod(ieSol, IE_COLOR);
    },
    [leftWidth, panelHeight, tEnd, exactCurve, eulerSol, rk4Sol, ieSol, showFE, showRK4, showIE],
  );

  // ── D3: Stability region panel (right) ────────────────────

  const regionRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (rightWidth === 0) return;

      const innerW = rightWidth - margin.left - margin.right;
      const innerH = panelHeight - margin.top - margin.bottom;

      const g = svg
        .attr('width', rightWidth)
        .attr('height', panelHeight)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const xScale = d3
        .scaleLinear()
        .domain([regionData.reMin, regionData.reMax])
        .range([0, innerW]);
      const yScale = d3
        .scaleLinear()
        .domain([regionData.imMin, regionData.imMax])
        .range([innerH, 0]);

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
        .attr('y', innerH + 32)
        .attr('text-anchor', 'middle')
        .style('font-size', '11px')
        .style('fill', 'var(--color-text-muted)')
        .text('Re(z)');
      g.append('text')
        .attr('x', -innerH / 2)
        .attr('y', -42)
        .attr('text-anchor', 'middle')
        .attr('transform', 'rotate(-90)')
        .style('font-size', '11px')
        .style('fill', 'var(--color-text-muted)')
        .text('Im(z)');

      // Shade left half-plane lightly
      g.append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', xScale(0))
        .attr('height', innerH)
        .style('fill', 'var(--color-text)')
        .style('opacity', 0.04);

      // Plot stability region as colored rectangles
      // Each grid cell is a small rect; cells with |R(z)| <= 1 are filled
      const cellW = innerW / (REGION_GRID - 1);
      const cellH = innerH / (REGION_GRID - 1);

      for (const pt of regionData.data) {
        if (pt.v <= 1) {
          g.append('rect')
            .attr('x', xScale(pt.re) - cellW / 2)
            .attr('y', yScale(pt.im) - cellH / 2)
            .attr('width', cellW + 0.5)
            .attr('height', cellH + 0.5)
            .style('fill', '#3B82F6')
            .style('opacity', 0.25);
        }
      }

      // Axes (Re=0, Im=0) drawn on top of the shading
      g.append('line')
        .attr('x1', xScale(0))
        .attr('x2', xScale(0))
        .attr('y1', 0)
        .attr('y2', innerH)
        .style('stroke', 'var(--color-text-muted)')
        .style('stroke-width', 0.75)
        .style('stroke-dasharray', '2,2');
      g.append('line')
        .attr('x1', 0)
        .attr('x2', innerW)
        .attr('y1', yScale(0))
        .attr('y2', yScale(0))
        .style('stroke', 'var(--color-text-muted)')
        .style('stroke-width', 0.75)
        .style('stroke-dasharray', '2,2');

      // Eigenvalue dot at z = h·λ_max (real, negative)
      g.append('circle')
        .attr('cx', xScale(eigenDot.re))
        .attr('cy', yScale(eigenDot.im))
        .attr('r', 6)
        .style('fill', inside ? '#059669' : '#DC2626')
        .style('stroke', '#fff')
        .style('stroke-width', 1.5);

      g.append('text')
        .attr('x', xScale(eigenDot.re) + 9)
        .attr('y', yScale(eigenDot.im) + 4)
        .style('font-size', '10px')
        .style('font-weight', 'bold')
        .style('fill', inside ? '#059669' : '#DC2626')
        .text(`h·λ = ${eigenDot.re.toFixed(2)}`);

      // Title
      g.append('text')
        .attr('x', innerW / 2)
        .attr('y', -4)
        .attr('text-anchor', 'middle')
        .style('font-size', '11px')
        .style('font-weight', 'bold')
        .style('fill', 'var(--color-text)')
        .text(`${regionPreset.label} stability region`);
    },
    [rightWidth, panelHeight, regionData, eigenDot, inside, regionPreset],
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
          System:
          <select
            value={presetIdx}
            onChange={(e) => setPresetIdx(parseInt(e.target.value))}
            className="rounded px-2 py-1 text-sm"
            style={{
              background: 'var(--color-surface-alt)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
            }}
          >
            {STIFF_PRESETS.map((p, i) => (
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
          h = {h.toExponential(1)}
          <input
            type="range"
            min={LOG_H_MIN}
            max={LOG_H_MAX}
            step={(LOG_H_MAX - LOG_H_MIN) / SLIDER_STEPS}
            value={logH}
            onChange={(e) => setLogH(parseFloat(e.target.value))}
            className="w-44"
          />
        </label>

        <span style={{ color: 'var(--color-text-muted)' }}>
          λ_max ≈ <b>{(-dominantLambda).toExponential(1)}</b>, hλ ={' '}
          <b style={{ color: inside ? '#059669' : '#DC2626' }}>
            {eigenDot.re.toFixed(3)}
          </b>{' '}
          {inside ? '(in region)' : '(outside region — UNSTABLE)'}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-sm">
        <span style={{ color: 'var(--color-text-muted)' }}>Show:</span>
        <label className="flex items-center gap-1.5" style={{ color: FE_COLOR }}>
          <input
            type="checkbox"
            checked={showFE}
            onChange={(e) => setShowFE(e.target.checked)}
          />
          Forward Euler
        </label>
        <label className="flex items-center gap-1.5" style={{ color: RK4_COLOR }}>
          <input
            type="checkbox"
            checked={showRK4}
            onChange={(e) => setShowRK4(e.target.checked)}
          />
          RK4
        </label>
        <label className="flex items-center gap-1.5" style={{ color: IE_COLOR }}>
          <input
            type="checkbox"
            checked={showIE}
            onChange={(e) => setShowIE(e.target.checked)}
          />
          Implicit Euler
        </label>

        <span
          className="ml-4"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Region for:
        </span>
        <select
          value={methodForRegion}
          onChange={(e) =>
            setMethodForRegion(e.target.value as 'forward-euler' | 'rk4' | 'implicit-euler')
          }
          className="rounded px-2 py-1 text-sm"
          style={{
            background: 'var(--color-surface-alt)',
            color: 'var(--color-text)',
            border: '1px solid var(--color-border)',
          }}
        >
          <option value="forward-euler">Forward Euler</option>
          <option value="rk4">RK4</option>
          <option value="implicit-euler">Implicit Euler</option>
        </select>
      </div>

      {/* Two panels side by side */}
      <div className="flex gap-2.5 flex-wrap">
        <svg
          ref={solRef}
          className="rounded"
          style={{
            border: '1px solid var(--color-border)',
            background: 'var(--color-viz-bg)',
          }}
        />
        <svg
          ref={regionRef}
          className="rounded"
          style={{
            border: '1px solid var(--color-border)',
            background: 'var(--color-viz-bg)',
          }}
        />
      </div>

      <p className="text-xs italic" style={{ color: 'var(--color-text-muted)' }}>
        {preset.description} The right panel shows the stability region of the
        selected method in the complex z = hλ plane (blue = stable region). The
        green/red dot is the current value of h·λ_max — green if it lies inside
        the stability region (the method is stable), red if it lies outside (the
        method will blow up). Move the h slider to see the dot enter or leave the
        region.
      </p>
    </div>
  );
}
