/**
 * GramSchmidtExplorer — viz for Topic 31 (Inner Product & Hilbert Spaces).
 *
 * Step-by-step Gram-Schmidt orthonormalization in ℝ²:
 *  - 2 input vectors adjustable via sliders
 *  - "Next step" / "Play" / "Reset" controls
 *  - Shows projection being subtracted at each step
 *  - Readout: step description, intermediate vectors, norms
 */

import { useMemo, useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { useD3 } from './shared/useD3';
import { useResizeObserver } from './shared/useResizeObserver';
import { computeGramSchmidtSteps, type GramSchmidtStep } from '../../data/hilbert-spaces-data';

// ── Constants ─────────────────────────────────────────────────

const INPUT_COLORS = ['#93C5FD', '#FCA5A5', '#86EFAC']; // muted blue, red, green
const OUTPUT_COLORS = ['#2563EB', '#DC2626', '#059669']; // bold blue, red, green
const ORANGE = '#F97316';
const TEAL = '#0D9488';

const margin = { top: 24, right: 16, bottom: 32, left: 16 };
const extent = 3.2;

// ── Component ─────────────────────────────────────────────────

export default function GramSchmidtExplorer() {
  const { ref: containerRef, width: containerWidth } = useResizeObserver<HTMLDivElement>();
  const width = containerWidth || 600;
  const height = Math.min(width * 0.7, 420);

  const [v1, setV1] = useState<[number, number]>([2.0, 0.5]);
  const [v2, setV2] = useState<[number, number]>([1.0, 2.0]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const playRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const vectors = useMemo(() => [
    [v1[0], v1[1]],
    [v2[0], v2[1]],
  ], [v1, v2]);

  const steps = useMemo(() => computeGramSchmidtSteps(vectors), [vectors]);
  const maxStep = steps.length; // 0 = initial, 1 = after first, 2 = after second

  // Play animation
  useEffect(() => {
    if (isPlaying) {
      playRef.current = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev >= maxStep) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1200);
    }
    return () => {
      if (playRef.current) clearInterval(playRef.current);
    };
  }, [isPlaying, maxStep]);

  // D3 rendering
  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (width <= 0) return;

      const panelW = width - margin.left - margin.right;
      const panelH = height - margin.top - margin.bottom;

      const xScale = d3.scaleLinear().domain([-extent, extent]).range([0, panelW]);
      const yScale = d3.scaleLinear().domain([-extent, extent]).range([panelH, 0]);

      const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      // Grid
      for (let v = -3; v <= 3; v++) {
        g.append('line')
          .attr('x1', xScale(-extent)).attr('y1', yScale(v))
          .attr('x2', xScale(extent)).attr('y2', yScale(v))
          .style('stroke', '#f3f4f6').style('stroke-width', 0.5);
        g.append('line')
          .attr('x1', xScale(v)).attr('y1', yScale(-extent))
          .attr('x2', xScale(v)).attr('y2', yScale(extent))
          .style('stroke', '#f3f4f6').style('stroke-width', 0.5);
      }

      // Axes
      g.append('line')
        .attr('x1', xScale(-extent)).attr('y1', yScale(0))
        .attr('x2', xScale(extent)).attr('y2', yScale(0))
        .style('stroke', '#d1d5db').style('stroke-width', 1);
      g.append('line')
        .attr('x1', xScale(0)).attr('y1', yScale(-extent))
        .attr('x2', xScale(0)).attr('y2', yScale(extent))
        .style('stroke', '#d1d5db').style('stroke-width', 1);

      // Draw input vectors (always visible, muted)
      vectors.forEach((v, i) => {
        g.append('line')
          .attr('x1', xScale(0)).attr('y1', yScale(0))
          .attr('x2', xScale(v[0])).attr('y2', yScale(v[1]))
          .style('stroke', INPUT_COLORS[i])
          .style('stroke-width', 2)
          .style('stroke-dasharray', '4,3');

        g.append('circle')
          .attr('cx', xScale(v[0])).attr('cy', yScale(v[1]))
          .attr('r', 4)
          .style('fill', INPUT_COLORS[i]).style('stroke', '#fff').style('stroke-width', 1);

        g.append('text')
          .attr('x', xScale(v[0]) + 8).attr('y', yScale(v[1]) - 6)
          .style('font-size', '11px').style('fill', INPUT_COLORS[i]).style('font-weight', '600')
          .text(`v${i + 1}`);
      });

      // Draw completed ONB vectors and projections based on currentStep
      for (let s = 0; s < Math.min(currentStep, steps.length); s++) {
        const step = steps[s];

        // Draw projections being subtracted (dashed orange)
        for (const proj of step.projections) {
          if (Math.abs(proj.coeff) > 0.01) {
            g.append('line')
              .attr('x1', xScale(step.original[0])).attr('y1', yScale(step.original[1]))
              .attr('x2', xScale(step.original[0] - proj.projVector[0]))
              .attr('y2', yScale(step.original[1] - proj.projVector[1]))
              .style('stroke', ORANGE)
              .style('stroke-width', 1.5)
              .style('stroke-dasharray', '4,2');
          }
        }

        // Draw the resulting ONB vector (bold)
        if (step.normalized) {
          const e = step.normalized;
          g.append('line')
            .attr('x1', xScale(0)).attr('y1', yScale(0))
            .attr('x2', xScale(e[0])).attr('y2', yScale(e[1]))
            .style('stroke', OUTPUT_COLORS[s])
            .style('stroke-width', 3);

          g.append('circle')
            .attr('cx', xScale(e[0])).attr('cy', yScale(e[1]))
            .attr('r', 5)
            .style('fill', OUTPUT_COLORS[s]).style('stroke', '#fff').style('stroke-width', 1.5);

          g.append('text')
            .attr('x', xScale(e[0]) + 10).attr('y', yScale(e[1]) - 8)
            .style('font-size', '12px').style('fill', OUTPUT_COLORS[s]).style('font-weight', '700')
            .text(`e${s + 1}`);

          // Right-angle marker between consecutive ONB vectors
          if (s > 0 && steps[s - 1].normalized) {
            const prev = steps[s - 1].normalized!;
            const sz = 0.12;
            const mx = prev[0] * sz + e[0] * sz;
            const my = prev[1] * sz + e[1] * sz;
            g.append('path')
              .attr('d', `M${xScale(prev[0] * sz)},${yScale(prev[1] * sz)} L${xScale(mx)},${yScale(my)} L${xScale(e[0] * sz)},${yScale(e[1] * sz)}`)
              .style('fill', 'none')
              .style('stroke', TEAL)
              .style('stroke-width', 1.5);
          }
        }
      }

      // Title
      g.append('text')
        .attr('x', panelW / 2).attr('y', -8)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px').style('font-weight', '600').style('fill', '#374151')
        .text(currentStep === 0 ? 'Input vectors' : `Step ${currentStep} of ${maxStep}`);
    },
    [width, height, vectors, steps, currentStep],
  );

  const stepDescription = currentStep === 0
    ? 'Input vectors shown. Press Next to begin orthonormalization.'
    : currentStep <= steps.length
      ? (() => {
        const s = steps[currentStep - 1];
        if (!s.normalized) return `v${s.inputIndex + 1} is linearly dependent — skipped.`;
        const norm = Math.sqrt(s.orthogonalized.reduce((a, b) => a + b * b, 0));
        return `e${currentStep} = normalize(v${s.inputIndex + 1} − projections). ‖orthogonalized‖ = ${norm.toFixed(3)}`;
      })()
      : 'Gram-Schmidt complete. The output vectors form an orthonormal basis.';

  return (
    <div
      ref={containerRef}
      className="my-6 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900"
    >
      {/* Vector controls */}
      <div className="mb-3 flex flex-wrap items-center gap-4 text-sm">
        <label className="flex items-center gap-1.5">
          <span className="font-medium" style={{ color: INPUT_COLORS[0] }}>v₁:</span>
          <span className="text-xs text-gray-500">x</span>
          <input type="range" min={-3} max={3} step={0.1} value={v1[0]}
            onChange={(e) => { setV1([Number(e.target.value), v1[1]]); setCurrentStep(0); }}
            className="w-16 accent-blue-400" />
          <span className="text-xs text-gray-500">y</span>
          <input type="range" min={-3} max={3} step={0.1} value={v1[1]}
            onChange={(e) => { setV1([v1[0], Number(e.target.value)]); setCurrentStep(0); }}
            className="w-16 accent-blue-400" />
        </label>

        <label className="flex items-center gap-1.5">
          <span className="font-medium" style={{ color: INPUT_COLORS[1] }}>v₂:</span>
          <span className="text-xs text-gray-500">x</span>
          <input type="range" min={-3} max={3} step={0.1} value={v2[0]}
            onChange={(e) => { setV2([Number(e.target.value), v2[1]]); setCurrentStep(0); }}
            className="w-16 accent-red-400" />
          <span className="text-xs text-gray-500">y</span>
          <input type="range" min={-3} max={3} step={0.1} value={v2[1]}
            onChange={(e) => { setV2([v2[0], Number(e.target.value)]); setCurrentStep(0); }}
            className="w-16 accent-red-400" />
        </label>
      </div>

      {/* Step controls */}
      <div className="mb-3 flex items-center gap-3 text-sm">
        <button
          onClick={() => { setCurrentStep(0); setIsPlaying(false); }}
          className="rounded border border-gray-300 px-2.5 py-1 text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800"
        >Reset</button>
        <button
          onClick={() => setCurrentStep((p) => Math.min(p + 1, maxStep))}
          disabled={currentStep >= maxStep}
          className="rounded border border-gray-300 px-2.5 py-1 text-gray-600 hover:bg-gray-100 disabled:opacity-40 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800"
        >Next step</button>
        <button
          onClick={() => { setCurrentStep(0); setIsPlaying(true); }}
          className="rounded border border-gray-300 px-2.5 py-1 text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800"
        >Play</button>
      </div>

      {/* SVG */}
      <svg ref={svgRef} width={width} height={height} className="block" />

      {/* Step description */}
      <div className="mt-3 rounded bg-gray-50 p-3 text-sm dark:bg-gray-800">
        <p className="text-gray-700 dark:text-gray-300">{stepDescription}</p>
      </div>

      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        Gram-Schmidt subtracts the projection of each new vector onto the already-orthonormalized set, then normalizes. Orange dashed lines show the projections being removed.
      </p>
    </div>
  );
}
