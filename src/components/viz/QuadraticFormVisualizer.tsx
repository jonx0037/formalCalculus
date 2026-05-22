/**
 * QuadraticFormVisualizer — Topic 34 §7 (and §10).
 *
 * Contour plot of q(x) = x^T A x for a user-controlled symmetric 2×2 matrix
 * A. Eigenvectors drawn through the origin as the principal axes. A
 * color-coded definiteness label categorises the level-set topology
 * (bowl / saddle / trough / dome / cylinder).
 */

import { useCallback, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { useD3 } from './shared/useD3';
import { useResizeObserver } from './shared/useResizeObserver';
import {
  classifyDefiniteness,
  isSymmetric,
  quadraticForm,
  spectralDecompositionSymmetric,
  type Matrix,
} from './shared/linearAlgebra';
import {
  getQuadraticFormPresets,
  type QuadraticFormPreset,
} from '../../data/eigenvalues-eigenvectors-data';

const VIEW_HALF = 2.5;
const SVG_MAX_SIZE = 440;
const SVG_MIN_SIZE = 300;
const margin = { top: 14, right: 14, bottom: 14, left: 14 };
const COLOR_EIGEN_1 = '#2563eb';
const COLOR_EIGEN_2 = '#059669';

function formatNumber(n: number, digits = 2): string {
  if (!Number.isFinite(n)) return '—';
  if (Math.abs(n) < 1e-9) return '0.00';
  return n.toFixed(digits);
}

const DEFINITENESS_COLOR: Record<string, string> = {
  'positive-definite': '#059669',
  'positive-semidefinite': '#0891b2',
  'negative-definite': '#dc2626',
  'negative-semidefinite': '#d97706',
  indefinite: '#7c3aed',
  zero: '#6b7280',
};

const DEFINITENESS_DESC: Record<string, string> = {
  'positive-definite': 'bowl (elliptic contours)',
  'positive-semidefinite': 'trough (parallel-line contours)',
  'negative-definite': 'dome (elliptic, inverted)',
  'negative-semidefinite': 'inverted trough',
  indefinite: 'saddle (hyperbolic contours)',
  zero: 'degenerate (q ≡ 0)',
};

export interface QuadraticFormVisualizerProps {
  initialMatrix?: [[number, number], [number, number]];
  show3D?: boolean;
}

export default function QuadraticFormVisualizer({
  initialMatrix = [[1, 0], [0, 1]],
}: QuadraticFormVisualizerProps = {}) {
  const { ref: containerRef, width: containerWidth } = useResizeObserver<HTMLDivElement>();
  const presets = useMemo<QuadraticFormPreset[]>(() => getQuadraticFormPresets(), []);
  const [matrix, setMatrix] = useState<[[number, number], [number, number]]>(initialMatrix);
  const [presetId, setPresetId] = useState<string>('isotropic');

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

  const eigenvalues = useMemo<[number, number]>(
    () => (spectral ? [spectral.Lambda[0][0], spectral.Lambda[1][1]] : [0, 0]),
    [spectral],
  );

  const eigenvectors = useMemo(
    () =>
      spectral
        ? [
            [spectral.Q[0][0], spectral.Q[1][0]],
            [spectral.Q[0][1], spectral.Q[1][1]],
          ]
        : [],
    [spectral],
  );

  const updateEntry = useCallback((row: 0 | 1, col: 0 | 1, value: number) => {
    setMatrix((prev) => {
      const next = prev.map((r) => r.slice()) as [[number, number], [number, number]];
      next[row][col] = value;
      if (row !== col) next[col][row] = value;
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
      for (let i = Math.ceil(-VIEW_HALF); i <= Math.floor(VIEW_HALF); i++) {
        g.append('line')
          .attr('x1', xScale(i))
          .attr('x2', xScale(i))
          .attr('y1', 0)
          .attr('y2', innerH)
          .style('stroke', 'var(--color-viz-grid)')
          .style('stroke-width', i === 0 ? 1.25 : 0.5)
          .style('opacity', i === 0 ? 0.55 : 0.22);
        g.append('line')
          .attr('x1', 0)
          .attr('x2', innerW)
          .attr('y1', yScale(i))
          .attr('y2', yScale(i))
          .style('stroke', 'var(--color-viz-grid)')
          .style('stroke-width', i === 0 ? 1.25 : 0.5)
          .style('opacity', i === 0 ? 0.55 : 0.22);
      }

      // Contour plot using d3.contours
      const RES = 90;
      const flat: number[] = [];
      let qMin = Infinity;
      let qMax = -Infinity;
      for (let iy = 0; iy <= RES; iy++) {
        const y = VIEW_HALF - (2 * VIEW_HALF * iy) / RES;
        for (let ix = 0; ix <= RES; ix++) {
          const x = -VIEW_HALF + (2 * VIEW_HALF * ix) / RES;
          const v = quadraticForm(symMatrix, [x, y]);
          flat.push(v);
          if (v < qMin) qMin = v;
          if (v > qMax) qMax = v;
        }
      }

      // Choose contour levels.
      let thresholds: number[] = [];
      if (definiteness === 'indefinite') {
        thresholds = [-4, -2, -1, -0.25, 0, 0.25, 1, 2, 4];
      } else if (definiteness === 'positive-definite' || definiteness === 'positive-semidefinite') {
        thresholds = [0.25, 0.5, 1, 2, 4, 6];
      } else if (definiteness === 'negative-definite' || definiteness === 'negative-semidefinite') {
        thresholds = [-6, -4, -2, -1, -0.5, -0.25];
      } else {
        thresholds = [];
      }

      const contours = d3.contours().size([RES + 1, RES + 1]).thresholds(thresholds);
      const polys = contours(flat);
      const colorScale = d3
        .scaleSequential(d3.interpolateViridis)
        .domain(
          definiteness === 'indefinite'
            ? [-Math.max(Math.abs(qMin), Math.abs(qMax)), Math.max(Math.abs(qMin), Math.abs(qMax))]
            : [qMin, qMax],
        );

      polys.forEach((p) => {
        const transformed = {
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
            .style('stroke', colorScale(p.value))
            .style('stroke-width', Math.abs(p.value) < 1e-6 ? 2.5 : 1.5)
            .style('opacity', 0.85);
        }
      });

      // Eigenvector lines
      eigenvectors.forEach((v, idx) => {
        const color = idx === 0 ? COLOR_EIGEN_1 : COLOR_EIGEN_2;
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
          .style('stroke-width', 2)
          .style('opacity', 0.85)
          .style('stroke-dasharray', '6 3');
      });
    },
    [matrix, symMatrix, svgSize, definiteness, eigenvectors],
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
            aria-label="Quadratic form visualization — contour plot with principal axes"
          />
        </div>

        <div className="flex-1 min-w-0">
          <label className="block mb-3">
            <span className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>
              Preset
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

          <div className="mb-3">
            <span className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>
              Symmetric matrix A
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
                Symmetrized to (A + Aᵀ)/2.
              </div>
            )}
          </div>

          {/* Definiteness label */}
          <div className="mb-3 rounded p-2 text-sm" style={{ background: DEFINITENESS_COLOR[definiteness] + '20' }}>
            <div style={{ color: DEFINITENESS_COLOR[definiteness], fontWeight: 600, textTransform: 'capitalize' }}>
              {definiteness.replace(/-/g, ' ')}
            </div>
            <div style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', marginTop: 2 }}>
              {DEFINITENESS_DESC[definiteness]}
            </div>
          </div>

          {/* Eigenvalues */}
          <div className="text-sm space-y-1">
            <div>
              <span style={{ color: COLOR_EIGEN_1, fontWeight: 600 }}>λ₁ = {formatNumber(eigenvalues[0])}</span>
              <span style={{ color: 'var(--color-text-muted)', marginLeft: 8 }}>(major principal axis)</span>
            </div>
            <div>
              <span style={{ color: COLOR_EIGEN_2, fontWeight: 600 }}>λ₂ = {formatNumber(eigenvalues[1])}</span>
              <span style={{ color: 'var(--color-text-muted)', marginLeft: 8 }}>(minor principal axis)</span>
            </div>
          </div>

          <div className="mt-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Dashed lines are the eigenvectors (principal axes). Contour color encodes the q(x) value (viridis colormap).
          </div>
        </div>
      </div>
    </div>
  );
}
