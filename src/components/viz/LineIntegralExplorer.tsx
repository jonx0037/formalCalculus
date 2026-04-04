/**
 * LineIntegralExplorer — flagship visualization for Topic 15.
 *
 * Animated particle traverses a curve through a vector field.
 * As the particle moves, the work integral accumulates — the dot product
 * F · dr at each point is shown as a contribution (positive when F aligns
 * with the path, negative when opposed). A running total displays the integral.
 */
import { useState, useMemo, useCallback, useEffect, useRef, useId, type ChangeEvent } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import {
  VECTOR_FIELD_PRESETS,
  CURVE_PRESETS,
  asF,
} from '../../data/line-integrals-data';
import { lineIntegralVector, computeWorkIntegral } from './shared/integration';
import { functionColors } from './shared/colorScales';

const margin = { top: 20, right: 16, bottom: 36, left: 42 };
const ARROW_GRID = 12;
const N_STEPS = 200;

export default function LineIntegralExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();
  const height = Math.min(width * 0.72, 480);
  const uid = useId();

  // State
  const [fieldIdx, setFieldIdx] = useState(2); // rotation field default
  const [curveIdx, setCurveIdx] = useState(2); // full circle default
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [showField, setShowField] = useState(true);
  const [showTangent, setShowTangent] = useState(true);
  const animRef = useRef<number | null>(null);

  const field = VECTOR_FIELD_PRESETS[fieldIdx];
  const curve = CURVE_PRESETS[curveIdx];
  const F = useMemo(() => asF(field), [fieldIdx]);

  // Compute work data for animation
  const workData = useMemo(
    () => computeWorkIntegral(F, curve.r, curve.rPrime, curve.domain, N_STEPS),
    [F, curve],
  );

  const totalWork = useMemo(
    () => lineIntegralVector(F, curve.r, curve.rPrime, curve.domain),
    [F, curve],
  );

  // Current step index from progress
  const stepIdx = Math.min(Math.floor(progress * N_STEPS), N_STEPS);
  const currentStep = workData[stepIdx] || workData[workData.length - 1];

  // Animation loop
  useEffect(() => {
    if (!playing) return;
    const step = () => {
      setProgress((prev) => {
        const next = prev + 0.003;
        if (next >= 1) {
          setPlaying(false);
          return 1;
        }
        return next;
      });
      animRef.current = requestAnimationFrame(step);
    };
    animRef.current = requestAnimationFrame(step);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [playing]);

  // Reset on preset change
  useEffect(() => {
    setProgress(0);
    setPlaying(false);
  }, [fieldIdx, curveIdx]);

  // D3 rendering
  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (width <= 0 || height <= 0) return;

      const innerW = width - margin.left - margin.right;
      const innerH = height - margin.top - margin.bottom;
      const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      // Compute curve extent for domain
      const curvePoints = workData.map((d) => d.position);
      const xExtent = d3.extent(curvePoints, (p) => p[0]) as [number, number];
      const yExtent = d3.extent(curvePoints, (p) => p[1]) as [number, number];
      const pad = 0.5;
      const xDomain: [number, number] = [xExtent[0] - pad, xExtent[1] + pad];
      const yDomain: [number, number] = [yExtent[0] - pad, yExtent[1] + pad];

      const xScale = d3.scaleLinear().domain(xDomain).range([0, innerW]);
      const yScale = d3.scaleLinear().domain(yDomain).range([innerH, 0]);

      // Axes
      g.append('g')
        .attr('transform', `translate(0,${innerH})`)
        .call(d3.axisBottom(xScale).ticks(6))
        .selectAll('text')
        .style('font-size', '10px');
      g.append('g')
        .call(d3.axisLeft(yScale).ticks(6))
        .selectAll('text')
        .style('font-size', '10px');

      // Arrow marker
      svg
        .append('defs')
        .append('marker')
        .attr('id', `arrow-${uid}`)
        .attr('viewBox', '0 0 10 10')
        .attr('refX', 10)
        .attr('refY', 5)
        .attr('markerWidth', 4)
        .attr('markerHeight', 4)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M 0 0 L 10 5 L 0 10 z')
        .attr('fill', '#94a3b8');

      // Vector field arrows
      if (showField) {
        const dx = (xDomain[1] - xDomain[0]) / ARROW_GRID;
        const dy = (yDomain[1] - yDomain[0]) / ARROW_GRID;

        // Find max magnitude for normalization
        let maxMag = 0;
        for (let i = 0; i <= ARROW_GRID; i++) {
          for (let j = 0; j <= ARROW_GRID; j++) {
            const x = xDomain[0] + i * dx;
            const y = yDomain[0] + j * dy;
            const [fx, fy] = F(x, y);
            const mag = Math.sqrt(fx * fx + fy * fy);
            if (isFinite(mag) && mag > maxMag) maxMag = mag;
          }
        }

        const arrowScale = Math.min(dx, dy) * 0.35 / (maxMag || 1);

        for (let i = 0; i <= ARROW_GRID; i++) {
          for (let j = 0; j <= ARROW_GRID; j++) {
            const x = xDomain[0] + i * dx;
            const y = yDomain[0] + j * dy;
            const [fx, fy] = F(x, y);
            const mag = Math.sqrt(fx * fx + fy * fy);
            if (!isFinite(mag) || mag < 1e-10) continue;

            g.append('line')
              .attr('x1', xScale(x))
              .attr('y1', yScale(y))
              .attr('x2', xScale(x + fx * arrowScale))
              .attr('y2', yScale(y + fy * arrowScale))
              .attr('stroke', '#94a3b8')
              .attr('stroke-width', 1)
              .attr('marker-end', `url(#arrow-${uid})`);
          }
        }
      }

      // Full curve path
      const curveLine = d3.line<[number, number]>()
        .x((d) => xScale(d[0]))
        .y((d) => yScale(d[1]));

      g.append('path')
        .datum(curvePoints)
        .attr('d', curveLine)
        .attr('fill', 'none')
        .attr('stroke', functionColors[0])
        .attr('stroke-width', 2)
        .attr('stroke-opacity', 0.4);

      // Traversed portion
      const traversed = curvePoints.slice(0, stepIdx + 1);
      if (traversed.length > 1) {
        g.append('path')
          .datum(traversed)
          .attr('d', curveLine)
          .attr('fill', 'none')
          .attr('stroke', functionColors[0])
          .attr('stroke-width', 3);
      }

      // Particle dot
      if (currentStep) {
        const [px, py] = currentStep.position;
        g.append('circle')
          .attr('cx', xScale(px))
          .attr('cy', yScale(py))
          .attr('r', 6)
          .attr('fill', functionColors[2])
          .attr('stroke', '#fff')
          .attr('stroke-width', 1.5);

        // Force vector at particle
        const [fx, fy] = F(px, py);
        const fMag = Math.sqrt(fx * fx + fy * fy);
        if (fMag > 1e-10 && isFinite(fMag)) {
          const arrowLen = 30;
          const scale = arrowLen / fMag;
          const endX = xScale(px) + fx * scale;
          const endY = yScale(py) - fy * scale;
          g.append('line')
            .attr('x1', xScale(px))
            .attr('y1', yScale(py))
            .attr('x2', endX)
            .attr('y2', endY)
            .attr('stroke', functionColors[1])
            .attr('stroke-width', 2)
            .attr('marker-end', `url(#arrow-${uid})`);
        }

        // Tangent projection
        if (showTangent) {
          const [dx, dy] = curve.rPrime(currentStep.t);
          const tMag = Math.sqrt(dx * dx + dy * dy);
          if (tMag > 1e-10) {
            const dotProduct = (fx * dx + fy * dy) / tMag;
            const tangentLen = 25 * (dotProduct / (fMag || 1));
            const tx = (dx / tMag) * tangentLen;
            const ty = (dy / tMag) * tangentLen;
            g.append('line')
              .attr('x1', xScale(px))
              .attr('y1', yScale(py))
              .attr('x2', xScale(px) + tx)
              .attr('y2', yScale(py) - ty)
              .attr('stroke', dotProduct >= 0 ? '#059669' : '#DC2626')
              .attr('stroke-width', 2.5)
              .attr('stroke-dasharray', '4,2');
          }
        }
      }
    },
    [fieldIdx, curveIdx, progress, showField, showTangent, width, height, uid],
  );

  const handleFieldChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    setFieldIdx(Number(e.target.value));
  }, []);
  const handleCurveChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    setCurveIdx(Number(e.target.value));
  }, []);

  return (
    <div ref={containerRef} className="my-8 w-full">
      {/* Controls */}
      <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-1.5">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">Field:</span>
          <select
            value={fieldIdx}
            onChange={handleFieldChange}
            className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-600 dark:bg-zinc-800"
          >
            {VECTOR_FIELD_PRESETS.map((p, i) => (
              <option key={p.name} value={i}>{p.label}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1.5">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">Curve:</span>
          <select
            value={curveIdx}
            onChange={handleCurveChange}
            className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-600 dark:bg-zinc-800"
          >
            {CURVE_PRESETS.map((p, i) => (
              <option key={p.name} value={i}>{p.label}</option>
            ))}
          </select>
        </label>
        <button
          onClick={() => {
            if (progress >= 1) setProgress(0);
            setPlaying(!playing);
          }}
          className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
        >
          {playing ? 'Pause' : progress >= 1 ? 'Replay' : 'Animate'}
        </button>
        <button
          onClick={() => { setProgress(0); setPlaying(false); }}
          className="rounded border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Reset
        </button>
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={showField}
            onChange={(e) => setShowField(e.target.checked)}
            className="rounded"
          />
          <span className="text-xs text-zinc-600 dark:text-zinc-400">Field arrows</span>
        </label>
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={showTangent}
            onChange={(e) => setShowTangent(e.target.checked)}
            className="rounded"
          />
          <span className="text-xs text-zinc-600 dark:text-zinc-400">Tangent projection</span>
        </label>
      </div>

      {/* Progress slider */}
      <div className="mb-2 flex items-center gap-2">
        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Progress:</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.005}
          value={progress}
          onChange={(e) => { setPlaying(false); setProgress(Number(e.target.value)); }}
          className="flex-1"
        />
        <span className="w-10 text-right text-xs tabular-nums text-zinc-500">{(progress * 100).toFixed(0)}%</span>
      </div>

      {/* SVG */}
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="overflow-visible rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900"
      />

      {/* Readout */}
      <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-zinc-600 dark:text-zinc-400">
        <div>
          <span className="font-medium">Position:</span>{' '}
          ({currentStep?.position[0].toFixed(3)}, {currentStep?.position[1].toFixed(3)})
        </div>
        <div>
          <span className="font-medium">F(r(t)):</span>{' '}
          ({currentStep ? field.P(currentStep.position[0], currentStep.position[1]).toFixed(3) : '—'},{' '}
          {currentStep ? field.Q(currentStep.position[0], currentStep.position[1]).toFixed(3) : '—'})
        </div>
        <div>
          <span className="font-medium">Work so far:</span>{' '}
          <span className="tabular-nums">{currentStep?.cumulative.toFixed(4)}</span>
        </div>
        <div>
          <span className="font-medium">Total ∫<sub>C</sub> F · dr:</span>{' '}
          <span className="tabular-nums">{totalWork.toFixed(4)}</span>
        </div>
      </div>

      <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
        {field.description}
      </p>
    </div>
  );
}
