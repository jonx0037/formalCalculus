import { useState, useMemo, useCallback, type ChangeEvent } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { powerSeriesEvaluate } from './shared/series';
import { getSmoothNotAnalyticPreset } from '../../data/power-taylor-series-data';
import { functionColors, regionColors } from './shared/colorScales';

// ── Factorial cache ────────────────────────────────────────

const factCache: number[] = [1, 1];
function factorial(n: number): number {
  if (n < 0) return NaN;
  if (n > 170) return Infinity;
  if (n < factCache.length) return factCache[n];
  for (let i = factCache.length; i <= n; i++) factCache[i] = factCache[i - 1] * i;
  return factCache[n];
}

// ── Analytic presets ───────────────────────────────────────

interface AnalyticPreset {
  name: string;
  label: string;
  coefficients: (n: number) => number;
  targetFn: (x: number) => number;
  xRange: [number, number];
  yRange: [number, number];
  radius: number;
}

const ANALYTIC_PRESETS: AnalyticPreset[] = [
  {
    name: 'exp',
    label: 'e\u02E3 (R = \u221E)',
    coefficients: (n) => 1 / factorial(n),
    targetFn: Math.exp,
    xRange: [-3, 3],
    yRange: [-1, 10],
    radius: Infinity,
  },
  {
    name: 'sin',
    label: 'sin x (R = \u221E)',
    coefficients: (n) => {
      if (n % 2 === 0) return 0;
      const k = (n - 1) / 2;
      return Math.pow(-1, k) / factorial(n);
    },
    targetFn: Math.sin,
    xRange: [-2 * Math.PI, 2 * Math.PI],
    yRange: [-2, 2],
    radius: Infinity,
  },
  {
    name: 'ln1px',
    label: 'ln(1+x) (R = 1)',
    coefficients: (n) => {
      if (n === 0) return 0;
      return Math.pow(-1, n + 1) / n;
    },
    targetFn: (x) => Math.log(1 + x),
    xRange: [-0.95, 1.95],
    yRange: [-3, 1.5],
    radius: 1,
  },
];

// ── Constants ──────────────────────────────────────────────

const margin = { top: 30, right: 20, bottom: 40, left: 50 };
const GAP = 16;
const NUM_POINTS = 200;
const CLAMP_THRESHOLD = 100;

const COLOR_TARGET = functionColors[0];       // #2563EB — blue
const COLOR_TAYLOR_ANALYTIC = '#F59E0B';      // orange
const COLOR_TAYLOR_NON_ANALYTIC = functionColors[1]; // #DC2626 — red
const COLOR_ERROR_ANALYTIC = '#FEF3C7';       // light orange
const COLOR_ERROR_NON_ANALYTIC = regionColors.errorFill; // #FECACA
const COLOR_ROC_FILL = '#D1FAE5';             // light green

// ── Computed curve data ────────────────────────────────────

interface CurvePoint {
  x: number;
  f: number;
  t: number;
}

function buildCurve(
  xRange: [number, number],
  targetFn: (x: number) => number,
  coefficients: (k: number) => number,
  center: number,
  n: number,
): CurvePoint[] {
  const [xMin, xMax] = xRange;
  const step = (xMax - xMin) / NUM_POINTS;
  const points: CurvePoint[] = [];

  for (let i = 0; i <= NUM_POINTS; i++) {
    const x = xMin + step * i;
    const f = targetFn(x);
    let t = powerSeriesEvaluate(coefficients, center, x, n);
    if (!isFinite(t) || Math.abs(t) > CLAMP_THRESHOLD) t = NaN;
    points.push({ x, f, t });
  }

  return points;
}

// ── Component ──────────────────────────────────────────────

export default function TaylorVsPowerSeriesExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();
  const height = Math.min(width * 0.6, 460);

  const [presetIdx, setPresetIdx] = useState(0);
  const [n, setN] = useState(5);

  const preset = ANALYTIC_PRESETS[presetIdx];
  const smoothPreset = useMemo(() => getSmoothNotAnalyticPreset(), []);

  const handlePresetChange = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => setPresetIdx(Number(e.target.value)),
    [],
  );

  // Left panel data: analytic function + Taylor partial sums
  const leftData = useMemo(
    () => buildCurve(preset.xRange, preset.targetFn, preset.coefficients, 0, n),
    [presetIdx, n],
  );

  // Right panel data: smooth-not-analytic function + identically-zero Taylor series
  const rightData = useMemo(
    () => buildCurve([-2, 2], smoothPreset.f, smoothPreset.taylorCoeffs, 0, n),
    [n, smoothPreset],
  );

  // Error readout at a probe point
  const probeAnalytic = useMemo(() => {
    const px = preset.xRange[0] + (preset.xRange[1] - preset.xRange[0]) * 0.65;
    const fVal = preset.targetFn(px);
    let tVal = powerSeriesEvaluate(preset.coefficients, 0, px, n);
    if (!isFinite(tVal) || Math.abs(tVal) > CLAMP_THRESHOLD) tVal = NaN;
    return { x: px, error: isFinite(tVal) ? Math.abs(fVal - tVal) : Infinity };
  }, [presetIdx, n]);

  const probeSmooth = useMemo(() => {
    const px = 0.5;
    const fVal = smoothPreset.f(px);
    const tVal = powerSeriesEvaluate(smoothPreset.taylorCoeffs, 0, px, n);
    return { x: px, error: Math.abs(fVal - tVal) };
  }, [n, smoothPreset]);

  // Responsive two-panel layout
  const isNarrow = width < 550;
  const panelW = isNarrow ? (width - margin.left - margin.right) : (width - margin.left - margin.right - GAP) / 2;
  const panelH = isNarrow ? Math.min(panelW * 0.8, 200) : (height - margin.top - margin.bottom);
  const totalHeight = isNarrow
    ? 2 * panelH + GAP + margin.top + margin.bottom
    : height;

  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (width <= 0 || height <= 0) return;

      const root = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      // ── Helper: draw one panel ──────────────────────────
      function drawPanel(
        panelIndex: number,
        title: string,
        data: CurvePoint[],
        xDomain: [number, number],
        yDomain: [number, number],
        taylorColor: string,
        errorFillColor: string,
        radiusOfConvergence: number,
      ) {
        const xOff = isNarrow ? 0 : panelIndex * (panelW + GAP);
        const yOff = isNarrow ? panelIndex * (panelH + GAP) : 0;

        const g = root.append('g')
          .attr('transform', `translate(${xOff},${yOff})`);

        // Background rect for visual separation
        g.append('rect')
          .attr('x', -4)
          .attr('y', -20)
          .attr('width', panelW + 8)
          .attr('height', panelH + 20)
          .attr('rx', 4)
          .style('fill', 'var(--color-surface-alt, #f9fafb)')
          .style('opacity', 0.35);

        // Panel title
        g.append('text')
          .attr('x', panelW / 2)
          .attr('y', -6)
          .attr('text-anchor', 'middle')
          .style('fill', 'var(--color-text)')
          .style('font-size', '11px')
          .style('font-weight', '600')
          .text(title);

        const pH = panelH - 24; // account for title space
        const pW = panelW;

        const xScale = d3.scaleLinear().domain(xDomain).range([0, pW]);
        const yScale = d3.scaleLinear().domain(yDomain).range([pH, 0]);

        const plotG = g.append('g').attr('transform', 'translate(0,24)');

        // Convergence region shading for finite radius
        if (isFinite(radiusOfConvergence)) {
          const rLeft = Math.max(xDomain[0], -radiusOfConvergence);
          const rRight = Math.min(xDomain[1], radiusOfConvergence);
          plotG.append('rect')
            .attr('x', xScale(rLeft))
            .attr('y', 0)
            .attr('width', xScale(rRight) - xScale(rLeft))
            .attr('height', pH)
            .style('fill', COLOR_ROC_FILL)
            .style('opacity', 0.4);
        }

        // Error fill between f(x) and T_n(x)
        const areaGen = d3.area<CurvePoint>()
          .x((d) => xScale(d.x))
          .y0((d) => yScale(Math.max(yDomain[0], Math.min(yDomain[1], d.f))))
          .y1((d) => yScale(Math.max(yDomain[0], Math.min(yDomain[1], isFinite(d.t) ? d.t : d.f))))
          .defined((d) => isFinite(d.f) && isFinite(d.t));

        plotG.append('path')
          .datum(data)
          .attr('d', areaGen)
          .style('fill', errorFillColor)
          .style('opacity', 0.5);

        // Target function f(x) — solid blue
        const fLine = d3.line<CurvePoint>()
          .x((d) => xScale(d.x))
          .y((d) => yScale(d.f))
          .defined((d) => isFinite(d.f) && d.f >= yDomain[0] && d.f <= yDomain[1]);

        plotG.append('path')
          .datum(data)
          .attr('d', fLine)
          .attr('fill', 'none')
          .attr('stroke', COLOR_TARGET)
          .attr('stroke-width', 2.5);

        // Taylor partial sum — dashed
        const tLine = d3.line<CurvePoint>()
          .x((d) => xScale(d.x))
          .y((d) => yScale(d.t))
          .defined((d) => isFinite(d.t) && d.t >= yDomain[0] && d.t <= yDomain[1]);

        plotG.append('path')
          .datum(data)
          .attr('d', tLine)
          .attr('fill', 'none')
          .attr('stroke', taylorColor)
          .attr('stroke-width', 2)
          .attr('stroke-dasharray', '6,4');

        // X-axis
        plotG.append('g')
          .attr('transform', `translate(0,${pH})`)
          .call(d3.axisBottom(xScale).ticks(Math.min(6, Math.floor(pW / 50))))
          .call((a) => {
            a.select('.domain').style('stroke', 'var(--color-border)');
            a.selectAll('.tick line').style('stroke', 'var(--color-border)');
            a.selectAll('.tick text')
              .style('fill', 'var(--color-text-muted)')
              .style('font-size', '10px');
          });

        // Y-axis
        plotG.append('g')
          .call(d3.axisLeft(yScale).ticks(5))
          .call((a) => {
            a.select('.domain').style('stroke', 'var(--color-border)');
            a.selectAll('.tick line').style('stroke', 'var(--color-border)');
            a.selectAll('.tick text')
              .style('fill', 'var(--color-text-muted)')
              .style('font-size', '10px');
          });

        // Axis label
        plotG.append('text')
          .attr('x', pW / 2)
          .attr('y', pH + 30)
          .attr('text-anchor', 'middle')
          .style('fill', 'var(--color-text-muted)')
          .style('font-size', '11px')
          .text('x');
      }

      // ── Left panel: Analytic ────────────────────────────
      drawPanel(
        0,
        'Analytic \u2014 converges to f',
        leftData,
        preset.xRange,
        preset.yRange,
        COLOR_TAYLOR_ANALYTIC,
        COLOR_ERROR_ANALYTIC,
        preset.radius,
      );

      // ── Right panel: Smooth, not analytic ───────────────
      drawPanel(
        1,
        'Smooth, not analytic \u2014 T(x) \u2261 0 \u2260 f',
        rightData,
        [-2, 2],
        [-0.1, 1.1],
        COLOR_TAYLOR_NON_ANALYTIC,
        COLOR_ERROR_NON_ANALYTIC,
        Infinity, // Taylor series converges everywhere — just to the wrong function
      );
    },
    [width, height, leftData, rightData, presetIdx, n, isNarrow, panelW, panelH],
  );

  // Format error for display
  const formatError = (err: number): string => {
    if (!isFinite(err)) return '\u221E';
    if (err < 1e-10) return '< 10\u207B\u00B9\u2070';
    if (err < 0.001) return err.toExponential(2);
    return err.toFixed(4);
  };

  return (
    <div ref={containerRef} className="w-full my-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4 mb-3">
        <label className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Left panel:
          <select
            value={presetIdx}
            onChange={handlePresetChange}
            className="ml-2 px-2 py-1 rounded text-sm"
            style={{
              background: 'var(--color-surface-alt)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
            }}
          >
            {ANALYTIC_PRESETS.map((p, i) => (
              <option key={p.name} value={i}>{p.label}</option>
            ))}
          </select>
        </label>

        <label className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          n = {n}
          <input
            type="range"
            min={1}
            max={20}
            step={1}
            value={n}
            onChange={(e) => setN(Number(e.target.value))}
            className="ml-2 w-28"
          />
        </label>
      </div>

      {/* SVG */}
      <svg ref={svgRef} width={width} height={totalHeight} />

      {/* Error readout */}
      <div className="flex flex-wrap gap-4 mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
        <span>
          Analytic |f({probeAnalytic.x.toFixed(1)}) &minus; T<sub>{n}</sub>| = {formatError(probeAnalytic.error)}
        </span>
        <span>
          Non-analytic |f({probeSmooth.x}) &minus; T<sub>{n}</sub>| = {formatError(probeSmooth.error)}
        </span>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
        <span><span style={{ color: '#2563EB' }}>{'\u2501'}</span> f(x)</span>
        <span><span style={{ color: '#F59E0B' }}>{'\u254C\u254C'}</span> T{'\u2099'}(x) (analytic)</span>
        <span><span style={{ color: '#DC2626' }}>{'\u254C\u254C'}</span> T{'\u2099'}(x) {'\u2261'} 0 (non-analytic)</span>
        <span className="font-medium" style={{ color: 'var(--color-text)' }}>n = {n}</span>
      </div>
    </div>
  );
}
