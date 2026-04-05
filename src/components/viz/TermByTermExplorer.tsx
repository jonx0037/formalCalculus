import { useState, useMemo, useCallback, type ChangeEvent } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { powerSeriesEvaluate, differentiateCoefficients, integrateCoefficients } from './shared/series';
import { functionColors } from './shared/colorScales';

// ── Memoized factorial ─────────────────────────────────────

const factCache: number[] = [1, 1];
function factorial(n: number): number {
  if (n < 0) return NaN;
  if (n > 170) return Infinity;
  if (n < factCache.length) return factCache[n];
  for (let i = factCache.length; i <= n; i++) factCache[i] = factCache[i - 1] * i;
  return factCache[n];
}

// ── Preset definitions ─────────────────────────────────────

interface TermByTermPreset {
  name: string;
  label: string;
  coefficients: (n: number) => number;
  targetFn: (x: number) => number;
  derivativeFn: (x: number) => number;
  integralFn: (x: number) => number;
  radius: number;
  xRange: [number, number];
}

const PRESETS: TermByTermPreset[] = [
  {
    name: '1/(1-x)',
    label: '1/(1\u2212x) \u2192 1/(1\u2212x)\u00B2',
    coefficients: (_n) => 1,
    targetFn: (x) => 1 / (1 - x),
    derivativeFn: (x) => 1 / ((1 - x) * (1 - x)),
    integralFn: (x) => -Math.log(1 - x),
    radius: 1,
    xRange: [-0.95, 0.95],
  },
  {
    name: '1/(1+x)',
    label: '1/(1+x) \u2192 ln(1+x)',
    coefficients: (n) => Math.pow(-1, n),
    targetFn: (x) => 1 / (1 + x),
    derivativeFn: (x) => -1 / ((1 + x) * (1 + x)),
    integralFn: (x) => Math.log(1 + x),
    radius: 1,
    xRange: [-0.95, 0.95],
  },
  {
    name: 'exp',
    label: 'e\u02E3 \u2192 e\u02E3 (self-reproducing)',
    coefficients: (n) => 1 / factorial(n),
    targetFn: Math.exp,
    derivativeFn: Math.exp,
    integralFn: (x) => Math.exp(x) - 1,
    radius: Infinity,
    xRange: [-3, 3],
  },
  {
    name: 'sin',
    label: 'sin x \u2192 cos x',
    coefficients: (n) => {
      if (n % 2 === 0) return 0;
      const k = (n - 1) / 2;
      return Math.pow(-1, k) / factorial(n);
    },
    targetFn: Math.sin,
    derivativeFn: Math.cos,
    integralFn: (x) => 1 - Math.cos(x),
    radius: Infinity,
    xRange: [-Math.PI * 1.5, Math.PI * 1.5],
  },
];

// ── Colors ─────────────────────────────────────────────────

const BLUE = functionColors[0];   // #2563EB — original function
const ORANGE = '#F59E0B';         // partial sum of original
const TEAL = '#0D9488';           // derivative / integral function
const PURPLE = '#7C3AED';         // partial sum of derivative / integral

// ── Layout constants ───────────────────────────────────────

const margin = { top: 20, right: 20, bottom: 40, left: 50 };
const GAP = 16;
const NUM_POINTS = 200;

type Mode = 'diff' | 'int';

// ── Component ──────────────────────────────────────────────

export default function TermByTermExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();
  const height = Math.min(width * 0.6, 460);

  const [presetIdx, setPresetIdx] = useState(0);
  const [mode, setMode] = useState<Mode>('diff');
  const [n, setN] = useState(6);

  const preset = PRESETS[presetIdx];

  const handlePresetChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    setPresetIdx(Number(e.target.value));
    setN(6);
  }, []);

  const handleNChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setN(Number(e.target.value));
  }, []);

  // ── Responsive two-panel layout ──────────────────────────

  const isNarrow = width < 550;
  const innerW = width - margin.left - margin.right;
  const panelW = isNarrow ? innerW : (innerW - GAP) / 2;
  const panelH = isNarrow ? Math.min(panelW * 0.8, 200) : height - margin.top - margin.bottom;
  const totalHeight = isNarrow
    ? 2 * panelH + GAP + margin.top + margin.bottom
    : height;

  // ── Compute curve data ───────────────────────────────────

  interface CurvePoint {
    x: number;
    y: number;
  }

  const curveData = useMemo(() => {
    const [xMin, xMax] = preset.xRange;
    const step = (xMax - xMin) / NUM_POINTS;

    const fCurve: CurvePoint[] = [];
    const snCurve: CurvePoint[] = [];
    const opCurve: CurvePoint[] = [];    // derivative or integral of f
    const opSnCurve: CurvePoint[] = [];  // derivative or integral of S_n

    const derivCoeffs = differentiateCoefficients(preset.coefficients);
    const integCoeffs = integrateCoefficients(preset.coefficients);

    for (let i = 0; i <= NUM_POINTS; i++) {
      const x = xMin + step * i;

      // Original function and its partial sum
      const fVal = preset.targetFn(x);
      const snVal = powerSeriesEvaluate(preset.coefficients, 0, x, n);

      if (isFinite(fVal)) fCurve.push({ x, y: fVal });
      if (isFinite(snVal)) snCurve.push({ x, y: snVal });

      if (mode === 'diff') {
        // Differentiated: f'(x) and S_n'(x) — degree drops by 1
        const fpVal = preset.derivativeFn(x);
        const spVal = powerSeriesEvaluate(derivCoeffs, 0, x, Math.max(0, n - 1));

        if (isFinite(fpVal)) opCurve.push({ x, y: fpVal });
        if (isFinite(spVal)) opSnCurve.push({ x, y: spVal });
      } else {
        // Integrated: F(x) and integral of S_n — degree increases by 1
        const FVal = preset.integralFn(x);
        const intSnVal = powerSeriesEvaluate(integCoeffs, 0, x, n + 1);

        if (isFinite(FVal)) opCurve.push({ x, y: FVal });
        if (isFinite(intSnVal)) opSnCurve.push({ x, y: intSnVal });
      }
    }

    return { fCurve, snCurve, opCurve, opSnCurve };
  }, [preset, n, mode]);

  // ── Radius label ─────────────────────────────────────────

  const radiusLabel = isFinite(preset.radius) ? preset.radius.toString() : '\u221E';

  // ── D3 rendering ─────────────────────────────────────────

  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (width <= 0 || totalHeight <= 0) return;

      const g = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      // Helper: draw one panel
      const drawPanel = (
        panelIndex: number,
        title: string,
        solidData: CurvePoint[],
        dashedData: CurvePoint[],
        solidColor: string,
        dashedColor: string,
      ) => {
        const xOff = isNarrow ? 0 : panelIndex * (panelW + GAP);
        const yOff = isNarrow ? panelIndex * (panelH + GAP) : 0;

        const pg = g.append('g')
          .attr('transform', `translate(${xOff},${yOff})`);

        if (solidData.length === 0 && dashedData.length === 0) return;

        // Compute scales from both data sets
        const allPoints = [...solidData, ...dashedData];
        const xExtRaw = d3.extent(allPoints, (d) => d.x);
        const xExtent = (xExtRaw[0] !== undefined ? xExtRaw : [-1, 1]) as [number, number];
        const yValues = allPoints.map((d) => d.y);
        const yExtRaw = d3.extent(yValues);
        const yExtent = (yExtRaw[0] !== undefined ? yExtRaw : [-1, 1]) as [number, number];
        const yPad = ((yExtent[1] - yExtent[0]) * 0.12) || 0.5;

        const xScale = d3.scaleLinear().domain(xExtent).range([0, panelW]);
        const yScale = d3.scaleLinear()
          .domain([yExtent[0] - yPad, yExtent[1] + yPad])
          .range([panelH, 0]);

        // Axes
        pg.append('g')
          .attr('transform', `translate(0,${panelH})`)
          .call(d3.axisBottom(xScale).ticks(5))
          .call((a) => {
            a.select('.domain').style('stroke', 'var(--color-border)');
            a.selectAll('.tick line').style('stroke', 'var(--color-border)');
            a.selectAll('.tick text').style('fill', 'var(--color-text-muted)').style('font-size', '9px');
          });

        pg.append('g')
          .call(d3.axisLeft(yScale).ticks(5))
          .call((a) => {
            a.select('.domain').style('stroke', 'var(--color-border)');
            a.selectAll('.tick line').style('stroke', 'var(--color-border)');
            a.selectAll('.tick text').style('fill', 'var(--color-text-muted)').style('font-size', '9px');
          });

        // x-axis label
        pg.append('text')
          .attr('x', panelW / 2)
          .attr('y', panelH + 32)
          .attr('text-anchor', 'middle')
          .style('font-size', '11px')
          .style('fill', 'var(--color-text-muted)')
          .text('x');

        // Solid line — target function (f, f', or F)
        const solidLine = d3.line<CurvePoint>()
          .x((d) => xScale(d.x))
          .y((d) => yScale(d.y))
          .defined((d) => isFinite(d.y));

        pg.append('path')
          .datum(solidData)
          .attr('d', solidLine)
          .attr('fill', 'none')
          .attr('stroke', solidColor)
          .attr('stroke-width', 2);

        // Dashed line — partial sum (S_n, S_n', or integ S_n)
        const dashedLine = d3.line<CurvePoint>()
          .x((d) => xScale(d.x))
          .y((d) => yScale(d.y))
          .defined((d) => isFinite(d.y));

        pg.append('path')
          .datum(dashedData)
          .attr('d', dashedLine)
          .attr('fill', 'none')
          .attr('stroke', dashedColor)
          .attr('stroke-width', 2)
          .attr('stroke-dasharray', '6,4');

        // Panel title
        pg.append('text')
          .attr('x', panelW / 2)
          .attr('y', -6)
          .attr('text-anchor', 'middle')
          .style('font-size', '11px')
          .style('font-weight', '600')
          .style('fill', 'var(--color-text)')
          .text(title);
      };

      // Left panel: f(x) and S_n(x)
      drawPanel(
        0,
        `f(x) and S\u2099(x)`,
        curveData.fCurve,
        curveData.snCurve,
        BLUE,
        ORANGE,
      );

      // Right panel: operation result
      const rightTitle = mode === 'diff'
        ? `f\u2032(x) and S\u2099\u2032(x)`
        : `\u222Bf(t)dt and \u222BS\u2099(t)dt`;

      drawPanel(
        1,
        rightTitle,
        curveData.opCurve,
        curveData.opSnCurve,
        TEAL,
        PURPLE,
      );
    },
    [width, totalHeight, curveData, mode, isNarrow, panelW, panelH],
  );

  return (
    <div ref={containerRef} className="w-full my-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <label className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Series:
          <select
            value={presetIdx}
            onChange={handlePresetChange}
            className="ml-2 text-sm border rounded px-2 py-1"
            style={{
              color: 'var(--color-text)',
              backgroundColor: 'var(--color-bg)',
              borderColor: 'var(--color-border)',
            }}
          >
            {PRESETS.map((p, i) => (
              <option key={p.name} value={i}>{p.label}</option>
            ))}
          </select>
        </label>

        {/* Mode toggle */}
        <div className="flex gap-1">
          <button
            className={`text-sm px-3 py-1 rounded ${mode === 'diff' ? 'font-semibold' : ''}`}
            style={{
              color: mode === 'diff' ? 'white' : 'var(--color-text)',
              backgroundColor: mode === 'diff' ? BLUE : 'transparent',
              borderColor: 'var(--color-border)',
              border: '1px solid',
            }}
            onClick={() => setMode('diff')}
          >
            Differentiate
          </button>
          <button
            className={`text-sm px-3 py-1 rounded ${mode === 'int' ? 'font-semibold' : ''}`}
            style={{
              color: mode === 'int' ? 'white' : 'var(--color-text)',
              backgroundColor: mode === 'int' ? TEAL : 'transparent',
              borderColor: 'var(--color-border)',
              border: '1px solid',
            }}
            onClick={() => setMode('int')}
          >
            Integrate
          </button>
        </div>

        <label className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          n = <strong style={{ color: 'var(--color-text)' }}>{n}</strong>
          <input
            type="range"
            min={1}
            max={20}
            value={n}
            onChange={handleNChange}
            className="ml-2 w-28"
          />
        </label>
      </div>

      {/* SVG */}
      <svg ref={svgRef} width={width} height={totalHeight} />

      {/* Legend / stats */}
      <div className="flex flex-wrap gap-4 mt-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
        <span><span style={{ color: BLUE }}>{'\u2501'}</span> f(x)</span>
        <span><span style={{ color: ORANGE }}>{'\u2564\u2564'}</span> S{'\u2099'}(x)</span>
        <span>
          <span style={{ color: TEAL }}>{'\u2501'}</span>
          {mode === 'diff' ? " f\u2032(x)" : ' \u222Bf'}
        </span>
        <span>
          <span style={{ color: PURPLE }}>{'\u2564\u2564'}</span>
          {mode === 'diff' ? " S\u2099\u2032(x)" : ' \u222BS\u2099'}
        </span>
        <span className="font-medium" style={{ color: 'var(--color-text)' }}>
          n = {n}, R = {radiusLabel}
        </span>
      </div>
    </div>
  );
}
