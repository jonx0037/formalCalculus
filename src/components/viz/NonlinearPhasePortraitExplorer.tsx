import { useState, useMemo, useCallback } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import {
  computeNonlinearField,
  computeNonlinearTrajectory,
  computeNullclines,
  classifyEquilibrium,
} from './shared/odes';
import type { Equilibrium2D, SystemTrajectory } from './shared/odes';
import { getNonlinearSystemPresets } from '../../data/stability-dynamics-data';

// ── Constants ─────────────────────────────────────────────────

const PRESETS = getNonlinearSystemPresets();
const margin = { top: 20, right: 30, bottom: 40, left: 50 };
const TRAJECTORY_COLORS = [
  '#2563EB', '#DC2626', '#059669', '#D97706',
  '#7C3AED', '#0891B2', '#DB2777', '#65A30D',
];
const MAX_TRAJECTORIES = 12;
const NULLCLINE_1_COLOR = '#3B82F6'; // blue
const NULLCLINE_2_COLOR = '#EF4444'; // red

const CLASSIFICATION_LABELS: Record<string, string> = {
  'stable-node': 'Stable Node',
  'unstable-node': 'Unstable Node',
  'saddle': 'Saddle Point',
  'stable-spiral': 'Stable Spiral',
  'unstable-spiral': 'Unstable Spiral',
  'center': 'Center',
  'degenerate': 'Degenerate Node',
};

interface TrajectoryData {
  y1_0: number;
  y2_0: number;
  forward: SystemTrajectory;
  backward: SystemTrajectory;
}

// ── Main component ──────────────────────────────────────────

export default function NonlinearPhasePortraitExplorer() {
  const { ref: containerRef, width: containerWidth } = useResizeObserver<HTMLDivElement>();

  // ── State ───────────────────────────────────────────────────

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [paramValues, setParamValues] = useState<Record<string, number>>(
    () => ({ ...PRESETS[0].defaultParams }),
  );
  const [trajectories, setTrajectories] = useState<TrajectoryData[]>([]);
  const [showNullclines, setShowNullclines] = useState(true);
  const [showLinearization, setShowLinearization] = useState(false);
  const [hoverInfo, setHoverInfo] = useState<{ y1: number; y2: number } | null>(null);

  const preset = PRESETS[selectedIdx];
  const width = Math.min(containerWidth, 800);
  const height = Math.min(width * 0.7, 500);

  // Bind parameters into the system function
  const systemFn = useCallback(
    (y1: number, y2: number): [number, number] => preset.f(y1, y2, paramValues),
    [preset, paramValues],
  );

  // ── Computed data ─────────────────────────────────────────

  const field = useMemo(
    () => computeNonlinearField(systemFn, preset.domain.y1, preset.domain.y2, 18, 18),
    [systemFn, preset.domain],
  );

  const maxMag = useMemo(
    () => Math.max(...field.map((p) => p.magnitude), 1e-10),
    [field],
  );

  const nullclines = useMemo(
    () => computeNullclines(systemFn, preset.domain.y1, preset.domain.y2, 150),
    [systemFn, preset.domain],
  );

  const equilibria: Equilibrium2D[] = useMemo(
    () => {
      if (nullclines.intersections.length === 0) return [];
      return classifyEquilibrium(systemFn, nullclines.intersections);
    },
    [systemFn, nullclines.intersections],
  );

  // ── Handlers ──────────────────────────────────────────────

  const handleClick = useCallback(
    (y1: number, y2: number) => {
      if (trajectories.length >= MAX_TRAJECTORIES) return;
      const tEnd = 20;
      const h = 0.02;
      const forward = computeNonlinearTrajectory(systemFn, [y1, y2], [0, tEnd], h);
      const backward = computeNonlinearTrajectory(systemFn, [y1, y2], [0, -tEnd], h);
      setTrajectories((prev) => [...prev, { y1_0: y1, y2_0: y2, forward, backward }]);
    },
    [systemFn, trajectories.length],
  );

  const handlePresetChange = useCallback((idx: number) => {
    setSelectedIdx(idx);
    setParamValues({ ...PRESETS[idx].defaultParams });
    setTrajectories([]);
    setHoverInfo(null);
  }, []);

  const handleParamChange = useCallback((key: string, value: number) => {
    setParamValues((prev) => ({ ...prev, [key]: value }));
    setTrajectories([]);
  }, []);

  // ── D3 rendering ──────────────────────────────────────────

  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (width === 0 || height === 0) return;

      const innerW = width - margin.left - margin.right;
      const innerH = height - margin.top - margin.bottom;

      const g = svg
        .attr('width', width)
        .attr('height', height)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const xScale = d3.scaleLinear().domain(preset.domain.y1).range([0, innerW]);
      const yScale = d3.scaleLinear().domain(preset.domain.y2).range([innerH, 0]);

      // ── Grid ───────────────────────────────────────────────
      const xAxis = d3.axisBottom(xScale).ticks(8);
      const yAxis = d3.axisLeft(yScale).ticks(8);

      g.append('g')
        .attr('transform', `translate(0,${innerH})`)
        .call(xAxis)
        .selectAll('text').style('font-size', '10px');

      g.append('g')
        .call(yAxis)
        .selectAll('text').style('font-size', '10px');

      // Axis labels
      g.append('text')
        .attr('x', innerW / 2).attr('y', innerH + 35)
        .attr('text-anchor', 'middle')
        .style('font-size', '11px').style('fill', 'var(--color-text-muted)')
        .text(preset.y1Label);

      g.append('text')
        .attr('x', -innerH / 2).attr('y', -38)
        .attr('text-anchor', 'middle')
        .attr('transform', 'rotate(-90)')
        .style('font-size', '11px').style('fill', 'var(--color-text-muted)')
        .text(preset.y2Label);

      // Clip path
      g.append('defs').append('clipPath').attr('id', 'nlpp-clip')
        .append('rect').attr('width', innerW).attr('height', innerH);

      const plotArea = g.append('g').attr('clip-path', 'url(#nlpp-clip)');

      // ── Vector field ───────────────────────────────────────
      const arrowLen = Math.min(innerW, innerH) / 22;

      for (const pt of field) {
        const cx = xScale(pt.y1);
        const cy = yScale(pt.y2);
        const scale = pt.magnitude > 1e-10 ? arrowLen * 0.8 * Math.min(pt.magnitude / maxMag, 1) : 0;
        if (scale < 0.5) continue;

        const angle = Math.atan2(-pt.dy2, pt.dy1); // negative because y-axis is flipped
        const dx = scale * Math.cos(angle);
        const dy = scale * Math.sin(angle);

        plotArea.append('line')
          .attr('x1', cx - dx * 0.5).attr('y1', cy - dy * 0.5)
          .attr('x2', cx + dx * 0.5).attr('y2', cy + dy * 0.5)
          .style('stroke', '#9CA3AF')
          .style('stroke-width', 0.8)
          .style('stroke-linecap', 'round')
          .style('opacity', 0.5);
      }

      // ── Nullclines ─────────────────────────────────────────
      if (showNullclines) {
        for (const pt of nullclines.f1Zero) {
          plotArea.append('circle')
            .attr('cx', xScale(pt.y1)).attr('cy', yScale(pt.y2))
            .attr('r', 1.2)
            .style('fill', NULLCLINE_1_COLOR)
            .style('opacity', 0.6);
        }
        for (const pt of nullclines.f2Zero) {
          plotArea.append('circle')
            .attr('cx', xScale(pt.y1)).attr('cy', yScale(pt.y2))
            .attr('r', 1.2)
            .style('fill', NULLCLINE_2_COLOR)
            .style('opacity', 0.6);
        }
      }

      // ── Trajectories ───────────────────────────────────────
      const lineGen = d3.line<[number, number]>()
        .x((d) => xScale(d[0]))
        .y((d) => yScale(d[1]));

      for (let i = 0; i < trajectories.length; i++) {
        const traj = trajectories[i];
        const color = TRAJECTORY_COLORS[i % TRAJECTORY_COLORS.length];

        for (const seg of [traj.forward, traj.backward]) {
          const pts: [number, number][] = seg.y1.map((v, j) => [v, seg.y2[j]]);
          if (pts.length < 2) continue;

          plotArea.append('path')
            .datum(pts)
            .attr('d', lineGen)
            .style('fill', 'none')
            .style('stroke', color)
            .style('stroke-width', 1.5)
            .style('opacity', 0.85);
        }

        // Starting point marker
        plotArea.append('circle')
          .attr('cx', xScale(traj.y1_0)).attr('cy', yScale(traj.y2_0))
          .attr('r', 3)
          .style('fill', color)
          .style('stroke', '#fff')
          .style('stroke-width', 1);
      }

      // ── Equilibria ─────────────────────────────────────────
      for (const eq of equilibria) {
        const cx = xScale(eq.y[0]);
        const cy = yScale(eq.y[1]);
        const isStable = eq.classification.type.startsWith('stable') || eq.classification.type === 'center';

        plotArea.append('circle')
          .attr('cx', cx).attr('cy', cy)
          .attr('r', 5)
          .style('fill', isStable ? '#059669' : '#fff')
          .style('stroke', isStable ? '#059669' : '#DC2626')
          .style('stroke-width', 2);

        // Linearization eigenvectors
        if (showLinearization && eq.eigenvalues.imag[0] === 0 && eq.eigenvalues.imag[1] === 0) {
          const J = eq.jacobian;
          // Compute eigenvectors from Jacobian for display
          for (let k = 0; k < 2; k++) {
            const lam = eq.eigenvalues.real[k];
            // Find eigenvector of (J - λI)
            let vx: number, vy: number;
            const a = J.a11 - lam;
            const b = J.a12;
            if (Math.abs(b) > 1e-10) {
              vx = 1;
              vy = -a / b;
            } else if (Math.abs(J.a21) > 1e-10) {
              vx = -(J.a22 - lam) / J.a21;
              vy = 1;
            } else {
              vx = 1;
              vy = 0;
            }
            const norm = Math.sqrt(vx * vx + vy * vy);
            vx /= norm;
            vy /= norm;

            const len = 30;
            const evColor = lam < 0 ? '#059669' : '#DC2626';
            plotArea.append('line')
              .attr('x1', cx - len * vx).attr('y1', cy + len * vy)
              .attr('x2', cx + len * vx).attr('y2', cy - len * vy)
              .style('stroke', evColor)
              .style('stroke-width', 1.5)
              .style('stroke-dasharray', '4,3')
              .style('opacity', 0.7);
          }
        }
      }

      // ── Click interaction ──────────────────────────────────
      g.append('rect')
        .attr('width', innerW).attr('height', innerH)
        .style('fill', 'transparent')
        .style('cursor', 'crosshair')
        .on('click', (event: MouseEvent) => {
          const [mx, my] = d3.pointer(event);
          const y1 = xScale.invert(mx);
          const y2 = yScale.invert(my);
          handleClick(y1, y2);
        })
        .on('mousemove', (event: MouseEvent) => {
          const [mx, my] = d3.pointer(event);
          setHoverInfo({ y1: xScale.invert(mx), y2: yScale.invert(my) });
        })
        .on('mouseleave', () => setHoverInfo(null));
    },
    [field, maxMag, nullclines, equilibria, trajectories, preset, width, height, showNullclines, showLinearization, handleClick],
  );

  // Get the first adjustable parameter for the slider
  const paramKeys = Object.keys(preset.defaultParams);
  const mainParamKey = paramKeys[0];
  const mainParamRange = preset.paramRanges[mainParamKey];

  return (
    <div ref={containerRef} className="flex flex-col gap-3 my-6">
      {/* ── Controls ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-1.5 font-medium" style={{ color: 'var(--color-text-muted)' }}>
          System:
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

        {mainParamKey && (
          <label className="flex items-center gap-1.5" style={{ color: 'var(--color-text-muted)' }}>
            {mainParamKey} = {paramValues[mainParamKey]?.toFixed(2)}
            <input
              type="range"
              min={mainParamRange[0]}
              max={mainParamRange[1]}
              step={(mainParamRange[1] - mainParamRange[0]) / 100}
              value={paramValues[mainParamKey] ?? mainParamRange[0]}
              onChange={(e) => handleParamChange(mainParamKey, parseFloat(e.target.value))}
              className="w-28"
            />
          </label>
        )}

        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={showNullclines}
            onChange={(e) => setShowNullclines(e.target.checked)}
          />
          <span style={{ color: 'var(--color-text-muted)' }}>Nullclines</span>
        </label>

        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={showLinearization}
            onChange={(e) => setShowLinearization(e.target.checked)}
          />
          <span style={{ color: 'var(--color-text-muted)' }}>Eigenvectors</span>
        </label>

        <button
          onClick={() => setTrajectories([])}
          className="rounded px-2 py-1 text-xs"
          style={{ background: 'var(--color-surface-alt)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
        >
          Clear trajectories
        </button>
      </div>

      {/* ── SVG ──────────────────────────────────────────── */}
      <svg
        ref={svgRef}
        className="rounded"
        style={{ border: '1px solid var(--color-border)', background: 'var(--color-viz-bg)' }}
      />

      {/* ── Info panel ───────────────────────────────────── */}
      <div className="flex flex-wrap gap-4 text-xs" style={{ color: 'var(--color-text-muted)' }}>
        <div>
          <strong>Equilibria:</strong>{' '}
          {equilibria.length === 0
            ? 'none in domain'
            : equilibria.map((eq, i) => (
                <span key={i} className="mr-2">
                  ({eq.y[0].toFixed(2)}, {eq.y[1].toFixed(2)}) — {CLASSIFICATION_LABELS[eq.classification.type] || eq.classification.type}
                  {eq.isHyperbolic ? '' : ' (non-hyperbolic)'}
                </span>
              ))}
        </div>
        {showNullclines && (
          <div>
            <span style={{ color: NULLCLINE_1_COLOR }}>●</span>{' '}
            {preset.y1Label} nullcline{' '}
            <span style={{ color: NULLCLINE_2_COLOR }}>●</span>{' '}
            {preset.y2Label} nullcline
          </div>
        )}
        {hoverInfo && (
          <div>
            Cursor: ({hoverInfo.y1.toFixed(2)}, {hoverInfo.y2.toFixed(2)})
          </div>
        )}
        <div className="italic">{preset.description}</div>
      </div>
    </div>
  );
}
