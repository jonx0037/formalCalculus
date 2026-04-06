import { useState, useMemo, useCallback, type ChangeEvent } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { computeSystemTrajectory } from './shared/odes';
import type { Matrix2x2 } from './shared/odes';
import { getForcedSystemPresets } from '../../data/linear-systems-data';

// ── Constants ─────────────────────────────────────────────────

const PRESETS = getForcedSystemPresets();
const margin = { top: 24, right: 16, bottom: 40, left: 46 };
const COLORS = {
  free: '#2563EB',
  forced: '#059669',
  total: '#DC2626',
} as const;
const STEP = 0.02;

type DisplayMode = 'all' | 'free' | 'forced' | 'total';

// ── Component ─────────────────────────────────────────────────

export default function VariationOfParametersExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();

  // ── State ────────────────────────────────────────────────────

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [y01, setY01] = useState(1);
  const [y02, setY02] = useState(0);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('all');

  const preset = PRESETS[selectedIdx];

  // ── Computed trajectories ────────────────────────────────────

  const { freeResponse, forcedResponse, totalResponse } = useMemo(() => {
    const A: Matrix2x2 = {
      a11: preset.A[0][0],
      a12: preset.A[0][1],
      a21: preset.A[1][0],
      a22: preset.A[1][1],
    };
    const tRange: [number, number] = [preset.domain.t[0], preset.domain.t[1]];

    // Free response: homogeneous system, no forcing
    const free = computeSystemTrajectory(A, [y01, y02], tRange, STEP);

    // Total response: with forcing
    const total = computeSystemTrajectory(A, [y01, y02], tRange, STEP, preset.g);

    // Forced (particular) response: total minus free, element-wise
    const minLen = Math.min(free.t.length, total.t.length);
    const forced = {
      t: total.t.slice(0, minLen),
      y1: total.y1.slice(0, minLen).map((v, i) => v - free.y1[i]),
      y2: total.y2.slice(0, minLen).map((v, i) => v - free.y2[i]),
      method: 'rk4-system' as const,
    };

    return { freeResponse: free, forcedResponse: forced, totalResponse: total };
  }, [preset, y01, y02]);

  // ── Helpers ──────────────────────────────────────────────────

  const shouldShow = useCallback(
    (which: 'free' | 'forced' | 'total') => {
      return displayMode === 'all' || displayMode === which;
    },
    [displayMode],
  );

  // ── D3: Phase portrait (left panel) ─────────────────────────

  const phaseRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (width === 0) return;

      const panelW = Math.max(0, width / 3 - 10);
      const panelH = Math.min(panelW, 320);
      const innerW = panelW - margin.left - margin.right;
      const innerH = panelH - margin.top - margin.bottom;
      if (innerW <= 0 || innerH <= 0) return;

      svg.attr('width', panelW).attr('height', panelH);

      const g = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      // Compute domain extents from all visible trajectories
      const allY1: number[] = [];
      const allY2: number[] = [];
      if (shouldShow('free')) {
        allY1.push(...freeResponse.y1);
        allY2.push(...freeResponse.y2);
      }
      if (shouldShow('forced')) {
        allY1.push(...forcedResponse.y1);
        allY2.push(...forcedResponse.y2);
      }
      if (shouldShow('total')) {
        allY1.push(...totalResponse.y1);
        allY2.push(...totalResponse.y2);
      }
      if (allY1.length === 0) {
        allY1.push(-1, 1);
        allY2.push(-1, 1);
      }

      const y1Ext = [d3.min(allY1) ?? -1, d3.max(allY1) ?? 1] as [number, number];
      const y2Ext = [d3.min(allY2) ?? -1, d3.max(allY2) ?? 1] as [number, number];
      const pad1 = (y1Ext[1] - y1Ext[0]) * 0.15 || 1;
      const pad2 = (y2Ext[1] - y2Ext[0]) * 0.15 || 1;

      const xScale = d3
        .scaleLinear()
        .domain([y1Ext[0] - pad1, y1Ext[1] + pad1])
        .range([0, innerW]);
      const yScale = d3
        .scaleLinear()
        .domain([y2Ext[0] - pad2, y2Ext[1] + pad2])
        .range([innerH, 0]);

      // Axes
      g.append('g')
        .attr('transform', `translate(0,${innerH})`)
        .call(d3.axisBottom(xScale).ticks(5))
        .selectAll('text')
        .style('font-size', '10px');
      g.call(d3.axisLeft(yScale).ticks(5))
        .selectAll('text')
        .style('font-size', '10px');

      // Axis labels
      g.append('text')
        .attr('x', innerW / 2)
        .attr('y', innerH + 32)
        .attr('text-anchor', 'middle')
        .style('font-size', '11px')
        .style('fill', '#374151')
        .text('y\u2081');
      g.append('text')
        .attr('x', -innerH / 2)
        .attr('y', -34)
        .attr('text-anchor', 'middle')
        .attr('transform', 'rotate(-90)')
        .style('font-size', '11px')
        .style('fill', '#374151')
        .text('y\u2082');

      // Title
      g.append('text')
        .attr('x', innerW / 2)
        .attr('y', -8)
        .attr('text-anchor', 'middle')
        .style('font-size', '11px')
        .style('fill', '#374151')
        .text('Phase portrait');

      // Line generators
      const drawPath = (
        y1Arr: number[],
        y2Arr: number[],
        color: string,
        dash: string,
        strokeWidth: number,
      ) => {
        const pts = y1Arr.map((_, i) => ({ x: y1Arr[i], y: y2Arr[i] }));
        const line = d3
          .line<{ x: number; y: number }>()
          .x((d) => xScale(d.x))
          .y((d) => yScale(d.y))
          .defined((d) => isFinite(d.x) && isFinite(d.y));
        g.append('path')
          .attr('d', line(pts))
          .style('fill', 'none')
          .style('stroke', color)
          .style('stroke-width', strokeWidth)
          .style('stroke-dasharray', dash);
      };

      // Draw trajectories based on display mode
      if (shouldShow('free')) {
        drawPath(freeResponse.y1, freeResponse.y2, COLORS.free, '6,3', 1.8);
      }
      if (shouldShow('forced')) {
        drawPath(forcedResponse.y1, forcedResponse.y2, COLORS.forced, '3,3', 1.8);
      }
      if (shouldShow('total')) {
        drawPath(totalResponse.y1, totalResponse.y2, COLORS.total, '', 2.2);
      }

      // Equilibrium at origin
      g.append('circle')
        .attr('cx', xScale(0))
        .attr('cy', yScale(0))
        .attr('r', 3.5)
        .style('fill', '#6b7280')
        .style('stroke', '#374151')
        .style('stroke-width', 1);
    },
    [width, freeResponse, forcedResponse, totalResponse, shouldShow],
  );

  // ── Shared time series rendering helper ──────────────────────

  const renderTimeSeriesPanel = useCallback(
    (
      svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
      yKey: 'y1' | 'y2',
      label: string,
    ) => {
      svg.selectAll('*').remove();
      if (width === 0) return;

      const panelW = Math.max(0, width / 3 - 10);
      const panelH = Math.min(panelW, 320);
      const innerW = panelW - margin.left - margin.right;
      const innerH = panelH - margin.top - margin.bottom;
      if (innerW <= 0 || innerH <= 0) return;

      svg.attr('width', panelW).attr('height', panelH);

      const g = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const tRange = preset.domain.t;

      const allY: number[] = [];
      if (shouldShow('free')) allY.push(...freeResponse[yKey]);
      if (shouldShow('forced')) allY.push(...forcedResponse[yKey]);
      if (shouldShow('total')) allY.push(...totalResponse[yKey]);
      if (allY.length === 0) allY.push(-1, 1);

      const yExt = [d3.min(allY) ?? -1, d3.max(allY) ?? 1] as [number, number];
      const yPad = (yExt[1] - yExt[0]) * 0.15 || 1;

      const xScale = d3.scaleLinear().domain(tRange).range([0, innerW]);
      const yScale = d3
        .scaleLinear()
        .domain([yExt[0] - yPad, yExt[1] + yPad])
        .range([innerH, 0]);

      g.append('g')
        .attr('transform', `translate(0,${innerH})`)
        .call(d3.axisBottom(xScale).ticks(5))
        .selectAll('text')
        .style('font-size', '10px');
      g.call(d3.axisLeft(yScale).ticks(5))
        .selectAll('text')
        .style('font-size', '10px');

      g.append('text')
        .attr('x', innerW / 2)
        .attr('y', innerH + 32)
        .attr('text-anchor', 'middle')
        .style('font-size', '11px')
        .style('fill', '#374151')
        .text('t');

      g.append('text')
        .attr('x', innerW / 2)
        .attr('y', -8)
        .attr('text-anchor', 'middle')
        .style('font-size', '11px')
        .style('fill', '#374151')
        .text(label);

      const drawCurve = (
        tArr: number[],
        yArr: number[],
        color: string,
        dash: string,
        strokeWidth: number,
      ) => {
        const pts = tArr.map((t, i) => ({ t, y: yArr[i] }));
        const line = d3
          .line<{ t: number; y: number }>()
          .x((d) => xScale(d.t))
          .y((d) => yScale(d.y))
          .defined((d) => isFinite(d.y));
        g.append('path')
          .attr('d', line(pts))
          .style('fill', 'none')
          .style('stroke', color)
          .style('stroke-width', strokeWidth)
          .style('stroke-dasharray', dash);
      };

      if (shouldShow('free')) {
        drawCurve(freeResponse.t, freeResponse[yKey], COLORS.free, '6,3', 1.8);
      }
      if (shouldShow('forced')) {
        drawCurve(forcedResponse.t, forcedResponse[yKey], COLORS.forced, '3,3', 1.8);
      }
      if (shouldShow('total')) {
        drawCurve(totalResponse.t, totalResponse[yKey], COLORS.total, '', 2.2);
      }
    },
    [width, freeResponse, forcedResponse, totalResponse, shouldShow, preset],
  );

  // ── D3: y1(t) time series (center panel) ────────────────────

  const y1Ref = useD3<SVGSVGElement>(
    (svg) => renderTimeSeriesPanel(svg, 'y1', 'y\u2081(t)'),
    [renderTimeSeriesPanel],
  );

  // ── D3: y2(t) time series (right panel) ─────────────────────

  const y2Ref = useD3<SVGSVGElement>(
    (svg) => renderTimeSeriesPanel(svg, 'y2', 'y\u2082(t)'),
    [renderTimeSeriesPanel],
  );

  // ── JSX ─────────────────────────────────────────────────────

  return (
    <div ref={containerRef} style={{ width: '100%', maxWidth: 900 }}>
      {/* Controls */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
          marginBottom: 10,
        }}
      >
        <label style={{ fontSize: 13, color: '#374151' }}>
          System:&nbsp;
          <select
            value={selectedIdx}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => {
              const idx = Number(e.target.value);
              setSelectedIdx(idx);
              setY01(1);
              setY02(0);
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
          y&#x2081;(0) =&nbsp;
          <input
            type="range"
            min={-3}
            max={3}
            step={0.1}
            value={y01}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setY01(Number(e.target.value))}
            style={{ width: 80, verticalAlign: 'middle' }}
          />
          <span style={{ fontSize: 11, color: '#6b7280', marginLeft: 4 }}>
            {y01.toFixed(1)}
          </span>
        </label>

        <label style={{ fontSize: 13, color: '#374151' }}>
          y&#x2082;(0) =&nbsp;
          <input
            type="range"
            min={-3}
            max={3}
            step={0.1}
            value={y02}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setY02(Number(e.target.value))}
            style={{ width: 80, verticalAlign: 'middle' }}
          />
          <span style={{ fontSize: 11, color: '#6b7280', marginLeft: 4 }}>
            {y02.toFixed(1)}
          </span>
        </label>

        <label style={{ fontSize: 13, color: '#374151' }}>
          Show:&nbsp;
          <select
            value={displayMode}
            onChange={(e: ChangeEvent<HTMLSelectElement>) =>
              setDisplayMode(e.target.value as DisplayMode)
            }
            style={{ fontSize: 13, padding: '2px 6px' }}
          >
            <option value="all">All</option>
            <option value="free">Free only</option>
            <option value="forced">Forced only</option>
            <option value="total">Total only</option>
          </select>
        </label>
      </div>

      {/* Three panels */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ flex: '1 1 250px', minWidth: 0 }}>
          <svg ref={phaseRef} />
        </div>
        <div style={{ flex: '1 1 250px', minWidth: 0 }}>
          <svg ref={y1Ref} />
        </div>
        <div style={{ flex: '1 1 250px', minWidth: 0 }}>
          <svg ref={y2Ref} />
        </div>
      </div>

      {/* Legend */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
          justifyContent: 'center',
          marginTop: 8,
          fontSize: 12,
          color: '#374151',
        }}
      >
        <span>
          <span
            style={{
              display: 'inline-block',
              width: 20,
              height: 0,
              borderTop: `2px dashed ${COLORS.free}`,
              verticalAlign: 'middle',
              marginRight: 4,
            }}
          />
          Free response (homogeneous)
        </span>
        <span>
          <span
            style={{
              display: 'inline-block',
              width: 20,
              height: 0,
              borderTop: `2px dotted ${COLORS.forced}`,
              verticalAlign: 'middle',
              marginRight: 4,
            }}
          />
          Forced response (particular)
        </span>
        <span>
          <span
            style={{
              display: 'inline-block',
              width: 20,
              height: 0,
              borderTop: `2.5px solid ${COLORS.total}`,
              verticalAlign: 'middle',
              marginRight: 4,
            }}
          />
          Total response
        </span>
      </div>

      {/* Description */}
      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>
        {preset.description}
      </div>
    </div>
  );
}
