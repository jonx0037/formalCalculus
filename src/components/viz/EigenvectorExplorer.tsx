/**
 * EigenvectorExplorer — Topic 34 (Eigenvalues & Eigenvectors), §§1-2 flagship.
 *
 * Real-time exploration of the eigenvalue equation Av = λv on a user-controlled
 * 2×2 matrix. The unit circle is rendered in light grey; its image under A is
 * drawn as a blue dashed ellipse (when real eigenvalues exist) or as a more
 * general parametric curve. Real eigenvectors are rendered as solid lines
 * through the origin in two distinct colors. Complex eigenvalues are reported
 * in the side panel with an Argand inset.
 *
 * Preset dropdown covers the qualitative zoo: distinct real, repeated
 * diagonalizable (scalar 2I), repeated defective (Jordan block), complex
 * conjugate pair (rotation), and symmetric variants.
 */

import { useCallback, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { useD3 } from './shared/useD3';
import { useResizeObserver } from './shared/useResizeObserver';
import {
  eigenvalues2x2,
  eigenvectorsForEigenvalue,
  type Matrix,
  type Vector,
  matVec,
} from './shared/linearAlgebra';
import {
  getEigenvalueMatrixPresets,
  type EigenvalueMatrixPreset,
} from '../../data/eigenvalues-eigenvectors-data';

// ── Constants ─────────────────────────────────────────────────

const VIEW_HALF = 3;
const SVG_MAX_SIZE = 460;
const SVG_MIN_SIZE = 320;
const margin = { top: 16, right: 16, bottom: 16, left: 16 };

const COLOR_EIGEN_1 = '#2563eb'; // blue-600
const COLOR_EIGEN_2 = '#059669'; // emerald-600
const COLOR_IMAGE_ELLIPSE = '#7c3aed'; // violet-600
const COLOR_UNIT_CIRCLE = '#9ca3af'; // gray-400

// ── Helpers ───────────────────────────────────────────────────

function formatNumber(n: number, digits = 2): string {
  if (!Number.isFinite(n)) return '—';
  if (Math.abs(n) < 1e-9) return '0.00';
  return n.toFixed(digits);
}

function classifyMatrix(
  matrix: Matrix,
  eigenvalues: { real: [number, number]; imag: [number, number] },
  realEigvecCount: number,
): { label: string; description: string } {
  const { real, imag } = eigenvalues;
  const isComplex = Math.abs(imag[0]) > 1e-7 || Math.abs(imag[1]) > 1e-7;
  if (isComplex) {
    return {
      label: 'Complex conjugate pair — no real invariant directions',
      description: 'The matrix rotates every real vector; eigenvalues live in ℂ as λ = a ± bi.',
    };
  }
  const repeated = Math.abs(real[0] - real[1]) <= 1e-6;
  // Check scalar (every direction is an eigenvector)
  const a = matrix[0][0];
  const b = matrix[0][1];
  const c = matrix[1][0];
  const d = matrix[1][1];
  const isScalar = Math.abs(b) < 1e-9 && Math.abs(c) < 1e-9 && Math.abs(a - d) < 1e-9;
  if (isScalar) {
    return {
      label: 'Scalar matrix — every direction is an eigenvector',
      description: `The map is a uniform stretch by ${formatNumber(a)}; the eigenspace E_${formatNumber(a)} is all of ℝ².`,
    };
  }
  if (repeated) {
    if (realEigvecCount >= 2) {
      return {
        label: 'Repeated eigenvalue, diagonalizable',
        description: 'Algebraic multiplicity 2, geometric multiplicity 2. A two-dimensional eigenspace.',
      };
    }
    return {
      label: 'Repeated eigenvalue, defective',
      description: 'Algebraic multiplicity 2 but geometric multiplicity 1 — only one eigenvector direction. Not diagonalizable.',
    };
  }
  return {
    label: 'Two distinct real eigenvalues — diagonalizable',
    description: 'Each eigenvalue has a one-dimensional eigenspace; the two eigenvectors form a basis.',
  };
}

// Format an eigenvector as "(0.71, 0.71)".
function formatVector(v: Vector): string {
  return `(${formatNumber(v[0])}, ${formatNumber(v[1])})`;
}

// ── Component ─────────────────────────────────────────────────

export interface EigenvectorExplorerProps {
  initialMatrix?: [[number, number], [number, number]];
  showUnitCircleImage?: boolean;
  showMultiplicities?: boolean;
}

export default function EigenvectorExplorer({
  initialMatrix = [
    [4, -2],
    [1, 1],
  ],
  showUnitCircleImage: initialShowImage = true,
  showMultiplicities: initialShowMult = true,
}: EigenvectorExplorerProps = {}) {
  const { ref: containerRef, width: containerWidth } = useResizeObserver<HTMLDivElement>();

  const presets = useMemo<EigenvalueMatrixPreset[]>(
    () => getEigenvalueMatrixPresets().filter((p) => p.matrix.length === 2),
    [],
  );

  const [matrix, setMatrix] = useState<[[number, number], [number, number]]>(initialMatrix);
  const [presetId, setPresetId] = useState<string>('distinct-2d');
  const [showImage, setShowImage] = useState<boolean>(initialShowImage);
  const [showMult, setShowMult] = useState<boolean>(initialShowMult);

  // ── Eigenvalue computation ──────────────────────────────────
  const eigenvalues = useMemo(() => eigenvalues2x2(matrix), [matrix]);

  const realEigenvectors = useMemo(() => {
    const { real, imag } = eigenvalues;
    const out: { lambda: number; vec: Vector }[] = [];
    const seen: number[] = [];
    for (let i = 0; i < real.length; i++) {
      if (Math.abs(imag[i]) > 1e-7) continue;
      if (seen.some((s) => Math.abs(s - real[i]) < 1e-6)) continue;
      seen.push(real[i]);
      const vecs = eigenvectorsForEigenvalue(matrix, real[i]);
      // For scalar matrices, multiplicity-2 produces a 2D eigenspace; render
      // both basis vectors. Otherwise the first orthonormal basis vector is
      // the canonical "direction" to draw as a line.
      for (const v of vecs) {
        out.push({ lambda: real[i], vec: v });
      }
    }
    return out;
  }, [matrix, eigenvalues]);

  const classification = useMemo(
    () => classifyMatrix(matrix, eigenvalues, realEigenvectors.length),
    [matrix, eigenvalues, realEigenvectors],
  );

  // ── Layout ──────────────────────────────────────────────────
  const svgSize = useMemo(() => {
    if (!containerWidth) return SVG_MAX_SIZE;
    return Math.max(SVG_MIN_SIZE, Math.min(SVG_MAX_SIZE, Math.floor(containerWidth * 0.55)));
  }, [containerWidth]);

  // ── Handlers ────────────────────────────────────────────────
  const updateEntry = useCallback((row: 0 | 1, col: 0 | 1, value: number) => {
    setMatrix((prev) => {
      const next = prev.map((r) => r.slice()) as [[number, number], [number, number]];
      next[row][col] = value;
      return next;
    });
  }, []);

  const handlePresetChange = useCallback(
    (id: string) => {
      setPresetId(id);
      const preset = presets.find((p) => p.id === id);
      if (!preset) return;
      const m = preset.matrix;
      if (m.length === 2 && m[0].length === 2 && m[1].length === 2) {
        setMatrix([
          [m[0][0], m[0][1]],
          [m[1][0], m[1][1]],
        ]);
      }
    },
    [presets],
  );

  // ── D3 rendering ────────────────────────────────────────────
  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      const innerW = svgSize - margin.left - margin.right;
      const innerH = svgSize - margin.top - margin.bottom;
      if (innerW <= 0 || innerH <= 0) return;

      const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
      const xScale = d3.scaleLinear().domain([-VIEW_HALF, VIEW_HALF]).range([0, innerW]);
      const yScale = d3.scaleLinear().domain([-VIEW_HALF, VIEW_HALF]).range([innerH, 0]);

      // Grid
      for (let i = -VIEW_HALF; i <= VIEW_HALF; i++) {
        g.append('line')
          .attr('x1', xScale(i))
          .attr('x2', xScale(i))
          .attr('y1', 0)
          .attr('y2', innerH)
          .style('stroke', 'var(--color-viz-grid)')
          .style('stroke-width', i === 0 ? 1.25 : 0.5)
          .style('opacity', i === 0 ? 0.65 : 0.3);
        g.append('line')
          .attr('x1', 0)
          .attr('x2', innerW)
          .attr('y1', yScale(i))
          .attr('y2', yScale(i))
          .style('stroke', 'var(--color-viz-grid)')
          .style('stroke-width', i === 0 ? 1.25 : 0.5)
          .style('opacity', i === 0 ? 0.65 : 0.3);
      }

      // Axis labels
      g.append('text')
        .attr('x', innerW - 6)
        .attr('y', yScale(0) - 6)
        .attr('text-anchor', 'end')
        .style('fill', 'var(--color-text-muted)')
        .style('font-size', '11px')
        .text('x');
      g.append('text')
        .attr('x', xScale(0) + 6)
        .attr('y', 12)
        .style('fill', 'var(--color-text-muted)')
        .style('font-size', '11px')
        .text('y');

      // Unit circle
      const SAMPLES = 100;
      const unitCirclePoints: [number, number][] = [];
      for (let k = 0; k <= SAMPLES; k++) {
        const theta = (2 * Math.PI * k) / SAMPLES;
        unitCirclePoints.push([Math.cos(theta), Math.sin(theta)]);
      }
      const linePath = d3
        .line<[number, number]>()
        .x((p) => xScale(p[0]))
        .y((p) => yScale(p[1]));
      g.append('path')
        .attr('d', linePath(unitCirclePoints) ?? '')
        .style('fill', 'none')
        .style('stroke', COLOR_UNIT_CIRCLE)
        .style('stroke-width', 1.25)
        .style('opacity', 0.8);

      // Image of the unit circle under A
      if (showImage) {
        const imagePoints: [number, number][] = unitCirclePoints.map((p) => {
          const [x, y] = matVec(matrix, p);
          return [x, y];
        });
        g.append('path')
          .attr('d', linePath(imagePoints) ?? '')
          .style('fill', 'none')
          .style('stroke', COLOR_IMAGE_ELLIPSE)
          .style('stroke-width', 2)
          .style('stroke-dasharray', '6 4')
          .style('opacity', 0.85);
      }

      // Eigenvector lines (extend to canvas edges)
      const eigenColors = [COLOR_EIGEN_1, COLOR_EIGEN_2];
      realEigenvectors.forEach((ev, idx) => {
        const color = eigenColors[idx % eigenColors.length];
        const [vx, vy] = ev.vec;
        const len = Math.hypot(vx, vy);
        if (len < 1e-9) return;
        const ux = vx / len;
        const uy = vy / len;
        const extent = 2 * VIEW_HALF;
        const x1 = xScale(-extent * ux);
        const y1 = yScale(-extent * uy);
        const x2 = xScale(extent * ux);
        const y2 = yScale(extent * uy);
        g.append('line')
          .attr('x1', x1)
          .attr('x2', x2)
          .attr('y1', y1)
          .attr('y2', y2)
          .style('stroke', color)
          .style('stroke-width', 2.25)
          .style('opacity', 0.85);

        // Arrowhead and label at the scaled-by-λ position
        const lambdaScaled = Math.max(-VIEW_HALF + 0.1, Math.min(VIEW_HALF - 0.1, ev.lambda));
        const hx = xScale(ux * lambdaScaled);
        const hy = yScale(uy * lambdaScaled);
        g.append('circle')
          .attr('cx', hx)
          .attr('cy', hy)
          .attr('r', 5)
          .style('fill', color);
        g.append('text')
          .attr('x', hx + 8 * Math.sign(ux || 1))
          .attr('y', hy - 8 * Math.sign(uy || 1))
          .attr('text-anchor', ux < 0 ? 'end' : 'start')
          .style('fill', color)
          .style('font-size', '12px')
          .style('font-weight', '600')
          .text(`λ = ${formatNumber(ev.lambda)}`);
      });
    },
    [matrix, svgSize, realEigenvectors, showImage],
  );

  // ── Render ──────────────────────────────────────────────────
  const algebraicMult = useMemo(() => {
    const { real, imag } = eigenvalues;
    const distinct = new Set<string>();
    for (let i = 0; i < real.length; i++) {
      if (Math.abs(imag[i]) > 1e-7) {
        distinct.add(`complex-${i}`);
      } else {
        distinct.add(real[i].toFixed(4));
      }
    }
    return { distinctCount: distinct.size };
  }, [eigenvalues]);

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
        {/* SVG canvas */}
        <div className="flex justify-center md:justify-start">
          <svg
            ref={svgRef}
            width={svgSize}
            height={svgSize}
            style={{ background: 'var(--color-viz-canvas)' }}
            aria-label="Eigenvector visualization — unit circle and its image, with eigenvector lines"
          />
        </div>

        {/* Side panel */}
        <div className="flex-1 min-w-0">
          {/* Preset dropdown */}
          <label className="block mb-3">
            <span
              className="block text-xs font-semibold mb-1"
              style={{ color: 'var(--color-text-muted)' }}
            >
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
              {presets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>

          {/* Matrix entry inputs */}
          <div className="mb-3">
            <span
              className="block text-xs font-semibold mb-1"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Matrix A
            </span>
            <div className="grid grid-cols-2 gap-2" style={{ maxWidth: 220 }}>
              {([0, 1] as const).map((row) =>
                ([0, 1] as const).map((col) => (
                  <input
                    key={`${row}-${col}`}
                    type="number"
                    step={0.1}
                    min={-3}
                    max={3}
                    value={matrix[row][col]}
                    onChange={(e) => {
                      const v = Number.parseFloat(e.target.value);
                      if (Number.isFinite(v)) updateEntry(row, col, v);
                    }}
                    className="rounded border px-2 py-1 text-sm text-center"
                    style={{
                      background: 'var(--color-surface)',
                      color: 'var(--color-text)',
                      borderColor: 'var(--color-viz-border)',
                    }}
                    aria-label={`Matrix entry row ${row + 1}, column ${col + 1}`}
                  />
                )),
              )}
            </div>
          </div>

          {/* Classification */}
          <div className="mb-3 rounded p-2 text-sm" style={{ background: 'var(--color-viz-info-bg)' }}>
            <div style={{ color: 'var(--color-text)', fontWeight: 600 }}>{classification.label}</div>
            <div className="mt-1" style={{ color: 'var(--color-text-muted)' }}>
              {classification.description}
            </div>
          </div>

          {/* Eigenvalues */}
          <div className="mb-3">
            <span
              className="block text-xs font-semibold mb-1"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Eigenvalues
            </span>
            <ul className="text-sm space-y-1" style={{ color: 'var(--color-text)' }}>
              {(() => {
                const { real, imag } = eigenvalues;
                const items: { key: string; text: string; color: string }[] = [];
                const handled = new Set<number>();
                for (let i = 0; i < real.length; i++) {
                  if (handled.has(i)) continue;
                  if (Math.abs(imag[i]) > 1e-7) {
                    const partner = i + 1 < real.length && Math.abs(imag[i] + imag[i + 1]) < 1e-7 ? i + 1 : -1;
                    const sign = imag[i] >= 0 ? '+' : '−';
                    items.push({
                      key: `c-${i}`,
                      text: `λ = ${formatNumber(real[i])} ${sign} ${formatNumber(Math.abs(imag[i]))} i  (and its conjugate)`,
                      color: 'var(--color-text-muted)',
                    });
                    handled.add(i);
                    if (partner >= 0) handled.add(partner);
                  } else {
                    items.push({
                      key: `r-${i}`,
                      text: `λ = ${formatNumber(real[i])}`,
                      color: i === 0 ? COLOR_EIGEN_1 : COLOR_EIGEN_2,
                    });
                    handled.add(i);
                  }
                }
                return items.map((it) => (
                  <li key={it.key} style={{ color: it.color, fontWeight: 600 }}>
                    {it.text}
                  </li>
                ));
              })()}
            </ul>
          </div>

          {/* Eigenvectors */}
          {realEigenvectors.length > 0 && (
            <div className="mb-3">
              <span
                className="block text-xs font-semibold mb-1"
                style={{ color: 'var(--color-text-muted)' }}
              >
                Eigenvectors (unit-normalized)
              </span>
              <ul className="text-sm space-y-1" style={{ color: 'var(--color-text)' }}>
                {realEigenvectors.map((ev, idx) => (
                  <li
                    key={`v-${idx}`}
                    style={{
                      color: idx % 2 === 0 ? COLOR_EIGEN_1 : COLOR_EIGEN_2,
                      fontWeight: 500,
                    }}
                  >
                    v = {formatVector(ev.vec)} for λ = {formatNumber(ev.lambda)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Multiplicities */}
          {showMult && (
            <div
              className="text-xs"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Distinct eigenvalues: {algebraicMult.distinctCount} · Real eigenvectors: {realEigenvectors.length}
            </div>
          )}

          {/* Toggles */}
          <div className="mt-3 space-y-1 text-xs">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showImage}
                onChange={(e) => setShowImage(e.target.checked)}
              />
              <span style={{ color: 'var(--color-text-muted)' }}>
                Show image of unit circle under A
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showMult}
                onChange={(e) => setShowMult(e.target.checked)}
              />
              <span style={{ color: 'var(--color-text-muted)' }}>
                Show multiplicity readout
              </span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
