import { useState, useMemo, useCallback } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { computeNonlinearField, computeNonlinearTrajectory } from './shared/odes';
import type { SystemTrajectory } from './shared/odes';
import { getBifurcationPresets } from '../../data/stability-dynamics-data';

// ── Constants ─────────────────────────────────────────────────

const PRESETS = getBifurcationPresets();
const TRAJECTORY_COLORS = ['#2563EB', '#DC2626', '#059669', '#D97706', '#7C3AED'];
const MAX_TRAJECTORIES = 8;

// ── Main component ──────────────────────────────────────────

export default function BifurcationDiagramExplorer() {
  const { ref: containerRef, width: containerWidth } = useResizeObserver<HTMLDivElement>();

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [mu, setMu] = useState(PRESETS[0].muDefault);
  const [trajectories, setTrajectories] = useState<SystemTrajectory[]>([]);

  const preset = PRESETS[selectedIdx];
  const totalWidth = Math.min(containerWidth, 900);
  const leftWidth = Math.floor(totalWidth * 0.48);
  const rightWidth = totalWidth - leftWidth - 10;
  const panelHeight = Math.min(leftWidth * 0.85, 380);

  const bfMargin = { top: 20, right: 20, bottom: 40, left: 50 };
  const ppMargin = { top: 20, right: 20, bottom: 40, left: 45 };

  // ── Computed: bifurcation curve ────────────────────────────

  const bifurcationCurve = useMemo(() => {
    const nMu = 200;
    const [muMin, muMax] = preset.muRange;
    const dMu = (muMax - muMin) / (nMu - 1);
    const stable: Array<{ mu: number; y1: number }> = [];
    const unstable: Array<{ mu: number; y1: number }> = [];

    for (let i = 0; i < nMu; i++) {
      const m = muMin + i * dMu;
      const eqs = preset.equilibria(m);
      for (const eq of eqs) {
        if (eq.stable) {
          stable.push({ mu: m, y1: eq.y[0] });
        } else {
          unstable.push({ mu: m, y1: eq.y[0] });
        }
      }
    }
    return { stable, unstable };
  }, [preset]);

  // Limit cycle amplitude for Hopf presets
  const limitCycleCurve = useMemo(() => {
    if (preset.type !== 'hopf-supercritical') return null;
    const pts: Array<{ mu: number; amp: number }> = [];
    const [muMin, muMax] = preset.muRange;
    const dMu = (muMax - muMin) / 200;
    for (let m = 0; m <= muMax; m += dMu) {
      if (m > 0) pts.push({ mu: m, amp: Math.sqrt(m) });
    }
    return pts;
  }, [preset]);

  // ── Phase portrait data at current mu ─────────────────────

  const currentSystemFn = useCallback(
    (y1: number, y2: number): [number, number] => preset.f(y1, y2, mu),
    [preset, mu],
  );

  const currentField = useMemo(
    () => computeNonlinearField(currentSystemFn, preset.domain.y1, preset.domain.y2, 14, 14),
    [currentSystemFn, preset.domain],
  );

  const currentEquilibria = useMemo(
    () => preset.equilibria(mu),
    [preset, mu],
  );

  const maxMag = useMemo(
    () => Math.max(...currentField.map((p) => p.magnitude), 1e-10),
    [currentField],
  );

  // ── Handlers ──────────────────────────────────────────────

  const handleMuChange = useCallback((newMu: number) => {
    setMu(newMu);
    setTrajectories([]);
  }, []);

  const handlePresetChange = useCallback((idx: number) => {
    setSelectedIdx(idx);
    setMu(PRESETS[idx].muDefault);
    setTrajectories([]);
  }, []);

  const handlePhaseClick = useCallback(
    (y1: number, y2: number) => {
      if (trajectories.length >= MAX_TRAJECTORIES) return;
      const traj = computeNonlinearTrajectory(currentSystemFn, [y1, y2], [0, 20], 0.02);
      setTrajectories((prev) => [...prev, traj]);
    },
    [currentSystemFn, trajectories.length],
  );

  // ── D3: Bifurcation diagram (left panel) ──────────────────

  const bfRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (leftWidth === 0) return;

      const innerW = leftWidth - bfMargin.left - bfMargin.right;
      const innerH = panelHeight - bfMargin.top - bfMargin.bottom;

      const g = svg
        .attr('width', leftWidth).attr('height', panelHeight)
        .append('g').attr('transform', `translate(${bfMargin.left},${bfMargin.top})`);

      const [muMin, muMax] = preset.muRange;

      // Compute y-range from data
      const allY1 = [...bifurcationCurve.stable.map((d) => d.y1), ...bifurcationCurve.unstable.map((d) => d.y1)];
      if (limitCycleCurve) allY1.push(...limitCycleCurve.map((d) => d.amp), ...limitCycleCurve.map((d) => -d.amp));
      const yMin = allY1.length > 0 ? Math.min(...allY1) - 0.3 : -2;
      const yMax = allY1.length > 0 ? Math.max(...allY1) + 0.3 : 2;

      const xScale = d3.scaleLinear().domain([muMin, muMax]).range([0, innerW]);
      const yScale = d3.scaleLinear().domain([yMin, yMax]).range([innerH, 0]);

      g.append('g').attr('transform', `translate(0,${innerH})`).call(d3.axisBottom(xScale).ticks(6))
        .selectAll('text').style('font-size', '9px');
      g.append('g').call(d3.axisLeft(yScale).ticks(6))
        .selectAll('text').style('font-size', '9px');

      g.append('text').attr('x', innerW / 2).attr('y', innerH + 32)
        .attr('text-anchor', 'middle').style('font-size', '10px').style('fill', 'var(--color-text-muted)')
        .text('μ');
      g.append('text').attr('x', -innerH / 2).attr('y', -35)
        .attr('text-anchor', 'middle').attr('transform', 'rotate(-90)')
        .style('font-size', '10px').style('fill', 'var(--color-text-muted)')
        .text('x*');

      // Stable branches (solid)
      const stableLine = d3.line<{ mu: number; y1: number }>()
        .x((d) => xScale(d.mu)).y((d) => yScale(d.y1));
      if (bifurcationCurve.stable.length > 1) {
        g.append('path').datum(bifurcationCurve.stable).attr('d', stableLine)
          .style('fill', 'none').style('stroke', '#059669').style('stroke-width', 2);
      }

      // Unstable branches (dashed)
      if (bifurcationCurve.unstable.length > 1) {
        g.append('path').datum(bifurcationCurve.unstable).attr('d', stableLine)
          .style('fill', 'none').style('stroke', '#DC2626').style('stroke-width', 2)
          .style('stroke-dasharray', '5,4');
      }

      // Limit cycle amplitude (for Hopf)
      if (limitCycleCurve && limitCycleCurve.length > 1) {
        const lcLine = d3.line<{ mu: number; amp: number }>()
          .x((d) => xScale(d.mu)).y((d) => yScale(d.amp));
        const lcLineNeg = d3.line<{ mu: number; amp: number }>()
          .x((d) => xScale(d.mu)).y((d) => yScale(-d.amp));

        g.append('path').datum(limitCycleCurve).attr('d', lcLine)
          .style('fill', 'none').style('stroke', '#7C3AED').style('stroke-width', 1.5);
        g.append('path').datum(limitCycleCurve).attr('d', lcLineNeg)
          .style('fill', 'none').style('stroke', '#7C3AED').style('stroke-width', 1.5);
      }

      // Current μ vertical line
      g.append('line')
        .attr('x1', xScale(mu)).attr('x2', xScale(mu))
        .attr('y1', 0).attr('y2', innerH)
        .style('stroke', '#6366F1').style('stroke-width', 1.5)
        .style('stroke-dasharray', '3,3').style('opacity', 0.8);

      // Current equilibria markers
      for (const eq of currentEquilibria) {
        const cx = xScale(mu);
        const cy = yScale(eq.y[0]);
        if (cy >= 0 && cy <= innerH) {
          g.append('circle')
            .attr('cx', cx).attr('cy', cy).attr('r', 4)
            .style('fill', eq.stable ? '#059669' : '#fff')
            .style('stroke', eq.stable ? '#059669' : '#DC2626')
            .style('stroke-width', 2);
        }
      }

      // Legend
      const legend = g.append('g').attr('transform', `translate(${innerW - 100}, 5)`);
      legend.append('line').attr('x1', 0).attr('x2', 15).attr('y1', 0).attr('y2', 0)
        .style('stroke', '#059669').style('stroke-width', 2);
      legend.append('text').attr('x', 20).attr('y', 4).style('font-size', '9px').style('fill', 'var(--color-text-muted)').text('Stable');
      legend.append('line').attr('x1', 0).attr('x2', 15).attr('y1', 15).attr('y2', 15)
        .style('stroke', '#DC2626').style('stroke-width', 2).style('stroke-dasharray', '5,4');
      legend.append('text').attr('x', 20).attr('y', 19).style('font-size', '9px').style('fill', 'var(--color-text-muted)').text('Unstable');
    },
    [bifurcationCurve, limitCycleCurve, currentEquilibria, mu, preset, leftWidth, panelHeight],
  );

  // ── D3: Phase portrait (right panel) ──────────────────────

  const ppRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (rightWidth === 0) return;

      const innerW = rightWidth - ppMargin.left - ppMargin.right;
      const innerH = panelHeight - ppMargin.top - ppMargin.bottom;

      const g = svg
        .attr('width', rightWidth).attr('height', panelHeight)
        .append('g').attr('transform', `translate(${ppMargin.left},${ppMargin.top})`);

      const xScale = d3.scaleLinear().domain(preset.domain.y1).range([0, innerW]);
      const yScale = d3.scaleLinear().domain(preset.domain.y2).range([innerH, 0]);

      g.append('g').attr('transform', `translate(0,${innerH})`).call(d3.axisBottom(xScale).ticks(5))
        .selectAll('text').style('font-size', '9px');
      g.append('g').call(d3.axisLeft(yScale).ticks(5))
        .selectAll('text').style('font-size', '9px');

      g.append('text').attr('x', innerW / 2).attr('y', innerH + 32)
        .attr('text-anchor', 'middle').style('font-size', '10px').style('fill', 'var(--color-text-muted)')
        .text('x₁');
      g.append('text').attr('x', -innerH / 2).attr('y', -32)
        .attr('text-anchor', 'middle').attr('transform', 'rotate(-90)')
        .style('font-size', '10px').style('fill', 'var(--color-text-muted)')
        .text('x₂');

      g.append('defs').append('clipPath').attr('id', 'bf-pp-clip')
        .append('rect').attr('width', innerW).attr('height', innerH);
      const plotArea = g.append('g').attr('clip-path', 'url(#bf-pp-clip)');

      // Vector field
      const arrowLen = Math.min(innerW, innerH) / 18;
      for (const pt of currentField) {
        const cx = xScale(pt.y1);
        const cy = yScale(pt.y2);
        const scale = pt.magnitude > 1e-10 ? arrowLen * 0.8 * Math.min(pt.magnitude / maxMag, 1) : 0;
        if (scale < 0.5) continue;

        const angle = Math.atan2(-pt.dy2, pt.dy1);
        const dx = scale * Math.cos(angle);
        const dy = scale * Math.sin(angle);

        plotArea.append('line')
          .attr('x1', cx - dx * 0.5).attr('y1', cy - dy * 0.5)
          .attr('x2', cx + dx * 0.5).attr('y2', cy + dy * 0.5)
          .style('stroke', '#9CA3AF').style('stroke-width', 0.7).style('opacity', 0.5);
      }

      // Trajectories
      const lineGen = d3.line<[number, number]>()
        .x((d) => xScale(d[0])).y((d) => yScale(d[1]));

      for (let i = 0; i < trajectories.length; i++) {
        const traj = trajectories[i];
        const color = TRAJECTORY_COLORS[i % TRAJECTORY_COLORS.length];
        const pts: [number, number][] = traj.y1.map((v, j) => [v, traj.y2[j]]);

        plotArea.append('path').datum(pts).attr('d', lineGen)
          .style('fill', 'none').style('stroke', color)
          .style('stroke-width', 1.5).style('opacity', 0.85);
      }

      // Equilibria
      for (const eq of currentEquilibria) {
        const cx = xScale(eq.y[0]);
        const cy = yScale(eq.y[1]);
        plotArea.append('circle')
          .attr('cx', cx).attr('cy', cy).attr('r', 5)
          .style('fill', eq.stable ? '#059669' : '#fff')
          .style('stroke', eq.stable ? '#059669' : '#DC2626')
          .style('stroke-width', 2);
      }

      // Click interaction
      g.append('rect')
        .attr('width', innerW).attr('height', innerH)
        .style('fill', 'transparent').style('cursor', 'crosshair')
        .on('click', (event: MouseEvent) => {
          const [mx, my] = d3.pointer(event);
          handlePhaseClick(xScale.invert(mx), yScale.invert(my));
        });
    },
    [currentField, currentEquilibria, trajectories, maxMag, preset, rightWidth, panelHeight, handlePhaseClick],
  );

  return (
    <div ref={containerRef} className="flex flex-col gap-3 my-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-1.5 font-medium" style={{ color: 'var(--color-text-muted)' }}>
          Bifurcation:
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

        <label className="flex items-center gap-1.5" style={{ color: 'var(--color-text-muted)' }}>
          μ = {mu.toFixed(2)}
          <input
            type="range"
            min={preset.muRange[0]}
            max={preset.muRange[1]}
            step={(preset.muRange[1] - preset.muRange[0]) / 200}
            value={mu}
            onChange={(e) => handleMuChange(parseFloat(e.target.value))}
            className="w-36"
          />
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
            Bifurcation diagram
          </div>
          <svg ref={bfRef} className="rounded"
            style={{ border: '1px solid var(--color-border)', background: 'var(--color-viz-bg)' }} />
        </div>
        <div>
          <div className="text-xs mb-1 font-medium" style={{ color: 'var(--color-text-muted)' }}>
            Phase portrait at μ = {mu.toFixed(2)} (click to launch)
          </div>
          <svg ref={ppRef} className="rounded"
            style={{ border: '1px solid var(--color-border)', background: 'var(--color-viz-bg)' }} />
        </div>
      </div>

      {/* Info */}
      <div className="text-xs italic" style={{ color: 'var(--color-text-muted)' }}>
        {preset.description}
      </div>
    </div>
  );
}
