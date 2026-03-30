import { useState, useMemo } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { functionColors, regionColors } from './shared/colorScales';

const margin = { top: 20, right: 30, bottom: 45, left: 50 };

// Uniform case: g_n(x) = x^n / n on [0,1], limit = 0 (continuous)
// Pointwise case: f_n(x) = x^n on [0,1], limit = step function (discontinuous)
function uniformFn(x: number, n: number): number {
  return Math.pow(x, n) / n;
}
function uniformLimit(_x: number): number {
  return 0;
}
function pointwiseFn(x: number, n: number): number {
  return Math.pow(x, n);
}
function pointwiseLimit(x: number): number {
  return x >= 1 ? 1 : 0;
}

export default function UniformLimitTheoremExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();
  const height = Math.min(width * 0.6, 440);

  const [mode, setMode] = useState<'uniform' | 'pointwise'>('uniform');
  const [n, setN] = useState(10);
  const [probeX, setProbeX] = useState<number | null>(null);
  const [probeEps] = useState(0.15);

  const isUniform = mode === 'uniform';
  const fn = isUniform ? uniformFn : pointwiseFn;
  const limit = isUniform ? uniformLimit : pointwiseLimit;
  const domain: [number, number] = [0, 1];

  // Continuity check at probe point
  const continuityCheck = useMemo(() => {
    if (probeX === null) return null;
    const a = probeX;
    const fa = limit(a);
    const eps = probeEps;

    // Find delta: largest region around a where |f(x) - f(a)| < eps
    const gridSize = 500;
    const step = 1 / gridSize;
    let delta = Infinity;
    for (let i = 0; i <= gridSize; i++) {
      const x = step * i;
      if (Math.abs(limit(x) - fa) >= eps) {
        const dist = Math.abs(x - a);
        if (dist < delta) delta = dist;
      }
    }
    // Clamp delta to domain bounds when no violation found
    if (delta === Infinity) {
      const [xMin, xMax] = domain;
      delta = Math.max(0, Math.min(a - xMin, xMax - a));
    }
    const found = delta > step * 2;
    return { a, fa, eps, delta: found ? delta * 0.9 : null, found };
  }, [probeX, probeEps, limit]);

  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (width === 0) return;

      const innerW = width - margin.left - margin.right;
      const innerH = height - margin.top - margin.bottom;
      const g = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const numPoints = 400;
      const step = 1 / numPoints;
      const fnPoints: [number, number][] = [];
      const limitPoints: [number, number][] = [];
      for (let i = 0; i <= numPoints; i++) {
        const x = step * i;
        fnPoints.push([x, fn(x, n)]);
        limitPoints.push([x, limit(x)]);
      }

      const yMin = isUniform ? -0.15 : -0.15;
      const yMax = isUniform ? 0.5 : 1.3;

      const xScale = d3.scaleLinear().domain([0, 1]).range([0, innerW]);
      const yScale = d3.scaleLinear().domain([yMin, yMax]).range([innerH, 0]);

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

      // ε/3 decomposition at probe point
      if (probeX !== null) {
        const a = probeX;
        const fa = limit(a);
        const fna = fn(a, n);

        // Highlight probe point
        g.append('line')
          .attr('x1', xScale(a))
          .attr('x2', xScale(a))
          .attr('y1', 0)
          .attr('y2', innerH)
          .attr('stroke', '#A1A1AA')
          .attr('stroke-width', 1)
          .attr('stroke-dasharray', '3,3');

        // Show the three segments of the ε/3 argument
        // Segment 1: |f(x) - f_n(x)| at probe (uniform convergence term)
        const seg1y0 = fa;
        const seg1y1 = fna;
        g.append('line')
          .attr('x1', xScale(a) - 8)
          .attr('x2', xScale(a) - 8)
          .attr('y1', yScale(seg1y0))
          .attr('y2', yScale(seg1y1))
          .attr('stroke', '#7C3AED')
          .attr('stroke-width', 3)
          .attr('opacity', 0.8);

        // Segment 2: |f_n(x) - f_n(a)| (continuity of f_n, shown at a nearby x)
        const nearX = Math.min(a + 0.05, 0.99);
        const fnNear = fn(nearX, n);
        g.append('line')
          .attr('x1', xScale(nearX))
          .attr('x2', xScale(nearX))
          .attr('y1', yScale(fna))
          .attr('y2', yScale(fnNear))
          .attr('stroke', '#059669')
          .attr('stroke-width', 3)
          .attr('opacity', 0.8);

        // Segment 3: |f_n(a) - f(a)| = same as segment 1
        g.append('line')
          .attr('x1', xScale(a) + 8)
          .attr('x2', xScale(a) + 8)
          .attr('y1', yScale(fna))
          .attr('y2', yScale(fa))
          .attr('stroke', '#D97706')
          .attr('stroke-width', 3)
          .attr('opacity', 0.8);

        // δ region if continuity check found a delta
        if (continuityCheck?.found && continuityCheck.delta) {
          const delta = continuityCheck.delta;
          g.append('rect')
            .attr('x', xScale(Math.max(0, a - delta)))
            .attr('y', 0)
            .attr('width', xScale(Math.min(1, a + delta)) - xScale(Math.max(0, a - delta)))
            .attr('height', innerH)
            .attr('fill', regionColors.deltaBand)
            .attr('fill-opacity', 0.2);
        }

        // Dots at probe
        g.append('circle')
          .attr('cx', xScale(a))
          .attr('cy', yScale(fa))
          .attr('r', 5)
          .attr('fill', functionColors[1]);
        g.append('circle')
          .attr('cx', xScale(a))
          .attr('cy', yScale(fna))
          .attr('r', 5)
          .attr('fill', functionColors[0]);
      }

      // Limit function
      const limitLine = d3
        .line<[number, number]>()
        .x((d) => xScale(d[0]))
        .y((d) => yScale(d[1]));

      g.append('path')
        .datum(limitPoints)
        .attr('d', limitLine)
        .attr('stroke', functionColors[1])
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '6,4')
        .attr('fill', 'none')
        .attr('opacity', 0.7);

      // f_n function
      const fnLine = d3
        .line<[number, number]>()
        .x((d) => xScale(d[0]))
        .y((d) => yScale(d[1]));

      g.append('path')
        .datum(fnPoints)
        .attr('d', fnLine)
        .attr('stroke', functionColors[0])
        .attr('stroke-width', 2.5)
        .attr('fill', 'none');

      // Clickable overlay for probe
      g.append('rect')
        .attr('width', innerW)
        .attr('height', innerH)
        .attr('fill', 'transparent')
        .style('cursor', 'crosshair')
        .on('click', (event: MouseEvent) => {
          const [mx] = d3.pointer(event);
          const x = xScale.invert(mx);
          if (x >= 0 && x <= 1) setProbeX(Math.round(x * 100) / 100);
        });

      // Legend
      const legend = g.append('g').attr('transform', `translate(${innerW - 155}, 5)`);
      legend
        .append('line')
        .attr('x1', 0).attr('y1', 0).attr('x2', 20).attr('y2', 0)
        .attr('stroke', functionColors[0]).attr('stroke-width', 2.5);
      legend.append('text').attr('x', 25).attr('y', 4)
        .style('font-size', '11px').style('fill', '#3F3F46')
        .text(`f_${n}(x)`);
      legend
        .append('line')
        .attr('x1', 0).attr('y1', 18).attr('x2', 20).attr('y2', 18)
        .attr('stroke', functionColors[1]).attr('stroke-width', 2).attr('stroke-dasharray', '6,4');
      legend.append('text').attr('x', 25).attr('y', 22)
        .style('font-size', '11px').style('fill', '#3F3F46')
        .text('f(x) = lim');

      // ε/3 legend
      if (probeX !== null) {
        const eLeg = g.append('g').attr('transform', `translate(5, ${innerH - 50})`);
        [
          { color: '#7C3AED', label: '|f(a) − f_n(a)|' },
          { color: '#059669', label: '|f_n(x) − f_n(a)|' },
          { color: '#D97706', label: '|f_n(a) − f(a)|' },
        ].forEach(({ color, label }, i) => {
          eLeg.append('line')
            .attr('x1', 0).attr('y1', i * 16).attr('x2', 14).attr('y2', i * 16)
            .attr('stroke', color).attr('stroke-width', 3);
          eLeg.append('text')
            .attr('x', 18).attr('y', i * 16 + 4)
            .style('font-size', '10px').style('fill', '#52525B')
            .text(label);
        });
      }
    },
    [width, height, fn, limit, n, probeX, probeEps, isUniform, continuityCheck],
  );

  return (
    <div className="my-8 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Mode:</label>
        <button
          className={`rounded px-3 py-1 text-sm font-medium ${isUniform ? 'bg-blue-600 text-white' : 'bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300'}`}
          onClick={() => { setMode('uniform'); setProbeX(null); }}
        >
          Uniform convergence
        </button>
        <button
          className={`rounded px-3 py-1 text-sm font-medium ${!isUniform ? 'bg-red-600 text-white' : 'bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300'}`}
          onClick={() => { setMode('pointwise'); setProbeX(null); }}
        >
          Pointwise only
        </button>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-4">
        <label className="text-sm text-zinc-600 dark:text-zinc-400">
          n = <strong className="text-zinc-900 dark:text-zinc-100">{n}</strong>
        </label>
        <input
          type="range"
          min={1}
          max={100}
          value={n}
          onChange={(e) => setN(Number(e.target.value))}
          className="w-40"
        />
        <span className="text-xs text-zinc-500 dark:text-zinc-500">
          Click on the graph to probe continuity at a point
        </span>
      </div>

      {continuityCheck && (
        <div className="mb-2 flex flex-wrap gap-4 text-sm text-zinc-600 dark:text-zinc-400">
          <span>
            Probing a = <strong className="text-zinc-900 dark:text-zinc-100">{continuityCheck.a.toFixed(2)}</strong>
          </span>
          <span>
            {continuityCheck.found ? (
              <span className="font-semibold text-emerald-600">
                ✓ Continuous — δ = {continuityCheck.delta?.toFixed(4)}
              </span>
            ) : (
              <span className="font-semibold text-red-500">
                ✗ Discontinuous — no valid δ exists
              </span>
            )}
          </span>
        </div>
      )}

      <div ref={containerRef} className="w-full">
        <svg ref={svgRef} width={width} height={height} />
      </div>

      <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
        {isUniform
          ? 'Uniform convergence (x^n/n → 0): the limit is continuous. The ε/3 argument works because one N controls all x.'
          : 'Pointwise convergence (x^n → step): the limit is discontinuous at x = 1. No δ works at the jump.'}
      </p>
    </div>
  );
}
