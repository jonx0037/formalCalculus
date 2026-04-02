import { useState, useMemo, useCallback, type ChangeEvent } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { VECTOR_FIELD_PRESETS } from '../../data/jacobian-data';
import { areaDistortion } from './shared/multivariate';
import { functionColors } from './shared/colorScales';

const margin = { top: 20, right: 16, bottom: 36, left: 42 };
const GAP = 24;

export default function JacobianDeterminantExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();
  const totalHeight = Math.min(width * 0.5, 420);

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [probePoint, setProbePoint] = useState<[number, number]>(
    VECTOR_FIELD_PRESETS[0].defaultPoint,
  );
  const [squareSize, setSquareSize] = useState(0.3);
  const [showHeatmap, setShowHeatmap] = useState(false);

  const preset = VECTOR_FIELD_PRESETS[selectedIdx];

  const handlePresetChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    const idx = Number(e.target.value);
    setSelectedIdx(idx);
    setProbePoint(VECTOR_FIELD_PRESETS[idx].defaultPoint);
    setSquareSize(0.3);
  }, []);

  // Area distortion data
  const distortion = useMemo(() => {
    const J = preset.J(probePoint[0], probePoint[1]);
    return areaDistortion(preset.f, probePoint, squareSize, J);
  }, [selectedIdx, probePoint, squareSize]);

  // Heatmap data: |det J| sampled on a grid
  const heatmapData = useMemo(() => {
    if (!showHeatmap) return null;
    const gridN = 40;
    const data: Array<{ x: number; y: number; absDetJ: number }> = [];
    const dx = (preset.xDomain[1] - preset.xDomain[0]) / gridN;
    const dy = (preset.yDomain[1] - preset.yDomain[0]) / gridN;
    for (let i = 0; i < gridN; i++) {
      for (let j = 0; j < gridN; j++) {
        const x = preset.xDomain[0] + (i + 0.5) * dx;
        const y = preset.yDomain[0] + (j + 0.5) * dy;
        const J = preset.J(x, y);
        const det = J[0][0] * J[1][1] - J[0][1] * J[1][0];
        data.push({ x, y, absDetJ: Math.abs(det) });
      }
    }
    return { data, dx, dy, gridN };
  }, [selectedIdx, showHeatmap]);

  // Output domain from distortion vertices
  const outputBounds = useMemo(() => {
    const allPts = distortion.outputVertices;
    const fPt = preset.f(probePoint[0], probePoint[1]);
    let xMin = fPt[0], xMax = fPt[0], yMin = fPt[1], yMax = fPt[1];
    for (const [x, y] of allPts) {
      xMin = Math.min(xMin, x); xMax = Math.max(xMax, x);
      yMin = Math.min(yMin, y); yMax = Math.max(yMax, y);
    }
    // Also include a reasonable range around f(a)
    const span = Math.max(xMax - xMin, yMax - yMin, 1);
    const pad = 0.5 * span;
    return {
      xDomain: [xMin - pad, xMax + pad] as [number, number],
      yDomain: [yMin - pad, yMax + pad] as [number, number],
    };
  }, [distortion, probePoint, selectedIdx]);

  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (width <= 0 || totalHeight <= 0) return;

      const panelW = (width - GAP) / 2 - margin.left - margin.right;
      const panelH = totalHeight - margin.top - margin.bottom;
      if (panelW <= 0 || panelH <= 0) return;

      const xIn = d3.scaleLinear().domain(preset.xDomain).range([0, panelW]);
      const yIn = d3.scaleLinear().domain(preset.yDomain).range([panelH, 0]);
      const xOut = d3.scaleLinear().domain(outputBounds.xDomain).range([0, panelW]);
      const yOut = d3.scaleLinear().domain(outputBounds.yDomain).range([panelH, 0]);

      const gLeft = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
      const rightOffset = margin.left + panelW + margin.right + GAP + margin.left;
      const gRight = svg.append('g').attr('transform', `translate(${rightOffset},${margin.top})`);

      // Labels
      svg.append('text').attr('x', margin.left + panelW / 2).attr('y', 14)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px').style('font-weight', '600').style('fill', '#374151')
        .text('Input Domain');
      svg.append('text').attr('x', rightOffset + panelW / 2).attr('y', 14)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px').style('font-weight', '600').style('fill', '#374151')
        .text('Output Domain');

      // Heatmap overlay on left panel
      if (heatmapData) {
        const maxDet = d3.max(heatmapData.data, (d) => d.absDetJ) || 1;
        const colorScale = d3.scaleSequential(d3.interpolateYlOrRd).domain([0, maxDet]);

        heatmapData.data.forEach(({ x, y, absDetJ }) => {
          const px = xIn(x - heatmapData.dx / 2);
          const py = yIn(y + heatmapData.dy / 2);
          const pw = Math.abs(xIn(x + heatmapData.dx / 2) - px);
          const ph = Math.abs(yIn(y - heatmapData.dy / 2) - py);
          gLeft.append('rect')
            .attr('x', px).attr('y', py)
            .attr('width', pw).attr('height', ph)
            .attr('fill', colorScale(absDetJ))
            .attr('opacity', 0.5);
        });
      }

      // Input square
      const squareLine = d3.line<[number, number]>()
        .x((d) => xIn(d[0])).y((d) => yIn(d[1]));
      const closedInput = [...distortion.inputVertices, distortion.inputVertices[0]];
      gLeft.append('path')
        .datum(closedInput)
        .attr('d', squareLine)
        .attr('fill', 'rgba(37, 99, 235, 0.2)')
        .attr('stroke', functionColors[0])
        .attr('stroke-width', 2);

      // Probe point
      gLeft.append('circle')
        .attr('cx', xIn(probePoint[0])).attr('cy', yIn(probePoint[1]))
        .attr('r', 4).attr('fill', functionColors[1])
        .attr('stroke', '#fff').attr('stroke-width', 1.5);

      // Output parallelogram
      const paraLine = d3.line<[number, number]>()
        .x((d) => xOut(d[0])).y((d) => yOut(d[1]));
      const closedOutput = [...distortion.outputVertices, distortion.outputVertices[0]];
      gRight.append('path')
        .datum(closedOutput)
        .attr('d', paraLine)
        .attr('fill', 'rgba(37, 99, 235, 0.2)')
        .attr('stroke', functionColors[0])
        .attr('stroke-width', 2);

      // Image of probe point
      const fPt = preset.f(probePoint[0], probePoint[1]);
      gRight.append('circle')
        .attr('cx', xOut(fPt[0])).attr('cy', yOut(fPt[1]))
        .attr('r', 4).attr('fill', functionColors[1])
        .attr('stroke', '#fff').attr('stroke-width', 1.5);

      // Drag behavior
      const drag = d3.drag<SVGRectElement, unknown>()
        .on('drag', (event) => {
          const [mx, my] = d3.pointer(event, gLeft.node());
          const x = xIn.invert(Math.max(0, Math.min(panelW, mx)));
          const y = yIn.invert(Math.max(0, Math.min(panelH, my)));
          setProbePoint([x, y]);
        });
      gLeft.append('rect')
        .attr('width', panelW).attr('height', panelH)
        .attr('fill', 'transparent').style('cursor', 'crosshair')
        .call(drag);

      // Axes
      gLeft.append('g').attr('transform', `translate(0,${panelH})`)
        .call(d3.axisBottom(xIn).ticks(5)).selectAll('text').style('font-size', '10px');
      gLeft.append('g')
        .call(d3.axisLeft(yIn).ticks(5)).selectAll('text').style('font-size', '10px');
      gRight.append('g').attr('transform', `translate(0,${panelH})`)
        .call(d3.axisBottom(xOut).ticks(5)).selectAll('text').style('font-size', '10px');
      gRight.append('g')
        .call(d3.axisLeft(yOut).ticks(5)).selectAll('text').style('font-size', '10px');
    },
    [width, totalHeight, selectedIdx, probePoint, squareSize, showHeatmap, distortion, outputBounds, heatmapData],
  );

  const fmt = (v: number) => v.toFixed(4);

  return (
    <div ref={containerRef} className="w-full my-6">
      <div className="flex flex-wrap items-center gap-4 mb-3 text-sm">
        <label className="flex items-center gap-1.5">
          <span className="font-medium text-slate-700">Function:</span>
          <select value={selectedIdx} onChange={handlePresetChange}
            className="border border-slate-300 rounded px-2 py-1 text-sm bg-white">
            {VECTOR_FIELD_PRESETS.map((p, i) => (
              <option key={p.name} value={i}>{p.label}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1.5">
          <span className="font-medium text-slate-700">Square size:</span>
          <input type="range" min={0.05} max={1} step={0.05} value={squareSize}
            onChange={(e) => setSquareSize(Number(e.target.value))} className="w-24" />
          <span className="font-mono text-slate-500 w-12">{squareSize.toFixed(2)}</span>
        </label>
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={showHeatmap}
            onChange={(e) => setShowHeatmap(e.target.checked)} className="rounded" />
          <span className="text-slate-700">Show |det J| heatmap</span>
        </label>
      </div>

      {width > 0 && (
        <svg ref={svgRef} width={width} height={totalHeight}
          className="border border-slate-200 rounded bg-white" />
      )}

      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <div className="bg-slate-50 rounded p-2">
          <div className="text-xs font-medium text-slate-500 mb-1">det J_f(a)</div>
          <div className="font-mono text-slate-800">{fmt(distortion.detJ)}</div>
        </div>
        <div className="bg-slate-50 rounded p-2">
          <div className="text-xs font-medium text-slate-500 mb-1">Input area</div>
          <div className="font-mono text-slate-800">{fmt(distortion.inputArea)}</div>
        </div>
        <div className="bg-slate-50 rounded p-2">
          <div className="text-xs font-medium text-slate-500 mb-1">Output area</div>
          <div className="font-mono text-slate-800">{fmt(distortion.outputArea)}</div>
        </div>
        <div className="bg-blue-50 rounded p-2">
          <div className="text-xs font-medium text-blue-600 mb-1">Ratio → |det J|</div>
          <div className="font-mono text-blue-900">{fmt(distortion.ratio)}</div>
          <div className="text-xs text-blue-500">|det J| = {fmt(Math.abs(distortion.detJ))}</div>
        </div>
      </div>
    </div>
  );
}
