import { useState, useMemo, type ChangeEvent } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { bernsteinPolynomial, fourierCoefficients, fourierPartialSum } from './shared/series';

// ── Constants ─────────────────────────────────────────────────

const margin = { top: 20, right: 20, bottom: 40, left: 55 };
const GAP = 40; // gap between left and right panels
const GRID_PTS = 300;
const TAYLOR_COLOR = '#DC2626';   // red
const FOURIER_COLOR = '#16A34A';  // green
const BERNSTEIN_COLOR = '#F59E0B'; // orange
const TARGET_COLOR = '#2563EB';   // blue

interface MethodErrorPoint {
  n: number;
  error: number;
}

interface ComparisonPreset {
  name: string;
  label: string;
  /** Function on [0, 1] for Bernstein */
  f01: (x: number) => number;
  /** Function on [-π, π] for Fourier */
  fPeriodic: (x: number) => number;
  /** Taylor coefficients a_k for expansion at center */
  taylorCoeffs: (k: number) => number;
  taylorCenter: number;
  taylorDomain: [number, number];
}

const PRESETS: ComparisonPreset[] = [
  {
    name: 'sin-pi-x',
    label: 'sin(πx) — analytic',
    f01: (x) => Math.sin(Math.PI * x),
    fPeriodic: (x) => Math.sin(x),
    taylorCoeffs: (k) => {
      // Taylor of sin(x) at 0: x - x³/3! + x⁵/5! - ...
      if (k % 2 === 0) return 0;
      const sign = ((k - 1) / 2) % 2 === 0 ? 1 : -1;
      let fact = 1;
      for (let i = 2; i <= k; i++) fact *= i;
      return sign / fact;
    },
    taylorCenter: 0,
    taylorDomain: [-Math.PI, Math.PI],
  },
  {
    name: 'abs-x',
    label: '|x| — Lipschitz, not C¹',
    f01: (x) => Math.abs(2 * x - 1),
    fPeriodic: (x) => {
      // |x| on [-π, π] extended periodically
      const xMod = ((x % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI) - Math.PI;
      return Math.abs(xMod);
    },
    taylorCoeffs: (_k) => 0, // |x| has no Taylor series at 0
    taylorCenter: 0,
    taylorDomain: [-1, 1],
  },
  {
    name: 'exp-x',
    label: 'eˣ — entire function',
    f01: (x) => Math.exp(x),
    fPeriodic: (x) => Math.exp(Math.cos(x)), // a smooth periodic function
    taylorCoeffs: (k) => {
      // Taylor of e^x at 0: Σ x^k / k!
      let fact = 1;
      for (let i = 2; i <= k; i++) fact *= i;
      return 1 / fact;
    },
    taylorCenter: 0,
    taylorDomain: [-2, 2],
  },
];

// ── Component ─────────────────────────────────────────────────

export default function ApproximationErrorExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();
  const totalHeight = Math.min(width * 0.5, 380);

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [n, setN] = useState(5);
  const [showTaylor, setShowTaylor] = useState(true);
  const [showFourier, setShowFourier] = useState(true);
  const [showBernstein, setShowBernstein] = useState(true);

  const preset = PRESETS[selectedIdx];

  // ── Compute Fourier coefficients (memoized) ───────────────

  const fourierCoeffs = useMemo(
    () => fourierCoefficients(preset.fPeriodic, 50),
    [preset],
  );

  // ── Compute function curves for left panel ────────────────

  const functionCurves = useMemo(() => {
    const [xMin, xMax] = preset.taylorDomain;
    const step = (xMax - xMin) / GRID_PTS;

    const targetPts: { x: number; y: number }[] = [];
    const taylorPts: { x: number; y: number }[] = [];
    const fourierPts: { x: number; y: number }[] = [];
    const bernsteinPts: { x: number; y: number }[] = [];

    for (let i = 0; i <= GRID_PTS; i++) {
      const x = xMin + i * step;
      const fPeriodic = preset.fPeriodic(x);

      targetPts.push({ x, y: fPeriodic });

      // Taylor partial sum
      if (showTaylor) {
        let taylor = 0;
        for (let k = 0; k <= n; k++) {
          taylor += preset.taylorCoeffs(k) * Math.pow(x - preset.taylorCenter, k);
        }
        taylorPts.push({ x, y: isFinite(taylor) ? taylor : NaN });
      }

      // Fourier partial sum
      if (showFourier) {
        const sn = fourierPartialSum(fourierCoeffs.a, fourierCoeffs.b, x, n);
        fourierPts.push({ x, y: sn });
      }

      // Bernstein (mapped to [0,1] from the domain)
      if (showBernstein) {
        const t = (x - xMin) / (xMax - xMin);
        const gFunc = (s: number) => preset.fPeriodic(xMin + s * (xMax - xMin));
        const bVal = bernsteinPolynomial(gFunc, n, t);
        bernsteinPts.push({ x, y: bVal });
      }
    }

    return { targetPts, taylorPts, fourierPts, bernsteinPts };
  }, [preset, n, showTaylor, showFourier, showBernstein, fourierCoeffs]);

  // ── Compute error vs n for right panel ────────────────────

  const errorCurves = useMemo(() => {
    const maxN = Math.max(n, 30);
    const [xMin, xMax] = preset.taylorDomain;
    const taylorErrors: MethodErrorPoint[] = [];
    const fourierErrors: MethodErrorPoint[] = [];
    const bernsteinErrors: MethodErrorPoint[] = [];

    for (let deg = 1; deg <= maxN; deg++) {
      // Taylor max error
      let tErr = 0;
      let fErr = 0;
      let bErr = 0;
      const evalPts = 500;

      for (let j = 0; j <= evalPts; j++) {
        const x = xMin + (j * (xMax - xMin)) / evalPts;
        const fVal = preset.fPeriodic(x);

        // Taylor
        let taylor = 0;
        for (let k = 0; k <= deg; k++) {
          taylor += preset.taylorCoeffs(k) * Math.pow(x - preset.taylorCenter, k);
        }
        if (isFinite(taylor)) tErr = Math.max(tErr, Math.abs(fVal - taylor));

        // Fourier
        const sn = fourierPartialSum(fourierCoeffs.a, fourierCoeffs.b, x, deg);
        fErr = Math.max(fErr, Math.abs(fVal - sn));

        // Bernstein
        const t = (x - xMin) / (xMax - xMin);
        const gFunc = (s: number) => preset.fPeriodic(xMin + s * (xMax - xMin));
        const bVal = bernsteinPolynomial(gFunc, deg, t);
        bErr = Math.max(bErr, Math.abs(fVal - bVal));
      }

      taylorErrors.push({ n: deg, error: Math.max(tErr, 1e-16) });
      fourierErrors.push({ n: deg, error: Math.max(fErr, 1e-16) });
      bernsteinErrors.push({ n: deg, error: Math.max(bErr, 1e-16) });
    }

    return { taylorErrors, fourierErrors, bernsteinErrors };
  }, [preset, n, fourierCoeffs]);

  // ── Handlers ──────────────────────────────────────────────

  const handlePresetChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setSelectedIdx(Number(e.target.value));
    setN(5);
  };

  // ── D3 rendering ──────────────────────────────────────────

  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (width < 100) return;

      const panelW = (width - margin.left - margin.right - GAP) / 2;
      const innerH = totalHeight - margin.top - margin.bottom;

      svg.attr('width', width).attr('height', totalHeight);

      // ── Left panel: function plots ──────────────────────

      const gLeft = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const [xMin, xMax] = preset.taylorDomain;
      const allYLeft = functionCurves.targetPts.map((p) => p.y);
      const yMinL = (d3.min(allYLeft) ?? -1) - 0.3;
      const yMaxL = (d3.max(allYLeft) ?? 1) + 0.3;

      const xScaleL = d3.scaleLinear().domain([xMin, xMax]).range([0, panelW]);
      const yScaleL = d3.scaleLinear().domain([yMinL, yMaxL]).range([innerH, 0]);

      gLeft
        .append('g')
        .attr('transform', `translate(0,${innerH})`)
        .call(d3.axisBottom(xScaleL).ticks(5))
        .selectAll('text')
        .style('font-size', '10px');

      gLeft
        .append('g')
        .call(d3.axisLeft(yScaleL).ticks(5))
        .selectAll('text')
        .style('font-size', '10px');

      gLeft
        .append('text')
        .attr('x', panelW / 2)
        .attr('y', innerH + 35)
        .attr('text-anchor', 'middle')
        .style('font-size', '11px')
        .text('x');

      const lineGen = d3
        .line<{ x: number; y: number }>()
        .x((d) => xScaleL(d.x))
        .y((d) => yScaleL(d.y))
        .defined((d) => isFinite(d.y) && Math.abs(d.y) < 50);

      // Target
      gLeft
        .append('path')
        .datum(functionCurves.targetPts)
        .attr('d', lineGen)
        .attr('fill', 'none')
        .attr('stroke', TARGET_COLOR)
        .attr('stroke-width', 2.5);

      // Taylor
      if (showTaylor && functionCurves.taylorPts.length > 0) {
        gLeft
          .append('path')
          .datum(functionCurves.taylorPts)
          .attr('d', lineGen)
          .attr('fill', 'none')
          .attr('stroke', TAYLOR_COLOR)
          .attr('stroke-width', 1.5)
          .attr('stroke-dasharray', '6,3');
      }

      // Fourier
      if (showFourier && functionCurves.fourierPts.length > 0) {
        gLeft
          .append('path')
          .datum(functionCurves.fourierPts)
          .attr('d', lineGen)
          .attr('fill', 'none')
          .attr('stroke', FOURIER_COLOR)
          .attr('stroke-width', 1.5)
          .attr('stroke-dasharray', '4,4');
      }

      // Bernstein
      if (showBernstein && functionCurves.bernsteinPts.length > 0) {
        gLeft
          .append('path')
          .datum(functionCurves.bernsteinPts)
          .attr('d', lineGen)
          .attr('fill', 'none')
          .attr('stroke', BERNSTEIN_COLOR)
          .attr('stroke-width', 1.5);
      }

      // ── Right panel: log-error vs n ─────────────────────

      const gRight = svg
        .append('g')
        .attr(
          'transform',
          `translate(${margin.left + panelW + GAP},${margin.top})`,
        );

      const maxN = Math.max(n, 30);
      const allErrors = [
        ...errorCurves.taylorErrors.map((p) => p.error),
        ...errorCurves.fourierErrors.map((p) => p.error),
        ...errorCurves.bernsteinErrors.map((p) => p.error),
      ].filter((e) => e > 0);

      const errMin = d3.min(allErrors) ?? 1e-16;
      const errMax = d3.max(allErrors) ?? 10;

      const xScaleR = d3.scaleLinear().domain([1, maxN]).range([0, panelW]);
      const yScaleR = d3
        .scaleLog()
        .domain([Math.max(errMin * 0.5, 1e-16), errMax * 2])
        .range([innerH, 0]);

      gRight
        .append('g')
        .attr('transform', `translate(0,${innerH})`)
        .call(d3.axisBottom(xScaleR).ticks(5))
        .selectAll('text')
        .style('font-size', '10px');

      gRight
        .append('g')
        .call(d3.axisLeft(yScaleR).ticks(5, '.0e'))
        .selectAll('text')
        .style('font-size', '10px');

      gRight
        .append('text')
        .attr('x', panelW / 2)
        .attr('y', innerH + 35)
        .attr('text-anchor', 'middle')
        .style('font-size', '11px')
        .text('degree n');

      gRight
        .append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -innerH / 2)
        .attr('y', -45)
        .attr('text-anchor', 'middle')
        .style('font-size', '11px')
        .text('max |error|');

      const errLine = d3
        .line<MethodErrorPoint>()
        .x((d) => xScaleR(d.n))
        .y((d) => yScaleR(d.error))
        .defined((d) => d.error > 0 && isFinite(d.error));

      if (showTaylor) {
        gRight
          .append('path')
          .datum(errorCurves.taylorErrors)
          .attr('d', errLine)
          .attr('fill', 'none')
          .attr('stroke', TAYLOR_COLOR)
          .attr('stroke-width', 1.5);
      }

      if (showFourier) {
        gRight
          .append('path')
          .datum(errorCurves.fourierErrors)
          .attr('d', errLine)
          .attr('fill', 'none')
          .attr('stroke', FOURIER_COLOR)
          .attr('stroke-width', 1.5);
      }

      if (showBernstein) {
        gRight
          .append('path')
          .datum(errorCurves.bernsteinErrors)
          .attr('d', errLine)
          .attr('fill', 'none')
          .attr('stroke', BERNSTEIN_COLOR)
          .attr('stroke-width', 1.5);
      }

      // Vertical line at current n
      gRight
        .append('line')
        .attr('x1', xScaleR(n))
        .attr('x2', xScaleR(n))
        .attr('y1', 0)
        .attr('y2', innerH)
        .attr('stroke', '#9CA3AF')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '4,3');
    },
    [width, totalHeight, functionCurves, errorCurves, n, showTaylor, showFourier, showBernstein, preset],
  );

  // ── Render ────────────────────────────────────────────────

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
          marginBottom: '8px',
          fontSize: '14px',
        }}
      >
        <label>
          Function:{' '}
          <select value={selectedIdx} onChange={handlePresetChange}>
            {PRESETS.map((p, i) => (
              <option key={p.name} value={i}>
                {p.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <em>n</em> = {n}{' '}
          <input
            type="range"
            min={1}
            max={50}
            value={n}
            onChange={(e) => setN(Number(e.target.value))}
            style={{ width: '100px', verticalAlign: 'middle' }}
          />
        </label>

        <label style={{ color: TAYLOR_COLOR, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={showTaylor}
            onChange={(e) => setShowTaylor(e.target.checked)}
          />{' '}
          Taylor
        </label>
        <label style={{ color: FOURIER_COLOR, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={showFourier}
            onChange={(e) => setShowFourier(e.target.checked)}
          />{' '}
          Fourier
        </label>
        <label style={{ color: BERNSTEIN_COLOR, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={showBernstein}
            onChange={(e) => setShowBernstein(e.target.checked)}
          />{' '}
          Bernstein
        </label>
      </div>

      <svg ref={svgRef} />

      <div
        style={{
          fontSize: '13px',
          color: '#6B7280',
          marginTop: '4px',
        }}
      >
        <strong style={{ color: TARGET_COLOR }}>f(x)</strong>{' '}
        {showTaylor && (
          <span style={{ color: TAYLOR_COLOR }}>— Taylor </span>
        )}
        {showFourier && (
          <span style={{ color: FOURIER_COLOR }}>— Fourier </span>
        )}
        {showBernstein && (
          <span style={{ color: BERNSTEIN_COLOR }}>— Bernstein </span>
        )}
        | Right panel: max |error| vs degree (log scale)
      </div>
    </div>
  );
}
