import { useState, useMemo, useCallback } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { computeNonlinearTrajectory } from './shared/odes';
import type { SystemTrajectory } from './shared/odes';
import { getLyapunovPresets } from '../../data/stability-dynamics-data';

// ── Constants ─────────────────────────────────────────────────

const PRESETS = getLyapunovPresets();
const margin = { top: 20, right: 20, bottom: 40, left: 50 };
const TRAJECTORY_COLORS = ['#2563EB', '#DC2626', '#059669', '#D97706', '#7C3AED'];
const MAX_TRAJECTORIES = 6;
const LEVEL_COLOR_SCALE = d3.scaleSequential(d3.interpolateYlOrRd);

interface TrajectoryData {
  y1_0: number;
  y2_0: number;
  traj: SystemTrajectory;
  vValues: number[];
}

// ── Main component ──────────────────────────────────────────

export default function LyapunovFunctionExplorer() {
  const { ref: containerRef, width: containerWidth } = useResizeObserver<HTMLDivElement>();

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [trajectories, setTrajectories] = useState<TrajectoryData[]>([]);
  const [showVt, setShowVt] = useState(true);
  const [hoverInfo, setHoverInfo] = useState<{ y1: number; y2: number } | null>(null);

  const preset = PRESETS[selectedIdx];
  const totalWidth = Math.min(containerWidth, 900);
  const panelWidth = showVt ? Math.floor(totalWidth * 0.48) : Math.floor(totalWidth * 0.65);
  const vtWidth = showVt ? totalWidth - panelWidth - 10 : 0;
  const panelHeight = Math.min(panelWidth * 0.85, 400);

  // ── Computed contour data ──────────────────────────────────

  const contourData = useMemo(() => {
    const n = 80;
    const [y1Min, y1Max] = preset.domain.y1;
    const [y2Min, y2Max] = preset.domain.y2;
    const d1 = (y1Max - y1Min) / (n - 1);
    const d2 = (y2Max - y2Min) / (n - 1);
    const values: number[] = [];

    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const y1 = y1Min + i * d1;
        const y2 = y2Min + j * d2;
        values.push(preset.V(y1, y2));
      }
    }

    return { values, n, y1Min, y1Max, y2Min, y2Max };
  }, [preset]);

  // ── Handlers ──────────────────────────────────────────────

  const handleClick = useCallback(
    (y1: number, y2: number) => {
      if (trajectories.length >= MAX_TRAJECTORIES) return;
      const traj = computeNonlinearTrajectory(preset.f, [y1, y2], [0, 15], 0.02);
      const vValues = traj.y1.map((v1, i) => preset.V(v1, traj.y2[i]));
      setTrajectories((prev) => [...prev, { y1_0: y1, y2_0: y2, traj, vValues }]);
    },
    [preset, trajectories.length],
  );

  const handlePresetChange = useCallback((idx: number) => {
    setSelectedIdx(idx);
    setTrajectories([]);
    setHoverInfo(null);
  }, []);

  // ── D3 rendering: 2D level curves ─────────────────────────

  const levelRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (panelWidth === 0) return;

      const innerW = panelWidth - margin.left - margin.right;
      const innerH = panelHeight - margin.top - margin.bottom;

      const g = svg
        .attr('width', panelWidth)
        .attr('height', panelHeight)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const { n, y1Min, y1Max, y2Min, y2Max, values } = contourData;
      const xScale = d3.scaleLinear().domain([y1Min, y1Max]).range([0, innerW]);
      const yScale = d3.scaleLinear().domain([y2Min, y2Max]).range([innerH, 0]);

      // Axes
      g.append('g').attr('transform', `translate(0,${innerH})`).call(d3.axisBottom(xScale).ticks(6))
        .selectAll('text').style('font-size', '9px');
      g.append('g').call(d3.axisLeft(yScale).ticks(6))
        .selectAll('text').style('font-size', '9px');

      g.append('text').attr('x', innerW / 2).attr('y', innerH + 32)
        .attr('text-anchor', 'middle').style('font-size', '10px').style('fill', 'var(--color-text-muted)')
        .text('y₁');
      g.append('text').attr('x', -innerH / 2).attr('y', -35)
        .attr('text-anchor', 'middle').attr('transform', 'rotate(-90)')
        .style('font-size', '10px').style('fill', 'var(--color-text-muted)')
        .text('y₂');

      // Clip path
      g.append('defs').append('clipPath').attr('id', 'lyap-clip')
        .append('rect').attr('width', innerW).attr('height', innerH);
      const plotArea = g.append('g').attr('clip-path', 'url(#lyap-clip)');

      // Contour lines
      const maxV = Math.max(...values.filter((v) => isFinite(v)));
      const thresholds = d3.range(0, maxV, maxV / 12).slice(1);

      const contours = d3.contours()
        .size([n, n])
        .thresholds(thresholds);

      const contourPaths = contours(values);
      const geoScale = d3.geoTransform({
        point(px, py) {
          const y1 = y1Min + (px / (n - 1)) * (y1Max - y1Min);
          const y2 = y2Min + (py / (n - 1)) * (y2Max - y2Min);
          this.stream.point(xScale(y1), yScale(y2));
        },
      });
      const path = d3.geoPath(geoScale);

      LEVEL_COLOR_SCALE.domain([0, maxV]);

      plotArea.selectAll('path.contour')
        .data(contourPaths)
        .enter().append('path')
        .attr('d', path as unknown as string)
        .style('fill', 'none')
        .style('stroke', (d) => LEVEL_COLOR_SCALE(d.value))
        .style('stroke-width', 0.8)
        .style('opacity', 0.7);

      // Trajectories
      const lineGen = d3.line<[number, number]>()
        .x((d) => xScale(d[0])).y((d) => yScale(d[1]));

      for (let i = 0; i < trajectories.length; i++) {
        const { traj } = trajectories[i];
        const color = TRAJECTORY_COLORS[i % TRAJECTORY_COLORS.length];
        const pts: [number, number][] = traj.y1.map((v, j) => [v, traj.y2[j]]);

        plotArea.append('path').datum(pts).attr('d', lineGen)
          .style('fill', 'none').style('stroke', color)
          .style('stroke-width', 1.8).style('opacity', 0.9);

        plotArea.append('circle')
          .attr('cx', xScale(traj.y1[0])).attr('cy', yScale(traj.y2[0]))
          .attr('r', 3).style('fill', color).style('stroke', '#fff').style('stroke-width', 1);
      }

      // Origin marker
      plotArea.append('circle')
        .attr('cx', xScale(0)).attr('cy', yScale(0)).attr('r', 4)
        .style('fill', '#059669').style('stroke', '#fff').style('stroke-width', 1.5);

      // Click interaction
      g.append('rect')
        .attr('width', innerW).attr('height', innerH)
        .style('fill', 'transparent').style('cursor', 'crosshair')
        .on('click', (event: MouseEvent) => {
          const [mx, my] = d3.pointer(event);
          handleClick(xScale.invert(mx), yScale.invert(my));
        })
        .on('mousemove', (event: MouseEvent) => {
          const [mx, my] = d3.pointer(event);
          setHoverInfo({ y1: xScale.invert(mx), y2: yScale.invert(my) });
        })
        .on('mouseleave', () => setHoverInfo(null));
    },
    [contourData, trajectories, panelWidth, panelHeight, handleClick],
  );

  // ── D3 rendering: V(t) panel ──────────────────────────────

  const vtRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (!showVt || vtWidth === 0 || trajectories.length === 0) return;

      const vtMargin = { top: 20, right: 15, bottom: 40, left: 45 };
      const innerW = vtWidth - vtMargin.left - vtMargin.right;
      const innerH = panelHeight - vtMargin.top - vtMargin.bottom;

      const g = svg
        .attr('width', vtWidth).attr('height', panelHeight)
        .append('g').attr('transform', `translate(${vtMargin.left},${vtMargin.top})`);

      const allT = trajectories.flatMap((t) => t.traj.t);
      const allV = trajectories.flatMap((t) => t.vValues);
      const tMax = Math.max(...allT.filter(isFinite));
      const vMax = Math.max(...allV.filter(isFinite));

      const xScale = d3.scaleLinear().domain([0, tMax]).range([0, innerW]);
      const yScale = d3.scaleLinear().domain([0, vMax * 1.1]).range([innerH, 0]);

      g.append('g').attr('transform', `translate(0,${innerH})`).call(d3.axisBottom(xScale).ticks(5))
        .selectAll('text').style('font-size', '9px');
      g.append('g').call(d3.axisLeft(yScale).ticks(5))
        .selectAll('text').style('font-size', '9px');

      g.append('text').attr('x', innerW / 2).attr('y', innerH + 32)
        .attr('text-anchor', 'middle').style('font-size', '10px').style('fill', 'var(--color-text-muted)')
        .text('t');
      g.append('text').attr('x', -innerH / 2).attr('y', -32)
        .attr('text-anchor', 'middle').attr('transform', 'rotate(-90)')
        .style('font-size', '10px').style('fill', 'var(--color-text-muted)')
        .text('V(y(t))');

      const lineGen = d3.line<[number, number]>()
        .x((d) => xScale(d[0])).y((d) => yScale(d[1]));

      for (let i = 0; i < trajectories.length; i++) {
        const { traj, vValues } = trajectories[i];
        const color = TRAJECTORY_COLORS[i % TRAJECTORY_COLORS.length];
        const pts: [number, number][] = traj.t.map((t, j) => [t, vValues[j]]);

        g.append('path').datum(pts).attr('d', lineGen)
          .style('fill', 'none').style('stroke', color)
          .style('stroke-width', 1.5).style('opacity', 0.9);
      }
    },
    [trajectories, showVt, vtWidth, panelHeight],
  );

  return (
    <div ref={containerRef} className="flex flex-col gap-3 my-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-1.5 font-medium" style={{ color: 'var(--color-text-muted)' }}>
          Lyapunov function:
          <select
            value={selectedIdx}
            onChange={(e) => handlePresetChange(parseInt(e.target.value))}
            className="rounded px-2 py-1 text-sm"
            style={{ background: 'var(--color-surface-alt)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
          >
            {PRESETS.map((p, i) => (
              <option key={p.name} value={i}>{p.label}</option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-1">
          <input type="checkbox" checked={showVt} onChange={(e) => setShowVt(e.target.checked)} />
          <span style={{ color: 'var(--color-text-muted)' }}>V(t) panel</span>
        </label>

        <button
          onClick={() => setTrajectories([])}
          className="rounded px-2 py-1 text-xs"
          style={{ background: 'var(--color-surface-alt)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
        >
          Clear trajectories
        </button>
      </div>

      {/* Panels */}
      <div className="flex gap-2.5 flex-wrap">
        <div>
          <div className="text-xs mb-1 font-medium" style={{ color: 'var(--color-text-muted)' }}>
            Level curves of V (click to launch trajectory)
          </div>
          <svg
            ref={levelRef}
            className="rounded"
            style={{ border: '1px solid var(--color-border)', background: 'var(--color-viz-bg)' }}
          />
        </div>
        {showVt && trajectories.length > 0 && (
          <div>
            <div className="text-xs mb-1 font-medium" style={{ color: 'var(--color-text-muted)' }}>
              V(y(t)) along trajectory (should decrease)
            </div>
            <svg
              ref={vtRef}
              className="rounded"
              style={{ border: '1px solid var(--color-border)', background: 'var(--color-viz-bg)' }}
            />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
        {hoverInfo && `Cursor: (${hoverInfo.y1.toFixed(2)}, ${hoverInfo.y2.toFixed(2)}) — V = ${preset.V(hoverInfo.y1, hoverInfo.y2).toFixed(3)}, V̇ = ${preset.Vdot(hoverInfo.y1, hoverInfo.y2).toFixed(3)}`}
        <div className="italic mt-1">{preset.description}</div>
      </div>
    </div>
  );
}
