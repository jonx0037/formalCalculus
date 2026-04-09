/**
 * RKHSExplorer — viz for Topic 31 (Inner Product & Hilbert Spaces).
 *
 * Two-panel visualization:
 *  - Left: kernel function K(x, ·) for a selected center point
 *  - Right: representer theorem solution f* as a linear combination of kernel evals
 *
 * Interactions:
 *  - Kernel selector (Gaussian, polynomial d=2, d=3, linear)
 *  - Bandwidth slider σ (Gaussian only)
 *  - Click to add training points (up to 8)
 *  - Toggle: show/hide individual αᵢK(xᵢ, ·) basis functions
 */

import { useMemo, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { useD3 } from './shared/useD3';
import { useResizeObserver } from './shared/useResizeObserver';
import { getKernelSpec, KERNEL_IDS, solveRepresenter } from '../../data/hilbert-spaces-data';

// ── Constants ─────────────────────────────────────────────────

const PURPLE = '#7C3AED';
const BLUE = '#2563EB';
const RED = '#DC2626';
const BASIS_COLORS = ['#A78BFA', '#F9A8D4', '#93C5FD', '#86EFAC', '#FCD34D', '#FCA5A5', '#C4B5FD', '#67E8F9'];

const margin = { top: 24, right: 16, bottom: 32, left: 40 };
const GAP = 28;

// ── Component ─────────────────────────────────────────────────

interface TrainPoint {
  x: number;
  y: number;
}

export default function RKHSExplorer() {
  const { ref: containerRef, width: containerWidth } = useResizeObserver<HTMLDivElement>();
  const width = containerWidth || 600;
  const height = Math.min(width * 0.5, 340);

  const [kernelId, setKernelId] = useState<string>('gaussian');
  const [sigma, setSigma] = useState(1.0);
  const [trainPoints, setTrainPoints] = useState<TrainPoint[]>([
    { x: -2, y: 1.0 },
    { x: 0, y: -0.5 },
    { x: 1.5, y: 1.5 },
  ]);
  const [showBasis, setShowBasis] = useState(false);
  const [centerX, setCenterX] = useState(0); // center for left panel K(centerX, ·)

  const kernelSpec = useMemo(() => getKernelSpec(kernelId), [kernelId]);

  const kernelFn = useCallback(
    (x: number, y: number) => {
      const params = kernelId === 'gaussian' ? { sigma } : undefined;
      return kernelSpec.evaluate(x, y, params);
    },
    [kernelSpec, kernelId, sigma],
  );

  // Solve representer theorem
  const representer = useMemo(() => {
    if (trainPoints.length === 0) return { alpha: [], rkhsNormSq: 0 };
    const trainX = trainPoints.map((p) => p.x);
    const trainY = trainPoints.map((p) => p.y);
    return solveRepresenter(trainX, trainY, kernelFn, 0.01);
  }, [trainPoints, kernelFn]);

  // Sample curves for display
  const xDomain: [number, number] = [-4, 4];
  const numSamples = 200;
  const xs = useMemo(() => {
    const arr: number[] = [];
    for (let i = 0; i <= numSamples; i++) {
      arr.push(xDomain[0] + (xDomain[1] - xDomain[0]) * (i / numSamples));
    }
    return arr;
  }, []);

  // Left panel: K(centerX, ·)
  const kernelCurve = useMemo(
    () => xs.map((x) => ({ x, y: kernelFn(centerX, x) })),
    [xs, kernelFn, centerX],
  );

  // Right panel: f*(x) = Σ αᵢ K(xᵢ, x)
  const fStarCurve = useMemo(() => {
    return xs.map((x) => {
      let val = 0;
      for (let i = 0; i < trainPoints.length; i++) {
        val += representer.alpha[i] * kernelFn(trainPoints[i].x, x);
      }
      return { x, y: val };
    });
  }, [xs, trainPoints, representer.alpha, kernelFn]);

  // Individual basis functions
  const basisCurves = useMemo(() => {
    if (!showBasis) return [];
    return trainPoints.map((tp, i) => ({
      color: BASIS_COLORS[i % BASIS_COLORS.length],
      curve: xs.map((x) => ({
        x,
        y: representer.alpha[i] * kernelFn(tp.x, x),
      })),
    }));
  }, [xs, trainPoints, representer.alpha, kernelFn, showBasis]);

  // D3 rendering
  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (width <= 0) return;

      const panelW = (width - margin.left - margin.right - GAP) / 2;
      const panelH = height - margin.top - margin.bottom;

      // ── Left panel: Kernel K(centerX, ·) ──
      const kernelYMax = Math.max(1.1, ...kernelCurve.map((p) => Math.abs(p.y)));
      const xL = d3.scaleLinear().domain(xDomain).range([0, panelW]);
      const yL = d3.scaleLinear().domain([-kernelYMax * 0.3, kernelYMax]).range([panelH, 0]);

      const gL = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      // Axes
      gL.append('line')
        .attr('x1', xL(xDomain[0])).attr('y1', yL(0))
        .attr('x2', xL(xDomain[1])).attr('y2', yL(0))
        .style('stroke', '#d1d5db').style('stroke-width', 1);

      // Kernel curve
      const kernelLine = d3.line<{ x: number; y: number }>()
        .x((d) => xL(d.x)).y((d) => yL(d.y));

      gL.append('path')
        .datum(kernelCurve)
        .attr('d', kernelLine)
        .style('fill', 'none')
        .style('stroke', PURPLE)
        .style('stroke-width', 2.5);

      // Center point marker
      gL.append('circle')
        .attr('cx', xL(centerX)).attr('cy', yL(kernelFn(centerX, centerX)))
        .attr('r', 4)
        .style('fill', PURPLE).style('stroke', '#fff').style('stroke-width', 1.5);

      gL.append('text')
        .attr('x', panelW / 2).attr('y', -8)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px').style('font-weight', '600').style('fill', '#374151')
        .text(`K(${centerX.toFixed(1)}, ·)`);

      // y-axis label
      gL.append('text')
        .attr('x', -4).attr('y', yL(kernelYMax) + 14)
        .style('font-size', '10px').style('fill', '#6b7280')
        .text('K');

      // ── Right panel: f* and training points ──
      const allY = fStarCurve.map((p) => p.y);
      const fMax = Math.max(
        2,
        ...allY.map((v) => Math.abs(v)),
        ...trainPoints.map((p) => Math.abs(p.y)),
      ) * 1.2;

      const xR = d3.scaleLinear().domain(xDomain).range([0, panelW]);
      const yR = d3.scaleLinear().domain([-fMax, fMax]).range([panelH, 0]);

      const gR = svg.append('g')
        .attr('transform', `translate(${margin.left + panelW + GAP},${margin.top})`);

      // Axes
      gR.append('line')
        .attr('x1', xR(xDomain[0])).attr('y1', yR(0))
        .attr('x2', xR(xDomain[1])).attr('y2', yR(0))
        .style('stroke', '#d1d5db').style('stroke-width', 1);

      // Basis functions (behind f*)
      for (const { color, curve } of basisCurves) {
        const basisLine = d3.line<{ x: number; y: number }>()
          .x((d) => xR(d.x)).y((d) => yR(d.y));
        gR.append('path')
          .datum(curve)
          .attr('d', basisLine)
          .style('fill', 'none')
          .style('stroke', color)
          .style('stroke-width', 1.5)
          .style('stroke-dasharray', '4,2')
          .style('opacity', 0.7);
      }

      // f* curve
      const fLine = d3.line<{ x: number; y: number }>()
        .x((d) => xR(d.x)).y((d) => yR(d.y));

      gR.append('path')
        .datum(fStarCurve)
        .attr('d', fLine)
        .style('fill', 'none')
        .style('stroke', BLUE)
        .style('stroke-width', 2.5);

      // Training points
      for (const tp of trainPoints) {
        gR.append('circle')
          .attr('cx', xR(tp.x)).attr('cy', yR(tp.y))
          .attr('r', 5)
          .style('fill', RED).style('stroke', '#fff').style('stroke-width', 1.5);
      }

      gR.append('text')
        .attr('x', panelW / 2).attr('y', -8)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px').style('font-weight', '600').style('fill', '#374151')
        .text('f* = Σ αᵢ K(xᵢ, ·)');

      // Click handler to add/remove training points
      const clickRect = gR.append('rect')
        .attr('x', 0).attr('y', 0)
        .attr('width', panelW).attr('height', panelH)
        .style('fill', 'transparent')
        .style('cursor', 'crosshair');

      clickRect.on('click', (event: MouseEvent) => {
        const [mx, my] = d3.pointer(event);
        const dataX = xR.invert(mx);
        const dataY = yR.invert(my);

        // Check if clicking near an existing point (remove it)
        const threshold = 0.3;
        const nearIdx = trainPoints.findIndex(
          (tp) => Math.abs(tp.x - dataX) < threshold && Math.abs(tp.y - dataY) < (fMax * threshold / 4),
        );
        if (nearIdx >= 0) {
          setTrainPoints((pts) => pts.filter((_, i) => i !== nearIdx));
        } else if (trainPoints.length < 8) {
          setTrainPoints((pts) => [...pts, { x: dataX, y: dataY }]);
        }
      });
    },
    [width, height, kernelCurve, fStarCurve, basisCurves, trainPoints, centerX, kernelFn],
  );

  return (
    <div
      ref={containerRef}
      className="my-6 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900"
    >
      {/* Controls */}
      <div className="mb-3 flex flex-wrap items-center gap-4 text-sm">
        <label className="flex items-center gap-1.5">
          <span className="font-medium text-gray-600 dark:text-gray-400">Kernel:</span>
          <select
            value={kernelId}
            onChange={(e) => setKernelId(e.target.value)}
            className="rounded border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
          >
            {KERNEL_IDS.map((id) => (
              <option key={id} value={id}>{getKernelSpec(id).name}</option>
            ))}
          </select>
        </label>

        {kernelId === 'gaussian' && (
          <label className="flex items-center gap-1.5">
            <span className="font-medium text-gray-600 dark:text-gray-400">σ:</span>
            <input type="range" min={0.1} max={5} step={0.1} value={sigma}
              onChange={(e) => setSigma(Number(e.target.value))}
              className="w-24 accent-purple-500" />
            <span className="w-8 text-right font-mono text-gray-700 dark:text-gray-300">{sigma.toFixed(1)}</span>
          </label>
        )}

        <label className="flex items-center gap-1.5">
          <span className="font-medium text-gray-600 dark:text-gray-400">Center:</span>
          <input type="range" min={-3} max={3} step={0.1} value={centerX}
            onChange={(e) => setCenterX(Number(e.target.value))}
            className="w-20 accent-purple-500" />
          <span className="w-8 text-right font-mono text-gray-700 dark:text-gray-300">{centerX.toFixed(1)}</span>
        </label>

        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={showBasis}
            onChange={(e) => setShowBasis(e.target.checked)}
            className="accent-purple-500" />
          <span className="text-gray-600 dark:text-gray-400">Show basis</span>
        </label>
      </div>

      {/* SVG */}
      <svg ref={svgRef} width={width} height={height} className="block" />

      {/* Info panel */}
      <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 rounded bg-gray-50 p-3 text-sm dark:bg-gray-800 sm:grid-cols-3">
        <div>
          <span className="font-medium text-gray-500 dark:text-gray-400">Kernel: </span>
          <span className="text-gray-700 dark:text-gray-300">{kernelSpec.name}</span>
        </div>
        <div>
          <span className="font-medium text-gray-500 dark:text-gray-400">Training: </span>
          <span className="font-mono text-gray-700 dark:text-gray-300">{trainPoints.length} points</span>
        </div>
        <div>
          <span className="font-medium text-gray-500 dark:text-gray-400">‖f*‖²<sub>H</sub> = </span>
          <span className="font-mono text-purple-600 dark:text-purple-400">
            {representer.rkhsNormSq.toFixed(4)}
          </span>
        </div>
      </div>

      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        Click in the right panel to add training points (up to 8). Click near an existing point to remove it. The representer theorem guarantees f* lives in the span of kernel evaluations at training points.
      </p>
    </div>
  );
}
