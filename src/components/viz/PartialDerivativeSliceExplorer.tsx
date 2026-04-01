import { useState, useMemo, useCallback, type ChangeEvent } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { SURFACE_PRESETS } from '../../data/gradient-data';
import { generateWireframe, project3D } from './shared/multivariate';
import { functionColors } from './shared/colorScales';

const margin = { top: 20, right: 20, bottom: 40, left: 50 };
const GAP = 30;
const GRID_SIZE = 30;
const SLICE_PTS = 200;

export default function PartialDerivativeSliceExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();
  const height = Math.min(width * 0.55, 440);

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [sliceAxis, setSliceAxis] = useState<'y' | 'x'>('y');
  const [slicePosition, setSlicePosition] = useState(0.5);
  const [evalPoint, setEvalPoint] = useState(0);

  const preset = SURFACE_PRESETS[selectedIdx];

  const handlePresetChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    const idx = Number(e.target.value);
    const defaultPt = SURFACE_PRESETS[idx].defaultPoint;
    setSelectedIdx(idx);
    setSlicePosition(0.5);
    setEvalPoint(sliceAxis === 'y' ? defaultPt[0] : defaultPt[1]);
  }, [sliceAxis]);

  // Generate wireframe
  const wireframe = useMemo(
    () => generateWireframe(preset.f, preset.xDomain, preset.yDomain, GRID_SIZE),
    [selectedIdx],
  );

  // Slice value in domain coords
  const sliceVal = useMemo(() => {
    const domain = sliceAxis === 'y' ? preset.yDomain : preset.xDomain;
    return domain[0] + slicePosition * (domain[1] - domain[0]);
  }, [selectedIdx, sliceAxis, slicePosition]);

  // 2D slice curve
  const sliceCurve = useMemo(() => {
    const varDomain = sliceAxis === 'y' ? preset.xDomain : preset.yDomain;
    const pts: Array<{ t: number; z: number }> = [];
    const dt = (varDomain[1] - varDomain[0]) / (SLICE_PTS - 1);
    for (let i = 0; i < SLICE_PTS; i++) {
      const t = varDomain[0] + i * dt;
      const z = sliceAxis === 'y' ? preset.f(t, sliceVal) : preset.f(sliceVal, t);
      if (isFinite(z)) pts.push({ t, z });
    }
    return pts;
  }, [selectedIdx, sliceAxis, sliceVal]);

  // Partial derivative at eval point
  const partialInfo = useMemo(() => {
    const derivFn = sliceAxis === 'y' ? preset.f_x : preset.f_y;
    const fVal = sliceAxis === 'y' ? preset.f(evalPoint, sliceVal) : preset.f(sliceVal, evalPoint);
    const slope = sliceAxis === 'y' ? derivFn(evalPoint, sliceVal) : derivFn(sliceVal, evalPoint);
    return { fVal, slope };
  }, [selectedIdx, sliceAxis, sliceVal, evalPoint]);

  const varDomain = sliceAxis === 'y' ? preset.xDomain : preset.yDomain;
  const evalMin = varDomain[0] + (varDomain[1] - varDomain[0]) * 0.05;
  const evalMax = varDomain[1] - (varDomain[1] - varDomain[0]) * 0.05;
  const evalStep = (varDomain[1] - varDomain[0]) / 200;

  // ── D3 rendering ───────────────────────────────────────
  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (width <= 0 || height <= 0) return;

      const innerW = width - margin.left - margin.right;
      const innerH = height - margin.top - margin.bottom;
      const leftW = Math.floor((innerW - GAP) * 0.5);
      const rightW = innerW - leftW - GAP;

      // ── Left panel: pseudo-3D wireframe ──
      const gLeft = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      // Project all grid points
      const { xGrid, yGrid, zValues } = wireframe;
      const projected: Array<{ sx: number; sy: number; i: number; j: number }> = [];
      let sxMin = Infinity, sxMax = -Infinity, syMin = Infinity, syMax = -Infinity;

      for (let i = 0; i < xGrid.length; i++) {
        for (let j = 0; j < yGrid.length; j++) {
          const z = zValues[i][j];
          if (!isFinite(z)) continue;
          const [sx, sy] = project3D(xGrid[i], yGrid[j], z);
          projected.push({ sx, sy, i, j });
          if (sx < sxMin) sxMin = sx;
          if (sx > sxMax) sxMax = sx;
          if (sy < syMin) syMin = sy;
          if (sy > syMax) syMax = sy;
        }
      }

      const scaleX3D = d3.scaleLinear().domain([sxMin, sxMax]).range([0, leftW]);
      const scaleY3D = d3.scaleLinear().domain([syMin, syMax]).range([innerH, 0]);

      // Draw wireframe grid lines (rows then columns)
      const lineGen = d3.line<[number, number]>()
        .x((d) => scaleX3D(d[0]))
        .y((d) => scaleY3D(d[1]))
        .defined((d) => isFinite(d[0]) && isFinite(d[1]));

      // Row lines (constant x)
      for (let i = 0; i < xGrid.length; i++) {
        const pts: Array<[number, number]> = [];
        for (let j = 0; j < yGrid.length; j++) {
          const z = zValues[i][j];
          if (!isFinite(z)) continue;
          pts.push(project3D(xGrid[i], yGrid[j], z));
        }
        if (pts.length > 1) {
          gLeft.append('path')
            .datum(pts)
            .attr('d', lineGen)
            .attr('fill', 'none')
            .style('stroke', 'var(--color-border)')
            .style('stroke-width', 0.5)
            .style('opacity', 0.4);
        }
      }

      // Column lines (constant y)
      for (let j = 0; j < yGrid.length; j++) {
        const pts: Array<[number, number]> = [];
        for (let i = 0; i < xGrid.length; i++) {
          const z = zValues[i][j];
          if (!isFinite(z)) continue;
          pts.push(project3D(xGrid[i], yGrid[j], z));
        }
        if (pts.length > 1) {
          gLeft.append('path')
            .datum(pts)
            .attr('d', lineGen)
            .attr('fill', 'none')
            .style('stroke', 'var(--color-border)')
            .style('stroke-width', 0.5)
            .style('opacity', 0.4);
        }
      }

      // Highlight slice curve on the 3D surface
      const slicePts3D: Array<[number, number]> = [];
      const nSlice = 80;
      const sliceVarDomain = sliceAxis === 'y' ? preset.xDomain : preset.yDomain;
      const sliceDt = (sliceVarDomain[1] - sliceVarDomain[0]) / (nSlice - 1);

      for (let k = 0; k < nSlice; k++) {
        const t = sliceVarDomain[0] + k * sliceDt;
        const x3 = sliceAxis === 'y' ? t : sliceVal;
        const y3 = sliceAxis === 'y' ? sliceVal : t;
        const z3 = preset.f(x3, y3);
        if (isFinite(z3)) {
          slicePts3D.push(project3D(x3, y3, z3));
        }
      }

      if (slicePts3D.length > 1) {
        gLeft.append('path')
          .datum(slicePts3D)
          .attr('d', lineGen)
          .attr('fill', 'none')
          .style('stroke', functionColors[1])
          .style('stroke-width', 2.5);
      }

      // Eval point on 3D surface
      const evalX3 = sliceAxis === 'y' ? evalPoint : sliceVal;
      const evalY3 = sliceAxis === 'y' ? sliceVal : evalPoint;
      const evalZ3 = preset.f(evalX3, evalY3);
      if (isFinite(evalZ3)) {
        const [esx, esy] = project3D(evalX3, evalY3, evalZ3);
        gLeft.append('circle')
          .attr('cx', scaleX3D(esx))
          .attr('cy', scaleY3D(esy))
          .attr('r', 5)
          .style('fill', functionColors[1])
          .style('stroke', '#fff')
          .style('stroke-width', 1.5);
      }

      // Left panel label
      gLeft.append('text')
        .attr('x', leftW / 2)
        .attr('y', innerH + 30)
        .attr('text-anchor', 'middle')
        .style('fill', 'var(--color-text-muted)')
        .style('font-size', '11px')
        .text(`Surface z = ${preset.label.replace('f(x,y) = ', '')}`);

      // ── Right panel: 2D slice curve + tangent ──
      const gRight = svg
        .append('g')
        .attr('transform', `translate(${margin.left + leftW + GAP},${margin.top})`);

      if (sliceCurve.length < 2) return;

      const tExtent = d3.extent(sliceCurve, (d) => d.t) as [number, number];
      const zExtent = d3.extent(sliceCurve, (d) => d.z) as [number, number];
      const zPad = (zExtent[1] - zExtent[0]) * 0.1 || 0.5;

      const xScale = d3.scaleLinear().domain(tExtent).range([0, rightW]);
      const yScale = d3.scaleLinear().domain([zExtent[0] - zPad, zExtent[1] + zPad]).range([innerH, 0]);

      // Axes
      gRight.append('g')
        .attr('transform', `translate(0,${innerH})`)
        .call(d3.axisBottom(xScale).ticks(5))
        .selectAll('text')
        .style('fill', 'var(--color-text-muted)')
        .style('font-size', '10px');

      gRight.append('g')
        .call(d3.axisLeft(yScale).ticks(5))
        .selectAll('text')
        .style('fill', 'var(--color-text-muted)')
        .style('font-size', '10px');

      // Slice curve
      const sliceLine = d3.line<{ t: number; z: number }>()
        .x((d) => xScale(d.t))
        .y((d) => yScale(d.z));

      gRight.append('path')
        .datum(sliceCurve)
        .attr('d', sliceLine)
        .attr('fill', 'none')
        .style('stroke', functionColors[0])
        .style('stroke-width', 2);

      // Tangent line at eval point
      const { fVal, slope } = partialInfo;
      const tangentX1 = tExtent[0];
      const tangentX2 = tExtent[1];
      const tangentY1 = fVal + slope * (tangentX1 - evalPoint);
      const tangentY2 = fVal + slope * (tangentX2 - evalPoint);

      gRight.append('line')
        .attr('x1', xScale(tangentX1))
        .attr('y1', yScale(tangentY1))
        .attr('x2', xScale(tangentX2))
        .attr('y2', yScale(tangentY2))
        .style('stroke', functionColors[1])
        .style('stroke-width', 1.5)
        .style('stroke-dasharray', '6,3');

      // Eval point dot on 2D curve
      gRight.append('circle')
        .attr('cx', xScale(evalPoint))
        .attr('cy', yScale(fVal))
        .attr('r', 5)
        .style('fill', functionColors[1])
        .style('stroke', '#fff')
        .style('stroke-width', 1.5);

      // Axis labels
      const varLabel = sliceAxis === 'y' ? 'x' : 'y';
      gRight.append('text')
        .attr('x', rightW / 2)
        .attr('y', innerH + 30)
        .attr('text-anchor', 'middle')
        .style('fill', 'var(--color-text-muted)')
        .style('font-size', '11px')
        .text(varLabel);

      gRight.append('text')
        .attr('x', -innerH / 2)
        .attr('y', -35)
        .attr('text-anchor', 'middle')
        .attr('transform', 'rotate(-90)')
        .style('fill', 'var(--color-text-muted)')
        .style('font-size', '11px')
        .text('z');
    },
    [wireframe, sliceCurve, partialInfo, sliceAxis, sliceVal, evalPoint, width, height],
  );

  const fixedVar = sliceAxis === 'y' ? 'y' : 'x';
  const freeVar = sliceAxis === 'y' ? 'x' : 'y';
  const partialSymbol = `∂f/∂${freeVar}`;

  return (
    <div ref={containerRef} className="w-full my-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4 mb-3">
        <label className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Function:
          <select
            className="ml-1 rounded px-1 py-0.5 text-sm"
            style={{ background: 'var(--color-bg-secondary)', color: 'var(--color-text)' }}
            value={selectedIdx}
            onChange={handlePresetChange}
          >
            {SURFACE_PRESETS.map((p, i) => (
              <option key={p.name} value={i}>{p.label}</option>
            ))}
          </select>
        </label>

        <label className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Slice:
          <select
            className="ml-1 rounded px-1 py-0.5 text-sm"
            style={{ background: 'var(--color-bg-secondary)', color: 'var(--color-text)' }}
            value={sliceAxis}
            onChange={(e) => setSliceAxis(e.target.value as 'y' | 'x')}
          >
            <option value="y">y = const (vary x)</option>
            <option value="x">x = const (vary y)</option>
          </select>
        </label>

        <label className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          {fixedVar} = {sliceVal.toFixed(2)}
          <input
            type="range"
            className="ml-2 w-24"
            min={0}
            max={1}
            step={0.01}
            value={slicePosition}
            onChange={(e) => setSlicePosition(Number(e.target.value))}
          />
        </label>

        <label className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          {freeVar} = {evalPoint.toFixed(2)}
          <input
            type="range"
            className="ml-2 w-24"
            min={evalMin}
            max={evalMax}
            step={evalStep}
            value={evalPoint}
            onChange={(e) => setEvalPoint(Number(e.target.value))}
          />
        </label>
      </div>

      {/* SVG */}
      <svg ref={svgRef} width={width} height={height} />

      {/* Readout + legend */}
      <div className="flex flex-wrap gap-6 mt-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
        <span>
          <span style={{ color: functionColors[0] }}>●</span> Slice curve ({fixedVar} = {sliceVal.toFixed(2)})
        </span>
        <span>
          <span style={{ color: functionColors[1] }}>●</span> Tangent (slope = {partialSymbol} = {partialInfo.slope.toFixed(3)})
        </span>
        <span>
          f({sliceAxis === 'y' ? evalPoint.toFixed(2) : sliceVal.toFixed(2)}, {sliceAxis === 'y' ? sliceVal.toFixed(2) : evalPoint.toFixed(2)}) = {partialInfo.fVal.toFixed(3)}
        </span>
      </div>
    </div>
  );
}
