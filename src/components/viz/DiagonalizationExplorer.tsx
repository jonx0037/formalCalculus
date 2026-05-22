/**
 * DiagonalizationExplorer — Topic 34 §4.
 *
 * Visualizes A = P·D·P⁻¹ as the three-step composition:
 *   x ↦ P⁻¹·x       (change to eigenbasis)
 *   ↦ D·P⁻¹·x       (scale along eigendirections)
 *   ↦ P·D·P⁻¹·x = A·x  (change back to standard basis)
 *
 * The user picks (or accepts) a diagonalizable 2×2 matrix, drags a probe
 * vector x, and steps through the three stages — watching the probe move
 * from x → P⁻¹·x → D·P⁻¹·x → A·x while the eigenbasis grid transforms in
 * parallel.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useD3 } from './shared/useD3';
import { useResizeObserver } from './shared/useResizeObserver';
import {
  diagonalize,
  matVec,
  type Matrix,
  type Vector,
} from './shared/linearAlgebra';
import {
  getEigenvalueMatrixPresets,
  type EigenvalueMatrixPreset,
} from '../../data/eigenvalues-eigenvectors-data';

// ── Constants ─────────────────────────────────────────────────

const VIEW_HALF = 4;
const SVG_MAX_SIZE = 420;
const SVG_MIN_SIZE = 300;
const margin = { top: 14, right: 14, bottom: 14, left: 14 };

const COLOR_PROBE = '#dc2626'; // red-600
const COLOR_EIGEN_1 = '#2563eb'; // blue-600
const COLOR_EIGEN_2 = '#059669'; // emerald-600

type Stage = 0 | 1 | 2 | 3;
const STAGE_LABELS: Record<Stage, string> = {
  0: 'x',
  1: 'P⁻¹·x',
  2: 'D·P⁻¹·x',
  3: 'P·D·P⁻¹·x = A·x',
};

// ── Helpers ───────────────────────────────────────────────────

function formatNumber(n: number, digits = 2): string {
  if (!Number.isFinite(n)) return '—';
  if (Math.abs(n) < 1e-9) return '0.00';
  return n.toFixed(digits);
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function renderMatrix(M: Matrix): string {
  return M.map((row) => row.map((v) => formatNumber(v).padStart(7)).join(' ')).join('\n');
}

// ── Component ─────────────────────────────────────────────────

export interface DiagonalizationExplorerProps {
  initialMatrix?: [[number, number], [number, number]];
}

export default function DiagonalizationExplorer({
  initialMatrix = [[4, -2], [1, 1]],
}: DiagonalizationExplorerProps = {}) {
  const { ref: containerRef, width: containerWidth } = useResizeObserver<HTMLDivElement>();

  const presets = useMemo<EigenvalueMatrixPreset[]>(
    () =>
      getEigenvalueMatrixPresets().filter(
        (p) =>
          p.matrix.length === 2 &&
          p.classification !== 'repeated-defective' &&
          p.classification !== 'complex-pair',
      ),
    [],
  );

  const [matrix, setMatrix] = useState<[[number, number], [number, number]]>(initialMatrix);
  const [presetId, setPresetId] = useState<string>('distinct-2d');
  const [probe, setProbe] = useState<[number, number]>([1.5, 1]);
  const [stage, setStage] = useState<Stage>(0);

  // Compute diagonalization
  const decomp = useMemo(() => {
    try {
      return diagonalize(matrix);
    } catch {
      return null;
    }
  }, [matrix]);

  const stages: { name: string; pt: Vector; label: string }[] = useMemo(() => {
    if (!decomp) return [];
    const x: Vector = [probe[0], probe[1]];
    const stage1 = matVec(decomp.Pinv, x);
    const stage2 = matVec(decomp.D, stage1);
    const stage3 = matVec(decomp.P, stage2);
    return [
      { name: STAGE_LABELS[0], pt: x, label: 'x' },
      { name: STAGE_LABELS[1], pt: stage1, label: 'P⁻¹·x' },
      { name: STAGE_LABELS[2], pt: stage2, label: 'D·P⁻¹·x' },
      { name: STAGE_LABELS[3], pt: stage3, label: 'A·x' },
    ];
  }, [decomp, probe]);

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
      setStage(0);
    },
    [presets],
  );

  // Track in-flight play-through timers so we can cancel on re-trigger or
  // unmount — otherwise overlapping clicks queue conflicting setStage calls
  // and a navigation-away mid-animation produces "setState on unmounted
  // component" warnings.
  const playTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const cancelPlay = useCallback(() => {
    for (const id of playTimersRef.current) clearTimeout(id);
    playTimersRef.current = [];
  }, []);

  const handlePlayAll = useCallback(() => {
    cancelPlay();
    setStage(0);
    playTimersRef.current = [
      setTimeout(() => setStage(1), 700),
      setTimeout(() => setStage(2), 1700),
      setTimeout(() => setStage(3), 2700),
    ];
  }, [cancelPlay]);

  useEffect(() => cancelPlay, [cancelPlay]);

  // ── Layout ──────────────────────────────────────────────────
  const svgSize = useMemo(() => {
    if (!containerWidth) return SVG_MAX_SIZE;
    return Math.max(SVG_MIN_SIZE, Math.min(SVG_MAX_SIZE, Math.floor(containerWidth * 0.5)));
  }, [containerWidth]);

  // Eigenvector directions (for the eigenbasis grid)
  const eigenCols: Vector[] = useMemo(() => {
    if (!decomp) return [];
    return [
      [decomp.P[0][0], decomp.P[1][0]],
      [decomp.P[0][1], decomp.P[1][1]],
    ];
  }, [decomp]);

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

      // Standard grid (light)
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

      // Eigenvector lines extending across the canvas
      if (eigenCols.length === 2) {
        eigenCols.forEach((v, idx) => {
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
            .style('stroke-width', 1.5)
            .style('opacity', 0.5)
            .style('stroke-dasharray', '4 3');
        });
      }

      // Trace from x to current stage as a series of arrows.
      const tracePoints = stages.slice(0, stage + 1).map((s) => s.pt);
      for (let i = 0; i < tracePoints.length - 1; i++) {
        const from = tracePoints[i];
        const to = tracePoints[i + 1];
        const x1 = xScale(clamp(from[0], -VIEW_HALF, VIEW_HALF));
        const y1 = yScale(clamp(from[1], -VIEW_HALF, VIEW_HALF));
        const x2 = xScale(clamp(to[0], -VIEW_HALF, VIEW_HALF));
        const y2 = yScale(clamp(to[1], -VIEW_HALF, VIEW_HALF));
        g.append('line')
          .attr('x1', x1)
          .attr('y1', y1)
          .attr('x2', x2)
          .attr('y2', y2)
          .style('stroke', 'var(--color-text-muted)')
          .style('stroke-width', 1.5)
          .style('stroke-dasharray', '5 4')
          .style('opacity', 0.7);
      }

      // Plot each stage point with a label
      const visibleStages = stages.slice(0, stage + 1);
      visibleStages.forEach((s, idx) => {
        const isCurrent = idx === stage;
        const px = xScale(clamp(s.pt[0], -VIEW_HALF, VIEW_HALF));
        const py = yScale(clamp(s.pt[1], -VIEW_HALF, VIEW_HALF));
        // Arrow from origin
        g.append('line')
          .attr('x1', xScale(0))
          .attr('y1', yScale(0))
          .attr('x2', px)
          .attr('y2', py)
          .style('stroke', COLOR_PROBE)
          .style('stroke-width', isCurrent ? 2.5 : 1.2)
          .style('opacity', isCurrent ? 1 : 0.4);
        g.append('circle')
          .attr('cx', px)
          .attr('cy', py)
          .attr('r', isCurrent ? 7 : 4)
          .style('fill', COLOR_PROBE)
          .style('opacity', isCurrent ? 1 : 0.5);
        // Label
        g.append('text')
          .attr('x', px + 8 * Math.sign(s.pt[0] || 1))
          .attr('y', py - 8 * Math.sign(s.pt[1] || 1))
          .attr('text-anchor', s.pt[0] < 0 ? 'end' : 'start')
          .style('fill', COLOR_PROBE)
          .style('font-size', '11px')
          .style('font-weight', isCurrent ? '700' : '500')
          .style('opacity', isCurrent ? 1 : 0.6)
          .text(s.label);
      });

      // Draggable handle for the starting probe (stage 0 always shown for drag)
      const x0 = xScale(probe[0]);
      const y0 = yScale(probe[1]);
      g.append('circle')
        .attr('cx', x0)
        .attr('cy', y0)
        .attr('r', 10)
        .style('fill', 'transparent')
        .style('stroke', COLOR_PROBE)
        .style('stroke-width', 1.5)
        .style('cursor', 'grab')
        .attr('role', 'slider')
        .attr('aria-label', 'probe vector x')
        .call(
          d3
            .drag<SVGCircleElement, unknown>()
            .on('drag', function (event) {
              const nx = clamp(xScale.invert(event.x), -VIEW_HALF + 0.2, VIEW_HALF - 0.2);
              const ny = clamp(yScale.invert(event.y), -VIEW_HALF + 0.2, VIEW_HALF - 0.2);
              setProbe([nx, ny]);
            }),
        );
    },
    [matrix, svgSize, stage, probe, eigenCols, stages],
  );

  // ── Render ──────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      className="my-6 rounded-lg border p-4"
      style={{ background: 'var(--color-viz-surface)', borderColor: 'var(--color-viz-border)' }}
    >
      {!decomp ? (
        <div className="text-sm p-4" style={{ color: 'var(--color-text-muted)' }}>
          The selected matrix is not diagonalizable (defective or complex spectrum). Choose a different preset.
        </div>
      ) : (
        <div className="flex flex-col gap-4 md:flex-row">
          <div className="flex justify-center md:justify-start">
            <svg
              ref={svgRef}
              width={svgSize}
              height={svgSize}
              style={{ background: 'var(--color-viz-canvas)' }}
              aria-label="Diagonalization explorer — three-step decomposition of A as P D P inverse"
            />
          </div>

          <div className="flex-1 min-w-0">
            {/* Preset */}
            <label className="block mb-3">
              <span className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>
                Preset (diagonalizable matrices only)
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

            {/* Stage buttons */}
            <div className="mb-3">
              <span className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>
                Decomposition stage
              </span>
              <div className="flex flex-wrap gap-1.5 text-xs">
                {([0, 1, 2, 3] as Stage[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStage(s)}
                    className="rounded px-2 py-1"
                    style={{
                      background: stage === s ? 'var(--color-accent-bg)' : 'var(--color-surface)',
                      color: stage === s ? 'var(--color-accent-text)' : 'var(--color-text)',
                      border: '1px solid var(--color-viz-border)',
                      fontWeight: stage === s ? 600 : 400,
                    }}
                    aria-pressed={stage === s}
                  >
                    {s === 0 ? 'x' : `Step ${s}`}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handlePlayAll}
                  className="rounded px-2 py-1"
                  style={{
                    background: 'var(--color-surface)',
                    color: 'var(--color-text)',
                    border: '1px solid var(--color-viz-border)',
                  }}
                >
                  ▶ Play all
                </button>
              </div>
            </div>

            {/* Current stage readout */}
            <div className="mb-3 rounded p-2 text-sm" style={{ background: 'var(--color-viz-info-bg)' }}>
              <div style={{ color: 'var(--color-text)', fontWeight: 600 }}>
                Current: {stages[stage]?.name}
              </div>
              <div className="mt-1 font-mono" style={{ color: 'var(--color-text-muted)' }}>
                = ({formatNumber(stages[stage]?.pt[0] ?? 0)}, {formatNumber(stages[stage]?.pt[1] ?? 0)})
              </div>
            </div>

            {/* P, D, P^-1 readout */}
            <div className="grid grid-cols-1 gap-2 text-xs font-mono">
              <div>
                <div className="font-semibold mb-1" style={{ color: 'var(--color-text-muted)', fontFamily: 'inherit' }}>
                  P (eigenvectors as columns)
                </div>
                <pre
                  className="rounded p-2 m-0"
                  style={{ background: 'var(--color-viz-info-bg)', color: 'var(--color-text)' }}
                >{renderMatrix(decomp.P)}</pre>
              </div>
              <div>
                <div className="font-semibold mb-1" style={{ color: 'var(--color-text-muted)', fontFamily: 'inherit' }}>
                  D (eigenvalues on diagonal)
                </div>
                <pre
                  className="rounded p-2 m-0"
                  style={{ background: 'var(--color-viz-info-bg)', color: 'var(--color-text)' }}
                >{renderMatrix(decomp.D)}</pre>
              </div>
              <div>
                <div className="font-semibold mb-1" style={{ color: 'var(--color-text-muted)', fontFamily: 'inherit' }}>
                  P⁻¹
                </div>
                <pre
                  className="rounded p-2 m-0"
                  style={{ background: 'var(--color-viz-info-bg)', color: 'var(--color-text)' }}
                >{renderMatrix(decomp.Pinv)}</pre>
              </div>
            </div>

            <div className="mt-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
              Drag the open red circle to move x. Eigenvector lines are dashed (blue, emerald).
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
