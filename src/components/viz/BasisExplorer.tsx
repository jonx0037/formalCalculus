/**
 * BasisExplorer — Topic 33 (Linear Algebra), §3.3 flagship visualization.
 *
 * Draggable vectors in ℝ² with real-time readouts for rank, linear
 * independence, and (when exactly two vectors are active) the determinant
 * of the matrix whose columns are those vectors. The shaded "span" region
 * tracks the span of the active vectors: a line when the rank is 1, a
 * tinted half-plane outline when the rank is 2.
 *
 * 2D mode is fully interactive in this first slice. 3D mode is a deliberate
 * placeholder — the GramSchmidtAnimator session adds shared 3D rendering
 * primitives, at which point 3D mode here will reuse them.
 */

import { useCallback, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { useD3 } from './shared/useD3';
import { useResizeObserver } from './shared/useResizeObserver';
import {
  determinant,
  rankFromColumns,
  type Vector,
} from './shared/linearAlgebra';
import { getBasisPresets, type BasisPreset } from '../../data/linear-algebra-data';

// ── Constants ─────────────────────────────────────────────────

const MAX_VECTORS = 3;
const VIEW_HALF = 3; // canvas covers [-3, 3] in both axes
const SVG_MAX_SIZE = 480;
const SVG_MIN_SIZE = 320;
const margin = { top: 16, right: 16, bottom: 16, left: 16 };

/** Tints for the up-to-3 user-visible vectors. Eight colors total so that
 *  future presets with more vectors continue to look distinct. */
const LINEAR_ALGEBRA_VECTOR_PALETTE = [
  '#2563eb', // blue-600
  '#dc2626', // red-600
  '#059669', // emerald-600
  '#d97706', // amber-600
  '#7c3aed', // violet-600
  '#0891b2', // cyan-600
  '#db2777', // pink-600
  '#65a30d', // lime-600
] as const;

// ── Types ─────────────────────────────────────────────────────

interface VectorState {
  /** Stable id so D3 joins are predictable across renders. */
  id: number;
  x: number;
  y: number;
  active: boolean;
}

export interface BasisExplorerProps {
  /** `2d` ships in this slice; `3d` renders a deferred-feature placeholder. */
  mode?: '2d' | '3d';
  /** Initial vectors (each length 2 if mode='2d'). Defaults to standard basis. */
  initialVectors?: number[][];
  /** Whether to render the shaded span region. Default true. */
  showSpan?: boolean;
}

// ── Helpers ───────────────────────────────────────────────────

function stateToColumns(vectors: VectorState[]): Vector[] {
  return vectors.filter((v) => v.active).map((v) => [v.x, v.y]);
}

function classifyIndependence(rank: number, activeCount: number): string {
  if (activeCount === 0) return 'no vectors active';
  if (rank < activeCount) return 'linearly dependent';
  return 'linearly independent';
}

function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return '—';
  if (Math.abs(n) < 1e-9) return '0.00';
  return n.toFixed(2);
}

// ── Component ─────────────────────────────────────────────────

export default function BasisExplorer({
  mode = '2d',
  initialVectors,
  showSpan: initialShowSpan = true,
}: BasisExplorerProps) {
  const { ref: containerRef, width: containerWidth } =
    useResizeObserver<HTMLDivElement>();

  const presets = useMemo<BasisPreset[]>(
    () => getBasisPresets().filter((p) => p.ambient === 2),
    [],
  );

  const defaultVectors: VectorState[] = useMemo(() => {
    const source =
      initialVectors && initialVectors.length > 0
        ? initialVectors
        : [
            [1, 0],
            [0, 1],
          ];
    return source.slice(0, MAX_VECTORS).map((coords, i) => ({
      id: i,
      x: coords[0] ?? 0,
      y: coords[1] ?? 0,
      active: true,
    }));
  }, [initialVectors]);

  const [vectors, setVectors] = useState<VectorState[]>(defaultVectors);
  const [showSpan, setShowSpan] = useState<boolean>(initialShowSpan);
  const [presetId, setPresetId] = useState<string>('standard-2d');

  const activeColumns = useMemo(() => stateToColumns(vectors), [vectors]);
  const rank = useMemo(() => rankFromColumns(activeColumns), [activeColumns]);
  const activeCount = useMemo(
    () => vectors.filter((v) => v.active).length,
    [vectors],
  );
  const det = useMemo(() => {
    if (activeColumns.length !== 2) return null;
    return determinant([
      [activeColumns[0][0], activeColumns[1][0]],
      [activeColumns[0][1], activeColumns[1][1]],
    ]);
  }, [activeColumns]);

  const handlePresetChange = useCallback(
    (nextId: string) => {
      setPresetId(nextId);
      const preset = presets.find((p) => p.id === nextId);
      if (!preset) return;
      const next: VectorState[] = preset.vectors
        .slice(0, MAX_VECTORS)
        .map((coords, i) => ({
          id: i,
          x: coords[0] ?? 0,
          y: coords[1] ?? 0,
          active: true,
        }));
      setVectors(next);
    },
    [presets],
  );

  const handleToggleActive = useCallback((id: number) => {
    setVectors((prev) =>
      prev.map((v) => (v.id === id ? { ...v, active: !v.active } : v)),
    );
  }, []);

  const handleAddVector = useCallback(() => {
    setVectors((prev) => {
      if (prev.length >= MAX_VECTORS) return prev;
      const usedIds = new Set(prev.map((v) => v.id));
      let nextId = 0;
      while (usedIds.has(nextId)) nextId += 1;
      // Place the new vector somewhere visible and not already on an existing one.
      const offsets = [
        [1.4, 0.5],
        [-0.7, 1.3],
        [0.6, -1.1],
      ];
      const [x, y] = offsets[prev.length] ?? [1, 1];
      return [...prev, { id: nextId, x, y, active: true }];
    });
  }, []);

  const handleRemoveVector = useCallback((id: number) => {
    setVectors((prev) => prev.filter((v) => v.id !== id));
  }, []);

  // Responsive square sizing — capped between SVG_MIN_SIZE and SVG_MAX_SIZE.
  const svgSize = useMemo(() => {
    if (!containerWidth) return SVG_MAX_SIZE;
    return Math.max(
      SVG_MIN_SIZE,
      Math.min(SVG_MAX_SIZE, Math.floor(containerWidth)),
    );
  }, [containerWidth]);

  // ── D3 rendering ────────────────────────────────────────────
  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (mode !== '2d') return;

      const innerW = svgSize - margin.left - margin.right;
      const innerH = svgSize - margin.top - margin.bottom;
      if (innerW <= 0 || innerH <= 0) return;

      const g = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const xScale = d3
        .scaleLinear()
        .domain([-VIEW_HALF, VIEW_HALF])
        .range([0, innerW]);
      const yScale = d3
        .scaleLinear()
        .domain([-VIEW_HALF, VIEW_HALF])
        .range([innerH, 0]); // y-down → flipped

      // ── Background grid ────────────────────────────────────
      const gridGroup = g.append('g').attr('class', 'grid');
      for (let i = -VIEW_HALF; i <= VIEW_HALF; i++) {
        gridGroup
          .append('line')
          .attr('x1', xScale(i))
          .attr('x2', xScale(i))
          .attr('y1', 0)
          .attr('y2', innerH)
          .style('stroke', 'var(--color-viz-grid)')
          .style('stroke-width', i === 0 ? 1.25 : 0.5)
          .style('opacity', i === 0 ? 0.65 : 0.3);
        gridGroup
          .append('line')
          .attr('x1', 0)
          .attr('x2', innerW)
          .attr('y1', yScale(i))
          .attr('y2', yScale(i))
          .style('stroke', 'var(--color-viz-grid)')
          .style('stroke-width', i === 0 ? 1.25 : 0.5)
          .style('opacity', i === 0 ? 0.65 : 0.3);
      }

      const activeVectors = vectors.filter((v) => v.active);

      // ── Span shading ────────────────────────────────────────
      if (showSpan && rank >= 1) {
        if (rank === 1 && activeVectors.length >= 1) {
          // Render a thick translucent line through the origin along the first
          // independent direction. Find the first nonzero active vector.
          const dirVec = activeVectors.find(
            (v) => Math.abs(v.x) > 1e-9 || Math.abs(v.y) > 1e-9,
          );
          if (dirVec) {
            const len = Math.sqrt(dirVec.x * dirVec.x + dirVec.y * dirVec.y);
            const ux = dirVec.x / len;
            const uy = dirVec.y / len;
            const extent = 2 * VIEW_HALF; // long enough to cross the canvas
            const x1 = xScale(-extent * ux);
            const y1 = yScale(-extent * uy);
            const x2 = xScale(extent * ux);
            const y2 = yScale(extent * uy);
            g.append('line')
              .attr('class', 'span-line')
              .attr('x1', x1)
              .attr('x2', x2)
              .attr('y1', y1)
              .attr('y2', y2)
              .style('stroke', LINEAR_ALGEBRA_VECTOR_PALETTE[0])
              .style('stroke-width', 18)
              .style('opacity', 0.18)
              .style('pointer-events', 'none');
          }
        } else if (rank === 2) {
          g.append('rect')
            .attr('class', 'span-rect')
            .attr('x', 0)
            .attr('y', 0)
            .attr('width', innerW)
            .attr('height', innerH)
            .style('fill', LINEAR_ALGEBRA_VECTOR_PALETTE[2])
            .style('opacity', 0.1)
            .style('pointer-events', 'none');
        }
      }

      // ── Axis labels (small "x", "y") ────────────────────────
      g.append('text')
        .attr('x', innerW - 8)
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

      // ── Vector arrows ──────────────────────────────────────
      const arrowGroup = g.append('g').attr('class', 'vectors');

      vectors.forEach((v, idx) => {
        const color = LINEAR_ALGEBRA_VECTOR_PALETTE[idx % LINEAR_ALGEBRA_VECTOR_PALETTE.length];
        const opacity = v.active ? 1 : 0.25;
        const x0 = xScale(0);
        const y0 = yScale(0);
        const x1 = xScale(v.x);
        const y1 = yScale(v.y);
        const grp = arrowGroup
          .append('g')
          .attr('class', `vector vector-${idx}`)
          .style('opacity', opacity);

        // Shaft.
        grp
          .append('line')
          .attr('x1', x0)
          .attr('x2', x1)
          .attr('y1', y0)
          .attr('y2', y1)
          .style('stroke', color)
          .style('stroke-width', 2.5)
          .style('pointer-events', 'none');

        // Arrowhead (a triangle at the tip, oriented along the shaft).
        const len = Math.hypot(x1 - x0, y1 - y0);
        if (len > 4) {
          const ux = (x1 - x0) / len;
          const uy = (y1 - y0) / len;
          const headLen = 12;
          const headHalf = 6;
          const hx = x1 - headLen * ux;
          const hy = y1 - headLen * uy;
          const px = -uy;
          const py = ux;
          const p1x = hx + headHalf * px;
          const p1y = hy + headHalf * py;
          const p2x = hx - headHalf * px;
          const p2y = hy - headHalf * py;
          grp
            .append('polygon')
            .attr('points', `${x1},${y1} ${p1x},${p1y} ${p2x},${p2y}`)
            .style('fill', color)
            .style('pointer-events', 'none');
        }

        // Coordinate label.
        grp
          .append('text')
          .attr('x', x1 + 8 * Math.sign(v.x || 1))
          .attr('y', y1 - 8 * Math.sign(v.y || 1))
          .attr('text-anchor', v.x < 0 ? 'end' : 'start')
          .style('fill', color)
          .style('font-size', '11px')
          .style('font-weight', '600')
          .style('pointer-events', 'none')
          .text(`v${idx + 1} = (${formatNumber(v.x)}, ${formatNumber(v.y)})`);

        // Draggable tip handle — the user grabs this circle.
        grp
          .append('circle')
          .attr('class', 'vector-tip')
          .attr('cx', x1)
          .attr('cy', y1)
          .attr('r', 9)
          .style('fill', color)
          .style('stroke', 'var(--color-surface)')
          .style('stroke-width', 2)
          .style('cursor', 'grab')
          .attr('role', 'slider')
          .attr('tabindex', 0)
          .attr('aria-label', `vector ${idx + 1} tip`)
          .attr(
            'aria-valuetext',
            `vector ${idx + 1} at (${formatNumber(v.x)}, ${formatNumber(v.y)})`,
          )
          .call(
            d3
              .drag<SVGCircleElement, unknown>()
              .on('start', function () {
                d3.select(this).style('cursor', 'grabbing');
              })
              .on('drag', function (event) {
                const nx = clamp(xScale.invert(event.x), -VIEW_HALF, VIEW_HALF);
                const ny = clamp(yScale.invert(event.y), -VIEW_HALF, VIEW_HALF);
                setVectors((prev) =>
                  prev.map((p) => (p.id === v.id ? { ...p, x: nx, y: ny } : p)),
                );
              })
              .on('end', function () {
                d3.select(this).style('cursor', 'grab');
              }),
          );
      });
    },
    [vectors, rank, showSpan, svgSize, mode],
  );

  // ── 3D placeholder ────────────────────────────────────────
  if (mode === '3d') {
    return (
      <div
        ref={containerRef}
        className="my-6 rounded-lg border p-6 text-center"
        style={{
          borderColor: 'var(--color-border)',
          background: 'var(--color-surface-alt)',
          color: 'var(--color-text-muted)',
        }}
      >
        <p className="text-sm">
          3D BasisExplorer is part of a follow-up session. For now, drop the{' '}
          <code>mode</code> prop to use 2D mode.
        </p>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      className="my-6 rounded-lg border p-4"
      style={{
        borderColor: 'var(--color-border)',
        background: 'var(--color-surface-alt)',
      }}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start">
        <div className="flex-shrink-0">
          <svg
            ref={svgRef}
            width={svgSize}
            height={svgSize}
            role="img"
            aria-label="Interactive plane showing draggable vectors and the span of the active set"
            style={{
              maxWidth: '100%',
              background: 'var(--color-surface)',
              borderRadius: '0.5rem',
            }}
          />
        </div>

        <div className="flex-1 space-y-3 text-sm">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Preset
            </label>
            <select
              value={presetId}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="w-full rounded border px-2 py-1"
              style={{
                borderColor: 'var(--color-viz-grid)',
                background: 'var(--color-surface)',
                color: 'var(--color-text)',
              }}
            >
              {presets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Vectors
              </span>
              <button
                type="button"
                onClick={handleAddVector}
                disabled={vectors.length >= MAX_VECTORS}
                className="rounded border px-2 py-0.5 text-xs disabled:opacity-40"
                style={{
                  borderColor: 'var(--color-viz-grid)',
                  background: 'var(--color-surface)',
                  color: 'var(--color-text)',
                }}
              >
                + add vector
              </button>
            </div>
            <ul className="space-y-1">
              {vectors.map((v, idx) => {
                const color =
                  LINEAR_ALGEBRA_VECTOR_PALETTE[
                    idx % LINEAR_ALGEBRA_VECTOR_PALETTE.length
                  ];
                return (
                  <li
                    key={v.id}
                    className="flex items-center gap-2 rounded px-2 py-1"
                    style={{ background: 'var(--color-surface)' }}
                  >
                    <span
                      aria-hidden="true"
                      className="inline-block h-3 w-3 rounded-full"
                      style={{ background: color }}
                    />
                    <span className="flex-1 font-mono text-xs">
                      v{idx + 1} = ({formatNumber(v.x)}, {formatNumber(v.y)})
                    </span>
                    <label className="flex items-center gap-1 text-xs">
                      <input
                        type="checkbox"
                        checked={v.active}
                        onChange={() => handleToggleActive(v.id)}
                        aria-label={`toggle vector ${idx + 1} active`}
                      />
                      active
                    </label>
                    {vectors.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveVector(v.id)}
                        className="text-xs text-gray-500 hover:text-red-600"
                        aria-label={`remove vector ${idx + 1}`}
                      >
                        ✕
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          <div>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={showSpan}
                onChange={(e) => setShowSpan(e.target.checked)}
              />
              Show span shading
            </label>
          </div>

          <div
            className="rounded px-3 py-2"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border, #e5e7eb)',
            }}
          >
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Readout
            </div>
            <ul className="space-y-1 text-xs">
              <li>
                <span className="font-mono">rank</span> = {rank}
                {activeCount > 0 ? ` (of ${activeCount} active)` : ''}
              </li>
              <li>
                <span className="font-mono">dim&nbsp;span</span> = {rank}
              </li>
              {det !== null && (
                <li>
                  <span className="font-mono">det</span> = {formatNumber(det)}
                  {Math.abs(det) < 1e-9 ? ' (singular)' : det > 0 ? ' (+)' : ' (−)'}
                </li>
              )}
              <li
                className={
                  rank === activeCount && activeCount > 0
                    ? 'text-emerald-600'
                    : 'text-amber-600'
                }
              >
                {classifyIndependence(rank, activeCount)}
              </li>
            </ul>
          </div>

          <p className="text-xs text-gray-500">
            Drag any vector tip to change its direction and length. Toggle{' '}
            <em>active</em> to exclude a vector from the rank/determinant
            calculation.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Utility ───────────────────────────────────────────────────

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}
