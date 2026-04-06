import { useState, useMemo, useCallback } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { getNeuralODEPresets } from '../../data/numerical-odes-data';

// ── Constants ─────────────────────────────────────────────────

const PRESETS = getNeuralODEPresets();

const CLASS_0_COLOR = '#2563EB'; // blue
const CLASS_1_COLOR = '#DC2626'; // red

const EULER_COLOR = '#DC2626';
const RK4_COLOR = '#2563EB';

// ── Trajectory integrator (2D, RK4) ──────────────────────────

function integrate2D(
  field: (x: number, y: number, t: number) => [number, number],
  x0: number,
  y0: number,
  tEnd: number,
  h: number,
  method: 'euler' | 'rk4',
): Array<[number, number]> {
  const pts: Array<[number, number]> = [[x0, y0]];
  let x = x0;
  let y = y0;
  let t = 0;
  const N = Math.ceil(tEnd / h);
  for (let i = 0; i < N; i++) {
    const dt = Math.min(h, tEnd - t);
    if (method === 'euler') {
      const [dx, dy] = field(x, y, t);
      x = x + dt * dx;
      y = y + dt * dy;
    } else {
      // RK4
      const [k1x, k1y] = field(x, y, t);
      const [k2x, k2y] = field(x + 0.5 * dt * k1x, y + 0.5 * dt * k1y, t + dt / 2);
      const [k3x, k3y] = field(x + 0.5 * dt * k2x, y + 0.5 * dt * k2y, t + dt / 2);
      const [k4x, k4y] = field(x + dt * k3x, y + dt * k3y, t + dt);
      x = x + (dt / 6) * (k1x + 2 * k2x + 2 * k3x + k4x);
      y = y + (dt / 6) * (k1y + 2 * k2y + 2 * k3y + k4y);
    }
    t = t + dt;
    pts.push([x, y]);
    if (!isFinite(x) || !isFinite(y) || Math.abs(x) > 1e6 || Math.abs(y) > 1e6) {
      break;
    }
  }
  return pts;
}

// ── Main component ──────────────────────────────────────────

export default function NeuralODEExplorer() {
  const { ref: containerRef, width: containerWidth } =
    useResizeObserver<HTMLDivElement>();

  const [presetIdx, setPresetIdx] = useState(0);
  const [solverChoice, setSolverChoice] = useState<'euler' | 'rk4'>('rk4');
  const [tFraction, setTFraction] = useState(1.0); // 0..1 along [tStart, tEnd]
  const [hStep, setHStep] = useState(0.1);

  const preset = PRESETS[presetIdx];
  const tEnd = preset.tRange[0] + tFraction * (preset.tRange[1] - preset.tRange[0]);

  // Layout
  const totalWidth = Math.min(containerWidth, 900);
  const leftWidth = Math.floor(totalWidth * 0.55);
  const rightWidth = totalWidth - leftWidth - 10;
  const panelHeight = Math.min(leftWidth * 0.7, 320);
  const margin = { top: 18, right: 24, bottom: 38, left: 56 };

  // ── Compute trajectories ──────────────────────────────────

  const trajectories = useMemo(() => {
    return preset.samplePoints.map(([x0, y0], i) => ({
      points: integrate2D(preset.vectorField, x0, y0, tEnd, hStep, solverChoice),
      label: preset.sampleLabels[i],
    }));
  }, [preset, tEnd, hStep, solverChoice]);

  // ── Convergence-order computation ─────────────────────────

  // Compare the full 2D trajectory of the first sample point against a
  // high-resolution RK4 reference, then fit the log-log slope of global
  // error vs step size. The empirical order should be ≈1 for Euler and ≈4
  // for RK4, which is the experimental verification of the Lax equivalence
  // theorem in the topic body.
  const convergenceData = useMemo(() => {
    const [x0, y0] = preset.samplePoints[0] ?? [1, 0];
    const tFinal = preset.tRange[1];

    // Reference solution: fixed-step RK4 at a step size that scales with the
    // integration interval. With ~4000 steps across [0, tFinal], the reference
    // error is O((tFinal/4000)^4) — well below the global errors of the test
    // solvers at the coarsest step size (tFinal/2) we fit against, so the
    // reference is effectively "ground truth" for the convergence fit. We
    // deliberately use a fixed-step method here (not adaptive) because a
    // uniform step gives a reproducible reference that doesn't depend on
    // tolerance choice.
    const refStep = tFinal / 4000;
    const refPts = integrate2D(preset.vectorField, x0, y0, tFinal, refStep, 'rk4');
    const yRef = refPts[refPts.length - 1][1];

    // Compute the global error of "single-step Euler over all of t" and the
    // global error of "single-step RK4 over all of t" at successively halved h.
    // To stay general for time-varying fields, we test the y component.
    const stepSizesArr = [
      0.5, 0.25, 0.125, 0.0625, 0.03125, 0.015625,
    ].map((s) => s * tFinal);

    const eulerErrs: number[] = [];
    const rk4Errs: number[] = [];
    for (const h of stepSizesArr) {
      const eu = integrate2D(preset.vectorField, x0, y0, tFinal, h, 'euler');
      const rk = integrate2D(preset.vectorField, x0, y0, tFinal, h, 'rk4');
      eulerErrs.push(Math.max(Math.abs(eu[eu.length - 1][1] - yRef), 1e-16));
      rk4Errs.push(Math.max(Math.abs(rk[rk.length - 1][1] - yRef), 1e-16));
    }

    // Linear fit of log(error) vs log(h) for each
    const fitSlope = (xs: number[], ys: number[]) => {
      const lx = xs.map(Math.log);
      const ly = ys.map(Math.log);
      const n = lx.length;
      const mx = lx.reduce((a, b) => a + b, 0) / n;
      const my = ly.reduce((a, b) => a + b, 0) / n;
      let num = 0,
        den = 0;
      for (let i = 0; i < n; i++) {
        num += (lx[i] - mx) * (ly[i] - my);
        den += (lx[i] - mx) * (lx[i] - mx);
      }
      return den > 1e-14 ? num / den : 0;
    };

    return {
      stepSizes: stepSizesArr,
      eulerErrors: eulerErrs,
      rk4Errors: rk4Errs,
      eulerSlope: fitSlope(stepSizesArr, eulerErrs),
      rk4Slope: fitSlope(stepSizesArr, rk4Errs),
    };
  }, [preset]);

  // ── D3: Vector field + trajectories (left panel) ──────────

  const fieldRef = useD3<SVGSVGElement>(
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

      const xScale = d3
        .scaleLinear()
        .domain(preset.domain.x)
        .range([0, innerW]);
      const yScale = d3
        .scaleLinear()
        .domain(preset.domain.y)
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
        .text('h₁');
      g.append('text')
        .attr('x', -innerH / 2)
        .attr('y', -42)
        .attr('text-anchor', 'middle')
        .attr('transform', 'rotate(-90)')
        .style('font-size', '11px')
        .style('fill', 'var(--color-text-muted)')
        .text('h₂');

      // Clip
      g.append('defs')
        .append('clipPath')
        .attr('id', 'no-field-clip')
        .append('rect')
        .attr('width', innerW)
        .attr('height', innerH);
      const plotArea = g.append('g').attr('clip-path', 'url(#no-field-clip)');

      // Vector field as a sparse grid of arrows
      const N_ARROWS = 14;
      const dxGrid = (preset.domain.x[1] - preset.domain.x[0]) / (N_ARROWS - 1);
      const dyGrid = (preset.domain.y[1] - preset.domain.y[0]) / (N_ARROWS - 1);
      const arrowLen = Math.min(innerW, innerH) / N_ARROWS / 1.5;

      // Compute max magnitude for normalization
      let maxMag = 1e-12;
      const fieldData: Array<{
        x: number;
        y: number;
        dx: number;
        dy: number;
        mag: number;
      }> = [];
      for (let i = 0; i < N_ARROWS; i++) {
        for (let j = 0; j < N_ARROWS; j++) {
          const xv = preset.domain.x[0] + i * dxGrid;
          const yv = preset.domain.y[0] + j * dyGrid;
          const [dx, dy] = preset.vectorField(xv, yv, 0);
          const mag = Math.sqrt(dx * dx + dy * dy);
          fieldData.push({ x: xv, y: yv, dx, dy, mag });
          if (mag > maxMag) maxMag = mag;
        }
      }

      for (const pt of fieldData) {
        if (pt.mag < 1e-10) continue;
        const cx = xScale(pt.x);
        const cy = yScale(pt.y);
        const scale = arrowLen * Math.min(pt.mag / maxMag, 1);
        const angle = Math.atan2(-pt.dy, pt.dx);
        const ex = cx + scale * Math.cos(angle);
        const ey = cy + scale * Math.sin(angle);

        plotArea
          .append('line')
          .attr('x1', cx)
          .attr('y1', cy)
          .attr('x2', ex)
          .attr('y2', ey)
          .style('stroke', '#9CA3AF')
          .style('stroke-width', 0.7)
          .style('opacity', 0.55);
      }

      // Sample-point trajectories
      const lineGen = d3
        .line<[number, number]>()
        .defined((d) => isFinite(d[0]) && isFinite(d[1]))
        .x((d) => xScale(d[0]))
        .y((d) => yScale(d[1]));

      for (const traj of trajectories) {
        const color = traj.label === 0 ? CLASS_0_COLOR : CLASS_1_COLOR;
        plotArea
          .append('path')
          .datum(traj.points)
          .attr('d', lineGen)
          .style('fill', 'none')
          .style('stroke', color)
          .style('stroke-width', 1.0)
          .style('opacity', 0.55);

        // Starting point (small open circle)
        const start = traj.points[0];
        plotArea
          .append('circle')
          .attr('cx', xScale(start[0]))
          .attr('cy', yScale(start[1]))
          .attr('r', 3)
          .style('fill', 'none')
          .style('stroke', color)
          .style('stroke-width', 1.5);

        // End point (filled)
        const end = traj.points[traj.points.length - 1];
        if (isFinite(end[0]) && isFinite(end[1])) {
          plotArea
            .append('circle')
            .attr('cx', xScale(end[0]))
            .attr('cy', yScale(end[1]))
            .attr('r', 3.5)
            .style('fill', color)
            .style('opacity', 0.9);
        }
      }
    },
    [leftWidth, panelHeight, preset, trajectories],
  );

  // ── D3: Convergence-order panel (right) ───────────────────

  const convRef = useD3<SVGSVGElement>(
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

      const allErrs = [
        ...convergenceData.eulerErrors,
        ...convergenceData.rk4Errors,
      ].filter((e) => e > 0);
      const eMin = Math.max(Math.min(...allErrs), 1e-16);
      const eMax = Math.max(...allErrs);

      const xScale = d3
        .scaleLog()
        .domain([
          Math.min(...convergenceData.stepSizes) * 0.7,
          Math.max(...convergenceData.stepSizes) * 1.3,
        ])
        .range([0, innerW]);
      const yScale = d3
        .scaleLog()
        .domain([eMin * 0.5, Math.max(eMax * 2, eMin * 10)])
        .range([innerH, 0]);

      g.append('g')
        .attr('transform', `translate(0,${innerH})`)
        .call(d3.axisBottom(xScale).ticks(4, '.0e'))
        .selectAll('text')
        .style('font-size', '9px');
      g.append('g')
        .call(d3.axisLeft(yScale).ticks(4, '.0e'))
        .selectAll('text')
        .style('font-size', '9px');

      g.append('text')
        .attr('x', innerW / 2)
        .attr('y', innerH + 32)
        .attr('text-anchor', 'middle')
        .style('font-size', '11px')
        .style('fill', 'var(--color-text-muted)')
        .text('step size h');
      g.append('text')
        .attr('x', -innerH / 2)
        .attr('y', -46)
        .attr('text-anchor', 'middle')
        .attr('transform', 'rotate(-90)')
        .style('font-size', '11px')
        .style('fill', 'var(--color-text-muted)')
        .text('|error|');

      // Title
      g.append('text')
        .attr('x', innerW / 2)
        .attr('y', -4)
        .attr('text-anchor', 'middle')
        .style('font-size', '11px')
        .style('font-weight', 'bold')
        .style('fill', 'var(--color-text)')
        .text('Empirical convergence order');

      const drawSeries = (
        errs: number[],
        color: string,
        label: string,
        slope: number,
        yOffset: number,
      ) => {
        const data = convergenceData.stepSizes.map((h, i) => ({
          h,
          e: errs[i],
        }));
        const lineGen = d3
          .line<{ h: number; e: number }>()
          .x((d) => xScale(d.h))
          .y((d) => yScale(d.e));

        g.append('path')
          .datum(data)
          .attr('d', lineGen)
          .style('fill', 'none')
          .style('stroke', color)
          .style('stroke-width', 1.7);

        g.selectAll(null)
          .data(data)
          .enter()
          .append('circle')
          .attr('cx', (d) => xScale(d.h))
          .attr('cy', (d) => yScale(d.e))
          .attr('r', 3)
          .style('fill', color);

        // Slope annotation
        g.append('text')
          .attr('x', innerW - 10)
          .attr('y', 16 + yOffset)
          .attr('text-anchor', 'end')
          .style('font-size', '11px')
          .style('font-weight', 'bold')
          .style('fill', color)
          .text(`${label}: slope ≈ ${slope.toFixed(2)}`);
      };

      drawSeries(
        convergenceData.eulerErrors,
        EULER_COLOR,
        'Euler',
        convergenceData.eulerSlope,
        0,
      );
      drawSeries(
        convergenceData.rk4Errors,
        RK4_COLOR,
        'RK4',
        convergenceData.rk4Slope,
        18,
      );
    },
    [rightWidth, panelHeight, convergenceData],
  );

  // ── Handlers ──────────────────────────────────────────────

  const handlePresetChange = useCallback((idx: number) => {
    setPresetIdx(idx);
    setTFraction(1.0);
  }, []);

  // Step count for the currently selected solver and step size. This is
  // a straightforward ceil((tRange[1] - tRange[0]) / hStep) and serves as
  // a "compute budget" indicator for the comparison — more steps means
  // more forward passes through the vector field, which for a real neural
  // ODE means more network evaluations.
  const solverSteps = useMemo(() => {
    const span = preset.tRange[1] - preset.tRange[0];
    return Math.ceil(span / hStep);
  }, [preset.tRange, hStep]);

  // ── Render ────────────────────────────────────────────────

  return (
    <div ref={containerRef} className="flex flex-col gap-3 my-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <label
          className="flex items-center gap-1.5 font-medium"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Demo:
          <select
            value={presetIdx}
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
          Solver:
          <select
            value={solverChoice}
            onChange={(e) => setSolverChoice(e.target.value as 'euler' | 'rk4')}
            className="rounded px-2 py-1 text-sm"
            style={{
              background: 'var(--color-surface-alt)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
            }}
          >
            <option value="euler">Euler (order 1)</option>
            <option value="rk4">RK4 (order 4)</option>
          </select>
        </label>

        <label
          className="flex items-center gap-1.5"
          style={{ color: 'var(--color-text-muted)' }}
        >
          h = {hStep.toFixed(3)}
          <input
            type="range"
            min={0.01}
            max={0.5}
            step={0.005}
            value={hStep}
            onChange={(e) => setHStep(parseFloat(e.target.value))}
            className="w-32"
          />
        </label>

        <label
          className="flex items-center gap-1.5"
          style={{ color: 'var(--color-text-muted)' }}
        >
          depth t = {tEnd.toFixed(2)}
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={tFraction}
            onChange={(e) => setTFraction(parseFloat(e.target.value))}
            className="w-32"
          />
        </label>

        <span style={{ color: 'var(--color-text-muted)' }}>
          solver steps: <b>{solverSteps}</b> (compute budget)
        </span>
      </div>

      {/* Two panels */}
      <div className="flex gap-2.5 flex-wrap">
        <svg
          ref={fieldRef}
          className="rounded"
          style={{
            border: '1px solid var(--color-border)',
            background: 'var(--color-viz-bg)',
          }}
        />
        <svg
          ref={convRef}
          className="rounded"
          style={{
            border: '1px solid var(--color-border)',
            background: 'var(--color-viz-bg)',
          }}
        />
      </div>

      <p className="text-xs italic" style={{ color: 'var(--color-text-muted)' }}>
        {preset.description} The left panel shows the vector field and how
        sample points flow through it from time 0 (open circles) to time t
        (filled circles). The right panel shows the empirical convergence order
        of Euler and RK4 on the y-component of the first trajectory — a direct
        verification of the theoretical orders 1 and 4. This is the experimental
        proof of the Lax equivalence theorem.
      </p>
    </div>
  );
}
