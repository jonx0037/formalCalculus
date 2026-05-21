/**
 * LinearMapMatrixBuilder — Topic 33 (Linear Algebra), §§3.4-3.5 flagship.
 *
 * Two draggable image arrows T(e_1) and T(e_2) in ℝ², with a live matrix
 * readout whose columns ARE the coordinates of those images. Drag a tip
 * and the corresponding column of the matrix updates immediately; pick a
 * preset and both arrows animate to the new positions while the matrix
 * morphs. The unit square renders alongside its image parallelogram so the
 * "linear map sends parallelograms to parallelograms" picture is visible
 * at all times.
 *
 * The §3.9 "second basis" toggle — which would add an alternate basis B'
 * and a second matrix panel showing [T] in B' via the change-of-basis
 * formula — is deferred to a later slice and is NOT implemented here. This
 * component is the §§3.4-3.5 surface only.
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
  getLinearMapPresets,
  type LinearMapPreset,
} from '../../data/linear-algebra-data';

// ── Constants ─────────────────────────────────────────────────

const VIEW_HALF = 3; // canvas covers [-3, 3] in both axes
const SVG_MAX_SIZE = 480;
const SVG_MIN_SIZE = 320;
const margin = { top: 16, right: 16, bottom: 16, left: 16 };

/** T(e_1) is rendered in this color (matches the matrix's column 1 border). */
const COLOR_E1 = '#2563eb'; // blue-600
/** T(e_2) is rendered in this color (matches the matrix's column 2 border). */
const COLOR_E2 = '#dc2626'; // red-600
/** Parallelogram fill color (semi-transparent). */
const COLOR_PARALLELOGRAM = '#7c3aed'; // violet-600

/** Preset-change animation duration. */
const PRESET_ANIM_MS = 500;

// ── Types ─────────────────────────────────────────────────────

interface ImageState {
  x: number;
  y: number;
}

export interface LinearMapMatrixBuilderProps {
  /** Initial image of e_1. Defaults to (1, 0). */
  initialImageE1?: [number, number];
  /** Initial image of e_2. Defaults to (0, 1). */
  initialImageE2?: [number, number];
  /** Whether to show the matrix readout panel. Default true. */
  showMatrix?: boolean;
  /** Whether to show the determinant indicator. Default true. */
  showDeterminant?: boolean;
}

// ── Helpers ───────────────────────────────────────────────────

function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return '—';
  if (Math.abs(n) < 1e-9) return '0.00';
  return n.toFixed(2);
}

function determinantSignClass(det: number): {
  label: string;
  textClass: string;
} {
  if (Math.abs(det) < 1e-9) {
    return { label: 'singular', textClass: 'text-gray-500' };
  }
  if (det > 0) {
    return { label: 'orientation-preserving', textClass: 'text-emerald-600' };
  }
  return { label: 'orientation-reversing', textClass: 'text-red-600' };
}

/** Linear interpolation. */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Smooth-step (cubic) easing for animation. */
function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

// ── Component ─────────────────────────────────────────────────

export default function LinearMapMatrixBuilder({
  initialImageE1 = [1, 0],
  initialImageE2 = [0, 1],
  showMatrix = true,
  showDeterminant = true,
}: LinearMapMatrixBuilderProps) {
  const { ref: containerRef, width: containerWidth } =
    useResizeObserver<HTMLDivElement>();

  const presets = useMemo<LinearMapPreset[]>(() => getLinearMapPresets(), []);

  const [imageE1, setImageE1] = useState<ImageState>({
    x: initialImageE1[0],
    y: initialImageE1[1],
  });
  const [imageE2, setImageE2] = useState<ImageState>({
    x: initialImageE2[0],
    y: initialImageE2[1],
  });
  const [presetId, setPresetId] = useState<string>('identity');

  // Animation handle so a new preset interrupts a running animation cleanly.
  const animFrameRef = useRef<number | null>(null);

  // Cancel any in-flight animation when the component unmounts.
  useEffect(() => {
    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  const handlePresetChange = useCallback(
    (nextId: string) => {
      const preset = presets.find((p) => p.id === nextId);
      if (!preset) return;
      setPresetId(nextId);
      // Columns of the preset matrix are the images of e_1 and e_2.
      const target1: ImageState = { x: preset.matrix[0][0], y: preset.matrix[1][0] };
      const target2: ImageState = { x: preset.matrix[0][1], y: preset.matrix[1][1] };
      // Cancel any in-flight animation.
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      // Capture starting positions for the animation.
      const start1 = { ...imageE1 };
      const start2 = { ...imageE2 };
      const startTime = performance.now();
      const tick = (now: number) => {
        const elapsed = now - startTime;
        const t = Math.min(1, elapsed / PRESET_ANIM_MS);
        const e = easeInOut(t);
        setImageE1({
          x: lerp(start1.x, target1.x, e),
          y: lerp(start1.y, target1.y, e),
        });
        setImageE2({
          x: lerp(start2.x, target2.x, e),
          y: lerp(start2.y, target2.y, e),
        });
        if (t < 1) {
          animFrameRef.current = requestAnimationFrame(tick);
        } else {
          animFrameRef.current = null;
        }
      };
      animFrameRef.current = requestAnimationFrame(tick);
    },
    [presets, imageE1, imageE2],
  );

  // Matrix and determinant from the current image positions.
  // The j-th column of the matrix is the coordinate vector of T(e_j).
  const matrix = useMemo<number[][]>(
    () => [
      [imageE1.x, imageE2.x],
      [imageE1.y, imageE2.y],
    ],
    [imageE1, imageE2],
  );
  const det = useMemo(() => determinant(matrix), [matrix]);
  const detClass = useMemo(() => determinantSignClass(det), [det]);

  // Responsive square sizing.
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
        .range([innerH, 0]);

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
          .style('opacity', i === 0 ? 0.7 : 0.3);
        gridGroup
          .append('line')
          .attr('x1', 0)
          .attr('x2', innerW)
          .attr('y1', yScale(i))
          .attr('y2', yScale(i))
          .style('stroke', 'var(--color-viz-grid)')
          .style('stroke-width', i === 0 ? 1.25 : 0.5)
          .style('opacity', i === 0 ? 0.7 : 0.3);
      }

      // Axis labels.
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

      // ── Unit square outline ───────────────────────────────
      const unitSquare = [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
      ];
      g.append('polygon')
        .attr('class', 'unit-square')
        .attr(
          'points',
          unitSquare
            .map(([x, y]) => `${xScale(x)},${yScale(y)}`)
            .join(' '),
        )
        .style('fill', 'none')
        .style('stroke', 'var(--color-text-muted)')
        .style('stroke-width', 1.2)
        .style('stroke-dasharray', '4 3')
        .style('opacity', 0.55);

      // ── Image parallelogram ───────────────────────────────
      const verts: Vector[] = parallelogramVertices(
        [imageE1.x, imageE1.y],
        [imageE2.x, imageE2.y],
      );
      g.append('polygon')
        .attr('class', 'image-parallelogram')
        .attr(
          'points',
          verts.map(([x, y]) => `${xScale(x)},${yScale(y)}`).join(' '),
        )
        .style('fill', COLOR_PARALLELOGRAM)
        .style('fill-opacity', 0.18)
        .style('stroke', COLOR_PARALLELOGRAM)
        .style('stroke-width', 1.5)
        .style('stroke-opacity', 0.6);

      // ── Image arrows (T(e_1), T(e_2)) ─────────────────────
      const drawArrow = (
        image: ImageState,
        color: string,
        labelText: string,
        ariaLabel: string,
        onDrag: (newX: number, newY: number) => void,
      ) => {
        const x0 = xScale(0);
        const y0 = yScale(0);
        const x1 = xScale(image.x);
        const y1 = yScale(image.y);
        const grp = g.append('g').attr('class', 'arrow');

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

        // Arrowhead.
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

        // Label.
        grp
          .append('text')
          .attr('x', x1 + 10 * Math.sign(image.x || 1))
          .attr('y', y1 - 10 * Math.sign(image.y || 1))
          .attr('text-anchor', image.x < 0 ? 'end' : 'start')
          .style('fill', color)
          .style('font-size', '11px')
          .style('font-weight', '600')
          .style('pointer-events', 'none')
          .text(labelText);

        // Draggable tip.
        grp
          .append('circle')
          .attr('class', 'tip')
          .attr('cx', x1)
          .attr('cy', y1)
          .attr('r', 9)
          .style('fill', color)
          .style('stroke', 'var(--color-surface)')
          .style('stroke-width', 2)
          .style('cursor', 'grab')
          .attr('role', 'slider')
          .attr('tabindex', 0)
          .attr('aria-label', ariaLabel)
          .attr(
            'aria-valuetext',
            `${ariaLabel} at (${formatNumber(image.x)}, ${formatNumber(image.y)})`,
          )
          .call(
            d3
              .drag<SVGCircleElement, unknown>()
              .on('start', function () {
                // If a preset animation is in flight, cancel it so the user can take over.
                if (animFrameRef.current !== null) {
                  cancelAnimationFrame(animFrameRef.current);
                  animFrameRef.current = null;
                }
                d3.select(this).style('cursor', 'grabbing');
              })
              .on('drag', function (event) {
                const nx = clamp(
                  xScale.invert(event.x),
                  -VIEW_HALF,
                  VIEW_HALF,
                );
                const ny = clamp(
                  yScale.invert(event.y),
                  -VIEW_HALF,
                  VIEW_HALF,
                );
                onDrag(nx, ny);
              })
              .on('end', function () {
                d3.select(this).style('cursor', 'grab');
              }),
          );
      };

      drawArrow(
        imageE1,
        COLOR_E1,
        'T(e₁)',
        'image of e1',
        (nx, ny) => setImageE1({ x: nx, y: ny }),
      );
      drawArrow(
        imageE2,
        COLOR_E2,
        'T(e₂)',
        'image of e2',
        (nx, ny) => setImageE2({ x: nx, y: ny }),
      );
    },
    [imageE1, imageE2, svgSize],
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
            aria-label="Two draggable image arrows in the plane showing where T sends the standard basis e_1 and e_2"
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
              {presets.find((p) => p.id === presetId)?.description ?? ''}
            </p>
          </div>

          {showMatrix && (
            <div
              className="rounded px-3 py-2"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
              }}
              role="grid"
              aria-label="Matrix of the linear map in the standard basis"
            >
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                [T] in the standard basis
              </div>
              <div className="flex items-center gap-1 font-mono text-sm">
                <span
                  className="text-3xl font-light"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  [
                </span>
                <div
                  className="grid grid-cols-2 gap-x-3 gap-y-1 px-1"
                  role="rowgroup"
                >
                  <div
                    role="row"
                    className="contents"
                  >
                    <span
                      role="gridcell"
                      className="border-l-2 pl-2"
                      style={{ borderColor: COLOR_E1 }}
                    >
                      {formatNumber(matrix[0][0])}
                    </span>
                    <span
                      role="gridcell"
                      className="border-l-2 pl-2"
                      style={{ borderColor: COLOR_E2 }}
                    >
                      {formatNumber(matrix[0][1])}
                    </span>
                  </div>
                  <div
                    role="row"
                    className="contents"
                  >
                    <span
                      role="gridcell"
                      className="border-l-2 pl-2"
                      style={{ borderColor: COLOR_E1 }}
                    >
                      {formatNumber(matrix[1][0])}
                    </span>
                    <span
                      role="gridcell"
                      className="border-l-2 pl-2"
                      style={{ borderColor: COLOR_E2 }}
                    >
                      {formatNumber(matrix[1][1])}
                    </span>
                  </div>
                </div>
                <span
                  className="text-3xl font-light"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  ]
                </span>
              </div>
              <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Column 1 is the coordinate vector of T(e₁); column 2 is the coordinate vector of T(e₂). The matching colored border ties each column to its arrow in the canvas.
              </p>
            </div>
          )}

          {showDeterminant && (
            <div
              className="rounded px-3 py-2"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
              }}
            >
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Determinant
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-base" style={{ color: 'var(--color-text)' }}>
                  det = {formatNumber(det)}
                </span>
                <span className={`text-xs ${detClass.textClass}`}>
                  ({detClass.label})
                </span>
              </div>
              <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                |det| is the area of the parallelogram. Sign tracks orientation: positive when T preserves it, negative when reflected, zero when collapsed to a line.
              </p>
            </div>
          )}

          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Drag <span style={{ color: COLOR_E1, fontWeight: 600 }}>T(e₁)</span> or <span style={{ color: COLOR_E2, fontWeight: 600 }}>T(e₂)</span> to change the linear map; the matrix and the parallelogram update live. Selecting a preset animates the arrows to the target positions.
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
