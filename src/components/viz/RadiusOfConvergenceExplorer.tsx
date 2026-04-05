import { useState, useMemo, useCallback, type ChangeEvent } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { powerSeriesEvaluate } from './shared/series';
import { functionColors } from './shared/colorScales';

// ── Factorial helper ───────────────────────────────────────

const factorialCache: number[] = [1, 1];

function factorial(n: number): number {
  if (n < 0) return NaN;
  if (n < factorialCache.length) return factorialCache[n];
  for (let i = factorialCache.length; i <= n; i++) {
    factorialCache[i] = factorialCache[i - 1] * i;
  }
  return factorialCache[n];
}

// ── Series presets ─────────────────────────────────────────

interface SeriesPreset {
  name: string;
  label: string;
  coeff: (n: number) => number;
  R: number;
  targetFn: ((x: number) => number) | null;
}

const PRESETS: SeriesPreset[] = [
  {
    name: 'xn/n!',
    label: '\u03A3 x\u207F/n! (R = \u221E)',
    coeff: (n: number) => 1 / factorial(n),
    R: Infinity,
    targetFn: Math.exp,
  },
  {
    name: 'xn/n',
    label: '\u03A3 x\u207F/n (R = 1)',
    coeff: (n: number) => (n === 0 ? 0 : 1 / n),
    R: 1,
    targetFn: (x: number) => -Math.log(1 - x),
  },
  {
    name: 'xn/n2',
    label: '\u03A3 x\u207F/n\u00B2 (R = 1)',
    coeff: (n: number) => (n === 0 ? 0 : 1 / (n * n)),
    R: 1,
    targetFn: null,
  },
  {
    name: 'n!xn',
    label: '\u03A3 n!x\u207F (R = 0)',
    coeff: (n: number) => factorial(n),
    R: 0,
    targetFn: null,
  },
  {
    name: '2nxn/n',
    label: '\u03A3 2\u207Fx\u207F/n (R = 1/2)',
    coeff: (n: number) => (n === 0 ? 0 : Math.pow(2, n) / n),
    R: 0.5,
    targetFn: null,
  },
];

// ── Diagnostic types ───────────────────────────────────────

type DiagnosticMode = 'ratio' | 'root';

interface DiagnosticPoint {
  n: number;
  value: number;
}

// ── Compute diagnostic sequences ───────────────────────────

function computeRatioDiagnostics(coeff: (n: number) => number, maxN: number): DiagnosticPoint[] {
  const pts: DiagnosticPoint[] = [];
  for (let n = 1; n < maxN; n++) {
    const an = Math.abs(coeff(n));
    const an1 = Math.abs(coeff(n + 1));
    if (an > 1e-300 && isFinite(an) && isFinite(an1)) {
      const ratio = an1 / an;
      if (isFinite(ratio) && ratio < 1e6) {
        pts.push({ n, value: ratio });
      }
    }
  }
  return pts;
}

function computeRootDiagnostics(coeff: (n: number) => number, maxN: number): DiagnosticPoint[] {
  const pts: DiagnosticPoint[] = [];
  for (let n = 1; n <= maxN; n++) {
    const absAn = Math.abs(coeff(n));
    if (absAn > 0 && isFinite(absAn)) {
      const root = Math.pow(absAn, 1 / n);
      if (isFinite(root) && root < 1e6) {
        pts.push({ n, value: root });
      }
    }
  }
  return pts;
}

// ── Estimate 1/R from diagnostic tail ──────────────────────

function estimateLimitFromTail(pts: DiagnosticPoint[]): number | null {
  if (pts.length < 5) return null;
  const tailCount = Math.max(5, Math.floor(pts.length * 0.2));
  const tail = pts.slice(-tailCount);
  const avg = tail.reduce((s, d) => s + d.value, 0) / tail.length;
  return isFinite(avg) ? avg : null;
}

// ── Partial sums for the right panel ───────────────────────

interface PartialSumPoint {
  n: number;
  Sn: number;
}

function computePowerPartialSums(
  coeff: (n: number) => number,
  x: number,
  maxN: number,
): PartialSumPoint[] {
  const pts: PartialSumPoint[] = [];
  for (let n = 1; n <= maxN; n++) {
    const Sn = powerSeriesEvaluate(coeff, 0, x, n);
    pts.push({ n, Sn });
  }
  return pts;
}

// ── Component ──────────────────────────────────────────────

const margin = { top: 20, right: 30, bottom: 40, left: 50 };
const GAP = 16;

export default function RadiusOfConvergenceExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();
  const height = Math.min(width * 0.6, 460);

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [diagMode, setDiagMode] = useState<DiagnosticMode>('ratio');
  const [probeX, setProbeX] = useState(0.5);
  const [maxN, setMaxN] = useState(60);

  const preset = PRESETS[selectedIdx];

  // Adjust probe range based on R
  const probeMin = preset.R === 0 ? -0.01 : preset.R === Infinity ? -5 : -(preset.R + 0.5);
  const probeMax = preset.R === 0 ? 0.01 : preset.R === Infinity ? 5 : preset.R + 0.5;

  // Clamp probeX into range when preset changes
  const clampedX = Math.max(probeMin, Math.min(probeMax, probeX));

  // Compute diagnostic sequence
  const diagnostics = useMemo(() => {
    if (diagMode === 'ratio') {
      return computeRatioDiagnostics(preset.coeff, maxN);
    }
    return computeRootDiagnostics(preset.coeff, maxN);
  }, [selectedIdx, diagMode, maxN]);

  const estimatedLimit = useMemo(() => estimateLimitFromTail(diagnostics), [diagnostics]);

  // Compute partial sums at probe x
  const partialSums = useMemo(
    () => computePowerPartialSums(preset.coeff, clampedX, maxN),
    [selectedIdx, clampedX, maxN],
  );

  // Convergence status
  const isInside = preset.R === Infinity
    ? true
    : preset.R === 0
      ? clampedX === 0
      : Math.abs(clampedX) < preset.R;

  // Format R for display
  const rDisplay = preset.R === Infinity ? '\u221E' : preset.R.toString();

  // Determine if partial sums diverge (unbounded)
  const lastSn = partialSums.length > 0 ? partialSums[partialSums.length - 1].Sn : 0;
  const sumBounded = partialSums.every((p) => isFinite(p.Sn) && Math.abs(p.Sn) < 1e12);

  // Handlers
  const handlePresetChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    const idx = Number(e.target.value);
    setSelectedIdx(idx);
    const p = PRESETS[idx];
    // Reset probe to a sensible default
    if (p.R === Infinity) setProbeX(1);
    else if (p.R === 0) setProbeX(0);
    else setProbeX(p.R * 0.5);
  }, []);

  const handleDiagChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    setDiagMode(e.target.value as DiagnosticMode);
  }, []);

  // ── D3 rendering ─────────────────────────────────────────

  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (width <= 0 || height <= 0) return;

      const innerW = width - margin.left - margin.right;
      const innerH = height - margin.top - margin.bottom;

      const isNarrow = width < 550;
      const panelW = isNarrow ? innerW : (innerW - GAP) / 2;
      const panelH = isNarrow ? Math.floor(innerH / 2) - GAP / 2 : innerH;

      // ── Left Panel: Diagnostic Sequence ──

      const leftG = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      if (diagnostics.length > 1) {
        // X scale: n
        const xExtent = d3.extent(diagnostics, (d) => d.n) as [number, number];
        const xScaleL = d3.scaleLinear().domain(xExtent).range([0, panelW]);

        // Y scale: diagnostic values, including the asymptote 1/R if finite
        const yValues = diagnostics.map((d) => d.value);
        const oneOverR = preset.R > 0 && isFinite(preset.R) ? 1 / preset.R : null;
        if (oneOverR !== null) yValues.push(oneOverR);
        if (preset.R === Infinity) yValues.push(0);

        const yExt = d3.extent(yValues.filter((v) => isFinite(v))) as [number, number];
        const yRange = yExt[1] - yExt[0];
        const yPad = (yRange * 0.15) || 0.2;
        const yScaleL = d3.scaleLinear()
          .domain([Math.max(0, yExt[0] - yPad), yExt[1] + yPad])
          .range([panelH, 0]);

        // Asymptote at 1/R (or 0 if R = infinity)
        const asymptoteValue = preset.R === Infinity ? 0 : preset.R === 0 ? null : 1 / preset.R;
        if (asymptoteValue !== null && isFinite(asymptoteValue)) {
          const yAsym = yScaleL(asymptoteValue);
          if (yAsym >= 0 && yAsym <= panelH) {
            leftG.append('line')
              .attr('x1', 0).attr('x2', panelW)
              .attr('y1', yAsym).attr('y2', yAsym)
              .style('stroke', '#DC2626')
              .style('stroke-dasharray', '6,4')
              .style('stroke-width', 1.5);

            leftG.append('text')
              .attr('x', panelW - 4).attr('y', yAsym - 6)
              .attr('text-anchor', 'end')
              .style('fill', '#DC2626')
              .style('font-size', '10px')
              .style('font-weight', '600')
              .text(`1/R = ${asymptoteValue.toFixed(3)}`);
          }
        }

        // Diagnostic dots
        leftG.selectAll('.diag-dot')
          .data(diagnostics)
          .join('circle')
          .attr('class', 'diag-dot')
          .attr('cx', (d) => xScaleL(d.n))
          .attr('cy', (d) => yScaleL(d.value))
          .attr('r', 2)
          .style('fill', '#7C3AED')
          .style('opacity', 0.6);

        // Diagnostic connecting line
        const diagLine = d3.line<DiagnosticPoint>()
          .x((d) => xScaleL(d.n))
          .y((d) => yScaleL(d.value))
          .defined((d) => isFinite(d.value));

        leftG.append('path')
          .datum(diagnostics)
          .attr('fill', 'none')
          .attr('stroke', '#7C3AED')
          .attr('stroke-width', 1.5)
          .attr('stroke-opacity', 0.7)
          .attr('d', diagLine);

        // Axes
        leftG.append('g')
          .attr('transform', `translate(0,${panelH})`)
          .call(d3.axisBottom(xScaleL).ticks(Math.min(6, Math.floor(panelW / 50))))
          .call((a) => {
            a.select('.domain').style('stroke', 'var(--color-border)');
            a.selectAll('.tick line').style('stroke', 'var(--color-border)');
            a.selectAll('.tick text').style('fill', 'var(--color-text-muted)').style('font-size', '10px');
          });

        leftG.append('g')
          .call(d3.axisLeft(yScaleL).ticks(5))
          .call((a) => {
            a.select('.domain').style('stroke', 'var(--color-border)');
            a.selectAll('.tick line').style('stroke', 'var(--color-border)');
            a.selectAll('.tick text').style('fill', 'var(--color-text-muted)').style('font-size', '10px');
          });

        // X axis label
        leftG.append('text')
          .attr('x', panelW / 2).attr('y', panelH + 32)
          .attr('text-anchor', 'middle')
          .style('fill', 'var(--color-text-muted)').style('font-size', '11px')
          .text('n');

        // Y axis label
        const yLabel = diagMode === 'ratio' ? '|a\u2099\u208A\u2081/a\u2099|' : '|a\u2099|^(1/n)';
        leftG.append('text')
          .attr('transform', 'rotate(-90)')
          .attr('x', -panelH / 2).attr('y', -38)
          .attr('text-anchor', 'middle')
          .style('fill', 'var(--color-text-muted)').style('font-size', '11px')
          .text(yLabel);
      } else {
        // Not enough data for diagnostics
        leftG.append('text')
          .attr('x', panelW / 2).attr('y', panelH / 2)
          .attr('text-anchor', 'middle')
          .style('fill', 'var(--color-text-muted)').style('font-size', '12px')
          .text(preset.R === 0 ? 'R = 0: series diverges for all x \u2260 0' : 'Insufficient diagnostic data');
      }

      // Panel title (left)
      leftG.append('text')
        .attr('x', panelW / 2).attr('y', -6)
        .attr('text-anchor', 'middle')
        .style('fill', 'var(--color-text)').style('font-size', '12px').style('font-weight', '600')
        .text(diagMode === 'ratio' ? 'Ratio Test Diagnostic' : 'Root Test Diagnostic');

      // ── Right Panel: Partial Sums S_n(x) ──

      const rightOffsetX = isNarrow ? 0 : panelW + GAP;
      const rightOffsetY = isNarrow ? panelH + GAP : 0;

      const rightG = svg
        .append('g')
        .attr('transform', `translate(${margin.left + rightOffsetX},${margin.top + rightOffsetY})`);

      // Filter to finite partial sums for scaling
      const finiteSums = partialSums.filter((p) => isFinite(p.Sn) && Math.abs(p.Sn) < 1e10);

      if (finiteSums.length > 1) {
        const xScaleR = d3.scaleLinear()
          .domain([1, maxN])
          .range([0, panelW]);

        const snValues = finiteSums.map((p) => p.Sn);
        // Include target function value if inside radius
        const targetVal = preset.targetFn && isInside ? preset.targetFn(clampedX) : null;
        if (targetVal !== null && isFinite(targetVal)) snValues.push(targetVal);

        const yExtR = d3.extent(snValues) as [number, number];
        const yRangeR = yExtR[1] - yExtR[0];
        const yPadR = (yRangeR * 0.12) || 0.5;
        const yScaleR = d3.scaleLinear()
          .domain([yExtR[0] - yPadR, yExtR[1] + yPadR])
          .range([panelH, 0]);

        // Target function horizontal line (if known and convergent)
        if (targetVal !== null && isFinite(targetVal)) {
          rightG.append('line')
            .attr('x1', 0).attr('x2', panelW)
            .attr('y1', yScaleR(targetVal)).attr('y2', yScaleR(targetVal))
            .style('stroke', '#059669')
            .style('stroke-dasharray', '6,4')
            .style('stroke-width', 1.5);

          rightG.append('text')
            .attr('x', panelW - 4).attr('y', yScaleR(targetVal) - 6)
            .attr('text-anchor', 'end')
            .style('fill', '#059669')
            .style('font-size', '10px')
            .style('font-weight', '600')
            .text(`f(x) = ${targetVal.toFixed(4)}`);
        }

        // Partial sum line
        const sumLine = d3.line<PartialSumPoint>()
          .x((d) => xScaleR(d.n))
          .y((d) => yScaleR(d.Sn))
          .defined((d) => isFinite(d.Sn) && Math.abs(d.Sn) < 1e10);

        const lineColor = isInside ? functionColors[0] : '#DC2626';

        rightG.append('path')
          .datum(partialSums)
          .attr('fill', 'none')
          .attr('stroke', lineColor)
          .attr('stroke-width', 2)
          .attr('d', sumLine);

        // Partial sum dots
        rightG.selectAll('.sum-dot')
          .data(finiteSums)
          .join('circle')
          .attr('class', 'sum-dot')
          .attr('cx', (d) => xScaleR(d.n))
          .attr('cy', (d) => yScaleR(d.Sn))
          .attr('r', 2)
          .style('fill', isInside ? functionColors[0] : '#DC2626')
          .style('opacity', 0.6);

        // Axes
        rightG.append('g')
          .attr('transform', `translate(0,${panelH})`)
          .call(d3.axisBottom(xScaleR).ticks(Math.min(6, Math.floor(panelW / 50))))
          .call((a) => {
            a.select('.domain').style('stroke', 'var(--color-border)');
            a.selectAll('.tick line').style('stroke', 'var(--color-border)');
            a.selectAll('.tick text').style('fill', 'var(--color-text-muted)').style('font-size', '10px');
          });

        rightG.append('g')
          .call(d3.axisLeft(yScaleR).ticks(5))
          .call((a) => {
            a.select('.domain').style('stroke', 'var(--color-border)');
            a.selectAll('.tick line').style('stroke', 'var(--color-border)');
            a.selectAll('.tick text').style('fill', 'var(--color-text-muted)').style('font-size', '10px');
          });

        // X axis label
        rightG.append('text')
          .attr('x', panelW / 2).attr('y', panelH + 32)
          .attr('text-anchor', 'middle')
          .style('fill', 'var(--color-text-muted)').style('font-size', '11px')
          .text('n');

        // Y axis label
        rightG.append('text')
          .attr('transform', 'rotate(-90)')
          .attr('x', -panelH / 2).attr('y', -38)
          .attr('text-anchor', 'middle')
          .style('fill', 'var(--color-text-muted)').style('font-size', '11px')
          .text('S\u2099(x)');
      } else {
        // No finite partial sums — divergence
        rightG.append('text')
          .attr('x', panelW / 2).attr('y', panelH / 2)
          .attr('text-anchor', 'middle')
          .style('fill', '#DC2626').style('font-size', '12px').style('font-weight', '600')
          .text('Diverges: |x| > R');

        rightG.append('text')
          .attr('x', panelW / 2).attr('y', panelH / 2 + 18)
          .attr('text-anchor', 'middle')
          .style('fill', 'var(--color-text-muted)').style('font-size', '11px')
          .text('Partial sums grow without bound');
      }

      // Panel title (right)
      const statusLabel = isInside ? 'converges' : 'diverges';
      const statusColor = isInside ? '#059669' : '#DC2626';
      rightG.append('text')
        .attr('x', panelW / 2).attr('y', -6)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px').style('font-weight', '600')
        .each(function () {
          const text = d3.select(this);
          text.append('tspan')
            .style('fill', 'var(--color-text)')
            .text('Partial Sums at x = ' + clampedX.toFixed(3) + ' ');
          text.append('tspan')
            .style('fill', statusColor)
            .style('font-size', '11px')
            .text('(' + statusLabel + ')');
        });
    },
    [diagnostics, partialSums, width, height, maxN, selectedIdx, diagMode, clampedX, isInside, preset],
  );

  // ── Effective SVG height ──

  const isNarrow = width < 550;
  const innerH = height - margin.top - margin.bottom;
  const panelH = isNarrow ? Math.floor(innerH / 2) - GAP / 2 : innerH;
  const svgHeight = isNarrow ? margin.top + panelH * 2 + GAP + margin.bottom : height;

  // ── Formatted readouts ──

  const limitStr = estimatedLimit !== null ? estimatedLimit.toFixed(4) : 'N/A';
  const lastSnStr = isFinite(lastSn) ? lastSn.toFixed(6) : (lastSn > 0 ? '+\u221E' : '-\u221E');

  return (
    <div ref={containerRef} className="w-full my-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4 mb-3">
        <label className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Series:
          <select
            value={selectedIdx}
            onChange={handlePresetChange}
            className="ml-2 px-2 py-1 rounded text-sm"
            style={{
              background: 'var(--color-surface-alt)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
            }}
          >
            {PRESETS.map((p, i) => (
              <option key={p.name} value={i}>{p.label}</option>
            ))}
          </select>
        </label>

        <label className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Test:
          <select
            value={diagMode}
            onChange={handleDiagChange}
            className="ml-2 px-2 py-1 rounded text-sm"
            style={{
              background: 'var(--color-surface-alt)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
            }}
          >
            <option value="ratio">Ratio test</option>
            <option value="root">Root test</option>
          </select>
        </label>

        <label className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          x = {clampedX.toFixed(3)}
          <input
            type="range"
            min={probeMin}
            max={probeMax}
            step={0.01}
            value={clampedX}
            onChange={(e) => setProbeX(Number(e.target.value))}
            className="ml-2 w-28"
          />
        </label>

        <label className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Terms: {maxN}
          <input
            type="range"
            min={20}
            max={200}
            step={10}
            value={maxN}
            onChange={(e) => setMaxN(Number(e.target.value))}
            className="ml-2 w-24"
          />
        </label>
      </div>

      {/* SVG */}
      <svg ref={svgRef} width={width} height={svgHeight} />

      {/* Legend / stats footer */}
      <div className="flex flex-wrap gap-4 mt-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
        <span>
          <span style={{ color: '#7C3AED' }}>{'\u2500'}</span>{' '}
          Diagnostic: {diagMode === 'ratio' ? '|a\u2099\u208A\u2081/a\u2099|' : '|a\u2099|^(1/n)'}{' '}
          {'\u2192'} {limitStr}
        </span>
        <span>
          R = <strong style={{ color: 'var(--color-text)' }}>{rDisplay}</strong>
        </span>
        <span>
          At x = {clampedX.toFixed(3)}:{' '}
          <strong style={{ color: isInside ? '#059669' : '#DC2626' }}>
            {isInside ? 'converges' : 'diverges'}
          </strong>
          {sumBounded && isFinite(lastSn) && (
            <> &middot; S<sub>{maxN}</sub> = {lastSnStr}</>
          )}
        </span>
      </div>
    </div>
  );
}
