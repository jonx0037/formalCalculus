/**
 * DirectMethodExplorer — viz for the direct method of the calculus of variations.
 *
 * Visualizes a minimizing sequence {y_n} converging weakly to the minimizer y*:
 *  - Left panel: curves y_n(x) fading in, bold minimizer y*
 *  - Right panel: J[y_n] vs n plot showing functional values descending to inf J
 *
 * Controls: functional selector, step-through ("Next n") + play animation,
 *           show/hide functional values, weak convergence annotation.
 */

import { useMemo, useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { useD3 } from './shared/useD3';
import { useResizeObserver } from './shared/useResizeObserver';
import { sampleCurve, finiteYMax } from './shared/plotting';
import type { Point2D } from './shared/plotting';
import {
  generateMinimizingSequence,
} from './shared/functional-analysis';
import type { MinimizingSequenceStep } from './shared/functional-analysis';

// ── Constants ─────────────────────────────────────────────────

const BLUE = '#2563EB';
const GREEN = '#059669';
const PURPLE = '#7C3AED';
const LIGHT_BLUE = '#93C5FD';
const MUTED = '#6b7280';

const margin = { top: 20, right: 16, bottom: 36, left: 48 };

// ── Functional presets ────────────────────────────────────────

interface DirectMethodPreset {
  name: string;
  lagrangian: (x: number, y: number, yp: number) => number;
  domain: [number, number];
  bc: { left: number; right: number };
  infJ: number;
  solutionFn: (x: number) => number;
}

const PRESETS: DirectMethodPreset[] = [
  {
    name: 'Dirichlet Energy',
    lagrangian: (_x, _y, yp) => 0.5 * yp * yp,
    domain: [0, 1],
    bc: { left: 0, right: 1 },
    infJ: 0.5,
    solutionFn: (x) => x,
  },
  {
    name: 'Elastic Energy',
    lagrangian: (_x, y, yp) => 0.5 * yp * yp + 0.5 * y * y,
    domain: [0, 1],
    bc: { left: 0, right: 0 },
    infJ: 0,
    solutionFn: (_x) => 0,
  },
];

// ── Component ─────────────────────────────────────────────────

export default function DirectMethodExplorer() {
  const { ref: containerRef, width: containerWidth } = useResizeObserver<HTMLDivElement>();
  const width = containerWidth || 700;
  const height = Math.min(width * 0.55, 380);

  const [presetIdx, setPresetIdx] = useState(0);
  const [currentN, setCurrentN] = useState(0);
  const [showFunctionalValues, setShowFunctionalValues] = useState(true);
  const [showWeakAnnotation, setShowWeakAnnotation] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const preset = PRESETS[presetIdx];
  const totalSteps = 25;

  // Generate the full minimizing sequence
  const sequence = useMemo<MinimizingSequenceStep[]>(
    () =>
      generateMinimizingSequence(
        preset.lagrangian,
        preset.domain,
        preset.bc,
        totalSteps,
        51,
      ),
    [preset],
  );

  // Animation via requestAnimationFrame
  const animRef = useRef<number | null>(null);
  useEffect(() => {
    if (!isPlaying) {
      if (animRef.current) {
        cancelAnimationFrame(animRef.current);
        animRef.current = null;
      }
      return;
    }

    let lastTime = performance.now();
    const animate = (time: number) => {
      if (time - lastTime >= 300) {
        lastTime = time;
        setCurrentN((prev) => {
          if (prev >= totalSteps) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isPlaying, totalSteps]);

  const [a, b] = preset.domain;
  const dx = (b - a) / 50;

  // Convert step values to sampled curves
  const stepCurves = useMemo(() => {
    const curves: Point2D[][] = [];
    for (let n = 0; n <= Math.min(currentN, totalSteps); n++) {
      const step = sequence[n];
      if (!step) continue;
      const pts: Point2D[] = step.values.map((v, i) => [a + i * dx, v] as Point2D);
      curves.push(pts);
    }
    return curves;
  }, [sequence, currentN, totalSteps, a, dx]);

  const solutionPts = useMemo(
    () => sampleCurve(preset.solutionFn, [a, b]),
    [preset, a, b],
  );

  const allCurves = useMemo(
    () => [...stepCurves, solutionPts],
    [stepCurves, solutionPts],
  );

  const yMax = useMemo(
    () => finiteYMax(allCurves, 0.2, 1.2),
    [allCurves],
  );

  // Functional value data for the right panel
  const jData = useMemo<Point2D[]>(() => {
    return sequence
      .slice(0, currentN + 1)
      .map((s) => [s.n, s.functionalValue] as Point2D);
  }, [sequence, currentN]);

  const currentStep = sequence[Math.min(currentN, totalSteps)];

  // ── D3 rendering ────────────────────────────────────────────

  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (width <= 0) return;

      const splitRatio = 0.58;
      const leftW = width * splitRatio - margin.left - margin.right;
      const rightW = width * (1 - splitRatio) - margin.right - 16;
      const panelH = height - margin.top - margin.bottom;

      // ── Left panel: curves ─────────────────────────────────
      const gLeft = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const xScale = d3.scaleLinear().domain([a, b]).range([0, leftW]);
      const yScale = d3.scaleLinear().domain([-0.1, yMax]).range([panelH, 0]);

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

      gLeft
        .append('text')
        .attr('x', leftW / 2)
        .attr('y', panelH + 32)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('fill', MUTED)
        .text('x');

      const line = d3
        .line<Point2D>()
        .x((d) => xScale(d[0]))
        .y((d) => yScale(d[1]))
        .defined((d) => Number.isFinite(d[1]));

      // Draw sequence members with fading opacity
      const nCurves = stepCurves.length;
      stepCurves.forEach((pts, i) => {
        const t = nCurves > 1 ? i / (nCurves - 1) : 1;
        const color = d3.interpolateRgb(LIGHT_BLUE, BLUE)(t);
        gLeft
          .append('path')
          .datum(pts)
          .attr('d', line)
          .attr('fill', 'none')
          .attr('stroke', color)
          .attr('stroke-width', i === nCurves - 1 ? 2 : 1)
          .attr('opacity', 0.3 + 0.7 * t);
      });

      // Minimizer (bold)
      gLeft
        .append('path')
        .datum(solutionPts)
        .attr('d', line)
        .attr('fill', 'none')
        .attr('stroke', GREEN)
        .attr('stroke-width', 2.5)
        .attr('opacity', 0.7);

      // Weak convergence annotation
      if (showWeakAnnotation && currentN > 3) {
        gLeft
          .append('text')
          .attr('x', leftW / 2)
          .attr('y', 14)
          .attr('text-anchor', 'middle')
          .style('font-size', '12px')
          .style('fill', BLUE)
          .style('font-style', 'italic')
          .text(`y_${currentN} ⇀ y* (weak convergence)`);
      }

      // Legend
      gLeft
        .append('line')
        .attr('x1', leftW - 100)
        .attr('y1', 8)
        .attr('x2', leftW - 80)
        .attr('y2', 8)
        .attr('stroke', BLUE)
        .attr('stroke-width', 2);
      gLeft
        .append('text')
        .attr('x', leftW - 75)
        .attr('y', 12)
        .style('font-size', '11px')
        .style('fill', BLUE)
        .text('y_n');
      gLeft
        .append('line')
        .attr('x1', leftW - 100)
        .attr('y1', 24)
        .attr('x2', leftW - 80)
        .attr('y2', 24)
        .attr('stroke', GREEN)
        .attr('stroke-width', 2.5);
      gLeft
        .append('text')
        .attr('x', leftW - 75)
        .attr('y', 28)
        .style('font-size', '11px')
        .style('fill', GREEN)
        .text('y*');

      // ── Right panel: J[y_n] vs n ───────────────────────────
      if (rightW > 40 && showFunctionalValues) {
        const gRight = svg
          .append('g')
          .attr(
            'transform',
            `translate(${width * splitRatio + 8},${margin.top})`,
          );

        const allJ = sequence.map((s) => s.functionalValue);
        const jMax = Math.max(...allJ) * 1.1;
        const jMin = Math.min(preset.infJ, Math.min(...allJ)) * 0.9;

        const nScale = d3.scaleLinear().domain([0, totalSteps]).range([0, rightW]);
        const jScale = d3
          .scaleLinear()
          .domain([Math.max(jMin, 0), jMax])
          .range([panelH, 0]);

        gRight
          .append('g')
          .attr('transform', `translate(0,${panelH})`)
          .call(d3.axisBottom(nScale).ticks(5).tickFormat(d3.format('d')))
          .selectAll('text')
          .style('font-size', '10px');
        gRight
          .append('g')
          .call(d3.axisLeft(jScale).ticks(4).tickFormat(d3.format('.3f')))
          .selectAll('text')
          .style('font-size', '10px');

        gRight
          .append('text')
          .attr('x', rightW / 2)
          .attr('y', panelH + 32)
          .attr('text-anchor', 'middle')
          .style('font-size', '11px')
          .style('fill', MUTED)
          .text('n');
        gRight
          .append('text')
          .attr('x', rightW / 2)
          .attr('y', -6)
          .attr('text-anchor', 'middle')
          .style('font-size', '12px')
          .style('font-weight', '600')
          .style('fill', PURPLE)
          .text('J[y_n]');

        // inf J line
        gRight
          .append('line')
          .attr('x1', 0)
          .attr('y1', jScale(preset.infJ))
          .attr('x2', rightW)
          .attr('y2', jScale(preset.infJ))
          .attr('stroke', GREEN)
          .attr('stroke-dasharray', '4,4')
          .attr('stroke-width', 1.5);
        gRight
          .append('text')
          .attr('x', rightW + 4)
          .attr('y', jScale(preset.infJ) + 4)
          .style('font-size', '10px')
          .style('fill', GREEN)
          .text('inf J');

        // J[y_n] dots + line
        const jLine = d3
          .line<Point2D>()
          .x((d) => nScale(d[0]))
          .y((d) => jScale(d[1]));

        gRight
          .append('path')
          .datum(jData)
          .attr('d', jLine)
          .attr('fill', 'none')
          .attr('stroke', PURPLE)
          .attr('stroke-width', 1.5);

        jData.forEach(([n, j]) => {
          gRight
            .append('circle')
            .attr('cx', nScale(n))
            .attr('cy', jScale(j))
            .attr('r', 3)
            .attr('fill', PURPLE);
        });
      }
    },
    [
      width,
      height,
      stepCurves,
      solutionPts,
      jData,
      currentN,
      showFunctionalValues,
      showWeakAnnotation,
      yMax,
      a,
      b,
      preset,
      sequence,
      totalSteps,
    ],
  );

  return (
    <div ref={containerRef} className="w-full">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4 mb-3 text-sm">
        <label className="flex items-center gap-2">
          <span className="font-medium text-gray-700 dark:text-gray-300">Functional:</span>
          <select
            value={presetIdx}
            onChange={(e) => {
              setPresetIdx(Number(e.target.value));
              setCurrentN(0);
              setIsPlaying(false);
            }}
            className="rounded border border-gray-300 px-2 py-1 dark:border-gray-600 dark:bg-gray-800"
          >
            {PRESETS.map((p, i) => (
              <option key={p.name} value={i}>
                {p.name}
              </option>
            ))}
          </select>
        </label>

        <button
          onClick={() => setCurrentN((prev) => Math.min(prev + 1, totalSteps))}
          disabled={currentN >= totalSteps}
          className="rounded bg-blue-600 px-3 py-1 text-white disabled:opacity-40"
        >
          Next n
        </button>

        <button
          onClick={() => {
            if (isPlaying) {
              setIsPlaying(false);
            } else {
              if (currentN >= totalSteps) setCurrentN(0);
              setIsPlaying(true);
            }
          }}
          className="rounded bg-purple-600 px-3 py-1 text-white"
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>

        <button
          onClick={() => {
            setCurrentN(0);
            setIsPlaying(false);
          }}
          className="rounded border border-gray-300 px-3 py-1 dark:border-gray-600"
        >
          Reset
        </button>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={showFunctionalValues}
            onChange={(e) => setShowFunctionalValues(e.target.checked)}
          />
          <span className="text-gray-600 dark:text-gray-400">J[y_n] plot</span>
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={showWeakAnnotation}
            onChange={(e) => setShowWeakAnnotation(e.target.checked)}
          />
          <span className="text-gray-600 dark:text-gray-400">Weak convergence</span>
        </label>
      </div>

      {/* SVG */}
      <svg ref={svgRef} width={width} height={height} className="overflow-visible" />

      {/* Info panel */}
      <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
        <div>
          <span className="text-gray-500 dark:text-gray-400">n = </span>
          <span className="font-mono font-medium" style={{ color: BLUE }}>
            {currentN}
          </span>
        </div>
        <div>
          <span className="text-gray-500 dark:text-gray-400">J[y_n] = </span>
          <span className="font-mono font-medium" style={{ color: PURPLE }}>
            {currentStep ? currentStep.functionalValue.toFixed(4) : '—'}
          </span>
        </div>
        <div>
          <span className="text-gray-500 dark:text-gray-400">inf J = </span>
          <span className="font-mono font-medium" style={{ color: GREEN }}>
            {preset.infJ.toFixed(4)}
          </span>
        </div>
        <div>
          <span className="text-gray-500 dark:text-gray-400">Gap = </span>
          <span className="font-mono font-medium" style={{ color: MUTED }}>
            {currentStep
              ? (currentStep.functionalValue - preset.infJ).toFixed(4)
              : '—'}
          </span>
        </div>
      </div>
    </div>
  );
}
