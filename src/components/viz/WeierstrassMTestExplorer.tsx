import { useState, useMemo } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { getFunctionSeriesPresets } from '../../data/uniform-convergence-data';
import { weierstrassMTest } from './shared/limits';
import { functionColors, regionColors } from './shared/colorScales';

const margin = { top: 20, right: 20, bottom: 45, left: 50 };

export default function WeierstrassMTestExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();
  const height = Math.min(width * 0.55, 400);

  const presets = useMemo(() => getFunctionSeriesPresets(), []);
  const [presetIdx, setPresetIdx] = useState(0);
  const [n, setN] = useState(5);
  const [showMk, setShowMk] = useState(true);

  const preset = presets[presetIdx];

  const mResult = useMemo(
    () => weierstrassMTest(preset.term, preset.Mk, preset.domain, n, 200, 300),
    [preset, n],
  );

  // Half-width for side-by-side panels
  const panelW = Math.max(0, (width - margin.left - margin.right - 30) / 2);

  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (width === 0 || panelW < 50) return;

      const innerH = height - margin.top - margin.bottom;

      // ── Left panel: Partial sums S_n(x) ──
      const gL = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const [xMin, xMax] = preset.domain;
      const gridSize = 300;
      const step = (xMax - xMin) / gridSize;

      // Compute partial sum at current n and a "full" sum at maxK
      // Use the same maxK as weierstrassMTest() for consistent error/bound display
      const FULL_SUM_K = 200;
      const partialPoints: [number, number][] = [];
      const fullPoints: [number, number][] = [];
      for (let i = 0; i <= gridSize; i++) {
        const x = xMin + step * i;
        let partial = 0;
        let full = 0;
        for (let k = 1; k <= FULL_SUM_K; k++) {
          const term = preset.term(x, k);
          if (k <= n) partial += term;
          full += term;
        }
        partialPoints.push([x, partial]);
        fullPoints.push([x, full]);
      }

      const allY = [...partialPoints.map((p) => p[1]), ...fullPoints.map((p) => p[1])];
      const yExtent = d3.extent(allY) as [number, number];
      const yPad = (yExtent[1] - yExtent[0]) * 0.15 || 0.5;

      const xScaleL = d3.scaleLinear().domain([xMin, xMax]).range([0, panelW]);
      const yScaleL = d3
        .scaleLinear()
        .domain([yExtent[0] - yPad, yExtent[1] + yPad])
        .range([innerH, 0]);

      gL.append('g')
        .attr('transform', `translate(0,${innerH})`)
        .call(d3.axisBottom(xScaleL).ticks(5))
        .selectAll('text')
        .style('font-size', '10px');
      gL.append('g')
        .call(d3.axisLeft(yScaleL).ticks(5))
        .selectAll('text')
        .style('font-size', '10px');

      // "Full" sum (reference)
      const fullLine = d3
        .line<[number, number]>()
        .x((d) => xScaleL(d[0]))
        .y((d) => yScaleL(d[1]));
      gL.append('path')
        .datum(fullPoints)
        .attr('d', fullLine)
        .attr('stroke', '#A1A1AA')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '4,3')
        .attr('fill', 'none');

      // Partial sum S_n
      const partialLine = d3
        .line<[number, number]>()
        .x((d) => xScaleL(d[0]))
        .y((d) => yScaleL(d[1]));
      gL.append('path')
        .datum(partialPoints)
        .attr('d', partialLine)
        .attr('stroke', functionColors[0])
        .attr('stroke-width', 2.5)
        .attr('fill', 'none');

      // M_k bound envelope on partial sums
      if (showMk) {
        // Show ± tail bound as band around full sum
        const tailBound = mResult.tailBound;
        const bandArea = d3
          .area<[number, number]>()
          .x((d) => xScaleL(d[0]))
          .y0((d) => yScaleL(d[1] - tailBound))
          .y1((d) => yScaleL(d[1] + tailBound));
        gL.append('path')
          .datum(fullPoints)
          .attr('d', bandArea)
          .attr('fill', regionColors.epsilonBand)
          .attr('fill-opacity', 0.3)
          .attr('stroke', 'none');
      }

      gL.append('text')
        .attr('x', panelW / 2)
        .attr('y', -5)
        .attr('text-anchor', 'middle')
        .style('font-size', '11px')
        .style('font-weight', '600')
        .style('fill', '#3F3F46')
        .text(`Partial Sums S_${n}(x)`);

      // ── Right panel: M_k bars and tail convergence ──
      const gR = svg
        .append('g')
        .attr('transform', `translate(${margin.left + panelW + 30},${margin.top})`);

      const maxBars = Math.min(n + 10, 30);
      const mkValues = Array.from({ length: maxBars }, (_, i) => ({
        k: i + 1,
        Mk: preset.Mk(i + 1),
        inPartial: i + 1 <= n,
      }));

      const xScaleR = d3
        .scaleBand<number>()
        .domain(mkValues.map((d) => d.k))
        .range([0, panelW])
        .padding(0.15);
      const yMaxR = Math.max(...mkValues.map((d) => d.Mk)) * 1.2 || 1;
      const yScaleR = d3.scaleLinear().domain([0, yMaxR]).range([innerH, 0]);

      gR.append('g')
        .attr('transform', `translate(0,${innerH})`)
        .call(
          d3
            .axisBottom(xScaleR)
            .tickValues(mkValues.filter((_, i) => i % Math.ceil(maxBars / 8) === 0).map((d) => d.k))
        )
        .selectAll('text')
        .style('font-size', '10px');
      gR.append('g')
        .call(d3.axisLeft(yScaleR).ticks(5))
        .selectAll('text')
        .style('font-size', '10px');

      gR.selectAll('.mk-bar')
        .data(mkValues)
        .enter()
        .append('rect')
        .attr('class', 'mk-bar')
        .attr('x', (d) => xScaleR(d.k)!)
        .attr('y', (d) => yScaleR(d.Mk))
        .attr('width', xScaleR.bandwidth())
        .attr('height', (d) => innerH - yScaleR(d.Mk))
        .attr('fill', (d) => (d.inPartial ? functionColors[0] : '#D4D4D8'))
        .attr('opacity', 0.7);

      // Divider line at k = n
      if (n < maxBars) {
        const divX = (xScaleR(n)! + xScaleR(n + 1)!) / 2;
        gR.append('line')
          .attr('x1', divX)
          .attr('x2', divX)
          .attr('y1', 0)
          .attr('y2', innerH)
          .attr('stroke', functionColors[1])
          .attr('stroke-width', 1.5)
          .attr('stroke-dasharray', '4,3');
        gR.append('text')
          .attr('x', divX + 4)
          .attr('y', 12)
          .style('font-size', '10px')
          .style('fill', functionColors[1])
          .text('tail →');
      }

      gR.append('text')
        .attr('x', panelW / 2)
        .attr('y', -5)
        .attr('text-anchor', 'middle')
        .style('font-size', '11px')
        .style('font-weight', '600')
        .style('fill', '#3F3F46')
        .text('M_k Bounds');

      // k label
      gR.append('text')
        .attr('x', panelW / 2)
        .attr('y', innerH + 38)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('fill', '#71717A')
        .text('k');
    },
    [width, height, preset, n, showMk, panelW, mResult],
  );

  return (
    <div className="my-8 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Series:
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
            checked={showMk}
            onChange={(e) => setShowMk(e.target.checked)}
            className="rounded"
          />
          Show M_k bounds
        </label>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-4">
        <label className="text-sm text-zinc-600 dark:text-zinc-400">
          n = <strong className="text-zinc-900 dark:text-zinc-100">{n}</strong> terms
        </label>
        <input
          type="range"
          min={1}
          max={50}
          value={n}
          onChange={(e) => setN(Number(e.target.value))}
          className="w-48"
        />
      </div>

      <div className="mb-2 flex flex-wrap gap-4 text-sm text-zinc-600 dark:text-zinc-400">
        <span>
          Actual ‖S − S<sub>n</sub>‖<sub>∞</sub> ≈{' '}
          <strong className="text-zinc-900 dark:text-zinc-100">
            {mResult.actualSupError.toFixed(5)}
          </strong>
        </span>
        <span>
          M-test bound ≈{' '}
          <strong className="text-zinc-900 dark:text-zinc-100">
            {mResult.tailBound.toFixed(5)}
          </strong>
        </span>
        <span>
          {preset.MtestPasses ? (
            <span className="font-semibold text-emerald-600">✓ M-test passes</span>
          ) : (
            <span className="font-semibold text-red-500">✗ M-test fails (∑M_k diverges)</span>
          )}
        </span>
      </div>

      <div ref={containerRef} className="w-full">
        <svg ref={svgRef} width={width} height={height} />
      </div>

      <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
        {preset.MkFormula} · Left: partial sums S_n(x) vs. full sum. Right: M_k bound bars (blue = included, gray = tail).
      </p>
    </div>
  );
}
