import { useState, useMemo } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { getCompactContinuousPresets } from '../../data/completeness-compactness-data';
import { functionColors, regionColors } from './shared/colorScales';

const presets = getCompactContinuousPresets();
const margin = { top: 20, right: 30, bottom: 50, left: 55 };
const SAMPLE_PTS = 500;

type Tab = 'evt' | 'heine-cantor';

export default function CompactContinuousExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();
  const height = Math.min(width * 0.55, 420);

  const [tab, setTab] = useState<Tab>('evt');
  const [presetIdx, setPresetIdx] = useState(0);
  const [useCompactDomain, setUseCompactDomain] = useState(true);
  const [epsilon, setEpsilon] = useState(0.3);

  const preset = presets[presetIdx];
  const domain = useCompactDomain ? preset.compactDomain : preset.nonCompactDomain;
  const [xMin, xMax] = domain;

  // Generate curve data
  const curveData = useMemo(() => {
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i <= SAMPLE_PTS; i++) {
      const x = xMin + (xMax - xMin) * (i / SAMPLE_PTS);
      pts.push({ x, y: preset.fn(x) });
    }
    return pts;
  }, [presetIdx, useCompactDomain]);

  // Find max and min
  const extrema = useMemo(() => {
    let maxPt = curveData[0];
    let minPt = curveData[0];
    for (const pt of curveData) {
      if (pt.y > maxPt.y) maxPt = pt;
      if (pt.y < minPt.y) minPt = pt;
    }
    return { max: maxPt, min: minPt };
  }, [curveData]);

  // For Heine-Cantor: compute delta for given epsilon at various points
  const uniformDeltaData = useMemo(() => {
    if (tab !== 'heine-cantor') return null;

    // Find the minimum delta needed across sample points
    const testPoints = Array.from({ length: 20 }, (_, i) =>
      xMin + ((xMax - xMin) * (i + 0.5)) / 20
    );

    const deltas = testPoints.map((a) => {
      // Binary search for smallest delta where |f(x) - f(a)| < epsilon for |x - a| < delta
      let lo = 0;
      let hi = (xMax - xMin) / 2;
      for (let iter = 0; iter < 30; iter++) {
        const delta = (lo + hi) / 2;
        let ok = true;
        for (let j = 0; j <= 50; j++) {
          const x = a - delta + (2 * delta * j) / 50;
          if (x < xMin || x > xMax) continue;
          if (Math.abs(preset.fn(x) - preset.fn(a)) >= epsilon) {
            ok = false;
            break;
          }
        }
        if (ok) {
          lo = delta; // This delta works, try larger
        } else {
          hi = delta; // This delta fails, try smaller
        }
      }
      return { x: a, delta: lo, fA: preset.fn(a) };
    });

    const minDelta = Math.min(...deltas.map((d) => d.delta));
    const uniformWorks = minDelta > 1e-6;

    return { deltas, minDelta, uniformWorks };
  }, [tab, presetIdx, useCompactDomain, epsilon]);

  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (width === 0) return;

      const innerW = width - margin.left - margin.right;
      const innerH = height - margin.top - margin.bottom;
      const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      // Scales
      const yValues = curveData.map((d) => d.y);
      const yMin = Math.min(...yValues);
      const yMax = Math.max(...yValues);
      const yPad = (yMax - yMin) * 0.1 || 1;

      const xScale = d3.scaleLinear().domain([xMin, xMax]).range([0, innerW]);
      const yScale = d3.scaleLinear().domain([yMin - yPad, yMax + yPad]).range([innerH, 0]);

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

      // Function curve
      const line = d3.line<{ x: number; y: number }>()
        .x((d) => xScale(d.x))
        .y((d) => yScale(d.y));

      g.append('path')
        .datum(curveData)
        .attr('d', line)
        .style('fill', 'none')
        .style('stroke', functionColors[0])
        .style('stroke-width', 2.5);

      if (tab === 'evt') {
        // Show max and min markers
        const showMax = useCompactDomain || preset.hasMaxOnNonCompact;
        const showMin = useCompactDomain || preset.hasMaxOnNonCompact;

        if (showMax) {
          g.append('circle')
            .attr('cx', xScale(extrema.max.x))
            .attr('cy', yScale(extrema.max.y))
            .attr('r', 6)
            .style('fill', '#DC2626')
            .style('stroke', '#FFF')
            .style('stroke-width', 2);

          g.append('text')
            .attr('x', xScale(extrema.max.x) + 10)
            .attr('y', yScale(extrema.max.y) - 8)
            .style('font-size', '11px')
            .style('fill', '#DC2626')
            .style('font-weight', '600')
            .text(`max ≈ ${extrema.max.y.toFixed(3)}`);
        }

        if (showMin) {
          g.append('circle')
            .attr('cx', xScale(extrema.min.x))
            .attr('cy', yScale(extrema.min.y))
            .attr('r', 6)
            .style('fill', '#059669')
            .style('stroke', '#FFF')
            .style('stroke-width', 2);

          g.append('text')
            .attr('x', xScale(extrema.min.x) + 10)
            .attr('y', yScale(extrema.min.y) + 16)
            .style('font-size', '11px')
            .style('fill', '#059669')
            .style('font-weight', '600')
            .text(`min ≈ ${extrema.min.y.toFixed(3)}`);
        }

        // Horizontal dashed lines at max/min
        if (showMax) {
          g.append('line')
            .attr('x1', 0)
            .attr('x2', innerW)
            .attr('y1', yScale(extrema.max.y))
            .attr('y2', yScale(extrema.max.y))
            .style('stroke', '#DC2626')
            .style('stroke-width', 1)
            .style('stroke-dasharray', '4,3')
            .style('stroke-opacity', 0.5);
        }

        if (showMin) {
          g.append('line')
            .attr('x1', 0)
            .attr('x2', innerW)
            .attr('y1', yScale(extrema.min.y))
            .attr('y2', yScale(extrema.min.y))
            .style('stroke', '#059669')
            .style('stroke-width', 1)
            .style('stroke-dasharray', '4,3')
            .style('stroke-opacity', 0.5);
        }

        // Domain boundary indicators
        if (!useCompactDomain) {
          // Open/unbounded domain warning
          g.append('text')
            .attr('x', innerW / 2)
            .attr('y', innerH + 40)
            .attr('text-anchor', 'middle')
            .style('font-size', '11px')
            .style('fill', '#DC2626')
            .text(preset.nonCompactType === 'open'
              ? 'Domain is open — extrema may not be attained at boundary'
              : 'Domain is unbounded — function may have no finite extremum');
        }
      } else if (tab === 'heine-cantor' && uniformDeltaData) {
        // Show epsilon bands and delta neighborhoods at sample points
        uniformDeltaData.deltas.forEach((d, i) => {
          const cx = xScale(d.x);
          const cy = yScale(d.fA);

          // Epsilon band
          g.append('rect')
            .attr('x', cx - 15)
            .attr('y', yScale(d.fA + epsilon))
            .attr('width', 30)
            .attr('height', yScale(d.fA - epsilon) - yScale(d.fA + epsilon))
            .style('fill', regionColors.epsilonBand)
            .style('fill-opacity', 0.3);

          // Delta neighborhood on x-axis
          const deltaWidth = xScale(d.x + d.delta) - xScale(d.x - d.delta);
          g.append('rect')
            .attr('x', xScale(d.x - d.delta))
            .attr('y', innerH - 4)
            .attr('width', deltaWidth)
            .attr('height', 8)
            .style('fill', d.delta > uniformDeltaData.minDelta * 1.1 ? '#059669' : '#D97706')
            .style('fill-opacity', 0.5);

          // Point marker
          g.append('circle')
            .attr('cx', cx)
            .attr('cy', cy)
            .attr('r', 3)
            .style('fill', uniformDeltaData.uniformWorks ? '#059669' : '#DC2626');
        });

        // Uniform delta indicator
        if (uniformDeltaData.uniformWorks) {
          g.append('text')
            .attr('x', innerW / 2)
            .attr('y', innerH + 40)
            .attr('text-anchor', 'middle')
            .style('font-size', '11px')
            .style('fill', '#059669')
            .style('font-weight', '600')
            .text(`Uniform δ ≈ ${uniformDeltaData.minDelta.toFixed(4)} works for all points (Heine-Cantor)`);
        } else {
          g.append('text')
            .attr('x', innerW / 2)
            .attr('y', innerH + 40)
            .attr('text-anchor', 'middle')
            .style('font-size', '11px')
            .style('fill', '#DC2626')
            .style('font-weight', '600')
            .text('No uniform δ works — function is not uniformly continuous on this domain');
        }
      }
    },
    [width, height, curveData, tab, presetIdx, useCompactDomain, epsilon, uniformDeltaData],
  );

  return (
    <div className="my-8 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
      {/* Tab selector */}
      <div className="mb-3 flex border-b border-zinc-200 dark:border-zinc-700">
        <button
          className={`px-4 py-2 text-sm font-medium ${tab === 'evt'
            ? 'border-b-2 border-blue-600 text-blue-600'
            : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400'
          }`}
          onClick={() => setTab('evt')}
        >
          Extreme Value Theorem
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium ${tab === 'heine-cantor'
            ? 'border-b-2 border-blue-600 text-blue-600'
            : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400'
          }`}
          onClick={() => setTab('heine-cantor')}
        >
          Uniform Continuity (Heine-Cantor)
        </button>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Function:</label>
        <select
          className="rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
          value={presetIdx}
          onChange={(e) => setPresetIdx(Number(e.target.value))}
        >
          {presets.map((p, i) => (
            <option key={p.name} value={i}>{p.label}</option>
          ))}
        </select>

        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Domain:</label>
        <div className="flex gap-2">
          <button
            className={`rounded px-3 py-1 text-sm font-medium ${useCompactDomain
              ? 'bg-blue-600 text-white'
              : 'bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300'
            }`}
            onClick={() => setUseCompactDomain(true)}
          >
            Compact
          </button>
          <button
            className={`rounded px-3 py-1 text-sm font-medium ${!useCompactDomain
              ? 'bg-red-600 text-white'
              : 'bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300'
            }`}
            onClick={() => setUseCompactDomain(false)}
          >
            Non-compact
          </button>
        </div>

        {tab === 'heine-cantor' && (
          <div className="flex items-center gap-2">
            <label className="text-sm text-zinc-600 dark:text-zinc-400">ε = {epsilon.toFixed(2)}</label>
            <input
              type="range"
              min={0.05}
              max={1}
              step={0.05}
              value={epsilon}
              onChange={(e) => setEpsilon(Number(e.target.value))}
              className="w-24"
            />
          </div>
        )}
      </div>

      <div ref={containerRef} className="w-full">
        <svg ref={svgRef} width={width} height={height} />
      </div>
    </div>
  );
}
