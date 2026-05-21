/**
 * BasisExplorer — Topic 33 (Linear Algebra), §3.3 flagship visualization.
 *
 * Draggable vectors in ℝ² (or preset-driven vectors in ℝ³) with real-time
 * readouts for rank, linear independence, and the determinant of the
 * square matrix whose columns are the active vectors. The shaded "span"
 * region tracks the span of the active vectors: a line when the rank is
 * 1, a tinted rectangle when the rank is 2 (in 2D mode).
 *
 * 2D mode is fully interactive — drag vectors, toggle active, add and
 * remove vectors. 3D mode (added in slice 4) is preset-driven without
 * drag: pick a 3-vector basis from the preset menu and the rank/det/
 * independence readouts update accordingly. Dragging in 3D would require
 * picking a constrained plane in screen space, which the brief defers to
 * a future iteration.
 */

import { useCallback, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { useD3 } from './shared/useD3';
import { useResizeObserver } from './shared/useResizeObserver';
import {
  determinant,
  projectToScreen,
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
  /** z coordinate, present only in 3D mode. */
  z?: number;
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

function stateToColumns(vectors: VectorState[], mode: '2d' | '3d'): Vector[] {
  return vectors
    .filter((v) => v.active)
    .map((v) => (mode === '3d' ? [v.x, v.y, v.z ?? 0] : [v.x, v.y]));
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
    () => getBasisPresets().filter((p) => p.ambient === (mode === '3d' ? 3 : 2)),
    [mode],
  );

  const defaultVectors: VectorState[] = useMemo(() => {
    const dim = mode === '3d' ? 3 : 2;
    const source =
      initialVectors && initialVectors.length > 0
        ? initialVectors
        : dim === 3
          ? [
              [1, 0, 0],
              [0, 1, 0],
              [0, 0, 1],
            ]
          : [
              [1, 0],
              [0, 1],
            ];
    return source.slice(0, MAX_VECTORS).map((coords, i) => ({
      id: i,
      x: coords[0] ?? 0,
      y: coords[1] ?? 0,
      z: dim === 3 ? (coords[2] ?? 0) : undefined,
      active: true,
    }));
  }, [initialVectors, mode]);

  const [vectors, setVectors] = useState<VectorState[]>(defaultVectors);
  const [showSpan, setShowSpan] = useState<boolean>(initialShowSpan);
  const [presetId, setPresetId] = useState<string>(
    mode === '3d' ? 'standard-3d' : 'standard-2d',
  );

  const activeColumns = useMemo(() => stateToColumns(vectors, mode), [vectors, mode]);
  const rank = useMemo(() => rankFromColumns(activeColumns), [activeColumns]);
  const activeCount = useMemo(
    () => vectors.filter((v) => v.active).length,
    [vectors],
  );
  const det = useMemo(() => {
    if (mode === '2d') {
      if (activeColumns.length !== 2) return null;
      return determinant([
        [activeColumns[0][0], activeColumns[1][0]],
        [activeColumns[0][1], activeColumns[1][1]],
      ]);
    }
    // 3D mode: det only defined when exactly 3 active vectors.
    if (activeColumns.length !== 3) return null;
    return determinant([
      [activeColumns[0][0], activeColumns[1][0], activeColumns[2][0]],
      [activeColumns[0][1], activeColumns[1][1], activeColumns[2][1]],
      [activeColumns[0][2], activeColumns[1][2], activeColumns[2][2]],
    ]);
  }, [activeColumns, mode]);

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
          z: mode === '3d' ? (coords[2] ?? 0) : undefined,
          active: true,
        }));
      setVectors(next);
    },
    [presets, mode],
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
      const offsets2d = [
        [1.4, 0.5],
        [-0.7, 1.3],
        [0.6, -1.1],
      ];
      const offsets3d = [
        [1.4, 0.5, 0.3],
        [-0.7, 1.3, 0.4],
        [0.6, -1.1, 1.0],
      ];
      const [x, y, z] = (mode === '3d' ? offsets3d : offsets2d)[prev.length] ?? [1, 1, 0.5];
      return [
        ...prev,
        { id: nextId, x, y, z: mode === '3d' ? z : undefined, active: true },
      ];
    });
  }, [mode]);

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

      // ── 3D branch ──────────────────────────────────────────
      if (mode === '3d') {
        render3D(g, xScale, yScale, innerW, innerH, vectors);
        return;
      }

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
            aria-label={
              mode === '3d'
                ? 'Three-dimensional view showing a basis of R^3 via isometric projection'
                : 'Interactive plane showing draggable vectors and the span of the active set'
            }
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
                      v{idx + 1} = (
                      {formatNumber(v.x)}, {formatNumber(v.y)}
                      {mode === '3d' ? `, ${formatNumber(v.z ?? 0)}` : ''})
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
            {mode === '3d'
              ? 'Switch presets to explore different 3D bases. Toggle active to exclude a vector from the rank computation. Dragging is disabled in 3D — use presets to manipulate vectors.'
              : 'Drag any vector tip to change its direction and length. Toggle active to exclude a vector from the rank/determinant calculation.'}
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

// ── 3D rendering ──────────────────────────────────────────────

function render3D(
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  xScale: d3.ScaleLinear<number, number>,
  yScale: d3.ScaleLinear<number, number>,
  innerW: number,
  innerH: number,
  vectors: VectorState[],
): void {
  // Light isometric grid (the projected unit cube edges).
  const cubeEdges: Array<[number[], number[]]> = [
    [[0, 0, 0], [1, 0, 0]],
    [[0, 0, 0], [0, 1, 0]],
    [[0, 0, 0], [0, 0, 1]],
    [[1, 0, 0], [1, 1, 0]],
    [[1, 0, 0], [1, 0, 1]],
    [[0, 1, 0], [1, 1, 0]],
    [[0, 1, 0], [0, 1, 1]],
    [[0, 0, 1], [1, 0, 1]],
    [[0, 0, 1], [0, 1, 1]],
    [[1, 1, 0], [1, 1, 1]],
    [[1, 0, 1], [1, 1, 1]],
    [[0, 1, 1], [1, 1, 1]],
  ];
  cubeEdges.forEach(([a, b]) => {
    const [ax, ay] = projectToScreen(a);
    const [bx, by] = projectToScreen(b);
    g.append('line')
      .attr('x1', xScale(ax)).attr('y1', yScale(ay))
      .attr('x2', xScale(bx)).attr('y2', yScale(by))
      .style('stroke', 'var(--color-viz-grid)')
      .style('stroke-width', 0.5)
      .style('opacity', 0.45);
  });

  // 3D axes — x in red, y in green, z in blue (with negative halves dashed).
  const drawAxis = (dir: number[], color: string, label: string) => {
    const tip = dir.map((c) => c * 2.5);
    const tail = dir.map((c) => -c * 2.5);
    const [tx, ty] = projectToScreen(tip);
    const [hx, hy] = projectToScreen(tail);
    const [ox, oy] = projectToScreen([0, 0, 0]);
    g.append('line')
      .attr('x1', xScale(ox)).attr('y1', yScale(oy))
      .attr('x2', xScale(tx)).attr('y2', yScale(ty))
      .style('stroke', color).style('stroke-width', 0.9).style('opacity', 0.5);
    g.append('line')
      .attr('x1', xScale(ox)).attr('y1', yScale(oy))
      .attr('x2', xScale(hx)).attr('y2', yScale(hy))
      .style('stroke', color).style('stroke-width', 0.9).style('opacity', 0.25)
      .style('stroke-dasharray', '3 3');
    g.append('text')
      .attr('x', xScale(tx) + 4 * Math.sign(tx))
      .attr('y', yScale(ty) - 4)
      .style('fill', color).style('font-size', '10px').style('opacity', 0.7)
      .text(label);
  };
  drawAxis([1, 0, 0], '#dc2626', 'x');
  drawAxis([0, 1, 0], '#10b981', 'y');
  drawAxis([0, 0, 1], '#2563eb', 'z');

  // Vectors.
  vectors.forEach((v, idx) => {
    const color = LINEAR_ALGEBRA_VECTOR_PALETTE[idx % LINEAR_ALGEBRA_VECTOR_PALETTE.length];
    const opacity = v.active ? 1.0 : 0.25;
    const tip = [v.x, v.y, v.z ?? 0];
    const [origScreenX, origScreenY] = projectToScreen([0, 0, 0]);
    const [tipScreenX, tipScreenY] = projectToScreen(tip);
    const x0 = xScale(origScreenX);
    const y0 = yScale(origScreenY);
    const x1 = xScale(tipScreenX);
    const y1 = yScale(tipScreenY);
    const len = Math.hypot(x1 - x0, y1 - y0);
    if (len < 1) return;

    g.append('line')
      .attr('x1', x0).attr('y1', y0)
      .attr('x2', x1).attr('y2', y1)
      .style('stroke', color).style('stroke-width', 2.5)
      .style('opacity', opacity);

    // Arrowhead.
    const ux = (x1 - x0) / len;
    const uy = (y1 - y0) / len;
    const headLen = 12;
    const headHalf = 6;
    const hx = x1 - headLen * ux;
    const hy = y1 - headLen * uy;
    const px = -uy;
    const py = ux;
    g.append('polygon')
      .attr('points', `${x1},${y1} ${hx + headHalf * px},${hy + headHalf * py} ${hx - headHalf * px},${hy - headHalf * py}`)
      .style('fill', color)
      .style('opacity', opacity);

    g.append('text')
      .attr('x', x1 + 8 * Math.sign(tipScreenX || 1))
      .attr('y', y1 - 6)
      .attr('text-anchor', tipScreenX < 0 ? 'end' : 'start')
      .style('fill', color)
      .style('font-size', '10px')
      .style('font-weight', '600')
      .style('opacity', opacity)
      .text(`v${idx + 1}`);
  });

  // Suppress unused-axis warnings.
  void innerW; void innerH;
}
