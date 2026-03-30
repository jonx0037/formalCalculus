import { useState, useMemo } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { getFunctionSequencePresets } from '../../data/uniform-convergence-data';
import { checkUniformConvergence } from './shared/limits';
import { functionColors, regionColors } from './shared/colorScales';

const margin = { top: 20, right: 30, bottom: 45, left: 50 };

export default function PointwiseVsUniformExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();
  const height = Math.min(width * 0.6, 440);

  const presets = useMemo(() => getFunctionSequencePresets(), []);
  const [presetIdx, setPresetIdx] = useState(0);
  const [n, setN] = useState(5);
  const [epsilon, setEpsilon] = useState(0.1);
  const [showBand, setShowBand] = useState(true);

  const preset = presets[presetIdx];

  // Compute sup-norm and uniform check
  const check = useMemo(() => {
    const fn = (x: number) => preset.fn(x, n);
    return checkUniformConvergence(fn, preset.limit, preset.domain, epsilon, 500);
  }, [preset, n, epsilon]);

  const actualSupNorm = useMemo(() => preset.supNorm(n), [preset, n]);

  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (width === 0) return;

      const innerW = width - margin.left - margin.right;
      const innerH = height - margin.top - margin.bottom;
      const g = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const [xMin, xMax] = preset.domain;

      // Sample points
      const numPoints = 400;
      const step = (xMax - xMin) / numPoints;
      const fnPoints: [number, number][] = [];
      const limitPoints: [number, number][] = [];
      for (let i = 0; i <= numPoints; i++) {
        const x = xMin + step * i;
        fnPoints.push([x, preset.fn(x, n)]);
        limitPoints.push([x, preset.limit(x)]);
      }

      // Y range from data
      const allY = [...fnPoints.map((p) => p[1]), ...limitPoints.map((p) => p[1])];
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

      // Axis labels
      g.append('text')
        .attr('x', innerW / 2)
        .attr('y', innerH + 38)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('fill', '#71717A')
        .text('x');

      // ε-band around limit
      if (showBand) {
        const bandPath = d3.area<[number, number]>()
          .x((d) => xScale(d[0]))
          .y0((d) => yScale(d[1] - epsilon))
          .y1((d) => yScale(d[1] + epsilon));

        g.append('path')
          .datum(limitPoints)
          .attr('d', bandPath)
          .attr('fill', regionColors.epsilonBand)
          .attr('fill-opacity', 0.4)
          .attr('stroke', 'none');

        // Band edges
        const topLine = d3.line<[number, number]>()
          .x((d) => xScale(d[0]))
          .y((d) => yScale(d[1] + epsilon));
        const botLine = d3.line<[number, number]>()
          .x((d) => xScale(d[0]))
          .y((d) => yScale(d[1] - epsilon));

        g.append('path')
          .datum(limitPoints)
          .attr('d', topLine)
          .attr('stroke', '#93C5FD')
          .attr('stroke-width', 1)
          .attr('stroke-dasharray', '4,3')
          .attr('fill', 'none');
        g.append('path')
          .datum(limitPoints)
          .attr('d', botLine)
          .attr('stroke', '#93C5FD')
          .attr('stroke-width', 1)
          .attr('stroke-dasharray', '4,3')
          .attr('fill', 'none');
      }

      // Limit function
      const limitLine = d3.line<[number, number]>()
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
      const fnLine = d3.line<[number, number]>()
        .x((d) => xScale(d[0]))
        .y((d) => yScale(d[1]));

      g.append('path')
        .datum(fnPoints)
        .attr('d', fnLine)
        .attr('stroke', functionColors[0])
        .attr('stroke-width', 2.5)
        .attr('fill', 'none');

      // Legend
      const legend = g
        .append('g')
        .attr('transform', `translate(${innerW - 140}, 5)`);

      legend
        .append('line')
        .attr('x1', 0)
        .attr('y1', 0)
        .attr('x2', 20)
        .attr('y2', 0)
        .attr('stroke', functionColors[0])
        .attr('stroke-width', 2.5);
      legend
        .append('text')
        .attr('x', 25)
        .attr('y', 4)
        .style('font-size', '11px')
        .style('fill', '#3F3F46')
        .text(`f_${n}(x)`);

      legend
        .append('line')
        .attr('x1', 0)
        .attr('y1', 18)
        .attr('x2', 20)
        .attr('y2', 18)
        .attr('stroke', functionColors[1])
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '6,4');
      legend
        .append('text')
        .attr('x', 25)
        .attr('y', 22)
        .style('font-size', '11px')
        .style('fill', '#3F3F46')
        .text('f(x) = lim');
    },
    [width, height, preset, n, epsilon, showBand],
  );

  return (
    <div className="my-8 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Sequence:
        </label>
        <select
          className="rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
          value={presetIdx}
          onChange={(e) => {
            setPresetIdx(Number(e.target.value));
            setN(5);
          }}
        >
          {presets.map((p, i) => (
            <option key={p.name} value={i}>
              {p.label}
            </option>
          ))}
        </select>

        <label className="flex items-center gap-1.5 text-sm text-zinc-600 dark:text-zinc-400">
          <input
            type="checkbox"
            checked={showBand}
            onChange={(e) => setShowBand(e.target.checked)}
            className="rounded"
          />
          Show ε-band
        </label>
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

        <label className="text-sm text-zinc-600 dark:text-zinc-400">
          ε ={' '}
          <strong className="text-zinc-900 dark:text-zinc-100">
            {epsilon.toFixed(3)}
          </strong>
        </label>
        <input
          type="range"
          min={-2}
          max={-0.3}
          step={0.01}
          value={Math.log10(epsilon)}
          onChange={(e) => setEpsilon(Math.pow(10, Number(e.target.value)))}
          className="w-32"
        />
      </div>

      <div className="mb-2 flex flex-wrap gap-4 text-sm text-zinc-600 dark:text-zinc-400">
        <span>
          ‖f<sub>n</sub> − f‖<sub>∞</sub> ={' '}
          <strong className="text-zinc-900 dark:text-zinc-100">
            {check.supNorm.toFixed(4)}
          </strong>
        </span>
        <span>
          {check.fitsInBand ? (
            <span className="font-semibold text-emerald-600">✓ Fits in ε-band (uniform at this n)</span>
          ) : (
            <span className="font-semibold text-red-500">✗ Escapes ε-band (not uniform at this n)</span>
          )}
        </span>
        <span className="text-xs italic">
          {preset.isUniform ? 'Converges uniformly' : 'Pointwise only — NOT uniform'}
        </span>
      </div>

      <div ref={containerRef} className="w-full">
        <svg ref={svgRef} width={width} height={height} />
      </div>

      <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
        {preset.supNormFormula} · {preset.mlContext}
      </p>
    </div>
  );
}
