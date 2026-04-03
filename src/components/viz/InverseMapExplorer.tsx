import { useState, useMemo, useCallback, type ChangeEvent } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { functionColors } from './shared/colorScales';
import { coordinateTransform } from './shared/multivariate';
import { INVERSE_MAP_PRESETS } from '../../data/inverse-implicit-data';
import type { InverseMapPreset } from '../../data/inverse-implicit-data';

const margin = { top: 20, right: 20, bottom: 40, left: 50 };
const GAP = 24;
const GRID_DENSITY = 10;
const INVERTIBILITY_SAMPLES = 50;
const SINGULARITY_TOL = 1e-6;

/** 2×2 matrix inverse, or null if singular. */
function invert2x2(
  J: [[number, number], [number, number]],
  det: number,
): [[number, number], [number, number]] | null {
  if (Math.abs(det) < SINGULARITY_TOL) return null;
  return [
    [J[1][1] / det, -J[0][1] / det],
    [-J[1][0] / det, J[0][0] / det],
  ];
}

export default function InverseMapExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();
  const totalHeight = Math.min(width * 0.5, 420);

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [probePoint, setProbePoint] = useState<[number, number]>(
    INVERSE_MAP_PRESETS[0].defaultPoint,
  );
  const [showGrid, setShowGrid] = useState(true);
  const [showInvertibility, setShowInvertibility] = useState(false);
  const [zoomedToSingularity, setZoomedToSingularity] = useState(false);

  const preset = INVERSE_MAP_PRESETS[selectedIdx];

  const handlePresetChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    const idx = Number(e.target.value);
    setSelectedIdx(idx);
    setProbePoint(INVERSE_MAP_PRESETS[idx].defaultPoint);
    setZoomedToSingularity(false);
  }, []);

  // Compute effective domain — zoom to singularity neighbourhood if toggled
  const effectiveDomain = useMemo(() => {
    if (zoomedToSingularity && preset.singularPoints?.length) {
      const [sx, sy] = preset.singularPoints[0];
      const r = 0.5;
      return {
        xDomain: [sx - r, sx + r] as [number, number],
        yDomain: [sy - r, sy + r] as [number, number],
      };
    }
    return { xDomain: preset.xDomain, yDomain: preset.yDomain };
  }, [selectedIdx, zoomedToSingularity]);

  // Grid data for domain and codomain
  const gridData = useMemo(
    () => coordinateTransform(preset.f, effectiveDomain.xDomain, effectiveDomain.yDomain, GRID_DENSITY),
    [selectedIdx, effectiveDomain],
  );

  // Jacobian analysis at probe point
  const jacobianInfo = useMemo(() => {
    const fVal = preset.f(probePoint[0], probePoint[1]);
    const J = preset.J(probePoint[0], probePoint[1]);
    const det = J[0][0] * J[1][1] - J[0][1] * J[1][0];
    const invJ = invert2x2(J, det);
    return { fVal, J, det, invJ };
  }, [selectedIdx, probePoint]);

  // Invertibility heatmap: sample |det J| over the domain
  const invertibilityData = useMemo(() => {
    if (!showInvertibility) return null;
    const n = INVERTIBILITY_SAMPLES;
    const { xDomain, yDomain } = effectiveDomain;
    const data: Array<{ x: number; y: number; absDet: number }> = [];
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const x = xDomain[0] + (i + 0.5) * (xDomain[1] - xDomain[0]) / n;
        const y = yDomain[0] + (j + 0.5) * (yDomain[1] - yDomain[0]) / n;
        const det = preset.detJ(x, y);
        data.push({ x, y, absDet: Math.abs(det) });
      }
    }
    return data;
  }, [selectedIdx, showInvertibility, effectiveDomain]);

  // Compute output domain bounds from grid data
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
    // Include the image of the probe point
    const [fx, fy] = jacobianInfo.fVal;
    if (isFinite(fx) && isFinite(fy)) {
      xMin = Math.min(xMin, fx);
      xMax = Math.max(xMax, fx);
      yMin = Math.min(yMin, fy);
      yMax = Math.max(yMax, fy);
    }
    const pad = 0.1 * Math.max(xMax - xMin, yMax - yMin, 1);
    return {
      xDomain: [xMin - pad, xMax + pad] as [number, number],
      yDomain: [yMin - pad, yMax + pad] as [number, number],
    };
  }, [gridData, jacobianInfo.fVal]);

  // D3 rendering
  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (width <= 0 || totalHeight <= 0) return;

      const panelW = (width - GAP) / 2 - margin.left - margin.right;
      const panelH = totalHeight - margin.top - margin.bottom;
      if (panelW <= 0 || panelH <= 0) return;

      const { xDomain, yDomain } = effectiveDomain;

      // Scales — domain panel
      const xScaleIn = d3.scaleLinear().domain(xDomain).range([0, panelW]);
      const yScaleIn = d3.scaleLinear().domain(yDomain).range([panelH, 0]);

      // Scales — codomain panel
      const xScaleOut = d3.scaleLinear().domain(outputBounds.xDomain).range([0, panelW]);
      const yScaleOut = d3.scaleLinear().domain(outputBounds.yDomain).range([panelH, 0]);

      // Panel groups
      const leftOffset = margin.left;
      const rightOffset = margin.left + panelW + margin.right + GAP + margin.left;
      const gLeft = svg.append('g').attr('transform', `translate(${leftOffset},${margin.top})`);
      const gRight = svg.append('g').attr('transform', `translate(${rightOffset},${margin.top})`);

      // Panel labels
      svg.append('text')
        .attr('x', leftOffset + panelW / 2).attr('y', 14)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px').style('font-weight', '600').style('fill', '#374151')
        .text('Domain');
      svg.append('text')
        .attr('x', rightOffset + panelW / 2).attr('y', 14)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px').style('font-weight', '600').style('fill', '#374151')
        .text('Codomain');

      // ── Invertibility heatmap (behind grid) ──
      if (invertibilityData) {
        const n = INVERTIBILITY_SAMPLES;
        const cellW = panelW / n;
        const cellH = panelH / n;
        const maxDet = d3.max(invertibilityData, (d) => d.absDet) ?? 1;
        const colorScale = (v: number) => d3.interpolateRdYlGn(Math.min(v / (maxDet * 0.5), 1));

        invertibilityData.forEach((d) => {
          gLeft.append('rect')
            .attr('x', xScaleIn(d.x) - cellW / 2)
            .attr('y', yScaleIn(d.y) - cellH / 2)
            .attr('width', cellW)
            .attr('height', cellH)
            .attr('fill', colorScale(d.absDet))
            .attr('opacity', 0.5);
        });
      }

      // ── Grid lines ──
      if (showGrid) {
        const domainColor = '#94a3b8';
        const codomainColor = '#60a5fa';
        const strokeW = 0.7;

        // Domain grid
        const lineGenIn = d3.line<[number, number]>()
          .x((d) => xScaleIn(d[0])).y((d) => yScaleIn(d[1]));
        gridData.inputLines.forEach((line) => {
          gLeft.append('path')
            .datum(line)
            .attr('d', lineGenIn)
            .attr('fill', 'none')
            .attr('stroke', domainColor)
            .attr('stroke-width', strokeW);
        });

        // Codomain grid (deformed)
        const lineGenOut = d3.line<[number, number]>()
          .x((d) => xScaleOut(d[0])).y((d) => yScaleOut(d[1]))
          .defined((d) => isFinite(d[0]) && isFinite(d[1]));
        gridData.outputLines.forEach((line) => {
          gRight.append('path')
            .datum(line)
            .attr('d', lineGenOut)
            .attr('fill', 'none')
            .attr('stroke', codomainColor)
            .attr('stroke-width', strokeW);
        });
      }

      // ── Probe point (domain) ──
      gLeft.append('circle')
        .attr('cx', xScaleIn(probePoint[0]))
        .attr('cy', yScaleIn(probePoint[1]))
        .attr('r', 6)
        .attr('fill', functionColors[0])
        .attr('stroke', '#fff')
        .attr('stroke-width', 2)
        .style('cursor', 'grab')
        .style('pointer-events', 'none');

      // ── Image point (codomain) ──
      const [fx, fy] = jacobianInfo.fVal;
      if (isFinite(fx) && isFinite(fy)) {
        gRight.append('circle')
          .attr('cx', xScaleOut(fx))
          .attr('cy', yScaleOut(fy))
          .attr('r', 6)
          .attr('fill', functionColors[1])
          .attr('stroke', '#fff')
          .attr('stroke-width', 2);
      }

      // ── Drag behaviour on domain panel ──
      const drag = d3.drag<SVGRectElement, unknown>()
        .on('start drag', (event) => {
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

      // ── Axes ──
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
    [width, totalHeight, selectedIdx, probePoint, showGrid, showInvertibility,
     gridData, outputBounds, invertibilityData, effectiveDomain, jacobianInfo],
  );

  const handleZoomToSingularity = useCallback(() => {
    if (!preset.singularPoints?.length) return;
    setZoomedToSingularity((prev) => !prev);
    // Reset probe near the singularity when zooming in
    if (!zoomedToSingularity && preset.singularPoints.length) {
      const [sx, sy] = preset.singularPoints[0];
      setProbePoint([sx + 0.15, sy + 0.15]);
    } else {
      setProbePoint(preset.defaultPoint);
    }
  }, [preset, zoomedToSingularity]);

  const fmt = (v: number) => v.toFixed(3);
  const { J, det, invJ } = jacobianInfo;

  return (
    <div ref={containerRef} className="w-full my-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-3 text-sm">
        <label className="flex items-center gap-1.5">
          <span className="font-medium text-slate-700">Map:</span>
          <select
            value={selectedIdx}
            onChange={handlePresetChange}
            className="border border-slate-300 rounded px-2 py-1 text-sm bg-white"
          >
            {INVERSE_MAP_PRESETS.map((p, i) => (
              <option key={p.name} value={i}>{p.label}</option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-1.5">
          <input
            type="checkbox" checked={showGrid}
            onChange={(e) => setShowGrid(e.target.checked)}
            className="rounded"
          />
          <span className="text-slate-700">Show grid lines</span>
        </label>

        <label className="flex items-center gap-1.5">
          <input
            type="checkbox" checked={showInvertibility}
            onChange={(e) => setShowInvertibility(e.target.checked)}
            className="rounded"
          />
          <span className="text-slate-700">Show invertibility</span>
        </label>

        {preset.singularPoints?.length ? (
          <button
            onClick={handleZoomToSingularity}
            className="px-3 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-colors"
          >
            {zoomedToSingularity ? 'Reset zoom' : 'Zoom to singularity'}
          </button>
        ) : null}
      </div>

      {/* Description */}
      {preset.description && (
        <p className="text-xs text-slate-500 mb-2 italic">{preset.description}</p>
      )}

      {/* SVG */}
      {width > 0 && (
        <svg
          ref={svgRef}
          width={width}
          height={totalHeight}
          className="border border-slate-200 rounded bg-white"
        />
      )}

      {/* Jacobian readout */}
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
            [{fmt(J[0][0])}, {fmt(J[0][1])}]<br />
            [{fmt(J[1][0])}, {fmt(J[1][1])}]
          </div>
        </div>
        <div className="bg-slate-50 rounded p-2">
          <div className="text-xs font-medium text-slate-500 mb-1">det J_f(a)</div>
          <div className={`font-mono ${Math.abs(det) < SINGULARITY_TOL ? 'text-red-600 font-bold' : 'text-slate-800'}`}>
            {fmt(det)}
          </div>
        </div>
      </div>

      {/* Inverse Jacobian */}
      <div className="mt-2 bg-slate-50 rounded p-2 text-sm">
        <span className="text-xs font-medium text-slate-500 mr-2">[J_f(a)]⁻¹:</span>
        {invJ ? (
          <span className="font-mono text-xs text-slate-800">
            [{fmt(invJ[0][0])}, {fmt(invJ[0][1])}] &nbsp;
            [{fmt(invJ[1][0])}, {fmt(invJ[1][1])}]
          </span>
        ) : (
          <span className="font-mono text-xs text-red-600 font-bold">
            SINGULAR — det J_f ≈ 0, no local inverse exists
          </span>
        )}
      </div>
    </div>
  );
}
