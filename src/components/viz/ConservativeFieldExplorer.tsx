/**
 * ConservativeFieldExplorer — side-by-side comparison of a conservative field
 * and a non-conservative field, with multiple paths between the same endpoints
 * showing path (in)dependence.
 */
import { useState, useMemo, useId } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import {
  CONSERVATIVE_FIELD_PRESETS,
  NON_CONSERVATIVE_FIELD_PRESETS,
  asF,
} from '../../data/line-integrals-data';
import { lineIntegralVector } from './shared/integration';
import { functionColors } from './shared/colorScales';

const margin = { top: 28, right: 12, bottom: 32, left: 36 };
const GAP = 24;
const ARROW_GRID = 10;

// Fixed endpoints for path comparison
const START: [number, number] = [0, 0];
const END: [number, number] = [1.5, 1.5];

// Generate multiple paths between START and END
function makePaths(): {
  label: string;
  color: string;
  r: (t: number) => [number, number];
  rPrime: (t: number) => [number, number];
}[] {
  const [x0, y0] = START;
  const [x1, y1] = END;
  const dx = x1 - x0;
  const dy = y1 - y0;
  return [
    {
      label: 'Straight line',
      color: functionColors[0],
      r: (t: number): [number, number] => [x0 + t * dx, y0 + t * dy],
      rPrime: (): [number, number] => [dx, dy],
    },
    {
      label: 'Parabolic arc',
      color: functionColors[1],
      r: (t: number): [number, number] => [x0 + t * dx, y0 + t * t * dy],
      rPrime: (t: number): [number, number] => [dx, 2 * t * dy],
    },
    {
      label: 'Circular arc',
      color: functionColors[2],
      r: (t: number): [number, number] => {
        const angle = t * Math.PI / 2;
        return [x0 + Math.sin(angle) * dx, y0 + (1 - Math.cos(angle)) * dy];
      },
      rPrime: (t: number): [number, number] => {
        const angle = t * Math.PI / 2;
        return [
          Math.cos(angle) * dx * Math.PI / 2,
          Math.sin(angle) * dy * Math.PI / 2,
        ];
      },
    },
  ];
}

export default function ConservativeFieldExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();
  const panelW = Math.max(100, (width - GAP) / 2);
  const panelH = Math.min(panelW * 0.85, 400);
  const uid = useId();

  const [consIdx, setConsIdx] = useState(0);
  const [nonConsIdx, setNonConsIdx] = useState(0);
  const [showContours] = useState(true);

  const consField = CONSERVATIVE_FIELD_PRESETS[consIdx];
  const nonConsField = NON_CONSERVATIVE_FIELD_PRESETS[nonConsIdx];
  const consF = useMemo(() => asF(consField), [consIdx]);
  const nonConsF = useMemo(() => asF(nonConsField), [nonConsIdx]);

  const paths = useMemo(makePaths, []);

  // Compute work for each path on each field
  const consWork = useMemo(
    () => paths.map((p) => lineIntegralVector(consF, p.r, p.rPrime, [0, 1])),
    [consF, paths],
  );
  const nonConsWork = useMemo(
    () => paths.map((p) => lineIntegralVector(nonConsF, p.r, p.rPrime, [0, 1])),
    [nonConsF, paths],
  );

  // Render a single panel
  function renderPanel(
    g: d3.Selection<SVGGElement, unknown, null, undefined>,
    F: (x: number, y: number) => [number, number],
    w: number,
    h: number,
    title: string,
    workValues: number[],
    isConservative: boolean,
  ) {
    const innerW = w - margin.left - margin.right;
    const innerH = h - margin.top - margin.bottom;

    const xDomain: [number, number] = [-0.5, 2.5];
    const yDomain: [number, number] = [-0.5, 2.5];
    const xScale = d3.scaleLinear().domain(xDomain).range([0, innerW]);
    const yScale = d3.scaleLinear().domain(yDomain).range([innerH, 0]);

    // Title
    g.append('text')
      .attr('x', innerW / 2)
      .attr('y', -8)
      .attr('text-anchor', 'middle')
      .attr('font-size', '11px')
      .attr('font-weight', '600')
      .attr('fill', 'currentColor')
      .text(title);

    // Axes
    g.append('g')
      .attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(xScale).ticks(4));
    g.append('g').call(d3.axisLeft(yScale).ticks(4));

    // Arrow marker
    const defs = g.append('defs');
    const mkId = `arr-${uid}-${isConservative ? 'c' : 'n'}`;
    defs
      .append('marker')
      .attr('id', mkId)
      .attr('viewBox', '0 0 10 10')
      .attr('refX', 10)
      .attr('refY', 5)
      .attr('markerWidth', 3.5)
      .attr('markerHeight', 3.5)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M 0 0 L 10 5 L 0 10 z')
      .attr('fill', '#94a3b8');

    // Field arrows
    const dxGrid = (xDomain[1] - xDomain[0]) / ARROW_GRID;
    const dyGrid = (yDomain[1] - yDomain[0]) / ARROW_GRID;
    let maxMag = 0;
    for (let i = 0; i <= ARROW_GRID; i++) {
      for (let j = 0; j <= ARROW_GRID; j++) {
        const x = xDomain[0] + i * dxGrid;
        const y = yDomain[0] + j * dyGrid;
        const [fx, fy] = F(x, y);
        const mag = Math.sqrt(fx * fx + fy * fy);
        if (isFinite(mag) && mag > maxMag) maxMag = mag;
      }
    }
    const arrowScale = Math.min(dxGrid, dyGrid) * 0.35 / (maxMag || 1);

    for (let i = 0; i <= ARROW_GRID; i++) {
      for (let j = 0; j <= ARROW_GRID; j++) {
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
          .attr('stroke', '#cbd5e1')
          .attr('stroke-width', 0.8)
          .attr('marker-end', `url(#${mkId})`);
      }
    }

    // Draw paths
    paths.forEach((p, idx) => {
      const pts: [number, number][] = [];
      for (let s = 0; s <= 80; s++) {
        pts.push(p.r(s / 80));
      }
      const line = d3.line<[number, number]>()
        .x((d) => xScale(d[0]))
        .y((d) => yScale(d[1]));
      g.append('path')
        .datum(pts)
        .attr('d', line)
        .attr('fill', 'none')
        .attr('stroke', p.color)
        .attr('stroke-width', 2.5)
        .attr('stroke-opacity', 0.85);

      // Work label
      const midPt = p.r(0.55);
      const offset = idx === 0 ? -12 : idx === 1 ? 12 : 0;
      g.append('text')
        .attr('x', xScale(midPt[0]) + offset)
        .attr('y', yScale(midPt[1]) - 8)
        .attr('text-anchor', 'middle')
        .attr('font-size', '9px')
        .attr('font-weight', '600')
        .attr('fill', p.color)
        .text(workValues[idx].toFixed(3));
    });

    // Endpoints
    g.append('circle')
      .attr('cx', xScale(START[0]))
      .attr('cy', yScale(START[1]))
      .attr('r', 5)
      .attr('fill', '#18181b')
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5);
    g.append('circle')
      .attr('cx', xScale(END[0]))
      .attr('cy', yScale(END[1]))
      .attr('r', 5)
      .attr('fill', 'none')
      .attr('stroke', '#18181b')
      .attr('stroke-width', 2);
  }

  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (width <= 0 || panelH <= 0) return;

      // Left panel: conservative
      const gLeft = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
      renderPanel(gLeft, consF, panelW, panelH, `Conservative: ${consField.label}`, consWork, true);

      // Right panel: non-conservative
      const gRight = svg
        .append('g')
        .attr('transform', `translate(${panelW + GAP + margin.left},${margin.top})`);
      renderPanel(gRight, nonConsF, panelW, panelH, `Non-conservative: ${nonConsField.label}`, nonConsWork, false);
    },
    [consIdx, nonConsIdx, showContours, width, panelH, uid],
  );

  return (
    <div ref={containerRef} className="my-8 w-full">
      <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-1.5">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">Conservative:</span>
          <select
            value={consIdx}
            onChange={(e) => setConsIdx(Number(e.target.value))}
            className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-600 dark:bg-zinc-800"
          >
            {CONSERVATIVE_FIELD_PRESETS.map((p, i) => (
              <option key={p.name} value={i}>{p.label}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1.5">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">Non-conservative:</span>
          <select
            value={nonConsIdx}
            onChange={(e) => setNonConsIdx(Number(e.target.value))}
            className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-600 dark:bg-zinc-800"
          >
            {NON_CONSERVATIVE_FIELD_PRESETS.map((p, i) => (
              <option key={p.name} value={i}>{p.label}</option>
            ))}
          </select>
        </label>
      </div>

      <svg
        ref={svgRef}
        width={width}
        height={panelH + margin.top + margin.bottom}
        className="overflow-visible rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900"
      />

      {/* Work comparison table */}
      <div className="mt-3 grid grid-cols-2 gap-4">
        <div>
          <h4 className="mb-1 text-xs font-semibold text-zinc-700 dark:text-zinc-300">Conservative field</h4>
          <table className="w-full text-xs">
            <tbody>
              {paths.map((p, i) => (
                <tr key={p.label}>
                  <td className="pr-2" style={{ color: p.color }}>{p.label}</td>
                  <td className="tabular-nums text-right">{consWork[i]?.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-1 text-xs font-medium text-emerald-600">All paths give the same value</p>
        </div>
        <div>
          <h4 className="mb-1 text-xs font-semibold text-zinc-700 dark:text-zinc-300">Non-conservative field</h4>
          <table className="w-full text-xs">
            <tbody>
              {paths.map((p, i) => (
                <tr key={p.label}>
                  <td className="pr-2" style={{ color: p.color }}>{p.label}</td>
                  <td className="tabular-nums text-right">{nonConsWork[i]?.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-1 text-xs font-medium text-red-600">Different paths, different values</p>
        </div>
      </div>
    </div>
  );
}
