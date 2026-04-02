import { useState, useMemo, useCallback, useId, type ChangeEvent } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { VECTOR_FIELD_PRESETS } from '../../data/jacobian-data';
import { coordinateTransform, jacobianMatrix } from './shared/multivariate';
import { functionColors } from './shared/colorScales';

const margin = { top: 20, right: 16, bottom: 36, left: 42 };
const GAP = 24; // px between panels

export default function JacobianGridExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();
  const totalHeight = Math.min(width * 0.5, 420);
  const id = useId().replace(/:/g, '');

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [probePoint, setProbePoint] = useState<[number, number]>(
    VECTOR_FIELD_PRESETS[0].defaultPoint,
  );
  const [gridDensity, setGridDensity] = useState(10);
  const [showSquare, setShowSquare] = useState(true);

  const preset = VECTOR_FIELD_PRESETS[selectedIdx];

  const handlePresetChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    const idx = Number(e.target.value);
    setSelectedIdx(idx);
    setProbePoint(VECTOR_FIELD_PRESETS[idx].defaultPoint);
  }, []);

  // Grid data
  const gridData = useMemo(
    () =>
      coordinateTransform(preset.f, preset.xDomain, preset.yDomain, gridDensity),
    [selectedIdx, gridDensity],
  );

  // Jacobian at probe point
  const jacobianInfo = useMemo(() => {
    const wrapF = (...args: number[]) => {
      const [a, b] = preset.f(args[0], args[1]);
      return [a, b];
    };
    const jr = jacobianMatrix(wrapF, [...probePoint]);
    const fVal = preset.f(probePoint[0], probePoint[1]);
    const analyticalJ = preset.J(probePoint[0], probePoint[1]);
    const det = analyticalJ[0][0] * analyticalJ[1][1] - analyticalJ[0][1] * analyticalJ[1][0];
    return { jr, fVal, analyticalJ, det };
  }, [selectedIdx, probePoint]);

  // Unit square corners mapped through the Jacobian
  const squareData = useMemo(() => {
    if (!showSquare) return null;
    const s = 0.15;
    const [cx, cy] = probePoint;
    const inputCorners: Array<[number, number]> = [
      [cx - s, cy - s], [cx + s, cy - s],
      [cx + s, cy + s], [cx - s, cy + s],
    ];
    const outputCorners = inputCorners.map(([x, y]) => preset.f(x, y));
    return { inputCorners, outputCorners };
  }, [selectedIdx, probePoint, showSquare]);

  // Compute output domain bounds from the grid data
  const outputBounds = useMemo(() => {
    let xMin = Infinity, xMax = -Infinity;
    let yMin = Infinity, yMax = -Infinity;
    for (const [x, y] of gridData.outputGrid) {
      if (isFinite(x) && isFinite(y)) {
        xMin = Math.min(xMin, x);
        xMax = Math.max(xMax, x);
        yMin = Math.min(yMin, y);
        yMax = Math.max(yMax, y);
      }
    }
    const pad = 0.1 * Math.max(xMax - xMin, yMax - yMin, 1);
    return {
      xDomain: [xMin - pad, xMax + pad] as [number, number],
      yDomain: [yMin - pad, yMax + pad] as [number, number],
    };
  }, [gridData]);

  // D3 rendering
  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (width <= 0 || totalHeight <= 0) return;

      const panelW = (width - GAP) / 2 - margin.left - margin.right;
      const panelH = totalHeight - margin.top - margin.bottom;
      if (panelW <= 0 || panelH <= 0) return;

      // Scales — input panel
      const xScaleIn = d3.scaleLinear().domain(preset.xDomain).range([0, panelW]);
      const yScaleIn = d3.scaleLinear().domain(preset.yDomain).range([panelH, 0]);

      // Scales — output panel
      const xScaleOut = d3.scaleLinear().domain(outputBounds.xDomain).range([0, panelW]);
      const yScaleOut = d3.scaleLinear().domain(outputBounds.yDomain).range([panelH, 0]);

      // Left panel group
      const leftOffset = margin.left;
      const gLeft = svg.append('g').attr('transform', `translate(${leftOffset},${margin.top})`);

      // Right panel group
      const rightOffset = margin.left + panelW + margin.right + GAP + margin.left;
      const gRight = svg.append('g').attr('transform', `translate(${rightOffset},${margin.top})`);

      // Panel labels
      svg.append('text')
        .attr('x', leftOffset + panelW / 2).attr('y', 14)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px').style('font-weight', '600').style('fill', '#374151')
        .text('Input Domain');
      svg.append('text')
        .attr('x', rightOffset + panelW / 2).attr('y', 14)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px').style('font-weight', '600').style('fill', '#374151')
        .text('Output Domain');

      const lineGen = d3.line<[number, number]>();

      // Draw grid lines
      const gridColor = '#CBD5E1';
      const gridWidth = 0.6;

      // Input grid
      gridData.inputLines.forEach((line) => {
        gLeft.append('path')
          .datum(line)
          .attr('d', lineGen.x(d => xScaleIn(d[0])).y(d => yScaleIn(d[1])))
          .attr('fill', 'none')
          .attr('stroke', gridColor)
          .attr('stroke-width', gridWidth);
      });

      // Output grid (deformed)
      const outputLineGen = d3.line<[number, number]>()
        .x(d => xScaleOut(d[0])).y(d => yScaleOut(d[1]))
        .defined(d => isFinite(d[0]) && isFinite(d[1]));
      gridData.outputLines.forEach((line) => {
        gRight.append('path')
          .datum(line)
          .attr('d', outputLineGen)
          .attr('fill', 'none')
          .attr('stroke', gridColor)
          .attr('stroke-width', gridWidth);
      });

      // Unit square and parallelogram
      if (squareData) {
        const squareLine = d3.line<[number, number]>()
          .x(d => xScaleIn(d[0])).y(d => yScaleIn(d[1]));
        gLeft.append('path')
          .datum([...squareData.inputCorners, squareData.inputCorners[0]])
          .attr('d', squareLine)
          .attr('fill', 'rgba(37, 99, 235, 0.15)')
          .attr('stroke', functionColors[0])
          .attr('stroke-width', 1.5);

        const paraLine = d3.line<[number, number]>()
          .x(d => xScaleOut(d[0])).y(d => yScaleOut(d[1]));
        gRight.append('path')
          .datum([...squareData.outputCorners, squareData.outputCorners[0]])
          .attr('d', paraLine)
          .attr('fill', 'rgba(37, 99, 235, 0.15)')
          .attr('stroke', functionColors[0])
          .attr('stroke-width', 1.5);
      }

      // Probe point (input)
      gLeft.append('circle')
        .attr('cx', xScaleIn(probePoint[0]))
        .attr('cy', yScaleIn(probePoint[1]))
        .attr('r', 5)
        .attr('fill', functionColors[1])
        .attr('stroke', '#fff')
        .attr('stroke-width', 1.5)
        .style('cursor', 'grab');

      // Probe point image (output)
      const [fx, fy] = jacobianInfo.fVal;
      gRight.append('circle')
        .attr('cx', xScaleOut(fx))
        .attr('cy', yScaleOut(fy))
        .attr('r', 5)
        .attr('fill', functionColors[1])
        .attr('stroke', '#fff')
        .attr('stroke-width', 1.5);

      // Drag behavior on left panel
      const drag = d3.drag<SVGRectElement, unknown>()
        .on('drag', (event) => {
          const [mx, my] = d3.pointer(event, gLeft.node());
          const x = xScaleIn.invert(Math.max(0, Math.min(panelW, mx)));
          const y = yScaleIn.invert(Math.max(0, Math.min(panelH, my)));
          setProbePoint([x, y]);
        });

      gLeft.append('rect')
        .attr('width', panelW).attr('height', panelH)
        .attr('fill', 'transparent')
        .style('cursor', 'crosshair')
        .call(drag);

      // Axes
      gLeft.append('g').attr('transform', `translate(0,${panelH})`)
        .call(d3.axisBottom(xScaleIn).ticks(5))
        .selectAll('text').style('font-size', '10px');
      gLeft.append('g')
        .call(d3.axisLeft(yScaleIn).ticks(5))
        .selectAll('text').style('font-size', '10px');

      gRight.append('g').attr('transform', `translate(0,${panelH})`)
        .call(d3.axisBottom(xScaleOut).ticks(5))
        .selectAll('text').style('font-size', '10px');
      gRight.append('g')
        .call(d3.axisLeft(yScaleOut).ticks(5))
        .selectAll('text').style('font-size', '10px');
    },
    [width, totalHeight, selectedIdx, gridDensity, probePoint, showSquare, gridData, outputBounds, squareData, jacobianInfo],
  );

  const fmt = (v: number) => v.toFixed(3);
  const J = jacobianInfo.analyticalJ;

  return (
    <div ref={containerRef} className="w-full my-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4 mb-3 text-sm">
        <label className="flex items-center gap-1.5">
          <span className="font-medium text-slate-700">Function:</span>
          <select
            value={selectedIdx}
            onChange={handlePresetChange}
            className="border border-slate-300 rounded px-2 py-1 text-sm bg-white"
          >
            {VECTOR_FIELD_PRESETS.map((p, i) => (
              <option key={p.name} value={i}>{p.label}</option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-1.5">
          <span className="font-medium text-slate-700">Grid:</span>
          <input
            type="range" min={5} max={20} step={1} value={gridDensity}
            onChange={(e) => setGridDensity(Number(e.target.value))}
            className="w-20"
          />
          <span className="text-slate-500 w-8">{gridDensity}</span>
        </label>

        <label className="flex items-center gap-1.5">
          <input
            type="checkbox" checked={showSquare}
            onChange={(e) => setShowSquare(e.target.checked)}
            className="rounded"
          />
          <span className="text-slate-700">Show local square</span>
        </label>
      </div>

      {/* SVG */}
      {width > 0 && (
        <svg ref={svgRef} width={width} height={totalHeight}
          className="border border-slate-200 rounded bg-white" />
      )}

      {/* Readout */}
      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <div className="bg-slate-50 rounded p-2">
          <div className="text-xs font-medium text-slate-500 mb-1">Point a</div>
          <div className="font-mono text-slate-800">
            ({fmt(probePoint[0])}, {fmt(probePoint[1])})
          </div>
        </div>
        <div className="bg-slate-50 rounded p-2">
          <div className="text-xs font-medium text-slate-500 mb-1">f(a)</div>
          <div className="font-mono text-slate-800">
            ({fmt(jacobianInfo.fVal[0])}, {fmt(jacobianInfo.fVal[1])})
          </div>
        </div>
        <div className="bg-slate-50 rounded p-2">
          <div className="text-xs font-medium text-slate-500 mb-1">J_f(a)</div>
          <div className="font-mono text-slate-800 text-xs leading-tight">
            [{fmt(J[0][0])}, {fmt(J[0][1])}]<br/>
            [{fmt(J[1][0])}, {fmt(J[1][1])}]
          </div>
        </div>
        <div className="bg-slate-50 rounded p-2">
          <div className="text-xs font-medium text-slate-500 mb-1">det J_f(a)</div>
          <div className="font-mono text-slate-800">{fmt(jacobianInfo.det)}</div>
          <div className="text-xs text-slate-500">|det| = {fmt(Math.abs(jacobianInfo.det))}</div>
        </div>
      </div>
    </div>
  );
}
