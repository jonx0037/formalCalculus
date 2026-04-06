import { useState, useMemo, useCallback, useRef, useEffect, type ChangeEvent } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { computeSystemField, computeSystemTrajectory, eigenDecomposition2x2, classifyPhasePortrait } from './shared/odes';
import type { Matrix2x2 } from './shared/odes';
import { getSystemPresets } from '../../data/linear-systems-data';

// ── Constants ─────────────────────────────────────────────────

const PRESETS = getSystemPresets();
const margin = { top: 20, right: 30, bottom: 40, left: 50 };
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
const MAX_SOLUTIONS = 12;

/** Human-readable labels for phase portrait classifications. */
const CLASSIFICATION_LABELS: Record<string, string> = {
  'stable-node': 'Stable Node',
  'unstable-node': 'Unstable Node',
  'saddle': 'Saddle Point',
  'stable-spiral': 'Stable Spiral',
  'unstable-spiral': 'Unstable Spiral',
  'center': 'Center',
  'degenerate': 'Degenerate Node',
};

/** Colors associated with each classification type. */
const CLASSIFICATION_COLORS: Record<string, string> = {
  'stable-node': '#059669',
  'unstable-node': '#DC2626',
  'saddle': '#D97706',
  'stable-spiral': '#2563EB',
  'unstable-spiral': '#DB2777',
  'center': '#7C3AED',
  'degenerate': '#6b7280',
};

interface SolutionPair {
  y1_0: number;
  y2_0: number;
  forward: { t: number[]; y1: number[]; y2: number[] };
  backward: { t: number[]; y1: number[]; y2: number[] };
}

// ── Trace-determinant inset diagram ──────────────────────────

function TraceDetDiagram({ trace, determinant, classification }: {
  trace: number;
  determinant: number;
  classification: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const W = 150;
  const H = 120;
  const pad = { top: 10, right: 10, bottom: 22, left: 28 };

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const innerW = W - pad.left - pad.right;
    const innerH = H - pad.top - pad.bottom;

    const g = svg
      .attr('width', W)
      .attr('height', H)
      .append('g')
      .attr('transform', `translate(${pad.left},${pad.top})`);

    // Scales: tau on horizontal, delta on vertical
    const tauRange = 8;
    const deltaRange = 10;
    const xScale = d3.scaleLinear().domain([-tauRange, tauRange]).range([0, innerW]);
    const yScale = d3.scaleLinear().domain([-deltaRange / 2, deltaRange]).range([innerH, 0]);

    // Shaded region: delta < 0 (saddle region)
    g.append('rect')
      .attr('x', 0)
      .attr('y', yScale(0))
      .attr('width', innerW)
      .attr('height', innerH - yScale(0))
      .style('fill', '#FEF3C7')
      .style('opacity', 0.5);

    // Axes
    g.append('line')
      .attr('x1', 0).attr('x2', innerW)
      .attr('y1', yScale(0)).attr('y2', yScale(0))
      .style('stroke', '#9ca3af').style('stroke-width', 0.5);
    g.append('line')
      .attr('x1', xScale(0)).attr('x2', xScale(0))
      .attr('y1', 0).attr('y2', innerH)
      .style('stroke', '#9ca3af').style('stroke-width', 0.5);

    // Parabola: delta = tau^2 / 4
    const tauValues: number[] = [];
    for (let tau = -tauRange; tau <= tauRange; tau += 0.1) {
      tauValues.push(tau);
    }

    const parabolaLine = d3.line<number>()
      .x((tau) => xScale(tau))
      .y((tau) => yScale((tau * tau) / 4))
      .defined((tau) => (tau * tau) / 4 <= deltaRange);

    g.append('path')
      .datum(tauValues)
      .attr('d', parabolaLine)
      .style('fill', 'none')
      .style('stroke', '#6b7280')
      .style('stroke-width', 1)
      .style('stroke-dasharray', '3,2');

    // Axis labels
    g.append('text')
      .attr('x', innerW / 2).attr('y', innerH + 18)
      .attr('text-anchor', 'middle')
      .style('font-size', '9px').style('fill', '#6b7280')
      .text('trace (τ)');

    g.append('text')
      .attr('x', -innerH / 2).attr('y', -18)
      .attr('text-anchor', 'middle')
      .attr('transform', 'rotate(-90)')
      .style('font-size', '9px').style('fill', '#6b7280')
      .text('det (Δ)');

    // Current point
    const ptColor = CLASSIFICATION_COLORS[classification] || '#374151';
    const cx = xScale(trace);
    const cy = yScale(determinant);

    // Only draw if the point is within the visible area
    if (cx >= 0 && cx <= innerW && cy >= 0 && cy <= innerH) {
      g.append('circle')
        .attr('cx', cx).attr('cy', cy)
        .attr('r', 4)
        .style('fill', ptColor)
        .style('stroke', '#fff')
        .style('stroke-width', 1.5);
    }
  }, [trace, determinant, classification]);

  return <svg ref={svgRef} />;
}

// ── Main component ──────────────────────────────────────────

export default function PhasePortraitExplorer() {
  const { ref: containerRef, width: containerWidth } = useResizeObserver<HTMLDivElement>();

  // ── State ───────────────────────────────────────────────────

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [a11, setA11] = useState(PRESETS[0].A[0][0]);
  const [a12, setA12] = useState(PRESETS[0].A[0][1]);
  const [a21, setA21] = useState(PRESETS[0].A[1][0]);
  const [a22, setA22] = useState(PRESETS[0].A[1][1]);
  const [solutions, setSolutions] = useState<SolutionPair[]>([]);
  const [showEigenvectors, setShowEigenvectors] = useState(true);
  const [hoverInfo, setHoverInfo] = useState<{ y1: number; y2: number } | null>(null);

  // ── Derived layout ────────────────────────────────────────

  const width = Math.min(containerWidth, 900);
  const svgSize = Math.max(300, Math.min(width * 0.58, 500));
  const height = svgSize;

  // ── Computed values ───────────────────────────────────────

  const A: Matrix2x2 = useMemo(() => ({ a11, a12, a21, a22 }), [a11, a12, a21, a22]);

  const field = useMemo(
    () => computeSystemField(A, [-4, 4], [-4, 4], 16, 16),
    [A],
  );

  const eigen = useMemo(() => eigenDecomposition2x2(A), [A]);

  const classification = useMemo(() => classifyPhasePortrait(A), [A]);

  const maxMag = useMemo(
    () => Math.max(...field.map((p) => p.magnitude), 1e-10),
    [field],
  );

  // ── Click handler ─────────────────────────────────────────

  const handleClick = useCallback(
    (y1: number, y2: number) => {
      if (solutions.length >= MAX_SOLUTIONS) return;
      const forward = computeSystemTrajectory(A, [y1, y2], [0, 10], 0.02);
      const backward = computeSystemTrajectory(A, [y1, y2], [0, -10], 0.02);
      setSolutions((prev) => [
        ...prev,
        {
          y1_0: y1,
          y2_0: y2,
          forward: { t: forward.t, y1: forward.y1, y2: forward.y2 },
          backward: { t: backward.t, y1: backward.y1, y2: backward.y2 },
        },
      ]);
    },
    [A, solutions.length],
  );

  // ── Preset change handler ─────────────────────────────────

  const handlePresetChange = useCallback(
    (idx: number) => {
      setSelectedIdx(idx);
      const p = PRESETS[idx];
      setA11(p.A[0][0]);
      setA12(p.A[0][1]);
      setA21(p.A[1][0]);
      setA22(p.A[1][1]);
      setSolutions([]);
    },
    [],
  );

  // ── D3 rendering ──────────────────────────────────────────

  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (svgSize === 0) return;

      const innerW = svgSize - margin.left - margin.right;
      const innerH = height - margin.top - margin.bottom;
      if (innerW <= 0 || innerH <= 0) return;

      const g = svg
        .attr('width', svgSize)
        .attr('height', height)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const xScale = d3.scaleLinear().domain([-4, 4]).range([0, innerW]);
      const yScale = d3.scaleLinear().domain([-4, 4]).range([innerH, 0]);

      // ── Grid lines ──────────────────────────────────────────

      const gridValues = [-4, -3, -2, -1, 0, 1, 2, 3, 4];
      for (const v of gridValues) {
        g.append('line')
          .attr('x1', xScale(v)).attr('x2', xScale(v))
          .attr('y1', 0).attr('y2', innerH)
          .style('stroke', v === 0 ? '#9ca3af' : '#e5e7eb')
          .style('stroke-width', v === 0 ? 1 : 0.5);
        g.append('line')
          .attr('x1', 0).attr('x2', innerW)
          .attr('y1', yScale(v)).attr('y2', yScale(v))
          .style('stroke', v === 0 ? '#9ca3af' : '#e5e7eb')
          .style('stroke-width', v === 0 ? 1 : 0.5);
      }

      // ── Axes ────────────────────────────────────────────────

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
        .text('y\u2081');

      g.append('text')
        .attr('x', -innerH / 2)
        .attr('y', -38)
        .attr('text-anchor', 'middle')
        .attr('transform', 'rotate(-90)')
        .style('font-size', '12px')
        .style('fill', '#374151')
        .text('y\u2082');

      // ── Vector field arrows ─────────────────────────────────

      const arrowLen = 8;
      const arrowGroup = g.append('g');

      for (const pt of field) {
        if (pt.magnitude < 1e-10) continue;
        // Normalize direction
        const nx = pt.dy1 / pt.magnitude;
        const ny = pt.dy2 / pt.magnitude;

        const cx = xScale(pt.y1);
        const cy = yScale(pt.y2);
        const halfLen = arrowLen / 2;

        // Opacity based on magnitude (logarithmic scaling for better contrast)
        const opacity = Math.min(0.15 + 0.65 * (pt.magnitude / maxMag), 0.8);

        // Draw arrow as a line from tail to head
        const x1 = cx - halfLen * nx;
        const y1 = cy + halfLen * ny; // yScale is inverted
        const x2 = cx + halfLen * nx;
        const y2 = cy - halfLen * ny;

        arrowGroup.append('line')
          .attr('x1', x1).attr('y1', y1)
          .attr('x2', x2).attr('y2', y2)
          .style('stroke', '#93c5fd')
          .style('stroke-width', 1.2)
          .style('opacity', opacity);

        // Small arrowhead
        const headLen = 3;
        const angle = Math.atan2(-(y2 - y1), x2 - x1);
        const ah1x = x2 - headLen * Math.cos(angle - Math.PI / 6);
        const ah1y = y2 + headLen * Math.sin(angle - Math.PI / 6);
        const ah2x = x2 - headLen * Math.cos(angle + Math.PI / 6);
        const ah2y = y2 + headLen * Math.sin(angle + Math.PI / 6);

        arrowGroup.append('path')
          .attr('d', `M${x2},${y2}L${ah1x},${ah1y}M${x2},${y2}L${ah2x},${ah2y}`)
          .style('stroke', '#93c5fd')
          .style('stroke-width', 0.8)
          .style('fill', 'none')
          .style('opacity', opacity);
      }

      // ── Solution trajectories ───────────────────────────────

      for (let si = 0; si < solutions.length; si++) {
        const sol = solutions[si];
        const color = SOLUTION_COLORS[si % SOLUTION_COLORS.length];

        // Forward trajectory
        const fwdData: [number, number][] = sol.forward.y1.map((v, i) => [v, sol.forward.y2[i]]);
        const fwdLine = d3.line<[number, number]>()
          .x((d) => xScale(d[0]))
          .y((d) => yScale(d[1]))
          .defined((d) => Math.abs(d[0]) <= 5 && Math.abs(d[1]) <= 5);

        g.append('path')
          .datum(fwdData)
          .attr('d', fwdLine)
          .style('fill', 'none')
          .style('stroke', color)
          .style('stroke-width', 1.5)
          .style('opacity', 0.85);

        // Backward trajectory
        const bwdData: [number, number][] = sol.backward.y1.map((v, i) => [v, sol.backward.y2[i]]);

        g.append('path')
          .datum(bwdData)
          .attr('d', fwdLine) // same line generator
          .style('fill', 'none')
          .style('stroke', color)
          .style('stroke-width', 1.5)
          .style('stroke-dasharray', '4,2')
          .style('opacity', 0.7);

        // Starting point dot
        const startX = xScale(sol.y1_0);
        const startY = yScale(sol.y2_0);
        if (startX >= 0 && startX <= innerW && startY >= 0 && startY <= innerH) {
          g.append('circle')
            .attr('cx', startX)
            .attr('cy', startY)
            .attr('r', 3)
            .style('fill', color)
            .style('stroke', '#fff')
            .style('stroke-width', 1);
        }
      }

      // ── Eigenvector direction lines ─────────────────────────

      if (showEigenvectors && eigen.isReal && eigen.eigenvectors) {
        for (const vec of eigen.eigenvectors) {
          const [v1, v2] = vec;
          const norm = Math.sqrt(v1 * v1 + v2 * v2);
          if (norm < 1e-12) continue;

          // Scale eigenvector to span the full domain
          const scale = 6 / norm;
          const x1 = xScale(-v1 * scale);
          const y1 = yScale(-v2 * scale);
          const x2 = xScale(v1 * scale);
          const y2 = yScale(v2 * scale);

          g.append('line')
            .attr('x1', x1).attr('y1', y1)
            .attr('x2', x2).attr('y2', y2)
            .style('stroke', '#6b7280')
            .style('stroke-width', 1.2)
            .style('stroke-dasharray', '5,4')
            .style('opacity', 0.7);
        }
      }

      // ── Equilibrium point at origin ─────────────────────────

      g.append('circle')
        .attr('cx', xScale(0))
        .attr('cy', yScale(0))
        .attr('r', 4.5)
        .style('fill', '#DC2626')
        .style('stroke', '#fff')
        .style('stroke-width', 1.5);

      // ── Click overlay ───────────────────────────────────────

      g.append('rect')
        .attr('width', innerW)
        .attr('height', innerH)
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
          setHoverInfo({
            y1: xScale.invert(mx),
            y2: yScale.invert(my),
          });
        })
        .on('mouseleave', () => setHoverInfo(null));
    },
    [svgSize, height, field, solutions, showEigenvectors, eigen, maxMag, handleClick],
  );

  // ── Eigenvalue display formatting ─────────────────────────

  const eigenDisplay = useMemo(() => {
    const { real, imag } = eigen.eigenvalues;
    if (eigen.isReal) {
      return [
        `\u03BB\u2081 = ${real[0].toFixed(3)}`,
        `\u03BB\u2082 = ${real[1].toFixed(3)}`,
      ];
    }
    // Complex: alpha +/- i*beta
    const alpha = real[0].toFixed(3);
    const beta = Math.abs(imag[0]).toFixed(3);
    return [
      `\u03BB\u2081 = ${alpha} + ${beta}i`,
      `\u03BB\u2082 = ${alpha} \u2212 ${beta}i`,
    ];
  }, [eigen]);

  // ── Slider helper ─────────────────────────────────────────

  const renderSlider = (
    label: string,
    value: number,
    setter: (v: number) => void,
  ) => (
    <label style={{ fontSize: 12, color: '#374151', display: 'flex', alignItems: 'center', gap: 4 }}>
      <span style={{ fontFamily: 'monospace', minWidth: 26 }}>{label}</span>
      <input
        type="range"
        min={-5}
        max={5}
        step={0.1}
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) => {
          setter(Number(e.target.value));
          setSolutions([]);
        }}
        style={{ width: 80, verticalAlign: 'middle' }}
      />
      <span style={{ fontSize: 11, color: '#6b7280', fontFamily: 'monospace', minWidth: 36 }}>
        {value.toFixed(1)}
      </span>
    </label>
  );

  // ── JSX ───────────────────────────────────────────────────

  return (
    <div ref={containerRef} style={{ width: '100%', maxWidth: 900 }}>
      {/* Controls row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: 10, alignItems: 'center' }}>
        <label style={{ fontSize: 13, color: '#374151' }}>
          Preset:&nbsp;
          <select
            value={selectedIdx}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => handlePresetChange(Number(e.target.value))}
            style={{ fontSize: 13, padding: '2px 6px' }}
          >
            {PRESETS.map((p, i) => (
              <option key={p.name} value={i}>
                {p.label}
              </option>
            ))}
          </select>
        </label>

        {renderSlider('a\u2081\u2081', a11, setA11)}
        {renderSlider('a\u2081\u2082', a12, setA12)}
        {renderSlider('a\u2082\u2081', a21, setA21)}
        {renderSlider('a\u2082\u2082', a22, setA22)}

        <label style={{ fontSize: 13, color: '#374151', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={showEigenvectors}
            onChange={() => setShowEigenvectors(!showEigenvectors)}
            style={{ marginRight: 4, verticalAlign: 'middle' }}
          />
          Eigenvectors
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
          Clear trajectories
        </button>
      </div>

      {/* Two-panel layout */}
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        {/* Left: Phase portrait SVG */}
        <svg ref={svgRef} style={{ flex: '1 1 400px' }} />

        {/* Right: Info panel */}
        <div style={{ flex: '0 0 260px', fontSize: 13, color: '#374151' }}>
          {/* Matrix A display */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Matrix A</div>
            <div
              style={{
                display: 'inline-grid',
                gridTemplateColumns: 'auto auto',
                gap: '2px 12px',
                fontFamily: 'monospace',
                fontSize: 14,
                padding: '6px 10px',
                background: '#f9fafb',
                borderRadius: 4,
                border: '1px solid #e5e7eb',
              }}
            >
              <span>{a11.toFixed(1)}</span>
              <span>{a12.toFixed(1)}</span>
              <span>{a21.toFixed(1)}</span>
              <span>{a22.toFixed(1)}</span>
            </div>
          </div>

          {/* Classification */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Classification</div>
            <span
              style={{
                display: 'inline-block',
                padding: '2px 8px',
                borderRadius: 4,
                fontSize: 13,
                fontWeight: 500,
                color: '#fff',
                background: CLASSIFICATION_COLORS[classification.type] || '#374151',
              }}
            >
              {CLASSIFICATION_LABELS[classification.type] || classification.type}
            </span>
          </div>

          {/* Eigenvalues */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Eigenvalues</div>
            {eigenDisplay.map((line, i) => (
              <div key={i} style={{ fontFamily: 'monospace', fontSize: 12 }}>{line}</div>
            ))}
          </div>

          {/* Trace, determinant, discriminant */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Invariants</div>
            <div style={{ fontSize: 12, lineHeight: 1.6 }}>
              <div>
                <span style={{ color: '#6b7280' }}>Trace </span>
                <span style={{ fontFamily: 'monospace' }}>{'\u03C4'} = {classification.trace.toFixed(3)}</span>
              </div>
              <div>
                <span style={{ color: '#6b7280' }}>Determinant </span>
                <span style={{ fontFamily: 'monospace' }}>{'\u0394'} = {classification.determinant.toFixed(3)}</span>
              </div>
              <div>
                <span style={{ color: '#6b7280' }}>Discriminant </span>
                <span style={{ fontFamily: 'monospace' }}>D = {classification.discriminant.toFixed(3)}</span>
              </div>
            </div>
          </div>

          {/* Trace-determinant diagram */}
          <div>
            <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 12 }}>Trace-Determinant Plane</div>
            <TraceDetDiagram
              trace={classification.trace}
              determinant={classification.determinant}
              classification={classification.type}
            />
          </div>
        </div>
      </div>

      {/* Readout */}
      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6, minHeight: 18 }}>
        {hoverInfo ? (
          <span>
            (y{'\u2081'} = {hoverInfo.y1.toFixed(2)}, y{'\u2082'} = {hoverInfo.y2.toFixed(2)})
          </span>
        ) : (
          <span>Click anywhere on the phase plane to launch a trajectory (up to {MAX_SOLUTIONS})</span>
        )}
        {solutions.length > 0 && (
          <span style={{ marginLeft: 12 }}>
            {solutions.length} trajectory{solutions.length !== 1 ? 'ies' : 'y'} shown
          </span>
        )}
      </div>
    </div>
  );
}
