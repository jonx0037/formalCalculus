/**
 * GreenTheoremExplorer — two-panel visualization demonstrating Green's theorem.
 * Left: line integral ∮_C F · dr around a region boundary.
 * Right: double integral ∬_D curl(F) dA over the enclosed region.
 * Both values converge to the same number.
 */
import { useState, useMemo, useId } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import {
  VECTOR_FIELD_PRESETS,
  REGION_PRESETS,
  asF,
} from '../../data/line-integrals-data';
import { computeCirculation } from './shared/integration';
import { curl2D } from './shared/multivariate';
import { functionColors } from './shared/colorScales';

const margin = { top: 28, right: 12, bottom: 32, left: 36 };
const GAP = 24;
const CURL_GRID = 20;

export default function GreenTheoremExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();
  const panelW = Math.max(100, (width - GAP) / 2);
  const panelH = Math.min(panelW * 0.85, 400);
  const uid = useId();

  const [fieldIdx, setFieldIdx] = useState(2); // rotation (−y, x)
  const [regionIdx, setRegionIdx] = useState(0); // unit disk
  const [showHeatmap, setShowHeatmap] = useState(true);

  const field = VECTOR_FIELD_PRESETS[fieldIdx];
  const region = REGION_PRESETS[regionIdx];
  const F = useMemo(() => asF(field), [fieldIdx]);
  const boundary = region.boundary;

  // Line integral: ∮_C F · dr
  const circulation = useMemo(
    () => computeCirculation(F, boundary.r, boundary.rPrime, boundary.domain, 400),
    [F, boundary],
  );

  // Double integral of curl: ∬_D curl(F) dA (via Monte Carlo on sampled grid)
  const { curlIntegral, curlData } = useMemo(() => {
    const xRange: [number, number] = [-2, 2];
    const yRange: [number, number] = [-2, 2];
    const n = CURL_GRID;
    const dxG = (xRange[1] - xRange[0]) / n;
    const dyG = (yRange[1] - yRange[0]) / n;
    const data: { x: number; y: number; curl: number; inside: boolean }[] = [];
    let sum = 0;

    // Sample boundary to determine inside/outside
    const bPts: [number, number][] = [];
    for (let s = 0; s <= 200; s++) {
      const t = boundary.domain[0] + (s / 200) * (boundary.domain[1] - boundary.domain[0]);
      bPts.push(boundary.r(t));
    }

    // Point-in-polygon via ray casting for region check
    function isInside(px: number, py: number): boolean {
      let inside = false;
      for (let i = 0, j = bPts.length - 1; i < bPts.length; j = i++) {
        const [xi, yi] = bPts[i];
        const [xj, yj] = bPts[j];
        if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
          inside = !inside;
        }
      }
      return inside;
    }

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const x = xRange[0] + (i + 0.5) * dxG;
        const y = yRange[0] + (j + 0.5) * dyG;
        const c = curl2D(F, x, y);
        const ins = isInside(x, y);
        data.push({ x, y, curl: c, inside: ins });
        if (ins) sum += c * dxG * dyG;
      }
    }
    return { curlIntegral: sum, curlData: data };
  }, [F, boundary, regionIdx]);

  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (width <= 0 || panelH <= 0) return;

      const innerW = panelW - margin.left - margin.right;
      const innerH = panelH - margin.top - margin.bottom;
      const xDomain: [number, number] = [-2, 2];
      const yDomain: [number, number] = [-2, 2];

      // Shared scales
      const xScale = d3.scaleLinear().domain(xDomain).range([0, innerW]);
      const yScale = d3.scaleLinear().domain(yDomain).range([innerH, 0]);

      // Sample boundary curve
      const bPts: [number, number][] = [];
      for (let s = 0; s <= 200; s++) {
        const t = boundary.domain[0] + (s / 200) * (boundary.domain[1] - boundary.domain[0]);
        bPts.push(boundary.r(t));
      }
      const curveLine = d3.line<[number, number]>()
        .x((d) => xScale(d[0]))
        .y((d) => yScale(d[1]));

      // ── Left panel: Line integral ──
      const gLeft = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      gLeft.append('text')
        .attr('x', innerW / 2)
        .attr('y', -8)
        .attr('text-anchor', 'middle')
        .attr('font-size', '11px')
        .attr('font-weight', '600')
        .attr('fill', 'currentColor')
        .text('Line integral ∮ F · dr');

      gLeft.append('g').attr('transform', `translate(0,${innerH})`).call(d3.axisBottom(xScale).ticks(4));
      gLeft.append('g').call(d3.axisLeft(yScale).ticks(4));

      // Boundary curve (thick)
      gLeft.append('path')
        .datum(bPts)
        .attr('d', curveLine)
        .attr('fill', 'none')
        .attr('stroke', functionColors[0])
        .attr('stroke-width', 3);

      // CCW direction arrows along boundary
      for (let k = 0; k < 8; k++) {
        const t = boundary.domain[0] + (k / 8) * (boundary.domain[1] - boundary.domain[0]);
        const [px, py] = boundary.r(t);
        const [dx, dy] = boundary.rPrime(t);
        const mag = Math.sqrt(dx * dx + dy * dy);
        if (mag < 1e-10) continue;
        const arrowLen = 12;
        const sx = (dx / mag) * arrowLen;
        const sy = (dy / mag) * arrowLen;

        gLeft.append('line')
          .attr('x1', xScale(px) - sx * 0.5)
          .attr('y1', yScale(py) + sy * 0.5)
          .attr('x2', xScale(px) + sx * 0.5)
          .attr('y2', yScale(py) - sy * 0.5)
          .attr('stroke', functionColors[0])
          .attr('stroke-width', 2)
          .attr('marker-end', `url(#garr-${uid})`);
      }

      // Circulation value
      gLeft.append('text')
        .attr('x', innerW / 2)
        .attr('y', innerH + 28)
        .attr('text-anchor', 'middle')
        .attr('font-size', '11px')
        .attr('fill', functionColors[0])
        .text(`∮ = ${circulation.toFixed(4)}`);

      // Arrow marker for Green's viz
      svg.append('defs')
        .append('marker')
        .attr('id', `garr-${uid}`)
        .attr('viewBox', '0 0 10 10')
        .attr('refX', 10)
        .attr('refY', 5)
        .attr('markerWidth', 4)
        .attr('markerHeight', 4)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M 0 0 L 10 5 L 0 10 z')
        .attr('fill', functionColors[0]);

      // ── Right panel: Double integral of curl ──
      const gRight = svg
        .append('g')
        .attr('transform', `translate(${panelW + GAP + margin.left},${margin.top})`);

      gRight.append('text')
        .attr('x', innerW / 2)
        .attr('y', -8)
        .attr('text-anchor', 'middle')
        .attr('font-size', '11px')
        .attr('font-weight', '600')
        .attr('fill', 'currentColor')
        .text('Double integral ∬ curl(F) dA');

      gRight.append('g').attr('transform', `translate(0,${innerH})`).call(d3.axisBottom(xScale).ticks(4));
      gRight.append('g').call(d3.axisLeft(yScale).ticks(4));

      // Curl heatmap (only inside region)
      if (showHeatmap) {
        const insideData = curlData.filter((d) => d.inside);
        const curlExtent = d3.extent(insideData, (d) => d.curl) as [number, number];
        const maxAbs = Math.max(Math.abs(curlExtent[0] || 0), Math.abs(curlExtent[1] || 0)) || 1;
        const colorScale = d3.scaleDiverging(d3.interpolateRdBu).domain([maxAbs, 0, -maxAbs]);

        const cellW = innerW / CURL_GRID;
        const cellH = innerH / CURL_GRID;

        curlData.forEach((d) => {
          if (!d.inside) return;
          gRight.append('rect')
            .attr('x', xScale(d.x) - cellW / 2)
            .attr('y', yScale(d.y) - cellH / 2)
            .attr('width', cellW)
            .attr('height', cellH)
            .attr('fill', colorScale(d.curl))
            .attr('opacity', 0.7);
        });
      }

      // Boundary outline (thin)
      gRight.append('path')
        .datum(bPts)
        .attr('d', curveLine)
        .attr('fill', 'none')
        .attr('stroke', '#71717a')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '4,3');

      // Double integral value
      gRight.append('text')
        .attr('x', innerW / 2)
        .attr('y', innerH + 28)
        .attr('text-anchor', 'middle')
        .attr('font-size', '11px')
        .attr('fill', '#7C3AED')
        .text(`∬ = ${curlIntegral.toFixed(4)}`);
    },
    [fieldIdx, regionIdx, showHeatmap, width, panelH, uid],
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
          <span className="font-medium text-zinc-700 dark:text-zinc-300">Region:</span>
          <select
            value={regionIdx}
            onChange={(e) => setRegionIdx(Number(e.target.value))}
            className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-600 dark:bg-zinc-800"
          >
            {REGION_PRESETS.map((p, i) => (
              <option key={p.name} value={i}>{p.label}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={showHeatmap}
            onChange={(e) => setShowHeatmap(e.target.checked)}
            className="rounded"
          />
          <span className="text-xs text-zinc-600 dark:text-zinc-400">Curl heatmap</span>
        </label>
      </div>

      <svg
        ref={svgRef}
        width={width}
        height={panelH + margin.top + margin.bottom}
        className="overflow-visible rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900"
      />

      <div className="mt-3 flex items-center gap-6 text-xs">
        <div>
          <span className="font-medium text-zinc-700 dark:text-zinc-300">∮ F · dr =</span>{' '}
          <span className="tabular-nums" style={{ color: functionColors[0] }}>{circulation.toFixed(6)}</span>
        </div>
        <div>
          <span className="font-medium text-zinc-700 dark:text-zinc-300">∬ curl(F) dA =</span>{' '}
          <span className="tabular-nums" style={{ color: '#7C3AED' }}>{curlIntegral.toFixed(6)}</span>
        </div>
        <div>
          <span className="font-medium text-zinc-700 dark:text-zinc-300">Difference:</span>{' '}
          <span className="tabular-nums text-zinc-500">{Math.abs(circulation - curlIntegral).toExponential(2)}</span>
        </div>
      </div>
    </div>
  );
}
