/**
 * CharacteristicPolynomialVisualizer — Topic 34 §3.
 *
 * Plots p_A(λ) = det(λI − A) as a curve in the (λ, p_A) plane for a
 * user-controlled 2×2 or 3×3 matrix. Real eigenvalues appear as filled
 * circles where the curve crosses zero. Complex roots (if any) are
 * reported in the side panel — the curve in the real plane never touches
 * zero in that case.
 */

import { useCallback, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { useD3 } from './shared/useD3';
import { useResizeObserver } from './shared/useResizeObserver';
import {
  characteristicPolynomial,
  characteristicPolynomialAt,
  eigenvalues2x2,
  eigenvalues3x3,
  type Matrix,
} from './shared/linearAlgebra';
import {
  getEigenvalueMatrixPresets,
  type EigenvalueMatrixPreset,
} from '../../data/eigenvalues-eigenvectors-data';

// ── Constants ─────────────────────────────────────────────────

const SVG_MAX_WIDTH = 520;
const SVG_HEIGHT = 320;
const SAMPLES = 240;
const margin = { top: 18, right: 24, bottom: 36, left: 48 };

const COLOR_CURVE = '#7c3aed'; // violet-600
const COLOR_ROOT = '#dc2626'; // red-600
const COLOR_AXIS = '#9ca3af';

// ── Helpers ───────────────────────────────────────────────────

function formatNumber(n: number, digits = 2): string {
  if (!Number.isFinite(n)) return '—';
  if (Math.abs(n) < 1e-9) return '0';
  return n.toFixed(digits);
}

/** Render a polynomial p(λ) = c_0 + c_1 λ + ... + c_n λ^n as a human string. */
function polynomialToString(coeffs: number[]): string {
  const parts: string[] = [];
  for (let i = coeffs.length - 1; i >= 0; i--) {
    const c = coeffs[i];
    if (Math.abs(c) < 1e-9) continue;
    const absC = Math.abs(c);
    const sign = c < 0 ? '−' : parts.length === 0 ? '' : '+';
    const coefStr =
      i === 0
        ? formatNumber(absC)
        : Math.abs(absC - 1) < 1e-9
          ? ''
          : formatNumber(absC);
    const lambdaStr = i === 0 ? '' : i === 1 ? 'λ' : `λ${i === 2 ? '²' : i === 3 ? '³' : `^${i}`}`;
    parts.push(`${sign}${parts.length === 0 ? '' : ' '}${coefStr}${lambdaStr}`);
  }
  return parts.length > 0 ? parts.join(' ') : '0';
}

function factoredForm(realRoots: number[]): string {
  if (realRoots.length === 0) return '(no real factorization)';
  return realRoots
    .map((r) => `(λ ${r >= 0 ? '−' : '+'} ${formatNumber(Math.abs(r))})`)
    .join(' · ');
}

// ── Component ─────────────────────────────────────────────────

export interface CharacteristicPolynomialVisualizerProps {
  initialDim?: 2 | 3;
  initialMatrix?: number[][];
  lambdaRange?: [number, number];
}

export default function CharacteristicPolynomialVisualizer({
  initialDim = 2,
  initialMatrix,
  lambdaRange = [-5, 5],
}: CharacteristicPolynomialVisualizerProps = {}) {
  const { ref: containerRef, width: containerWidth } = useResizeObserver<HTMLDivElement>();

  const presets = useMemo(() => getEigenvalueMatrixPresets(), []);
  const default2x2 = useMemo(
    () => initialMatrix ?? [[4, -2], [1, 1]],
    [initialMatrix],
  );
  const default3x3 = useMemo(
    () => [
      [2, 1, 0],
      [0, 2, 1],
      [0, 0, 3],
    ],
    [],
  );

  const [dim, setDim] = useState<2 | 3>(initialDim);
  const [matrix, setMatrix] = useState<Matrix>(default2x2);
  const [presetId, setPresetId] = useState<string>('distinct-2d');
  const [showFactored, setShowFactored] = useState<boolean>(false);

  const filteredPresets = useMemo<EigenvalueMatrixPreset[]>(
    () => presets.filter((p) => p.matrix.length === dim),
    [presets, dim],
  );

  const coeffs = useMemo(() => characteristicPolynomial(matrix), [matrix]);

  const eigenvalues = useMemo(() => {
    if (dim === 2) return eigenvalues2x2(matrix);
    return eigenvalues3x3(matrix);
  }, [matrix, dim]);

  const realRoots = useMemo(() => {
    const out: number[] = [];
    for (let i = 0; i < eigenvalues.real.length; i++) {
      if (Math.abs(eigenvalues.imag[i]) < 1e-7) out.push(eigenvalues.real[i]);
    }
    return out;
  }, [eigenvalues]);

  const complexRoots = useMemo(() => {
    const out: { re: number; im: number }[] = [];
    const handled = new Set<number>();
    for (let i = 0; i < eigenvalues.real.length; i++) {
      if (handled.has(i)) continue;
      if (Math.abs(eigenvalues.imag[i]) > 1e-7) {
        out.push({ re: eigenvalues.real[i], im: eigenvalues.imag[i] });
        // Mark conjugate as handled too
        for (let j = i + 1; j < eigenvalues.real.length; j++) {
          if (Math.abs(eigenvalues.real[j] - eigenvalues.real[i]) < 1e-7 && Math.abs(eigenvalues.imag[j] + eigenvalues.imag[i]) < 1e-7) {
            handled.add(j);
            break;
          }
        }
      }
      handled.add(i);
    }
    return out;
  }, [eigenvalues]);

  // ── Handlers ────────────────────────────────────────────────
  const updateEntry = useCallback((row: number, col: number, value: number) => {
    setMatrix((prev) => {
      const next = prev.map((r) => r.slice());
      next[row][col] = value;
      return next;
    });
  }, []);

  const handleDimChange = useCallback(
    (newDim: 2 | 3) => {
      setDim(newDim);
      setMatrix(newDim === 2 ? default2x2 : default3x3);
      setPresetId(newDim === 2 ? 'distinct-2d' : 'diag-3d-distinct');
    },
    [default2x2, default3x3],
  );

  const handlePresetChange = useCallback(
    (id: string) => {
      setPresetId(id);
      const preset = filteredPresets.find((p) => p.id === id);
      if (!preset) return;
      setMatrix(preset.matrix.map((row) => row.slice()));
    },
    [filteredPresets],
  );

  // ── Layout ──────────────────────────────────────────────────
  const svgWidth = useMemo(() => {
    if (!containerWidth) return SVG_MAX_WIDTH;
    return Math.max(360, Math.min(SVG_MAX_WIDTH, Math.floor(containerWidth * 0.55)));
  }, [containerWidth]);

  // ── D3 rendering ────────────────────────────────────────────
  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      const innerW = svgWidth - margin.left - margin.right;
      const innerH = SVG_HEIGHT - margin.top - margin.bottom;
      if (innerW <= 0 || innerH <= 0) return;

      const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      // Sample p_A(λ)
      const xs: number[] = [];
      const ys: number[] = [];
      for (let i = 0; i <= SAMPLES; i++) {
        const lambda = lambdaRange[0] + ((lambdaRange[1] - lambdaRange[0]) * i) / SAMPLES;
        xs.push(lambda);
        ys.push(characteristicPolynomialAt(matrix, lambda));
      }

      // y-axis scale: clamp to a sensible range based on the values we see.
      const yMax = d3.max(ys.map((y) => Math.abs(y))) ?? 1;
      const yLim = Math.min(Math.max(yMax * 1.1, 1), 60); // cap to avoid huge cubic excursions

      const xScale = d3.scaleLinear().domain(lambdaRange).range([0, innerW]);
      const yScale = d3.scaleLinear().domain([-yLim, yLim]).range([innerH, 0]);

      // Grid + axes
      const xAxis = d3.axisBottom(xScale).ticks(8);
      const yAxis = d3.axisLeft(yScale).ticks(6);
      const xAxisG = g.append('g').attr('transform', `translate(0,${yScale(0)})`).call(xAxis);
      xAxisG.selectAll('line').style('stroke', COLOR_AXIS).style('opacity', 0.6);
      xAxisG.selectAll('path').style('stroke', COLOR_AXIS);
      xAxisG.selectAll('text').style('fill', 'var(--color-text-muted)').style('font-size', '11px');
      const yAxisG = g.append('g').call(yAxis);
      yAxisG.selectAll('line').style('stroke', COLOR_AXIS).style('opacity', 0.6);
      yAxisG.selectAll('path').style('stroke', COLOR_AXIS);
      yAxisG.selectAll('text').style('fill', 'var(--color-text-muted)').style('font-size', '11px');

      // Axis labels
      g.append('text')
        .attr('x', innerW)
        .attr('y', yScale(0) - 6)
        .attr('text-anchor', 'end')
        .style('fill', 'var(--color-text-muted)')
        .style('font-size', '11px')
        .text('λ');
      g.append('text')
        .attr('x', -6)
        .attr('y', 8)
        .attr('text-anchor', 'end')
        .style('fill', 'var(--color-text-muted)')
        .style('font-size', '11px')
        .text('p(λ)');

      // Polynomial curve — clip points outside y range
      const linePoints: [number, number][] = xs.map((x, i) => [x, ys[i]]);
      const linePath = d3
        .line<[number, number]>()
        .defined((p) => Math.abs(p[1]) <= yLim * 1.5)
        .x((p) => xScale(p[0]))
        .y((p) => yScale(Math.max(-yLim, Math.min(yLim, p[1]))));
      g.append('path')
        .attr('d', linePath(linePoints) ?? '')
        .style('fill', 'none')
        .style('stroke', COLOR_CURVE)
        .style('stroke-width', 2.25);

      // Real roots: filled circles at (λ, 0)
      realRoots.forEach((root) => {
        if (root < lambdaRange[0] || root > lambdaRange[1]) return;
        g.append('circle')
          .attr('cx', xScale(root))
          .attr('cy', yScale(0))
          .attr('r', 6)
          .style('fill', COLOR_ROOT);
        // Vertical guide line
        g.append('line')
          .attr('x1', xScale(root))
          .attr('x2', xScale(root))
          .attr('y1', yScale(0))
          .attr('y2', yScale(0) + 16)
          .style('stroke', COLOR_ROOT)
          .style('stroke-width', 1.5)
          .style('opacity', 0.7);
        g.append('text')
          .attr('x', xScale(root))
          .attr('y', yScale(0) + 28)
          .attr('text-anchor', 'middle')
          .style('fill', COLOR_ROOT)
          .style('font-size', '11px')
          .style('font-weight', '600')
          .text(`λ = ${formatNumber(root)}`);
      });
    },
    [matrix, svgWidth, lambdaRange, realRoots, dim],
  );

  return (
    <div
      ref={containerRef}
      className="my-6 rounded-lg border p-4"
      style={{
        background: 'var(--color-viz-surface)',
        borderColor: 'var(--color-viz-border)',
      }}
    >
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="flex justify-center md:justify-start">
          <svg
            ref={svgRef}
            width={svgWidth}
            height={SVG_HEIGHT}
            style={{ background: 'var(--color-viz-canvas)' }}
            aria-label="Characteristic polynomial plot with real roots highlighted"
          />
        </div>

        <div className="flex-1 min-w-0">
          {/* Dim toggle */}
          <div className="flex items-center gap-2 mb-3 text-xs">
            <span style={{ color: 'var(--color-text-muted)' }}>Matrix size:</span>
            {([2, 3] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => handleDimChange(d)}
                className="rounded px-2 py-1"
                style={{
                  background: dim === d ? 'var(--color-accent-bg)' : 'var(--color-surface)',
                  color: dim === d ? 'var(--color-accent-text)' : 'var(--color-text)',
                  border: '1px solid var(--color-viz-border)',
                  fontWeight: dim === d ? 600 : 400,
                }}
              >
                {d}×{d}
              </button>
            ))}
          </div>

          {/* Preset dropdown */}
          <label className="block mb-3">
            <span className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>
              Preset matrix
            </span>
            <select
              value={presetId}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="w-full rounded border px-2 py-1 text-sm"
              style={{
                background: 'var(--color-surface)',
                color: 'var(--color-text)',
                borderColor: 'var(--color-viz-border)',
              }}
            >
              {filteredPresets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>

          {/* Matrix inputs */}
          <div className="mb-3">
            <span className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>
              Matrix A
            </span>
            <div
              className="grid gap-2"
              style={{
                gridTemplateColumns: `repeat(${dim}, minmax(0, 1fr))`,
                maxWidth: dim === 2 ? 220 : 280,
              }}
            >
              {matrix.flatMap((row, i) =>
                row.map((val, j) => (
                  <input
                    key={`${i}-${j}`}
                    type="number"
                    step={0.5}
                    min={-5}
                    max={5}
                    value={val}
                    onChange={(e) => {
                      const v = Number.parseFloat(e.target.value);
                      if (Number.isFinite(v)) updateEntry(i, j, v);
                    }}
                    className="rounded border px-2 py-1 text-sm text-center"
                    style={{
                      background: 'var(--color-surface)',
                      color: 'var(--color-text)',
                      borderColor: 'var(--color-viz-border)',
                    }}
                    aria-label={`Matrix entry row ${i + 1}, column ${j + 1}`}
                  />
                )),
              )}
            </div>
          </div>

          {/* Polynomial */}
          <div className="mb-3">
            <span className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>
              p<sub>A</sub>(λ) =
            </span>
            <div
              className="rounded px-2 py-1.5 text-sm font-mono"
              style={{
                background: 'var(--color-viz-info-bg)',
                color: 'var(--color-text)',
              }}
            >
              {polynomialToString(coeffs)}
            </div>
          </div>

          {/* Eigenvalues */}
          <div className="mb-3">
            <span className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>
              Eigenvalues (real roots and complex conjugate pairs)
            </span>
            <ul className="text-sm space-y-0.5" style={{ color: 'var(--color-text)' }}>
              {realRoots.map((r, idx) => (
                <li key={`r-${idx}`} style={{ color: COLOR_ROOT, fontWeight: 600 }}>
                  λ = {formatNumber(r)}
                </li>
              ))}
              {complexRoots.map((c, idx) => {
                const sign = c.im >= 0 ? '+' : '−';
                return (
                  <li key={`c-${idx}`} style={{ color: 'var(--color-text-muted)' }}>
                    λ = {formatNumber(c.re)} {sign} {formatNumber(Math.abs(c.im))} i &nbsp; (and conjugate)
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Factored form */}
          {showFactored && realRoots.length > 0 && (
            <div className="mb-3">
              <span className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>
                Real factorization
              </span>
              <div
                className="rounded px-2 py-1.5 text-sm font-mono"
                style={{ background: 'var(--color-viz-info-bg)', color: 'var(--color-text)' }}
              >
                p<sub>A</sub>(λ) = {factoredForm(realRoots)}
                {complexRoots.length > 0 && ' · (complex factors)'}
              </div>
            </div>
          )}

          {/* Toggles */}
          <div className="mt-3 space-y-1 text-xs">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showFactored}
                onChange={(e) => setShowFactored(e.target.checked)}
              />
              <span style={{ color: 'var(--color-text-muted)' }}>Show factored form</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
