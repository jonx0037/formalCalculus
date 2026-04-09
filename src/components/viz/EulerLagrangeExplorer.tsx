/**
 * EulerLagrangeExplorer — flagship viz for Topic 32 (Calculus of Variations).
 *
 * Visualizes the Euler-Lagrange equation in action:
 *  - Left panel: candidate curve y(x) with draggable control points,
 *    perturbation y + εη overlay, and analytic E-L solution
 *  - Right panel: J(ε) plot showing the functional value as a function
 *    of the perturbation parameter ε, with minimum at ε = 0 for the E-L solution
 *
 * Controls: functional selector, ε slider, "Show E-L solution" toggle,
 *           "Show J vs ε" toggle.
 */

import { useMemo, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { useD3 } from './shared/useD3';
import { useResizeObserver } from './shared/useResizeObserver';
import { sampleCurve, finiteYMax } from './shared/plotting';
import type { Point2D } from './shared/plotting';
import { getFunctionalSpecs } from '../../data/calculus-of-variations-data';
import type { FunctionalSpec } from '../../data/calculus-of-variations-data';

// ── Constants ─────────────────────────────────────────────────

const BLUE = '#2563EB';
const GREEN = '#059669';
const ORANGE = '#F97316';
const PURPLE = '#7C3AED';
const RED = '#DC2626';
const MUTED = '#6b7280';

const margin = { top: 20, right: 16, bottom: 36, left: 48 };

// ── Component ─────────────────────────────────────────────────

export default function EulerLagrangeExplorer() {
  const { ref: containerRef, width: containerWidth } = useResizeObserver<HTMLDivElement>();
  const width = containerWidth || 700;
  const height = Math.min(width * 0.55, 380);

  const specs = useMemo(() => getFunctionalSpecs(), []);

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [epsilon, setEpsilon] = useState(0);
  const [showSolution, setShowSolution] = useState(true);
  const [showJPlot, setShowJPlot] = useState(true);
  const [controlPoints, setControlPoints] = useState<number[]>([0.15, 0.35, 0.55, 0.75, 0.9]);

  const spec = specs[selectedIdx];
  const [a, b] = spec.domain;
  const { left: yA, right: yB } = spec.boundaryConditions;

  // Build candidate curve from control points via cubic interpolation
  const candidateFn = useCallback(
    (x: number): number => {
      const t = (x - a) / (b - a);
      if (t <= 0) return yA;
      if (t >= 1) return yB;
      // Piecewise linear through boundary + control points
      const pts = [yA, ...controlPoints, yB];
      const n = pts.length - 1;
      const idx = t * n;
      const lo = Math.floor(idx);
      const hi = Math.min(lo + 1, n);
      const frac = idx - lo;
      return pts[lo] * (1 - frac) + pts[hi] * frac;
    },
    [controlPoints, a, b, yA, yB],
  );

  const candidateDerivFn = useCallback(
    (x: number): number => {
      const h = 1e-5;
      return (candidateFn(x + h) - candidateFn(x - h)) / (2 * h);
    },
    [candidateFn],
  );

  // Perturbation direction η(x) = sin(πx) (vanishes at boundaries)
  const etaFn = useCallback(
    (x: number): number => {
      const t = (x - a) / (b - a);
      return Math.sin(Math.PI * t);
    },
    [a, b],
  );

  // Perturbed curve y + εη
  const perturbedFn = useCallback(
    (x: number): number => candidateFn(x) + epsilon * etaFn(x),
    [candidateFn, etaFn, epsilon],
  );

  const perturbedDerivFn = useCallback(
    (x: number): number => {
      const h = 1e-5;
      return (perturbedFn(x + h) - perturbedFn(x - h)) / (2 * h);
    },
    [perturbedFn],
  );

  // Functional values
  const jCandidate = useMemo(
    () => spec.evaluate(candidateFn, candidateDerivFn, a, b),
    [spec, candidateFn, candidateDerivFn, a, b],
  );

  const jPerturbed = useMemo(
    () => spec.evaluate(perturbedFn, perturbedDerivFn, a, b),
    [spec, perturbedFn, perturbedDerivFn, a, b],
  );

  const jSolution = useMemo(() => {
    if (!spec.solutionFn || !spec.solutionDerivFn) return null;
    return spec.evaluate(spec.solutionFn, spec.solutionDerivFn, a, b);
  }, [spec, a, b]);

  // J(ε) curve data
  const jEpsilonData = useMemo(() => {
    const pts: Point2D[] = [];
    for (let i = 0; i <= 40; i++) {
      const eps = -1 + (2 * i) / 40;
      const yEps = (x: number) => candidateFn(x) + eps * etaFn(x);
      const yEpsDeriv = (x: number) => {
        const h2 = 1e-5;
        return (yEps(x + h2) - yEps(x - h2)) / (2 * h2);
      };
      const val = spec.evaluate(yEps, yEpsDeriv, a, b);
      pts.push([eps, val]);
    }
    return pts;
  }, [spec, candidateFn, etaFn, a, b]);

  // Sample curves for D3
  const candidatePts = useMemo(() => sampleCurve(candidateFn, [a, b]), [candidateFn, a, b]);
  const perturbedPts = useMemo(
    () => (Math.abs(epsilon) > 0.01 ? sampleCurve(perturbedFn, [a, b]) : []),
    [perturbedFn, a, b, epsilon],
  );
  const solutionPts = useMemo(
    () => (showSolution && spec.solutionFn ? sampleCurve(spec.solutionFn, [a, b]) : []),
    [showSolution, spec, a, b],
  );

  // Y extent for the curve panel
  const yMax = useMemo(
    () => finiteYMax([candidatePts, perturbedPts, solutionPts], 0.2, 1.2),
    [candidatePts, perturbedPts, solutionPts],
  );

  // Drag handler for control points
  const handleDrag = useCallback(
    (cpIdx: number, newY: number) => {
      setControlPoints((prev) => {
        const next = [...prev];
        next[cpIdx] = Math.max(-0.5, Math.min(2.0, newY));
        return next;
      });
    },
    [],
  );

  // ── D3 rendering ────────────────────────────────────────────

  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (width <= 0) return;

      const splitRatio = showJPlot ? 0.58 : 1.0;
      const leftW = width * splitRatio - margin.left - margin.right;
      const rightW = showJPlot ? width * (1 - splitRatio) - margin.right - 16 : 0;
      const panelH = height - margin.top - margin.bottom;

      // ── Left panel: curves ─────────────────────────────────
      const gLeft = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const xScale = d3.scaleLinear().domain([a, b]).range([0, leftW]);
      const yScale = d3.scaleLinear().domain([-0.1, yMax]).range([panelH, 0]);

      // Axes
      gLeft
        .append('g')
        .attr('transform', `translate(0,${panelH})`)
        .call(d3.axisBottom(xScale).ticks(5))
        .selectAll('text')
        .style('font-size', '11px');
      gLeft
        .append('g')
        .call(d3.axisLeft(yScale).ticks(5))
        .selectAll('text')
        .style('font-size', '11px');

      // Axis labels
      gLeft
        .append('text')
        .attr('x', leftW / 2)
        .attr('y', panelH + 32)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('fill', MUTED)
        .text('x');
      gLeft
        .append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -panelH / 2)
        .attr('y', -38)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('fill', MUTED)
        .text('y');

      const line = d3
        .line<Point2D>()
        .x((d) => xScale(d[0]))
        .y((d) => yScale(d[1]))
        .defined((d) => Number.isFinite(d[1]));

      // E-L solution
      if (solutionPts.length > 0) {
        gLeft
          .append('path')
          .datum(solutionPts)
          .attr('d', line)
          .attr('fill', 'none')
          .attr('stroke', GREEN)
          .attr('stroke-width', 2.5)
          .attr('opacity', 0.8);
      }

      // Perturbed curve
      if (perturbedPts.length > 0) {
        gLeft
          .append('path')
          .datum(perturbedPts)
          .attr('d', line)
          .attr('fill', 'none')
          .attr('stroke', ORANGE)
          .attr('stroke-width', 1.5)
          .attr('stroke-dasharray', '6,4')
          .attr('opacity', 0.8);
      }

      // Candidate curve
      gLeft
        .append('path')
        .datum(candidatePts)
        .attr('d', line)
        .attr('fill', 'none')
        .attr('stroke', BLUE)
        .attr('stroke-width', 2.5);

      // Control points (draggable)
      const cpXPositions = controlPoints.map((_, i) => {
        const t = (i + 1) / (controlPoints.length + 1);
        return a + t * (b - a);
      });

      gLeft
        .selectAll('.control-point')
        .data(controlPoints)
        .enter()
        .append('circle')
        .attr('class', 'control-point')
        .attr('cx', (_, i) => xScale(cpXPositions[i]))
        .attr('cy', (d) => yScale(d))
        .attr('r', 6)
        .attr('fill', RED)
        .attr('stroke', '#fff')
        .attr('stroke-width', 2)
        .style('cursor', 'ns-resize')
        .call(
          d3.drag<SVGCircleElement, number>().on('drag', function (event, _d) {
            const cpIdx = controlPoints.indexOf(_d);
            if (cpIdx >= 0) {
              const newY = yScale.invert(event.y);
              handleDrag(cpIdx, newY);
            }
          }) as any,
        );

      // Boundary markers
      gLeft
        .append('circle')
        .attr('cx', xScale(a))
        .attr('cy', yScale(yA))
        .attr('r', 4)
        .attr('fill', MUTED);
      gLeft
        .append('circle')
        .attr('cx', xScale(b))
        .attr('cy', yScale(yB))
        .attr('r', 4)
        .attr('fill', MUTED);

      // Legend
      const legendY = 8;
      const legendItems = [
        { label: 'y(x)', color: BLUE, dash: '' },
        ...(showSolution ? [{ label: 'E-L solution', color: GREEN, dash: '' }] : []),
        ...(Math.abs(epsilon) > 0.01 ? [{ label: 'y + εη', color: ORANGE, dash: '6,4' }] : []),
      ];
      legendItems.forEach((item, i) => {
        const lx = leftW - 100;
        const ly = legendY + i * 18;
        gLeft
          .append('line')
          .attr('x1', lx)
          .attr('y1', ly)
          .attr('x2', lx + 20)
          .attr('y2', ly)
          .attr('stroke', item.color)
          .attr('stroke-width', 2)
          .attr('stroke-dasharray', item.dash);
        gLeft
          .append('text')
          .attr('x', lx + 25)
          .attr('y', ly + 4)
          .style('font-size', '11px')
          .style('fill', item.color)
          .text(item.label);
      });

      // ── Right panel: J(ε) ──────────────────────────────────
      if (showJPlot && rightW > 40) {
        const gRight = svg
          .append('g')
          .attr(
            'transform',
            `translate(${width * splitRatio + 8},${margin.top})`,
          );

        const jValues = jEpsilonData.map((d) => d[1]);
        const jMin = Math.min(...jValues);
        const jMaxVal = Math.max(...jValues);
        const jPad = (jMaxVal - jMin) * 0.1 || 0.1;

        const epsScale = d3.scaleLinear().domain([-1, 1]).range([0, rightW]);
        const jScale = d3
          .scaleLinear()
          .domain([jMin - jPad, jMaxVal + jPad])
          .range([panelH, 0]);

        gRight
          .append('g')
          .attr('transform', `translate(0,${panelH})`)
          .call(d3.axisBottom(epsScale).ticks(5))
          .selectAll('text')
          .style('font-size', '10px');
        gRight
          .append('g')
          .call(d3.axisLeft(jScale).ticks(4).tickFormat(d3.format('.3f')))
          .selectAll('text')
          .style('font-size', '10px');

        // Axis labels
        gRight
          .append('text')
          .attr('x', rightW / 2)
          .attr('y', panelH + 32)
          .attr('text-anchor', 'middle')
          .style('font-size', '11px')
          .style('fill', MUTED)
          .text('ε');
        gRight
          .append('text')
          .attr('transform', 'rotate(-90)')
          .attr('x', -panelH / 2)
          .attr('y', -42)
          .attr('text-anchor', 'middle')
          .style('font-size', '11px')
          .style('fill', MUTED)
          .text('J(ε)');

        const jLine = d3
          .line<Point2D>()
          .x((d) => epsScale(d[0]))
          .y((d) => jScale(d[1]))
          .defined((d) => Number.isFinite(d[1]));

        gRight
          .append('path')
          .datum(jEpsilonData)
          .attr('d', jLine)
          .attr('fill', 'none')
          .attr('stroke', PURPLE)
          .attr('stroke-width', 2);

        // Current ε marker
        gRight
          .append('circle')
          .attr('cx', epsScale(epsilon))
          .attr('cy', jScale(jPerturbed))
          .attr('r', 5)
          .attr('fill', PURPLE);

        gRight
          .append('text')
          .attr('x', rightW / 2)
          .attr('y', -6)
          .attr('text-anchor', 'middle')
          .style('font-size', '12px')
          .style('font-weight', '600')
          .style('fill', PURPLE)
          .text('J vs ε');
      }
    },
    [
      width,
      height,
      candidatePts,
      perturbedPts,
      solutionPts,
      jEpsilonData,
      controlPoints,
      epsilon,
      jPerturbed,
      showSolution,
      showJPlot,
      a,
      b,
      yA,
      yB,
      yMax,
      handleDrag,
    ],
  );

  return (
    <div ref={containerRef} className="w-full">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4 mb-3 text-sm">
        <label className="flex items-center gap-2">
          <span className="font-medium text-gray-700 dark:text-gray-300">Functional:</span>
          <select
            value={selectedIdx}
            onChange={(e) => {
              setSelectedIdx(Number(e.target.value));
              setControlPoints([0.15, 0.35, 0.55, 0.75, 0.9]);
              setEpsilon(0);
            }}
            className="rounded border border-gray-300 px-2 py-1 dark:border-gray-600 dark:bg-gray-800"
          >
            {specs.map((s, i) => (
              <option key={s.name} value={i}>
                {s.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2">
          <span className="text-gray-600 dark:text-gray-400">ε = {epsilon.toFixed(2)}</span>
          <input
            type="range"
            min={-1}
            max={1}
            step={0.01}
            value={epsilon}
            onChange={(e) => setEpsilon(Number(e.target.value))}
            className="w-28"
          />
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={showSolution}
            onChange={(e) => setShowSolution(e.target.checked)}
          />
          <span className="text-gray-600 dark:text-gray-400">Show E-L solution</span>
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={showJPlot}
            onChange={(e) => setShowJPlot(e.target.checked)}
          />
          <span className="text-gray-600 dark:text-gray-400">Show J vs ε</span>
        </label>
      </div>

      {/* SVG */}
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="overflow-visible"
      />

      {/* Info panel */}
      <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
        <div>
          <span className="text-gray-500 dark:text-gray-400">J[y] = </span>
          <span className="font-mono font-medium" style={{ color: BLUE }}>
            {jCandidate.toFixed(4)}
          </span>
        </div>
        {jSolution !== null && (
          <div>
            <span className="text-gray-500 dark:text-gray-400">J[y*] = </span>
            <span className="font-mono font-medium" style={{ color: GREEN }}>
              {jSolution.toFixed(4)}
            </span>
          </div>
        )}
        <div>
          <span className="text-gray-500 dark:text-gray-400">J[y+εη] = </span>
          <span className="font-mono font-medium" style={{ color: ORANGE }}>
            {jPerturbed.toFixed(4)}
          </span>
        </div>
        {jSolution !== null && (
          <div>
            <span className="text-gray-500 dark:text-gray-400">Gap = </span>
            <span className="font-mono font-medium" style={{ color: RED }}>
              {(jCandidate - jSolution).toFixed(4)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
