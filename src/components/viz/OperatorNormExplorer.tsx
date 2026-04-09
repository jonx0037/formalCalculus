/**
 * OperatorNormExplorer — flagship viz for Topic 30 (Normed & Banach Spaces).
 *
 * Shows how a 2×2 linear operator maps the unit ball under different ℓ^p norms:
 *  - Left panel: input unit ball (diamond p=1, circle p=2, square p=∞)
 *  - Right panel: image of the unit ball under A, with operator-norm circle
 *  - Matrix sliders + preset dropdown
 *  - Info panel: operator norm, singular values, condition number
 */

import { useCallback, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { useD3 } from './shared/useD3';
import { useResizeObserver } from './shared/useResizeObserver';
import {
  createLpNorm,
  computeOperatorNorm,
  type OperatorNormResult,
} from './shared/functional-analysis';
import {
  getMatrixPreset,
  MATRIX_PRESET_IDS,
  type MatrixPresetId,
} from '../../data/banach-spaces-data';

// ── Constants ─────────────────────────────────────────────────

const NORM_OPTIONS = [
  { value: 1, label: 'ℓ¹ (diamond)' },
  { value: 2, label: 'ℓ² (circle)' },
  { value: Infinity, label: 'ℓ∞ (square)' },
] as const;

const LIGHT_BLUE = '#93C5FD';
const LIGHT_GREEN = '#86EFAC';
const RED = '#DC2626';
const ORANGE = '#F97316';
const BLUE_STROKE = '#2563EB';
const GREEN_STROKE = '#059669';

const margin = { top: 20, right: 16, bottom: 32, left: 16 };
const GAP = 24; // horizontal gap between the two panels

// ── Component ─────────────────────────────────────────────────

export default function OperatorNormExplorer() {
  const { ref: containerRef, width: containerWidth } = useResizeObserver<HTMLDivElement>();
  const width = containerWidth || 600;
  const height = Math.min(width * 0.5, 360);

  // State
  const [presetId, setPresetId] = useState<MatrixPresetId>('singular');
  const [entries, setEntries] = useState<[number, number, number, number]>([2, 1, 0, 1]);
  const [normP, setNormP] = useState<number>(2);

  // Derived data
  const inputNorm = useMemo(() => createLpNorm(normP), [normP]);
  const inputBall = useMemo(() => inputNorm.sampleUnitBall(500), [inputNorm]);

  const imageBall = useMemo(() => {
    const [a11, a12, a21, a22] = entries;
    return inputBall.map((pt) => ({
      x: a11 * pt.x + a12 * pt.y,
      y: a21 * pt.x + a22 * pt.y,
    }));
  }, [entries, inputBall]);

  const opResult: OperatorNormResult = useMemo(
    () => computeOperatorNorm(entries, normP),
    [entries, normP],
  );

  // Handlers
  const handlePresetChange = useCallback((id: MatrixPresetId) => {
    setPresetId(id);
    setEntries(getMatrixPreset(id).entries as [number, number, number, number]);
  }, []);

  const handleEntryChange = useCallback(
    (idx: number, val: number) => {
      const next = [...entries] as [number, number, number, number];
      next[idx] = val;
      setEntries(next);
      setPresetId('singular'); // deselect preset when manually changing
    },
    [entries],
  );

  // D3 rendering
  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (width <= 0) return;

      const panelW = (width - margin.left - margin.right - GAP) / 2;
      const panelH = height - margin.top - margin.bottom;

      // Compute domains
      const inputExtent = 1.3;
      const imageExtentX = Math.max(
        ...imageBall.map((p) => Math.abs(p.x)),
        opResult.norm,
        0.5,
      ) * 1.2;
      const imageExtentY = Math.max(
        ...imageBall.map((p) => Math.abs(p.y)),
        opResult.norm,
        0.5,
      ) * 1.2;
      const imageExtent = Math.max(imageExtentX, imageExtentY);

      // Scales — left panel
      const xL = d3.scaleLinear().domain([-inputExtent, inputExtent]).range([0, panelW]);
      const yL = d3.scaleLinear().domain([-inputExtent, inputExtent]).range([panelH, 0]);

      // Scales — right panel
      const xR = d3.scaleLinear().domain([-imageExtent, imageExtent]).range([0, panelW]);
      const yR = d3.scaleLinear().domain([-imageExtent, imageExtent]).range([panelH, 0]);

      // Left panel group
      const gL = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      // Grid lines
      gL.append('line')
        .attr('x1', xL(0)).attr('y1', yL(-inputExtent))
        .attr('x2', xL(0)).attr('y2', yL(inputExtent))
        .style('stroke', '#e5e7eb').style('stroke-width', 1);
      gL.append('line')
        .attr('x1', xL(-inputExtent)).attr('y1', yL(0))
        .attr('x2', xL(inputExtent)).attr('y2', yL(0))
        .style('stroke', '#e5e7eb').style('stroke-width', 1);

      // Input unit ball
      const ballLine = d3.line<{ x: number; y: number }>()
        .x((d) => xL(d.x))
        .y((d) => yL(d.y))
        .curve(d3.curveLinearClosed);

      gL.append('path')
        .datum(inputBall)
        .attr('d', ballLine)
        .style('fill', LIGHT_BLUE)
        .style('fill-opacity', 0.4)
        .style('stroke', BLUE_STROKE)
        .style('stroke-width', 1.5);

      gL.append('text')
        .attr('x', panelW / 2)
        .attr('y', -6)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('font-weight', '600')
        .style('fill', '#374151')
        .text('Input: unit ball');

      // Right panel group
      const gR = svg
        .append('g')
        .attr('transform', `translate(${margin.left + panelW + GAP},${margin.top})`);

      // Grid lines
      gR.append('line')
        .attr('x1', xR(0)).attr('y1', yR(-imageExtent))
        .attr('x2', xR(0)).attr('y2', yR(imageExtent))
        .style('stroke', '#e5e7eb').style('stroke-width', 1);
      gR.append('line')
        .attr('x1', xR(-imageExtent)).attr('y1', yR(0))
        .attr('x2', xR(imageExtent)).attr('y2', yR(0))
        .style('stroke', '#e5e7eb').style('stroke-width', 1);

      // Image of the unit ball
      const imageLine = d3.line<{ x: number; y: number }>()
        .x((d) => xR(d.x))
        .y((d) => yR(d.y))
        .curve(d3.curveLinearClosed);

      gR.append('path')
        .datum(imageBall)
        .attr('d', imageLine)
        .style('fill', LIGHT_GREEN)
        .style('fill-opacity', 0.4)
        .style('stroke', GREEN_STROKE)
        .style('stroke-width', 1.5);

      // Operator-norm circle (dashed red)
      if (opResult.norm > 1e-6) {
        const circlePoints: Array<{ x: number; y: number }> = [];
        for (let i = 0; i <= 100; i++) {
          const theta = (2 * Math.PI * i) / 100;
          circlePoints.push({
            x: opResult.norm * Math.cos(theta),
            y: opResult.norm * Math.sin(theta),
          });
        }
        const circleLine = d3.line<{ x: number; y: number }>()
          .x((d) => xR(d.x))
          .y((d) => yR(d.y));

        gR.append('path')
          .datum(circlePoints)
          .attr('d', circleLine)
          .style('fill', 'none')
          .style('stroke', RED)
          .style('stroke-width', 1.5)
          .style('stroke-dasharray', '6,4')
          .style('opacity', 0.7);
      }

      // Singular value directions (orange arrows) for p=2
      if (normP === 2 && opResult.singularValues[0] > 1e-6) {
        const [vx, vy] = opResult.maximizingDirection;
        const [a11, a12, a21, a22] = entries;
        const imgX = a11 * vx + a12 * vy;
        const imgY = a21 * vx + a22 * vy;

        // Direction arrow in the image
        gR.append('line')
          .attr('x1', xR(0)).attr('y1', yR(0))
          .attr('x2', xR(imgX)).attr('y2', yR(imgY))
          .style('stroke', ORANGE)
          .style('stroke-width', 2)
          .style('marker-end', 'url(#arrow-orange)');

        // Arrow marker definition
        svg.append('defs')
          .append('marker')
          .attr('id', 'arrow-orange')
          .attr('viewBox', '0 0 10 10')
          .attr('refX', 8).attr('refY', 5)
          .attr('markerWidth', 6).attr('markerHeight', 6)
          .attr('orient', 'auto-start-reverse')
          .append('path')
          .attr('d', 'M 0 0 L 10 5 L 0 10 z')
          .style('fill', ORANGE);
      }

      gR.append('text')
        .attr('x', panelW / 2)
        .attr('y', -6)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('font-weight', '600')
        .style('fill', '#374151')
        .text('Image: A · (unit ball)');
    },
    [width, height, inputBall, imageBall, opResult, normP, entries],
  );

  const preset = getMatrixPreset(presetId);
  const condNum = opResult.singularValues[1] > 1e-12
    ? opResult.singularValues[0] / opResult.singularValues[1]
    : Infinity;

  return (
    <div
      ref={containerRef}
      className="my-6 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900"
    >
      {/* Controls row */}
      <div className="mb-3 flex flex-wrap items-center gap-4 text-sm">
        {/* Preset selector */}
        <label className="flex items-center gap-1.5">
          <span className="font-medium text-gray-600 dark:text-gray-400">Preset:</span>
          <select
            value={presetId}
            onChange={(e) => handlePresetChange(e.target.value as MatrixPresetId)}
            className="rounded border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
          >
            {MATRIX_PRESET_IDS.map((id) => (
              <option key={id} value={id}>
                {getMatrixPreset(id).label}
              </option>
            ))}
          </select>
        </label>

        {/* Norm selector */}
        <label className="flex items-center gap-1.5">
          <span className="font-medium text-gray-600 dark:text-gray-400">Norm:</span>
          <select
            value={normP}
            onChange={(e) => setNormP(Number(e.target.value))}
            className="rounded border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
          >
            {NORM_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Matrix entry sliders */}
      <div className="mb-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
        {(['a₁₁', 'a₁₂', 'a₂₁', 'a₂₂'] as const).map((label, idx) => (
          <label key={label} className="flex items-center gap-1.5">
            <span className="w-7 font-mono text-gray-500 dark:text-gray-400">{label}</span>
            <input
              type="range"
              min={-3}
              max={3}
              step={0.1}
              value={entries[idx]}
              onChange={(e) => handleEntryChange(idx, parseFloat(e.target.value))}
              className="h-1.5 flex-1 cursor-pointer"
            />
            <span className="w-9 text-right font-mono text-gray-700 dark:text-gray-300">
              {entries[idx].toFixed(1)}
            </span>
          </label>
        ))}
      </div>

      {/* SVG */}
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="block"
      />

      {/* Info panel */}
      <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 rounded bg-gray-50 p-3 text-sm dark:bg-gray-800 sm:grid-cols-4">
        <div>
          <span className="font-medium text-gray-500 dark:text-gray-400">‖A‖ₒₚ = </span>
          <span className="font-mono font-semibold text-red-600 dark:text-red-400">
            {opResult.norm.toFixed(4)}
          </span>
        </div>
        <div>
          <span className="font-medium text-gray-500 dark:text-gray-400">σ₁ = </span>
          <span className="font-mono text-gray-700 dark:text-gray-300">
            {opResult.singularValues[0].toFixed(4)}
          </span>
        </div>
        <div>
          <span className="font-medium text-gray-500 dark:text-gray-400">σ₂ = </span>
          <span className="font-mono text-gray-700 dark:text-gray-300">
            {opResult.singularValues[1].toFixed(4)}
          </span>
        </div>
        <div>
          <span className="font-medium text-gray-500 dark:text-gray-400">κ(A) = </span>
          <span className="font-mono text-gray-700 dark:text-gray-300">
            {Number.isFinite(condNum) ? condNum.toFixed(2) : '∞'}
          </span>
        </div>
      </div>

      {/* Description */}
      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        {preset.description}
      </p>
    </div>
  );
}
