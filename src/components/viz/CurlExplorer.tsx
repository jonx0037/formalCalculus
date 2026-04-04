/**
 * CurlExplorer — 2D vector field with curl heatmap, animated paddlewheels,
 * and an interactive probe circle demonstrating curl as infinitesimal circulation.
 */
import { useState, useMemo, useEffect, useRef, useId } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { VECTOR_FIELD_PRESETS, asF } from '../../data/line-integrals-data';
import { computeCirculation } from './shared/integration';
import { curl2D } from './shared/multivariate';
import { functionColors } from './shared/colorScales';

const margin = { top: 20, right: 16, bottom: 36, left: 42 };
const FIELD_GRID = 12;
const PADDLE_GRID = 4; // every Nth field point gets a paddlewheel
const CURL_GRID = 25;

export default function CurlExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();
  const height = Math.min(width * 0.75, 500);
  const uid = useId();

  const [fieldIdx, setFieldIdx] = useState(2); // rotation (−y, x)
  const [probeX, setProbeX] = useState(0.5);
  const [probeY, setProbeY] = useState(0.5);
  const [circleRadius, setCircleRadius] = useState(0.4);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showPaddlewheels, setShowPaddlewheels] = useState(true);
  const [paddleAngle, setPaddleAngle] = useState(0);
  const [animating, setAnimating] = useState(true);
  const animRef = useRef<number | null>(null);

  const field = VECTOR_FIELD_PRESETS[fieldIdx];
  const F = useMemo(() => asF(field), [fieldIdx]);

  const xDomain: [number, number] = [-2, 2];
  const yDomain: [number, number] = [-2, 2];

  // Compute curl grid for heatmap
  const curlData = useMemo(() => {
    const n = CURL_GRID;
    const dx = (xDomain[1] - xDomain[0]) / n;
    const dy = (yDomain[1] - yDomain[0]) / n;
    const data: { x: number; y: number; curl: number }[] = [];
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const x = xDomain[0] + (i + 0.5) * dx;
        const y = yDomain[0] + (j + 0.5) * dy;
        const c = curl2D(F, x, y);
        data.push({ x, y, curl: isFinite(c) ? c : 0 });
      }
    }
    return data;
  }, [F]);

  // Probe data
  const probeCurl = useMemo(() => curl2D(F, probeX, probeY), [F, probeX, probeY]);
  const probeCirculation = useMemo(() => {
    const r = circleRadius;
    const circR = (t: number): [number, number] => [
      probeX + r * Math.cos(t),
      probeY + r * Math.sin(t),
    ];
    const circRPrime = (t: number): [number, number] => [
      -r * Math.sin(t),
      r * Math.cos(t),
    ];
    return computeCirculation(F, circR, circRPrime, [0, 2 * Math.PI], 200);
  }, [F, probeX, probeY, circleRadius]);

  const probeArea = Math.PI * circleRadius * circleRadius;
  const probeRatio = probeArea > 1e-12 ? probeCirculation / probeArea : 0;

  // Paddle animation
  useEffect(() => {
    if (!animating) return;
    const step = () => {
      setPaddleAngle((prev) => prev + 0.04);
      animRef.current = requestAnimationFrame(step);
    };
    animRef.current = requestAnimationFrame(step);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [animating]);

  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (width <= 0 || height <= 0) return;

      const innerW = width - margin.left - margin.right;
      const innerH = height - margin.top - margin.bottom;
      const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      const xScale = d3.scaleLinear().domain(xDomain).range([0, innerW]);
      const yScale = d3.scaleLinear().domain(yDomain).range([innerH, 0]);

      // Axes
      g.append('g')
        .attr('transform', `translate(0,${innerH})`)
        .call(d3.axisBottom(xScale).ticks(5))
        .selectAll('text').style('font-size', '10px');
      g.append('g')
        .call(d3.axisLeft(yScale).ticks(5))
        .selectAll('text').style('font-size', '10px');

      // Curl heatmap
      if (showHeatmap) {
        const maxAbsCurl = d3.max(curlData, (d) => Math.abs(d.curl)) || 1;
        const colorScale = d3.scaleDiverging(d3.interpolateRdBu).domain([maxAbsCurl, 0, -maxAbsCurl]);
        const cellW = innerW / CURL_GRID;
        const cellH = innerH / CURL_GRID;

        curlData.forEach((d) => {
          g.append('rect')
            .attr('x', xScale(d.x) - cellW / 2)
            .attr('y', yScale(d.y) - cellH / 2)
            .attr('width', cellW)
            .attr('height', cellH)
            .attr('fill', colorScale(d.curl))
            .attr('opacity', 0.55);
        });
      }

      // Vector field arrows
      const dxGrid = (xDomain[1] - xDomain[0]) / FIELD_GRID;
      const dyGrid = (yDomain[1] - yDomain[0]) / FIELD_GRID;
      let maxMag = 0;
      for (let i = 0; i <= FIELD_GRID; i++) {
        for (let j = 0; j <= FIELD_GRID; j++) {
          const x = xDomain[0] + i * dxGrid;
          const y = yDomain[0] + j * dyGrid;
          const [fx, fy] = F(x, y);
          const mag = Math.sqrt(fx * fx + fy * fy);
          if (isFinite(mag) && mag > maxMag) maxMag = mag;
        }
      }

      svg.append('defs')
        .append('marker')
        .attr('id', `curl-arr-${uid}`)
        .attr('viewBox', '0 0 10 10')
        .attr('refX', 10)
        .attr('refY', 5)
        .attr('markerWidth', 3.5)
        .attr('markerHeight', 3.5)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M 0 0 L 10 5 L 0 10 z')
        .attr('fill', '#64748b');

      const arrowScale = Math.min(dxGrid, dyGrid) * 0.35 / (maxMag || 1);
      for (let i = 0; i <= FIELD_GRID; i++) {
        for (let j = 0; j <= FIELD_GRID; j++) {
          const x = xDomain[0] + i * dxGrid;
          const y = yDomain[0] + j * dyGrid;
          const [fx, fy] = F(x, y);
          const mag = Math.sqrt(fx * fx + fy * fy);
          if (!isFinite(mag) || mag < 1e-10) continue;
          g.append('line')
            .attr('x1', xScale(x))
            .attr('y1', yScale(y))
            .attr('x2', xScale(x + fx * arrowScale))
            .attr('y2', yScale(y + fy * arrowScale))
            .attr('stroke', '#64748b')
            .attr('stroke-width', 0.8)
            .attr('marker-end', `url(#curl-arr-${uid})`);
        }
      }

      // Paddlewheels
      if (showPaddlewheels) {
        const paddleStep = PADDLE_GRID;
        const paddleR = Math.min(
          Math.abs(xScale(dxGrid) - xScale(0)),
          Math.abs(yScale(0) - yScale(dyGrid)),
        ) * 0.28;

        for (let i = 1; i < FIELD_GRID; i += paddleStep) {
          for (let j = 1; j < FIELD_GRID; j += paddleStep) {
            const x = xDomain[0] + i * dxGrid;
            const y = yDomain[0] + j * dyGrid;
            const localCurl = curl2D(F, x, y);
            if (!isFinite(localCurl)) continue;

            const maxAbsCurl = d3.max(curlData, (d) => Math.abs(d.curl)) || 1;
            const rotSpeed = localCurl / maxAbsCurl;
            const angle = paddleAngle * rotSpeed;

            const pg = g.append('g')
              .attr('transform', `translate(${xScale(x)},${yScale(y)}) rotate(${(-angle * 180) / Math.PI})`);

            // Cross shape
            pg.append('line')
              .attr('x1', -paddleR).attr('y1', 0)
              .attr('x2', paddleR).attr('y2', 0)
              .attr('stroke', localCurl > 0 ? '#2563EB' : '#DC2626')
              .attr('stroke-width', 2);
            pg.append('line')
              .attr('x1', 0).attr('y1', -paddleR)
              .attr('x2', 0).attr('y2', paddleR)
              .attr('stroke', localCurl > 0 ? '#2563EB' : '#DC2626')
              .attr('stroke-width', 2);

            // Paddle tips
            [-paddleR, paddleR].forEach((pos) => {
              pg.append('rect')
                .attr('x', pos - 2).attr('y', -1.5)
                .attr('width', 4).attr('height', 3)
                .attr('fill', localCurl > 0 ? '#2563EB' : '#DC2626');
              pg.append('rect')
                .attr('x', -1.5).attr('y', pos - 2)
                .attr('width', 3).attr('height', 4)
                .attr('fill', localCurl > 0 ? '#2563EB' : '#DC2626');
            });
          }
        }
      }

      // Probe circle
      const nProbe = 60;
      const probePoints: [number, number][] = [];
      for (let k = 0; k <= nProbe; k++) {
        const angle = (k / nProbe) * 2 * Math.PI;
        probePoints.push([
          probeX + circleRadius * Math.cos(angle),
          probeY + circleRadius * Math.sin(angle),
        ]);
      }
      const probeLine = d3.line<[number, number]>()
        .x((d) => xScale(d[0]))
        .y((d) => yScale(d[1]));

      g.append('path')
        .datum(probePoints)
        .attr('d', probeLine)
        .attr('fill', 'none')
        .attr('stroke', functionColors[2])
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '6,3');

      // Probe center
      g.append('circle')
        .attr('cx', xScale(probeX))
        .attr('cy', yScale(probeY))
        .attr('r', 4)
        .attr('fill', functionColors[2])
        .attr('stroke', '#fff')
        .attr('stroke-width', 1.5);

      // Make probe draggable
      const dragOverlay = g.append('rect')
        .attr('x', 0).attr('y', 0)
        .attr('width', innerW).attr('height', innerH)
        .attr('fill', 'none')
        .attr('pointer-events', 'all')
        .style('cursor', 'crosshair');

      dragOverlay.call(
        d3.drag<SVGRectElement, unknown>()
          .on('drag', (event) => {
            const newX = xScale.invert(event.x);
            const newY = yScale.invert(event.y);
            setProbeX(Math.max(xDomain[0] + 0.1, Math.min(xDomain[1] - 0.1, newX)));
            setProbeY(Math.max(yDomain[0] + 0.1, Math.min(yDomain[1] - 0.1, newY)));
          }),
      );
    },
    [fieldIdx, probeX, probeY, circleRadius, showHeatmap, showPaddlewheels, paddleAngle, width, height, uid],
  );

  return (
    <div ref={containerRef} className="my-8 w-full">
      <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-1.5">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">Field:</span>
          <select
            value={fieldIdx}
            onChange={(e) => setFieldIdx(Number(e.target.value))}
            className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-600 dark:bg-zinc-800"
          >
            {VECTOR_FIELD_PRESETS.map((p, i) => (
              <option key={p.name} value={i}>{p.label}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1.5">
          <span className="text-xs text-zinc-600 dark:text-zinc-400">Radius:</span>
          <input
            type="range"
            min={0.1}
            max={1.5}
            step={0.05}
            value={circleRadius}
            onChange={(e) => setCircleRadius(Number(e.target.value))}
            className="w-20"
          />
          <span className="w-8 text-right text-xs tabular-nums text-zinc-500">{circleRadius.toFixed(2)}</span>
        </label>
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={showHeatmap} onChange={(e) => setShowHeatmap(e.target.checked)} className="rounded" />
          <span className="text-xs text-zinc-600 dark:text-zinc-400">Heatmap</span>
        </label>
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={showPaddlewheels} onChange={(e) => setShowPaddlewheels(e.target.checked)} className="rounded" />
          <span className="text-xs text-zinc-600 dark:text-zinc-400">Paddlewheels</span>
        </label>
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={animating} onChange={(e) => setAnimating(e.target.checked)} className="rounded" />
          <span className="text-xs text-zinc-600 dark:text-zinc-400">Animate</span>
        </label>
      </div>

      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="overflow-visible rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900"
      />

      <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-zinc-600 dark:text-zinc-400">
        <div><span className="font-medium">curl(F) at center:</span> <span className="tabular-nums">{probeCurl.toFixed(4)}</span></div>
        <div><span className="font-medium">∮ F · dr around circle:</span> <span className="tabular-nums">{probeCirculation.toFixed(4)}</span></div>
        <div><span className="font-medium">Area πr²:</span> <span className="tabular-nums">{probeArea.toFixed(4)}</span></div>
        <div><span className="font-medium">∮/πr² (≈ curl):</span> <span className="tabular-nums">{probeRatio.toFixed(4)}</span></div>
      </div>

      <p className="mt-1 text-xs text-zinc-500">
        Drag to move the probe circle. As the radius shrinks, ∮/πr² → curl(F) at the center.
      </p>
    </div>
  );
}
