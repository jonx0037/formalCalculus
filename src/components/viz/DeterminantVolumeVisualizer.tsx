/**
 * DeterminantVolumeVisualizer — Topic 33 (Linear Algebra), §3.7.
 *
 * Two draggable column vectors a_1, a_2 in ℝ² spanning a parallelogram.
 * The fill color tracks the sign of the determinant: green when positive
 * (orientation-preserving), red when negative (orientation-reversing),
 * grey when zero (the columns are parallel and the parallelogram collapses
 * to a line). The signed determinant and the absolute area are reported
 * live, and a 6-preset selector lets the reader cycle through the canonical
 * cases (identity, scaling, rotation, reflection, shear, singular).
 *
 * 3D mode is a deferred-feature placeholder. Adding a 3D parallelepiped
 * with depth-sorted wireframe edges is a clean follow-up that reuses the
 * `projectToScreen` and `parallelepipedEdges` helpers from
 * `shared/linearAlgebra.ts` (designed in slice 1 with exactly this in mind).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useD3 } from './shared/useD3';
import { useResizeObserver } from './shared/useResizeObserver';
import {
  determinant,
  parallelogramVertices,
  type Vector,
} from './shared/linearAlgebra';
import {
  getDeterminantPresets,
  type DeterminantPreset,
} from '../../data/linear-algebra-data';

// ── Constants ─────────────────────────────────────────────────

const VIEW_HALF = 3; // canvas covers [-3, 3] in both axes
const SVG_MAX_SIZE = 480;
const SVG_MIN_SIZE = 320;
const margin = { top: 16, right: 16, bottom: 16, left: 16 };

/** Column 1 color (matches readout). */
const COLOR_A1 = '#2563eb'; // blue-600
/** Column 2 color (matches readout). */
const COLOR_A2 = '#dc2626'; // red-600

/** Parallelogram fill colors keyed on orientation. */
const FILL_POSITIVE = '#10b981'; // emerald-500 — orientation-preserving
const FILL_NEGATIVE = '#ef4444'; // red-500 — orientation-reversing
const FILL_SINGULAR = '#9ca3af'; // gray-400 — singular

const PRESET_ANIM_MS = 500;

// ── Types ─────────────────────────────────────────────────────

interface ColumnState {
  x: number;
  y: number;
}

export interface DeterminantVolumeVisualizerProps {
  /** "2d" ships in this slice; "3d" renders a deferred-feature placeholder. */
  mode?: '2d' | '3d';
  /** Initial columns of the matrix. Defaults to identity. */
  initialColumns?: number[][];
}

// ── Helpers ───────────────────────────────────────────────────

function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return '—';
  if (Math.abs(n) < 1e-9) return '0.00';
  return n.toFixed(2);
}

function orientationFill(det: number): { fill: string; label: string; textClass: string } {
  if (Math.abs(det) < 1e-9) {
    return { fill: FILL_SINGULAR, label: 'singular (collapsed to a line)', textClass: 'text-gray-500' };
  }
  if (det > 0) {
    return { fill: FILL_POSITIVE, label: 'positive (orientation-preserving)', textClass: 'text-emerald-600' };
  }
  return { fill: FILL_NEGATIVE, label: 'negative (orientation-reversing)', textClass: 'text-red-600' };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

// ── Component ─────────────────────────────────────────────────

export default function DeterminantVolumeVisualizer({
  mode = '2d',
  initialColumns,
}: DeterminantVolumeVisualizerProps) {
  const { ref: containerRef, width: containerWidth } =
    useResizeObserver<HTMLDivElement>();

  const presets = useMemo<DeterminantPreset[]>(() => getDeterminantPresets(), []);

  const defaultColumns: [ColumnState, ColumnState] = useMemo(() => {
    if (initialColumns && initialColumns.length >= 2) {
      return [
        { x: initialColumns[0][0] ?? 1, y: initialColumns[0][1] ?? 0 },
        { x: initialColumns[1][0] ?? 0, y: initialColumns[1][1] ?? 1 },
      ];
    }
    return [
      { x: 1, y: 0 },
      { x: 0, y: 1 },
    ];
  }, [initialColumns]);

  const [colA1, setColA1] = useState<ColumnState>(defaultColumns[0]);
  const [colA2, setColA2] = useState<ColumnState>(defaultColumns[1]);
  const [presetId, setPresetId] = useState<string>('identity-2d');

  const animFrameRef = useRef<number | null>(null);
  useEffect(() => {
    return () => {
      if (animFrameRef.current !== null) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  const handlePresetChange = useCallback(
    (nextId: string) => {
      const preset = presets.find((p) => p.id === nextId);
      if (!preset) return;
      setPresetId(nextId);
      const targetA1: ColumnState = { x: preset.columns[0][0], y: preset.columns[0][1] };
      const targetA2: ColumnState = { x: preset.columns[1][0], y: preset.columns[1][1] };
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      const start1 = { ...colA1 };
      const start2 = { ...colA2 };
      const startTime = performance.now();
      const tick = (now: number) => {
        const elapsed = now - startTime;
        const t = Math.min(1, elapsed / PRESET_ANIM_MS);
        const e = easeInOut(t);
        setColA1({ x: lerp(start1.x, targetA1.x, e), y: lerp(start1.y, targetA1.y, e) });
        setColA2({ x: lerp(start2.x, targetA2.x, e), y: lerp(start2.y, targetA2.y, e) });
        if (t < 1) {
          animFrameRef.current = requestAnimationFrame(tick);
        } else {
          animFrameRef.current = null;
        }
      };
      animFrameRef.current = requestAnimationFrame(tick);
    },
    [presets, colA1, colA2],
  );

  // Build matrix and compute determinant.
  const matrix = useMemo<number[][]>(
    () => [
      [colA1.x, colA2.x],
      [colA1.y, colA2.y],
    ],
    [colA1, colA2],
  );
  const det = useMemo(() => determinant(matrix), [matrix]);
  const orient = useMemo(() => orientationFill(det), [det]);

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

      const xScale = d3.scaleLinear().domain([-VIEW_HALF, VIEW_HALF]).range([0, innerW]);
      const yScale = d3.scaleLinear().domain([-VIEW_HALF, VIEW_HALF]).range([innerH, 0]);

      // Background grid.
      const gridGroup = g.append('g').attr('class', 'grid');
      for (let i = -VIEW_HALF; i <= VIEW_HALF; i++) {
        gridGroup
          .append('line')
          .attr('x1', xScale(i)).attr('x2', xScale(i))
          .attr('y1', 0).attr('y2', innerH)
          .style('stroke', 'var(--color-viz-grid)')
          .style('stroke-width', i === 0 ? 1.25 : 0.5)
          .style('opacity', i === 0 ? 0.7 : 0.3);
        gridGroup
          .append('line')
          .attr('x1', 0).attr('x2', innerW)
          .attr('y1', yScale(i)).attr('y2', yScale(i))
          .style('stroke', 'var(--color-viz-grid)')
          .style('stroke-width', i === 0 ? 1.25 : 0.5)
          .style('opacity', i === 0 ? 0.7 : 0.3);
      }

      // Axis labels.
      g.append('text')
        .attr('x', innerW - 8).attr('y', yScale(0) - 6)
        .attr('text-anchor', 'end')
        .style('fill', 'var(--color-text-muted)')
        .style('font-size', '11px')
        .text('x');
      g.append('text')
        .attr('x', xScale(0) + 6).attr('y', 12)
        .style('fill', 'var(--color-text-muted)')
        .style('font-size', '11px')
        .text('y');

      // Parallelogram fill — color tracks orientation.
      const verts: Vector[] = parallelogramVertices(
        [colA1.x, colA1.y],
        [colA2.x, colA2.y],
      );
      g.append('polygon')
        .attr('class', 'parallelogram')
        .attr('points', verts.map(([x, y]) => `${xScale(x)},${yScale(y)}`).join(' '))
        .style('fill', orient.fill)
        .style('fill-opacity', 0.28)
        .style('stroke', orient.fill)
        .style('stroke-width', 1.5)
        .style('stroke-opacity', 0.7);

      // Small orientation indicator: an arc from a_1 to a_2 at the origin,
      // suggesting the sense of rotation.
      if (Math.abs(det) > 1e-9) {
        const a1Angle = Math.atan2(colA1.y, colA1.x);
        const a2Angle = Math.atan2(colA2.y, colA2.x);
        let deltaAngle = a2Angle - a1Angle;
        if (deltaAngle > Math.PI) deltaAngle -= 2 * Math.PI;
        if (deltaAngle < -Math.PI) deltaAngle += 2 * Math.PI;
        const sweepRadius = 24;
        const sweepFlag = deltaAngle > 0 ? 1 : 0;
        const largeArcFlag = Math.abs(deltaAngle) > Math.PI ? 1 : 0;
        const sx = xScale(0) + sweepRadius * Math.cos(a1Angle);
        const sy = yScale(0) - sweepRadius * Math.sin(a1Angle);
        const ex = xScale(0) + sweepRadius * Math.cos(a2Angle);
        const ey = yScale(0) - sweepRadius * Math.sin(a2Angle);
        g.append('path')
          .attr(
            'd',
            `M ${sx},${sy} A ${sweepRadius},${sweepRadius} 0 ${largeArcFlag} ${sweepFlag === 1 ? 0 : 1} ${ex},${ey}`,
          )
          .style('stroke', orient.fill)
          .style('stroke-width', 1.5)
          .style('fill', 'none')
          .style('opacity', 0.65);
      }

      // Two column arrows.
      const drawArrow = (
        col: ColumnState,
        color: string,
        labelText: string,
        ariaLabel: string,
        onDrag: (nx: number, ny: number) => void,
      ) => {
        const x0 = xScale(0);
        const y0 = yScale(0);
        const x1 = xScale(col.x);
        const y1 = yScale(col.y);
        const grp = g.append('g').attr('class', 'arrow');

        grp.append('line')
          .attr('x1', x0).attr('x2', x1)
          .attr('y1', y0).attr('y2', y1)
          .style('stroke', color).style('stroke-width', 2.5)
          .style('pointer-events', 'none');

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
          grp.append('polygon')
            .attr('points', `${x1},${y1} ${hx + headHalf * px},${hy + headHalf * py} ${hx - headHalf * px},${hy - headHalf * py}`)
            .style('fill', color)
            .style('pointer-events', 'none');
        }

        grp.append('text')
          .attr('x', x1 + 10 * Math.sign(col.x || 1))
          .attr('y', y1 - 10 * Math.sign(col.y || 1))
          .attr('text-anchor', col.x < 0 ? 'end' : 'start')
          .style('fill', color)
          .style('font-size', '11px')
          .style('font-weight', '600')
          .style('pointer-events', 'none')
          .text(labelText);

        grp.append('circle')
          .attr('class', 'tip')
          .attr('cx', x1).attr('cy', y1).attr('r', 9)
          .style('fill', color)
          .style('stroke', 'var(--color-surface)')
          .style('stroke-width', 2)
          .style('cursor', 'grab')
          .attr('role', 'slider')
          .attr('tabindex', 0)
          .attr('aria-label', ariaLabel)
          .attr('aria-valuetext', `${ariaLabel} at (${formatNumber(col.x)}, ${formatNumber(col.y)})`)
          .call(
            d3.drag<SVGCircleElement, unknown>()
              .on('start', function () {
                if (animFrameRef.current !== null) {
                  cancelAnimationFrame(animFrameRef.current);
                  animFrameRef.current = null;
                }
                d3.select(this).style('cursor', 'grabbing');
              })
              .on('drag', function (event) {
                const nx = clamp(xScale.invert(event.x), -VIEW_HALF, VIEW_HALF);
                const ny = clamp(yScale.invert(event.y), -VIEW_HALF, VIEW_HALF);
                onDrag(nx, ny);
              })
              .on('end', function () {
                d3.select(this).style('cursor', 'grab');
              }),
          );
      };

      drawArrow(colA1, COLOR_A1, 'a₁', 'column 1', (nx, ny) => setColA1({ x: nx, y: ny }));
      drawArrow(colA2, COLOR_A2, 'a₂', 'column 2', (nx, ny) => setColA2({ x: nx, y: ny }));
    },
    [colA1, colA2, det, svgSize, mode, orient.fill],
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
          3D parallelepiped mode is part of a follow-up session. The
          `parallelepipedEdges()` and `projectToScreen()` helpers in
          `shared/linearAlgebra.ts` were prepared in slice 1 for this case.
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
            aria-label="Two draggable column vectors and the signed-area parallelogram they span"
            style={{
              maxWidth: '100%',
              background: 'var(--color-viz-bg)',
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
                borderColor: 'var(--color-border-strong)',
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
            <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {presets.find((p) => p.id === presetId)?.notes ?? ''}
            </p>
          </div>

          <div
            className="rounded px-3 py-2"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Columns
            </div>
            <ul className="space-y-1 font-mono text-xs">
              <li className="flex items-center gap-2">
                <span aria-hidden="true" className="inline-block h-3 w-3 rounded-full" style={{ background: COLOR_A1 }} />
                <span>a₁ = ({formatNumber(colA1.x)}, {formatNumber(colA1.y)})</span>
              </li>
              <li className="flex items-center gap-2">
                <span aria-hidden="true" className="inline-block h-3 w-3 rounded-full" style={{ background: COLOR_A2 }} />
                <span>a₂ = ({formatNumber(colA2.x)}, {formatNumber(colA2.y)})</span>
              </li>
            </ul>
          </div>

          <div
            className="rounded px-3 py-2"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Determinant and area
            </div>
            <ul className="space-y-1 text-xs">
              <li>
                <span className="font-mono">det A</span> = <span className="font-mono">{formatNumber(det)}</span>
              </li>
              <li>
                <span className="font-mono">|det A|</span> = <span className="font-mono">{formatNumber(Math.abs(det))}</span>
                <span style={{ color: 'var(--color-text-muted)' }}> (area of the parallelogram)</span>
              </li>
              <li className={orient.textClass}>{orient.label}</li>
            </ul>
          </div>

          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Drag <span style={{ color: COLOR_A1, fontWeight: 600 }}>a₁</span> or <span style={{ color: COLOR_A2, fontWeight: 600 }}>a₂</span> to change the columns. The parallelogram colors green when det A &gt; 0 (orientation-preserving), red when det A &lt; 0 (orientation-reversing), grey when det A = 0 (the columns are parallel).
          </p>
        </div>
      </div>
    </div>
  );
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}
