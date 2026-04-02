import { useState, useMemo, useCallback, type ChangeEvent } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { VECTOR_FIELD_PRESETS } from '../../data/jacobian-data';
import { functionColors } from './shared/colorScales';

const margin = { top: 20, right: 16, bottom: 36, left: 42 };
const GAP = 24;
const N_SAMPLES = 64; // points on the perturbation circle

export default function JacobianLinearApproxExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();
  const totalHeight = Math.min(width * 0.5, 420);

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [probePoint, setProbePoint] = useState<[number, number]>(
    VECTOR_FIELD_PRESETS[0].defaultPoint,
  );
  const [epsilon, setEpsilon] = useState(0.5);
  const [showError, setShowError] = useState(false);

  const preset = VECTOR_FIELD_PRESETS[selectedIdx];

  const handlePresetChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    const idx = Number(e.target.value);
    setSelectedIdx(idx);
    setProbePoint(VECTOR_FIELD_PRESETS[idx].defaultPoint);
    setEpsilon(0.5);
  }, []);

  // Sample circle, exact image, and linear approximation
  const circleData = useMemo(() => {
    const [cx, cy] = probePoint;
    const fA = preset.f(cx, cy);
    const J = preset.J(cx, cy);

    const inputPts: Array<[number, number]> = [];
    const exactPts: Array<[number, number]> = [];
    const approxPts: Array<[number, number]> = [];
    let totalError = 0;
    let maxError = 0;

    for (let i = 0; i <= N_SAMPLES; i++) {
      const theta = (i / N_SAMPLES) * 2 * Math.PI;
      const dx = epsilon * Math.cos(theta);
      const dy = epsilon * Math.sin(theta);

      inputPts.push([cx + dx, cy + dy]);

      // Exact: f(a + h)
      const [ex, ey] = preset.f(cx + dx, cy + dy);
      exactPts.push([ex, ey]);

      // Linear approx: f(a) + J_f(a) * h
      const ax = fA[0] + J[0][0] * dx + J[0][1] * dy;
      const ay = fA[1] + J[1][0] * dx + J[1][1] * dy;
      approxPts.push([ax, ay]);

      // Error
      const err = Math.sqrt((ex - ax) ** 2 + (ey - ay) ** 2);
      totalError += err;
      maxError = Math.max(maxError, err);
    }

    return {
      inputPts, exactPts, approxPts, fA,
      avgError: totalError / (N_SAMPLES + 1),
      maxError,
    };
  }, [selectedIdx, probePoint, epsilon]);

  // Output domain from exact+approx points
  const outputBounds = useMemo(() => {
    const allPts = [...circleData.exactPts, ...circleData.approxPts];
    let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
    for (const [x, y] of allPts) {
      if (isFinite(x) && isFinite(y)) {
        xMin = Math.min(xMin, x); xMax = Math.max(xMax, x);
        yMin = Math.min(yMin, y); yMax = Math.max(yMax, y);
      }
    }
    const pad = 0.15 * Math.max(xMax - xMin, yMax - yMin, 0.5);
    return {
      xDomain: [xMin - pad, xMax + pad] as [number, number],
      yDomain: [yMin - pad, yMax + pad] as [number, number],
    };
  }, [circleData]);

  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (width <= 0 || totalHeight <= 0) return;

      const panelW = (width - GAP) / 2 - margin.left - margin.right;
      const panelH = totalHeight - margin.top - margin.bottom;
      if (panelW <= 0 || panelH <= 0) return;

      // Scales
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
        .text('Input Space');
      svg.append('text').attr('x', rightOffset + panelW / 2).attr('y', 14)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px').style('font-weight', '600').style('fill', '#374151')
        .text('Output Space');

      // Input circle
      gLeft.append('circle')
        .attr('cx', xIn(probePoint[0])).attr('cy', yIn(probePoint[1]))
        .attr('r', Math.abs(xIn(probePoint[0] + epsilon) - xIn(probePoint[0])))
        .attr('fill', 'rgba(37, 99, 235, 0.08)')
        .attr('stroke', functionColors[0])
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '4,3');

      // Probe point
      gLeft.append('circle')
        .attr('cx', xIn(probePoint[0])).attr('cy', yIn(probePoint[1]))
        .attr('r', 4).attr('fill', functionColors[1]).attr('stroke', '#fff').attr('stroke-width', 1.5);

      // Exact image curve (red)
      const exactLine = d3.line<[number, number]>()
        .x(d => xOut(d[0])).y(d => yOut(d[1]))
        .defined(d => isFinite(d[0]) && isFinite(d[1]));
      gRight.append('path')
        .datum(circleData.exactPts)
        .attr('d', exactLine)
        .attr('fill', 'rgba(220, 38, 38, 0.08)')
        .attr('stroke', functionColors[1])
        .attr('stroke-width', 2);

      // Approx image ellipse (blue, dashed)
      const approxLine = d3.line<[number, number]>()
        .x(d => xOut(d[0])).y(d => yOut(d[1]));
      gRight.append('path')
        .datum(circleData.approxPts)
        .attr('d', approxLine)
        .attr('fill', 'rgba(37, 99, 235, 0.08)')
        .attr('stroke', functionColors[0])
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '6,3');

      // Error lines between exact and approx (optional)
      if (showError) {
        for (let i = 0; i < N_SAMPLES; i += 4) {
          const [ex, ey] = circleData.exactPts[i];
          const [ax, ay] = circleData.approxPts[i];
          if (isFinite(ex) && isFinite(ey) && isFinite(ax) && isFinite(ay)) {
            gRight.append('line')
              .attr('x1', xOut(ex)).attr('y1', yOut(ey))
              .attr('x2', xOut(ax)).attr('y2', yOut(ay))
              .attr('stroke', '#F59E0B')
              .attr('stroke-width', 1)
              .attr('stroke-dasharray', '2,2');
          }
        }
      }

      // Output center point
      gRight.append('circle')
        .attr('cx', xOut(circleData.fA[0])).attr('cy', yOut(circleData.fA[1]))
        .attr('r', 4).attr('fill', functionColors[1]).attr('stroke', '#fff').attr('stroke-width', 1.5);

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

      // Legend
      const legend = gRight.append('g').attr('transform', `translate(${panelW - 120}, 8)`);
      legend.append('line').attr('x1', 0).attr('y1', 0).attr('x2', 20).attr('y2', 0)
        .attr('stroke', functionColors[1]).attr('stroke-width', 2);
      legend.append('text').attr('x', 24).attr('y', 4)
        .style('font-size', '10px').style('fill', '#374151').text('Exact f(a+h)');
      legend.append('line').attr('x1', 0).attr('y1', 16).attr('x2', 20).attr('y2', 16)
        .attr('stroke', functionColors[0]).attr('stroke-width', 2).attr('stroke-dasharray', '6,3');
      legend.append('text').attr('x', 24).attr('y', 20)
        .style('font-size', '10px').style('fill', '#374151').text('Linear approx');
    },
    [width, totalHeight, selectedIdx, probePoint, epsilon, showError, circleData, outputBounds],
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
          <span className="font-medium text-slate-700">Radius &epsilon;:</span>
          <input type="range" min={0.05} max={2} step={0.05} value={epsilon}
            onChange={(e) => setEpsilon(Number(e.target.value))} className="w-24" />
          <span className="font-mono text-slate-500 w-12">{epsilon.toFixed(2)}</span>
        </label>
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={showError}
            onChange={(e) => setShowError(e.target.checked)} className="rounded" />
          <span className="text-slate-700">Show error</span>
        </label>
      </div>

      {width > 0 && (
        <svg ref={svgRef} width={width} height={totalHeight}
          className="border border-slate-200 rounded bg-white" />
      )}

      <div className="mt-3 flex flex-wrap gap-4 text-sm">
        <div className="bg-slate-50 rounded p-2">
          <span className="text-xs font-medium text-slate-500">Avg error:</span>{' '}
          <span className="font-mono text-slate-800">{fmt(circleData.avgError)}</span>
        </div>
        <div className="bg-slate-50 rounded p-2">
          <span className="text-xs font-medium text-slate-500">Max error:</span>{' '}
          <span className="font-mono text-slate-800">{fmt(circleData.maxError)}</span>
        </div>
        <div className="bg-slate-50 rounded p-2">
          <span className="text-xs font-medium text-slate-500">Error/&epsilon;:</span>{' '}
          <span className="font-mono text-slate-800">{fmt(circleData.avgError / epsilon)}</span>
          <span className="text-xs text-slate-500 ml-1">(→ 0 as &epsilon; → 0)</span>
        </div>
      </div>
    </div>
  );
}
