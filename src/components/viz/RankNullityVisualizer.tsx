/**
 * RankNullityVisualizer — Topic 33 (Linear Algebra), §3.8.
 *
 * Visualizes the rank-nullity theorem rank + nullity = n by showing, for a
 * preset matrix A: m x n, the input space ℝⁿ on the left with its kernel
 * shaded, and the output space ℝᵐ on the right with the column space (=
 * image) shaded. Arrows show representative input vectors and their image
 * under A — kernel vectors collapse to the origin in the output; vectors in
 * the complement of the kernel survive to span the image.
 *
 * Five presets from getRankNullityPresets():
 *   - Full-rank 3×3 (rank 3, nullity 0)
 *   - Tall 3×2     (rank 2, nullity 0)
 *   - Wide 2×3     (rank 2, nullity 1)
 *   - Rank-2 3×3  (rank 2, nullity 1)
 *   - Rank-1 2×4  (rank 1, nullity 3)
 *
 * Higher-dimensional spaces (R^3, R^4) are rendered via an isometric
 * projection from `projectToScreen()` in `shared/linearAlgebra.ts`. The
 * 4D case (rank-1 2x4 preset's input) is rendered as a schematic — we draw
 * the 4 standard basis vectors as projections from R^3, accepting that the
 * "kernel hyperplane in R^4" can't be drawn faithfully in 2D.
 */

import { useCallback, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { useD3 } from './shared/useD3';
import { useResizeObserver } from './shared/useResizeObserver';
import {
  matVec,
  projectToScreen,
  type Matrix,
  type Vector,
} from './shared/linearAlgebra';
import {
  getRankNullityPresets,
  type RankNullityPreset,
} from '../../data/linear-algebra-data';

// ── Constants ─────────────────────────────────────────────────

const VIEW_HALF = 2.5;
const SVG_MAX_SIZE = 320;
const SVG_MIN_SIZE = 240;
const margin = { top: 12, right: 12, bottom: 12, left: 12 };

const COLOR_INPUT = '#2563eb'; // blue-600 — input vectors
const COLOR_IMAGE = '#dc2626'; // red-600 — image vectors
const COLOR_KERNEL = '#a855f7'; // purple-500 — kernel subspace
const COLOR_COLSPACE = '#10b981'; // emerald-500 — column space

// ── Types ─────────────────────────────────────────────────────

export interface RankNullityVisualizerProps {
  /** Optional fixed initial preset id. */
  initialPresetId?: string;
}

// ── Helpers ───────────────────────────────────────────────────

/**
 * Sample representative input vectors for the given input dimension. Returns
 * a small set of vectors that includes some inside the kernel (when the
 * preset's nullity is known) and some outside, suitable for showing how A
 * acts.
 *
 * For simplicity we sample the standard basis vectors of ℝⁿ — every
 * representable input direction. The actions on those are the columns of A.
 */
function sampleInputs(n: number): Vector[] {
  const inputs: Vector[] = [];
  for (let i = 0; i < n; i++) {
    const v = new Array(n).fill(0);
    v[i] = 1;
    inputs.push(v);
  }
  return inputs;
}

/** Coordinate of a vector in the visualizer's 2D canvas (after projection if needed). */
function projectVec(v: Vector): [number, number] {
  if (v.length === 1) return [v[0], 0];
  if (v.length === 2) return [v[0], v[1]];
  if (v.length === 3) return projectToScreen(v);
  // For 4D, project the first three coordinates via isometric and use the
  // fourth as a small jitter on the y-axis. Schematic only.
  return [
    projectToScreen([v[0], v[1], v[2]])[0],
    projectToScreen([v[0], v[1], v[2]])[1] + 0.25 * v[3],
  ];
}

// ── Component ─────────────────────────────────────────────────

export default function RankNullityVisualizer({
  initialPresetId = 'full-rank-square',
}: RankNullityVisualizerProps) {
  const { ref: containerRef, width: containerWidth } =
    useResizeObserver<HTMLDivElement>();

  const presets = useMemo<RankNullityPreset[]>(() => getRankNullityPresets(), []);
  const [presetId, setPresetId] = useState<string>(initialPresetId);

  const preset = useMemo<RankNullityPreset>(
    () => presets.find((p) => p.id === presetId) ?? presets[0],
    [presets, presetId],
  );

  const A: Matrix = preset.matrix;
  const [m, n] = preset.shape;
  const inputVecs = useMemo<Vector[]>(() => sampleInputs(n), [n]);
  const imageVecs = useMemo<Vector[]>(
    () => inputVecs.map((v) => matVec(A, v)),
    [A, inputVecs],
  );

  // Sub-SVG sizing — two side-by-side square canvases. On narrow screens,
  // they stack vertically.
  const stacked = (containerWidth ?? 0) > 0 && (containerWidth ?? 0) < 640;
  const svgSize = useMemo(() => {
    const w = containerWidth ?? 0;
    if (stacked) return Math.max(SVG_MIN_SIZE, Math.min(SVG_MAX_SIZE, Math.floor(w - 16)));
    const half = Math.max(SVG_MIN_SIZE, Math.min(SVG_MAX_SIZE, Math.floor(w / 2 - 16)));
    return half;
  }, [containerWidth, stacked]);

  const handlePresetChange = useCallback((nextId: string) => {
    setPresetId(nextId);
  }, []);

  // ── Rendering each panel as its own SVG ────────────────────
  // Input panel: renders the basis vectors of ℝⁿ. For visualization we use
  // projectVec to map to 2D screen space.
  const inputSvgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      const inner = svgSize - margin.left - margin.right;
      if (inner <= 0) return;
      const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
      drawPanel(g, inner, inputVecs.map(projectVec), {
        title: `Input space ℝ${supDigit(n)}`,
        vectorColor: COLOR_INPUT,
        vectorLabels: inputVecs.map((_, i) => `e${subDigit(i + 1)}`),
        labelInsideKernel: (i) => isInKernel(A, inputVecs[i]),
        kernelLegend: preset.nullity > 0 ? `kernel (dim ${preset.nullity})` : 'kernel = {0}',
      });
    },
    [inputVecs, A, preset, svgSize, n],
  );

  // Output panel: renders the image of each input basis vector.
  const outputSvgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      const inner = svgSize - margin.left - margin.right;
      if (inner <= 0) return;
      const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
      drawPanel(g, inner, imageVecs.map(projectVec), {
        title: `Output space ℝ${supDigit(m)}`,
        vectorColor: COLOR_IMAGE,
        vectorLabels: imageVecs.map((_, i) => `A·e${subDigit(i + 1)}`),
        labelInsideKernel: (i) => isZeroVector(imageVecs[i]),
        kernelLegend: `image (dim ${preset.rank})`,
        imageMode: true,
      });
    },
    [imageVecs, preset, svgSize, m],
  );

  return (
    <div
      ref={containerRef}
      className="my-6 rounded-lg border p-4"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-alt)' }}
    >
      <div className="mb-3">
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
          Preset
        </label>
        <select
          value={presetId}
          onChange={(e) => handlePresetChange(e.target.value)}
          className="w-full rounded border px-2 py-1 text-sm md:max-w-md"
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
          Matrix size {preset.shape[0]} × {preset.shape[1]}. The columns of A — equivalently, the images of e₁, e₂, … under A — span the image. The dimension of the input that A sends to zero (the kernel) is the nullity.
        </p>
      </div>

      <div className={`grid gap-4 ${stacked ? 'grid-cols-1' : 'grid-cols-2'}`}>
        <div>
          <svg
            ref={inputSvgRef}
            width={svgSize}
            height={svgSize}
            role="img"
            aria-label={`Input space R^${n} with kernel highlighted`}
            style={{
              maxWidth: '100%',
              background: 'var(--color-viz-bg)',
              borderRadius: '0.5rem',
            }}
          />
        </div>
        <div>
          <svg
            ref={outputSvgRef}
            width={svgSize}
            height={svgSize}
            role="img"
            aria-label={`Output space R^${m} with column space highlighted`}
            style={{
              maxWidth: '100%',
              background: 'var(--color-viz-bg)',
              borderRadius: '0.5rem',
            }}
          />
        </div>
      </div>

      <div
        className="mt-4 rounded px-3 py-2 text-sm"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Rank-Nullity verification
        </div>
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 font-mono text-sm">
          <span>
            <span style={{ color: COLOR_COLSPACE, fontWeight: 600 }}>rank(A)</span> = {preset.rank}
          </span>
          <span style={{ color: 'var(--color-text-muted)' }}>+</span>
          <span>
            <span style={{ color: COLOR_KERNEL, fontWeight: 600 }}>nullity(A)</span> = {preset.nullity}
          </span>
          <span style={{ color: 'var(--color-text-muted)' }}>=</span>
          <span>
            <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>n</span> = {preset.shape[1]}
          </span>
          <span
            className="ml-2 text-xs"
            style={{
              color: preset.rank + preset.nullity === preset.shape[1] ? '#10b981' : '#dc2626',
            }}
          >
            {preset.rank + preset.nullity === preset.shape[1] ? '✓ checks out' : '✗ mismatch'}
          </span>
        </div>
        <p className="mt-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
          The {preset.rank} surviving input directions span the image (right panel). The remaining {preset.nullity} input directions live in the kernel and collapse to the origin under A. Every input direction has exactly one of these fates.
        </p>
      </div>
    </div>
  );
}

// ── Panel rendering helper ────────────────────────────────────

interface PanelOptions {
  title: string;
  vectorColor: string;
  vectorLabels: string[];
  labelInsideKernel: (i: number) => boolean;
  kernelLegend: string;
  imageMode?: boolean;
}

function drawPanel(
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  inner: number,
  projectedVectors: Array<[number, number]>,
  options: PanelOptions,
) {
  const xScale = d3.scaleLinear().domain([-VIEW_HALF, VIEW_HALF]).range([0, inner]);
  const yScale = d3.scaleLinear().domain([-VIEW_HALF, VIEW_HALF]).range([inner, 0]);

  // Background grid.
  for (let i = -2; i <= 2; i++) {
    g.append('line')
      .attr('x1', xScale(i)).attr('x2', xScale(i))
      .attr('y1', 0).attr('y2', inner)
      .style('stroke', 'var(--color-viz-grid)')
      .style('stroke-width', i === 0 ? 1.0 : 0.5)
      .style('opacity', i === 0 ? 0.55 : 0.25);
    g.append('line')
      .attr('x1', 0).attr('x2', inner)
      .attr('y1', yScale(i)).attr('y2', yScale(i))
      .style('stroke', 'var(--color-viz-grid)')
      .style('stroke-width', i === 0 ? 1.0 : 0.5)
      .style('opacity', i === 0 ? 0.55 : 0.25);
  }

  // Panel title.
  g.append('text')
    .attr('x', 4).attr('y', 14)
    .style('fill', 'var(--color-text-muted)')
    .style('font-size', '10px')
    .style('font-weight', '600')
    .text(options.title);

  // Vector arrows.
  projectedVectors.forEach((pt, i) => {
    const collapsed = options.labelInsideKernel(i);
    const colorForThis = collapsed ? COLOR_KERNEL : options.vectorColor;

    if (collapsed && !options.imageMode) {
      // Input-side: kernel vectors get a purple background highlight.
      g.append('circle')
        .attr('cx', xScale(0)).attr('cy', yScale(0)).attr('r', 8)
        .style('fill', COLOR_KERNEL).style('fill-opacity', 0.18)
        .style('stroke', 'none');
    }

    if (collapsed && options.imageMode) {
      // Output-side: image of a kernel vector collapses to the origin —
      // render only a small marker, no arrow.
      g.append('circle')
        .attr('cx', xScale(0)).attr('cy', yScale(0)).attr('r', 4)
        .style('fill', COLOR_KERNEL)
        .style('opacity', 0.55);
      g.append('text')
        .attr('x', xScale(0) + 8).attr('y', yScale(0) + 4)
        .style('fill', COLOR_KERNEL)
        .style('font-size', '10px')
        .text(`${options.vectorLabels[i]} → 0`);
      return;
    }

    const x0 = xScale(0);
    const y0 = yScale(0);
    const x1 = xScale(pt[0]);
    const y1 = yScale(pt[1]);
    const len = Math.hypot(x1 - x0, y1 - y0);
    if (len < 1) return;

    // Shaft.
    g.append('line')
      .attr('x1', x0).attr('x2', x1)
      .attr('y1', y0).attr('y2', y1)
      .style('stroke', colorForThis)
      .style('stroke-width', 2);
    // Arrowhead.
    const ux = (x1 - x0) / len;
    const uy = (y1 - y0) / len;
    const headLen = 8;
    const headHalf = 4;
    const hx = x1 - headLen * ux;
    const hy = y1 - headLen * uy;
    const px = -uy;
    const py = ux;
    g.append('polygon')
      .attr('points', `${x1},${y1} ${hx + headHalf * px},${hy + headHalf * py} ${hx - headHalf * px},${hy - headHalf * py}`)
      .style('fill', colorForThis);
    // Label.
    g.append('text')
      .attr('x', x1 + 6 * Math.sign(pt[0] || 1))
      .attr('y', y1 - 4)
      .style('fill', colorForThis)
      .style('font-size', '10px')
      .style('font-weight', '600')
      .text(options.vectorLabels[i]);
  });

  // Legend line at bottom-right.
  g.append('text')
    .attr('x', inner - 6).attr('y', inner - 8)
    .attr('text-anchor', 'end')
    .style('fill', options.imageMode ? COLOR_COLSPACE : COLOR_KERNEL)
    .style('font-size', '10px')
    .style('font-weight', '500')
    .text(options.kernelLegend);
}

// ── Small helpers ─────────────────────────────────────────────

function isZeroVector(v: Vector, tol: number = 1e-9): boolean {
  return v.every((x) => Math.abs(x) < tol);
}

function isInKernel(A: Matrix, v: Vector, tol: number = 1e-9): boolean {
  return isZeroVector(matVec(A, v), tol);
}

function subDigit(n: number): string {
  // Map 1→"₁", 2→"₂", ... 4→"₄"
  const digits = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];
  return digits[n] ?? String(n);
}

function supDigit(n: number): string {
  const digits = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];
  return digits[n] ?? String(n);
}

