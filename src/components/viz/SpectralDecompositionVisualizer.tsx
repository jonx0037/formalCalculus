/**
 * SpectralDecompositionVisualizer — Topic 34 §6 (and §10).
 *
 * Renders the spectral theorem for a real symmetric 2×2 matrix in two
 * modes:
 *   - "circle-to-ellipse": the unit circle and its image A(circle), with
 *     eigenvectors drawn as the principal axes of the ellipse and
 *     eigenvalues annotated as semi-axis lengths
 *   - "level-sets": contours of the quadratic form x^T A x = c for
 *     c ∈ {0.5, 1, 2, 4} — nested ellipses (PD), parallel lines (PSD),
 *     or hyperbolas (indefinite)
 *
 * Non-symmetric input is symmetrized to (A + A^T)/2 with a panel warning.
 */

import { useCallback, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { useD3 } from './shared/useD3';
import { useResizeObserver } from './shared/useResizeObserver';
import {
  classifyDefiniteness,
  isSymmetric,
  matVec,
  quadraticForm,
  spectralDecompositionSymmetric,
  type Matrix,
  type Vector,
} from './shared/linearAlgebra';
import {
  getQuadraticFormPresets,
  type QuadraticFormPreset,
} from '../../data/eigenvalues-eigenvectors-data';

const VIEW_HALF = 3;
const SVG_MAX_SIZE = 440;
const SVG_MIN_SIZE = 300;
const margin = { top: 14, right: 14, bottom: 14, left: 14 };
const COLOR_EIGEN_1 = '#2563eb';
const COLOR_EIGEN_2 = '#059669';
const COLOR_ELLIPSE = '#7c3aed';
const COLOR_CIRCLE = '#9ca3af';

type Mode = 'circle-to-ellipse' | 'level-sets';

function formatNumber(n: number, digits = 2): string {
  if (!Number.isFinite(n)) return '—';
  if (Math.abs(n) < 1e-9) return '0.00';
  return n.toFixed(digits);
}

function definitenessLabel(d: string): string {
  return d.replace(/-/g, ' ');
}

export interface SpectralDecompositionVisualizerProps {
  initialMatrix?: [[number, number], [number, number]];
  mode?: Mode;
}

export default function SpectralDecompositionVisualizer({
  initialMatrix = [[2, 1], [1, 2]],
  mode: initialMode = 'circle-to-ellipse',
}: SpectralDecompositionVisualizerProps = {}) {
  const { ref: containerRef, width: containerWidth } = useResizeObserver<HTMLDivElement>();
  const presets = useMemo<QuadraticFormPreset[]>(() => getQuadraticFormPresets(), []);
  const [matrix, setMatrix] = useState<[[number, number], [number, number]]>(initialMatrix);
  const [presetId, setPresetId] = useState<string>('rotated-elongated');
  const [mode, setMode] = useState<Mode>(initialMode);

  // Symmetrize for downstream computation
  const symMatrix: Matrix = useMemo(() => {
    const a = matrix[0][0];
    const b = (matrix[0][1] + matrix[1][0]) / 2;
    const d = matrix[1][1];
    return [[a, b], [b, d]];
  }, [matrix]);

  const wasAsymmetric = !isSymmetric(matrix, 1e-7);

  const spectral = useMemo(() => {
    try {
      return spectralDecompositionSymmetric(symMatrix);
    } catch {
      return null;
    }
  }, [symMatrix]);

  const definiteness = useMemo(() => {
    try {
      return classifyDefiniteness(symMatrix);
    } catch {
      return 'zero' as const;
    }
  }, [symMatrix]);

  const eigenvectors: Vector[] = useMemo(() => {
    if (!spectral) return [];
    return [
      [spectral.Q[0][0], spectral.Q[1][0]],
      [spectral.Q[0][1], spectral.Q[1][1]],
    ];
  }, [spectral]);

  const eigenvalues: [number, number] = useMemo(() => {
    if (!spectral) return [0, 0];
    return [spectral.Lambda[0][0], spectral.Lambda[1][1]];
  }, [spectral]);

  const updateEntry = useCallback((row: 0 | 1, col: 0 | 1, value: number) => {
    setMatrix((prev) => {
      const next = prev.map((r) => r.slice()) as [[number, number], [number, number]];
      next[row][col] = value;
      // For 2x2 symmetric viz, mirror off-diagonal entry
      if (row !== col) {
        next[col === 1 ? 1 : 0][row === 1 ? 1 : 0] = value;
        // Actually we just set [row][col]; mirror at [col][row]:
        next[col][row] = value;
      }
      return next;
    });
  }, []);

  const handlePresetChange = useCallback(
    (id: string) => {
      setPresetId(id);
      const p = presets.find((x) => x.id === id);
      if (!p) return;
      setMatrix([[p.matrix[0][0], p.matrix[0][1]], [p.matrix[1][0], p.matrix[1][1]]]);
    },
    [presets],
  );

  const svgSize = useMemo(() => {
    if (!containerWidth) return SVG_MAX_SIZE;
    return Math.max(SVG_MIN_SIZE, Math.min(SVG_MAX_SIZE, Math.floor(containerWidth * 0.5)));
  }, [containerWidth]);

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
          .style('opacity', i === 0 ? 0.6 : 0.25);
        g.append('line')
          .attr('x1', 0)
          .attr('x2', innerW)
          .attr('y1', yScale(i))
          .attr('y2', yScale(i))
          .style('stroke', 'var(--color-viz-grid)')
          .style('stroke-width', i === 0 ? 1.25 : 0.5)
          .style('opacity', i === 0 ? 0.6 : 0.25);
      }

      const SAMPLES = 120;
      const linePath = d3
        .line<[number, number]>()
        .x((p) => xScale(p[0]))
        .y((p) => yScale(p[1]));

      if (mode === 'circle-to-ellipse') {
        const circle: [number, number][] = [];
        const ellipse: [number, number][] = [];
        for (let i = 0; i <= SAMPLES; i++) {
          const theta = (2 * Math.PI * i) / SAMPLES;
          const c: [number, number] = [Math.cos(theta), Math.sin(theta)];
          circle.push(c);
          const e = matVec(symMatrix, c);
          ellipse.push([e[0], e[1]]);
        }
        g.append('path')
          .attr('d', linePath(circle) ?? '')
          .style('fill', 'none')
          .style('stroke', COLOR_CIRCLE)
          .style('stroke-width', 1.25)
          .style('opacity', 0.8);
        g.append('path')
          .attr('d', linePath(ellipse) ?? '')
          .style('fill', 'none')
          .style('stroke', COLOR_ELLIPSE)
          .style('stroke-width', 2)
          .style('stroke-dasharray', '6 4')
          .style('opacity', 0.85);
      } else {
        // Level sets: render contours of q(x) = c for several c values.
        const cs = definiteness === 'indefinite' ? [-2, -1, 0, 1, 2] : [0.5, 1, 2, 4];
        const RES = 100;
        const gridVals: number[][] = [];
        for (let iy = 0; iy <= RES; iy++) {
          const row: number[] = [];
          const y = VIEW_HALF - (2 * VIEW_HALF * iy) / RES;
          for (let ix = 0; ix <= RES; ix++) {
            const x = -VIEW_HALF + (2 * VIEW_HALF * ix) / RES;
            row.push(quadraticForm(symMatrix, [x, y]));
          }
          gridVals.push(row);
        }
        const contours = d3
          .contours()
          .size([RES + 1, RES + 1])
          .thresholds(cs);
        const polys = contours(gridVals.flat());
        polys.forEach((p) => {
          const transformed: typeof p = {
            ...p,
            coordinates: p.coordinates.map((poly) =>
              poly.map((ring) =>
                ring.map(([px, py]) => {
                  const xv = -VIEW_HALF + (2 * VIEW_HALF * px) / RES;
                  const yv = VIEW_HALF - (2 * VIEW_HALF * py) / RES;
                  return [xScale(xv), yScale(yv)] as [number, number];
                }),
              ),
            ),
          };
          const pathStr = d3.geoPath()(transformed);
          if (pathStr) {
            g.append('path')
              .attr('d', pathStr)
              .style('fill', 'none')
              .style('stroke', p.value > 0 ? COLOR_ELLIPSE : COLOR_EIGEN_2)
              .style('stroke-width', 1.5)
              .style('opacity', 0.8);
          }
        });
      }

      // Eigenvector lines as principal axes
      eigenvectors.forEach((v, idx) => {
        const color = idx === 0 ? COLOR_EIGEN_1 : COLOR_EIGEN_2;
        const lambda = eigenvalues[idx];
        const len = Math.hypot(v[0], v[1]);
        if (len < 1e-9) return;
        const ux = v[0] / len;
        const uy = v[1] / len;
        const extent = 2 * VIEW_HALF;
        g.append('line')
          .attr('x1', xScale(-extent * ux))
          .attr('y1', yScale(-extent * uy))
          .attr('x2', xScale(extent * ux))
          .attr('y2', yScale(extent * uy))
          .style('stroke', color)
          .style('stroke-width', 2.25)
          .style('opacity', 0.85);
        // Semi-axis endpoint marker (where unit-circle image lands)
        const scale = Math.abs(lambda);
        const ex = ux * scale;
        const ey = uy * scale;
        if (Math.hypot(ex, ey) < VIEW_HALF * 1.5) {
          g.append('circle')
            .attr('cx', xScale(ex))
            .attr('cy', yScale(ey))
            .attr('r', 5)
            .style('fill', color);
          g.append('text')
            .attr('x', xScale(ex) + 8 * Math.sign(ux || 1))
            .attr('y', yScale(ey) - 8 * Math.sign(uy || 1))
            .attr('text-anchor', ux < 0 ? 'end' : 'start')
            .style('fill', color)
            .style('font-size', '12px')
            .style('font-weight', '600')
            .text(`λ = ${formatNumber(lambda)}`);
        }
      });
    },
    [matrix, symMatrix, svgSize, mode, eigenvectors, eigenvalues, definiteness],
  );

  return (
    <div
      ref={containerRef}
      className="my-6 rounded-lg border p-4"
      style={{ background: 'var(--color-viz-surface)', borderColor: 'var(--color-viz-border)' }}
    >
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="flex justify-center md:justify-start">
          <svg
            ref={svgRef}
            width={svgSize}
            height={svgSize}
            style={{ background: 'var(--color-viz-canvas)' }}
            aria-label="Spectral decomposition visualization for a real symmetric 2x2 matrix"
          />
        </div>

        <div className="flex-1 min-w-0">
          {/* Mode toggle */}
          <div className="flex items-center gap-2 mb-3 text-xs">
            <span style={{ color: 'var(--color-text-muted)' }}>Mode:</span>
            {(['circle-to-ellipse', 'level-sets'] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className="rounded px-2 py-1"
                style={{
                  background: mode === m ? 'var(--color-accent-bg)' : 'var(--color-surface)',
                  color: mode === m ? 'var(--color-accent-text)' : 'var(--color-text)',
                  border: '1px solid var(--color-viz-border)',
                  fontWeight: mode === m ? 600 : 400,
                }}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Preset */}
          <label className="block mb-3">
            <span className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>
              Preset (symmetric 2×2)
            </span>
            <select
              value={presetId}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="w-full rounded border px-2 py-1 text-sm"
              style={{ background: 'var(--color-surface)', color: 'var(--color-text)', borderColor: 'var(--color-viz-border)' }}
            >
              {presets.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </label>

          {/* Matrix inputs */}
          <div className="mb-3">
            <span className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>
              Matrix A (off-diagonal entries mirror; warning shown if asymmetric)
            </span>
            <div className="grid grid-cols-2 gap-2" style={{ maxWidth: 220 }}>
              {([0, 1] as const).map((row) =>
                ([0, 1] as const).map((col) => (
                  <input
                    key={`${row}-${col}`}
                    type="number"
                    step={0.5}
                    min={-5}
                    max={5}
                    value={matrix[row][col]}
                    onChange={(e) => {
                      const v = Number.parseFloat(e.target.value);
                      if (Number.isFinite(v)) updateEntry(row, col, v);
                    }}
                    className="rounded border px-2 py-1 text-sm text-center"
                    style={{ background: 'var(--color-surface)', color: 'var(--color-text)', borderColor: 'var(--color-viz-border)' }}
                    aria-label={`Matrix entry row ${row + 1}, column ${col + 1}`}
                  />
                )),
              )}
            </div>
            {wasAsymmetric && (
              <div
                className="mt-2 text-xs rounded px-2 py-1"
                style={{ background: 'rgba(220, 38, 38, 0.1)', color: '#dc2626' }}
              >
                Input was asymmetric — using symmetric part (A + Aᵀ)/2 for the spectral analysis.
              </div>
            )}
          </div>

          {/* Definiteness */}
          <div className="mb-3 rounded p-2 text-sm" style={{ background: 'var(--color-viz-info-bg)' }}>
            <div style={{ color: 'var(--color-text)', fontWeight: 600, textTransform: 'capitalize' }}>
              {definitenessLabel(definiteness)}
            </div>
          </div>

          {/* Eigenvalues / eigenvectors */}
          <div className="mb-3 text-sm space-y-1">
            <div>
              <span style={{ color: COLOR_EIGEN_1, fontWeight: 600 }}>
                λ₁ = {formatNumber(eigenvalues[0])}
              </span>
              {', q₁ ≈ ('}
              {formatNumber(eigenvectors[0]?.[0] ?? 0)}{', '}
              {formatNumber(eigenvectors[0]?.[1] ?? 0)}{')'}
            </div>
            <div>
              <span style={{ color: COLOR_EIGEN_2, fontWeight: 600 }}>
                λ₂ = {formatNumber(eigenvalues[1])}
              </span>
              {', q₂ ≈ ('}
              {formatNumber(eigenvectors[1]?.[0] ?? 0)}{', '}
              {formatNumber(eigenvectors[1]?.[1] ?? 0)}{')'}
            </div>
            <div style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
              A = λ₁ q₁ q₁ᵀ + λ₂ q₂ q₂ᵀ (spectral decomposition)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
