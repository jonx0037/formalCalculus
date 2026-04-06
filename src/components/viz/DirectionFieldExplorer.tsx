import { useState, useMemo, useCallback, type ChangeEvent } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { computeDirectionField, rk4Method, findEquilibria } from './shared/odes';
import { getODEPresets } from '../../data/first-order-odes-data';

// ── Constants ─────────────────────────────────────────────────

const PRESETS = getODEPresets();
const margin = { top: 20, right: 30, bottom: 40, left: 50 };
const MUTED = '#6b7280';
const SOLUTION_COLORS = [
  '#2563EB', // blue
  '#DC2626', // red
  '#059669', // green
  '#D97706', // orange
  '#7C3AED', // purple
  '#0891B2', // teal
  '#DB2777', // pink
  '#65A30D', // lime
];
const MAX_SOLUTIONS = 8;

interface SolutionCurve {
  t0: number;
  y0: number;
  forward: { t: number[]; y: number[] };
  backward: { t: number[]; y: number[] };
}

// ── Component ─────────────────────────────────────────────────

export default function DirectionFieldExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();
  const height = Math.min(width * 0.65, 500);

  const [selectedIdx, setSelectedIdx] = useState(1); // logistic as default
  const [gridDensity, setGridDensity] = useState(22);
  const [showEquilibria, setShowEquilibria] = useState(true);
  const [solutions, setSolutions] = useState<SolutionCurve[]>([]);
  const [hoverInfo, setHoverInfo] = useState<{ t: number; y: number; slope: number } | null>(null);

  const preset = PRESETS[selectedIdx];
  const [tMin, tMax] = preset.domain.t;
  const [yMin, yMax] = preset.domain.y;

  // ── Compute direction field ────────────────────────────────

  const fieldPoints = useMemo(
    () => computeDirectionField(preset.f, preset.domain.t, preset.domain.y, gridDensity, gridDensity),
    [preset, gridDensity],
  );

  // ── Compute equilibria (autonomous ODEs only) ──────────────

  const equilibria = useMemo(() => {
    if (!preset.isAutonomous) return preset.equilibria;
    return findEquilibria((y) => preset.f(0, y), preset.domain.y, 200);
  }, [preset]);

  // ── Click handler: launch solution curve ───────────────────

  const handleClick = useCallback(
    (t0: number, y0: number) => {
      if (solutions.length >= MAX_SOLUTIONS) return;
      const h = 0.01;
      const forward = rk4Method(preset.f, t0, y0, tMax, h);
      const backward = rk4Method(preset.f, t0, y0, tMin, h);
      setSolutions((prev) => [...prev, { t0, y0, forward, backward }]);
    },
    [preset, tMin, tMax, solutions.length],
  );

  // ── D3 rendering ──────────────────────────────────────────

  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (width === 0) return;

      const innerW = width - margin.left - margin.right;
      const innerH = height - margin.top - margin.bottom;
      if (innerW <= 0 || innerH <= 0) return;

      const g = svg
        .attr('width', width)
        .attr('height', height)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const xScale = d3.scaleLinear().domain([tMin, tMax]).range([0, innerW]);
      const yScale = d3.scaleLinear().domain([yMin, yMax]).range([innerH, 0]);

      // Axes
      g.append('g')
        .attr('transform', `translate(0,${innerH})`)
        .call(d3.axisBottom(xScale).ticks(8))
        .selectAll('text')
        .style('font-size', '11px');

      g.append('g')
        .call(d3.axisLeft(yScale).ticks(8))
        .selectAll('text')
        .style('font-size', '11px');

      // Axis labels
      g.append('text')
        .attr('x', innerW / 2)
        .attr('y', innerH + 35)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('fill', '#374151')
        .text('t');

      g.append('text')
        .attr('x', -innerH / 2)
        .attr('y', -38)
        .attr('text-anchor', 'middle')
        .attr('transform', 'rotate(-90)')
        .style('font-size', '12px')
        .style('fill', '#374151')
        .text('y');

      // Direction field segments
      const segLen = Math.min(innerW, innerH) / (gridDensity * 1.6);

      fieldPoints.forEach((pt) => {
        const cx = xScale(pt.t);
        const cy = yScale(pt.y);
        const dx = segLen / (2 * pt.magnitude);
        const dy = (segLen * pt.slope) / (2 * pt.magnitude);

        g.append('line')
          .attr('x1', cx - dx)
          .attr('y1', cy + dy) // y-axis is inverted in SVG
          .attr('x2', cx + dx)
          .attr('y2', cy - dy)
          .style('stroke', MUTED)
          .style('stroke-width', 1)
          .style('stroke-opacity', 0.6);
      });

      // Equilibria (horizontal dashed lines)
      if (showEquilibria) {
        equilibria.forEach((yEq) => {
          if (yEq >= yMin && yEq <= yMax) {
            g.append('line')
              .attr('x1', 0)
              .attr('y1', yScale(yEq))
              .attr('x2', innerW)
              .attr('y2', yScale(yEq))
              .style('stroke', MUTED)
              .style('stroke-width', 1.5)
              .style('stroke-dasharray', '6,4')
              .style('stroke-opacity', 0.8);
          }
        });
      }

      // Solution curves
      const line = d3
        .line<{ t: number; y: number }>()
        .x((d) => xScale(d.t))
        .y((d) => yScale(d.y))
        .defined((d) => isFinite(d.y) && Math.abs(d.y) < 1e6 && d.y >= yMin - 1 && d.y <= yMax + 1);

      solutions.forEach((sol, idx) => {
        const color = SOLUTION_COLORS[idx % SOLUTION_COLORS.length];

        // Combine backward (reversed) + forward
        const backPts = sol.backward.t
          .map((t, i) => ({ t, y: sol.backward.y[i] }))
          .reverse();
        const forwardPts = sol.forward.t.map((t, i) => ({ t, y: sol.forward.y[i] }));
        const allPts = [...backPts.slice(0, -1), ...forwardPts];

        g.append('path')
          .datum(allPts)
          .attr('d', line)
          .style('fill', 'none')
          .style('stroke', color)
          .style('stroke-width', 2.2)
          .style('stroke-opacity', 0.9);

        // Initial condition dot
        g.append('circle')
          .attr('cx', xScale(sol.t0))
          .attr('cy', yScale(sol.y0))
          .attr('r', 4)
          .style('fill', color)
          .style('stroke', '#fff')
          .style('stroke-width', 1.5);
      });

      // Click overlay
      g.append('rect')
        .attr('width', innerW)
        .attr('height', innerH)
        .style('fill', 'transparent')
        .style('cursor', 'crosshair')
        .on('click', (event: MouseEvent) => {
          const [mx, my] = d3.pointer(event);
          const t = xScale.invert(mx);
          const y = yScale.invert(my);
          handleClick(t, y);
        })
        .on('mousemove', (event: MouseEvent) => {
          const [mx, my] = d3.pointer(event);
          const t = xScale.invert(mx);
          const y = yScale.invert(my);
          const slope = preset.f(t, y);
          setHoverInfo({ t, y, slope });
        })
        .on('mouseleave', () => setHoverInfo(null));
    },
    [width, height, fieldPoints, solutions, equilibria, showEquilibria, gridDensity, preset, tMin, tMax, yMin, yMax, handleClick],
  );

  // ── JSX ────────────────────────────────────────────────────

  return (
    <div ref={containerRef} style={{ width: '100%', maxWidth: 780 }}>
      {/* Controls */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', marginBottom: 10 }}>
        <label style={{ fontSize: 13, color: '#374151' }}>
          ODE:&nbsp;
          <select
            value={selectedIdx}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => {
              setSelectedIdx(Number(e.target.value));
              setSolutions([]);
            }}
            style={{ fontSize: 13, padding: '2px 6px' }}
          >
            {PRESETS.map((p, i) => (
              <option key={p.name} value={i}>
                {p.label}
              </option>
            ))}
          </select>
        </label>

        <label style={{ fontSize: 13, color: '#374151' }}>
          Grid:&nbsp;
          <input
            type="range"
            min={10}
            max={40}
            value={gridDensity}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setGridDensity(Number(e.target.value))}
            style={{ width: 80, verticalAlign: 'middle' }}
          />
          <span style={{ fontSize: 11, color: '#6b7280', marginLeft: 4 }}>{gridDensity}</span>
        </label>

        <label style={{ fontSize: 13, color: '#374151', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={showEquilibria}
            onChange={() => setShowEquilibria(!showEquilibria)}
            style={{ marginRight: 4, verticalAlign: 'middle' }}
          />
          Equilibria
        </label>

        <button
          onClick={() => setSolutions([])}
          style={{
            fontSize: 12,
            padding: '3px 10px',
            background: '#f3f4f6',
            border: '1px solid #d1d5db',
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          Clear curves
        </button>
      </div>

      {/* SVG */}
      <svg ref={svgRef} />

      {/* Readout */}
      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6, minHeight: 18 }}>
        {hoverInfo ? (
          <span>
            ({hoverInfo.t.toFixed(2)}, {hoverInfo.y.toFixed(2)}) &nbsp; slope = {hoverInfo.slope.toFixed(3)}
          </span>
        ) : (
          <span>Click anywhere on the field to launch a solution curve (up to {MAX_SOLUTIONS})</span>
        )}
        {solutions.length > 0 && (
          <span style={{ marginLeft: 12 }}>
            {solutions.length} curve{solutions.length > 1 ? 's' : ''} shown
          </span>
        )}
      </div>
    </div>
  );
}
