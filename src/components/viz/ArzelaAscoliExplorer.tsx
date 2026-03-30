import { useState, useMemo, useCallback } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { getFunctionFamilyPresets } from '../../data/uniform-convergence-data';
import { checkEquicontinuity, extractUniformSubsequence } from './shared/limits';
import { functionColors } from './shared/colorScales';

const margin = { top: 20, right: 30, bottom: 45, left: 50 };
const FAMILY_SIZE = 12;
const DOMAIN: [number, number] = [0, Math.PI];

export default function ArzelaAscoliExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();
  const height = Math.min(width * 0.6, 440);

  const presets = useMemo(() => getFunctionFamilyPresets(), []);
  const [presetIdx, setPresetIdx] = useState(0);
  const [seed, setSeed] = useState(42);
  const [showSubseq, setShowSubseq] = useState(false);
  const [probeX, setProbeX] = useState<number | null>(null);
  const [probeEps, _setProbeEps] = useState(0.3);

  const preset = presets[presetIdx];

  const family = useMemo(
    () => preset.generateFamily(seed, FAMILY_SIZE),
    [preset, seed],
  );

  const subsequence = useMemo(
    () => (showSubseq ? extractUniformSubsequence(family, DOMAIN, 50) : null),
    [family, showSubseq],
  );

  const equiCheck = useMemo(() => {
    if (probeX === null) return null;
    return checkEquicontinuity(family, probeX, probeEps, DOMAIN, 300);
  }, [family, probeX, probeEps]);

  const handleGenerate = useCallback(() => {
    setSeed((s) => s + 1);
    setShowSubseq(false);
    setProbeX(null);
  }, []);

  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (width === 0) return;

      const innerW = width - margin.left - margin.right;
      const innerH = height - margin.top - margin.bottom;
      const g = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const [xMin, xMax] = DOMAIN;
      const numPoints = 200;
      const step = (xMax - xMin) / numPoints;

      // Evaluate all family members
      const allCurves = family.map((f) => {
        const points: [number, number][] = [];
        for (let i = 0; i <= numPoints; i++) {
          const x = xMin + step * i;
          points.push([x, f(x)]);
        }
        return points;
      });

      // Y range
      const allY = allCurves.flat().map((p) => p[1]);
      const yExtent = d3.extent(allY) as [number, number];
      const yPad = (yExtent[1] - yExtent[0]) * 0.15 || 0.5;

      const xScale = d3.scaleLinear().domain([xMin, xMax]).range([0, innerW]);
      const yScale = d3
        .scaleLinear()
        .domain([yExtent[0] - yPad, yExtent[1] + yPad])
        .range([innerH, 0]);

      // Axes
      g.append('g')
        .attr('transform', `translate(0,${innerH})`)
        .call(d3.axisBottom(xScale).ticks(6))
        .selectAll('text')
        .style('font-size', '11px');
      g.append('g')
        .call(d3.axisLeft(yScale).ticks(6))
        .selectAll('text')
        .style('font-size', '11px');

      g.append('text')
        .attr('x', innerW / 2)
        .attr('y', innerH + 38)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('fill', '#71717A')
        .text('x');

      // δ-region at probe
      if (probeX !== null && equiCheck?.isEquicontinuous && equiCheck.delta) {
        const delta = equiCheck.delta;
        g.append('rect')
          .attr('x', xScale(Math.max(xMin, probeX - delta)))
          .attr('y', 0)
          .attr(
            'width',
            xScale(Math.min(xMax, probeX + delta)) -
              xScale(Math.max(xMin, probeX - delta)),
          )
          .attr('height', innerH)
          .attr('fill', '#FDE68A')
          .attr('fill-opacity', 0.25);

        g.append('line')
          .attr('x1', xScale(probeX))
          .attr('x2', xScale(probeX))
          .attr('y1', 0)
          .attr('y2', innerH)
          .attr('stroke', '#A1A1AA')
          .attr('stroke-dasharray', '3,3');
      }

      const line = d3
        .line<[number, number]>()
        .x((d) => xScale(d[0]))
        .y((d) => yScale(d[1]));

      const subIndices = subsequence ? new Set(subsequence.indices) : new Set<number>();

      // Draw all curves
      allCurves.forEach((curve, i) => {
        const isInSubseq = subIndices.has(i);
        const highlighted = showSubseq && isInSubseq;
        const dimmed = showSubseq && !isInSubseq;

        g.append('path')
          .datum(curve)
          .attr('d', line)
          .attr('stroke', highlighted ? functionColors[0] : dimmed ? '#D4D4D8' : '#6366F1')
          .attr('stroke-width', highlighted ? 2.5 : dimmed ? 1 : 1.5)
          .attr('fill', 'none')
          .attr('opacity', dimmed ? 0.3 : 0.7);
      });

      // Draw limit approximation if subsequence is shown
      if (subsequence) {
        const limitPoints: [number, number][] = [];
        for (let i = 0; i <= numPoints; i++) {
          const x = xMin + step * i;
          limitPoints.push([x, subsequence.limitApprox(x)]);
        }
        g.append('path')
          .datum(limitPoints)
          .attr('d', line)
          .attr('stroke', functionColors[1])
          .attr('stroke-width', 2.5)
          .attr('stroke-dasharray', '6,4')
          .attr('fill', 'none');
      }

      // Clickable overlay for probe
      g.append('rect')
        .attr('width', innerW)
        .attr('height', innerH)
        .attr('fill', 'transparent')
        .style('cursor', 'crosshair')
        .on('click', (event: MouseEvent) => {
          const [mx] = d3.pointer(event);
          const x = xScale.invert(mx);
          if (x >= xMin && x <= xMax) setProbeX(Math.round(x * 100) / 100);
        });
    },
    [width, height, family, showSubseq, subsequence, probeX, equiCheck],
  );

  return (
    <div className="my-8 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Family:
        </label>
        <select
          className="rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
          value={presetIdx}
          onChange={(e) => {
            setPresetIdx(Number(e.target.value));
            setShowSubseq(false);
            setProbeX(null);
          }}
        >
          {presets.map((p, i) => (
            <option key={p.name} value={i}>
              {p.label}
            </option>
          ))}
        </select>

        <div className="flex gap-2">
          <button
            className="rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700"
            onClick={handleGenerate}
          >
            Generate Family
          </button>
          <button
            className="rounded bg-emerald-600 px-3 py-1 text-sm font-medium text-white hover:bg-emerald-700"
            onClick={() => setShowSubseq(!showSubseq)}
          >
            {showSubseq ? 'Hide Subsequence' : 'Extract Subsequence'}
          </button>
        </div>
      </div>

      <div className="mb-2 flex flex-wrap gap-4 text-sm text-zinc-600 dark:text-zinc-400">
        <span>
          Equicontinuous:{' '}
          <strong
            className={
              preset.isEquicontinuous
                ? 'text-emerald-600'
                : 'text-red-500'
            }
          >
            {preset.isEquicontinuous ? '✓' : '✗'}
          </strong>
        </span>
        <span>
          Pointwise bounded:{' '}
          <strong
            className={
              preset.isPointwiseBounded
                ? 'text-emerald-600'
                : 'text-red-500'
            }
          >
            {preset.isPointwiseBounded ? '✓' : '✗'}
          </strong>
        </span>
        <span>
          Arzelà-Ascoli applies:{' '}
          <strong
            className={
              preset.isEquicontinuous && preset.isPointwiseBounded
                ? 'text-emerald-600'
                : 'text-red-500'
            }
          >
            {preset.isEquicontinuous && preset.isPointwiseBounded ? '✓' : '✗'}
          </strong>
        </span>
        {preset.lipschitzBound !== null && (
          <span className="text-xs italic">
            Lipschitz bound: {preset.lipschitzBound}
          </span>
        )}
      </div>

      {equiCheck && (
        <div className="mb-2 text-sm text-zinc-600 dark:text-zinc-400">
          Probe x₀ = {probeX?.toFixed(2)}:{' '}
          {equiCheck.isEquicontinuous ? (
            <span className="font-semibold text-emerald-600">
              ✓ Single δ = {equiCheck.delta?.toFixed(4)} works for all f
            </span>
          ) : (
            <span className="font-semibold text-red-500">
              ✗ No single δ — worst function is f_{equiCheck.worstCaseF}
            </span>
          )}
        </div>
      )}

      {showSubseq && subsequence && (
        <div className="mb-2 text-sm text-zinc-600 dark:text-zinc-400">
          Extracted subsequence: indices [{subsequence.indices.join(', ')}]
          {preset.isEquicontinuous && (
            <span className="ml-2 text-emerald-600">
              — converges uniformly
            </span>
          )}
        </div>
      )}

      <div ref={containerRef} className="w-full">
        <svg ref={svgRef} width={width} height={height} />
      </div>

      <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
        Click on the graph to probe equicontinuity at a point. Blue curves =
        extracted subsequence. Dashed red = limit approximation.
      </p>
    </div>
  );
}
