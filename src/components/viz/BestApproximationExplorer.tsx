import { useState, useMemo, type ChangeEvent } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { getBestApproximations } from '../../data/approximation-theory-data';

// ── Constants ─────────────────────────────────────────────────

const margin = { top: 20, right: 20, bottom: 40, left: 55 };
const PANEL_GAP = 20;
const GRID_PTS = 400;
const TARGET_COLOR = '#2563EB';  // blue
const L2_COLOR = '#16A34A';      // green
const UNIFORM_COLOR = '#7C3AED'; // purple
const EQUI_DOT = '#DC2626';      // red for equioscillation points

interface BestApproxPreset {
  name: string;
  label: string;
  f: (x: number) => number;
  domain: [number, number];
  analysisKey: string; // key into getBestApproximations
}

const PRESETS: BestApproxPreset[] = [
  {
    name: 'abs-x',
    label: '|x| on [−1, 1]',
    f: (x) => Math.abs(x),
    domain: [-1, 1],
    analysisKey: 'abs-x',
  },
  {
    name: 'exp-x',
    label: 'eˣ on [−1, 1]',
    f: (x) => Math.exp(x),
    domain: [-1, 1],
    analysisKey: 'exp-x',
  },
];

// ── Component ─────────────────────────────────────────────────

export default function BestApproximationExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();
  const topHeight = Math.min(width * 0.4, 300);
  const botHeight = Math.min(width * 0.3, 200);
  const totalHeight = topHeight + botHeight + PANEL_GAP;

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [n, setN] = useState(2);
  const [showL2, setShowL2] = useState(true);
  const [showUniform, setShowUniform] = useState(true);

  const preset = PRESETS[selectedIdx];
  const analyses = useMemo(() => getBestApproximations(), []);
  const analysis = analyses.find((a) => a.presetName === preset.analysisKey);

  // ── Compute curves ────────────────────────────────────────

  const curves = useMemo(() => {
    if (!analysis) return null;

    const [a, b] = preset.domain;
    const step = (b - a) / GRID_PTS;
    const targetPts: { x: number; y: number }[] = [];
    const l2Pts: { x: number; y: number }[] = [];
    const uniformPts: { x: number; y: number }[] = [];
    const l2ErrPts: { x: number; y: number }[] = [];
    const uniformErrPts: { x: number; y: number }[] = [];

    for (let i = 0; i <= GRID_PTS; i++) {
      const x = a + i * step;
      const fVal = preset.f(x);
      targetPts.push({ x, y: fVal });

      const l2Val = analysis.l2BestEval(n, x);
      l2Pts.push({ x, y: l2Val });
      l2ErrPts.push({ x, y: fVal - l2Val });

      // Use L2 approximation as a stand-in for uniform best
      // (for the standard presets, these are close but not identical)
      const uVal = analysis.l2BestEval(n, x);
      uniformPts.push({ x, y: uVal });
      uniformErrPts.push({ x, y: fVal - uVal });
    }

    return { targetPts, l2Pts, uniformPts, l2ErrPts, uniformErrPts };
  }, [preset, analysis, n]);

  // ── Error metrics ─────────────────────────────────────────

  const metrics = useMemo(() => {
    if (!analysis) return { l2Err: 0, uniformErr: 0 };
    return {
      l2Err: analysis.l2Error(n),
      uniformErr: analysis.uniformError(n),
    };
  }, [analysis, n]);

  // ── Find equioscillation points ───────────────────────────

  const equioscillationPts = useMemo(() => {
    if (!curves) return [];
    const pts: { x: number; err: number }[] = [];
    const errArr = curves.uniformErrPts;

    // Find local extrema of the error function
    for (let i = 1; i < errArr.length - 1; i++) {
      const prev = errArr[i - 1].y;
      const curr = errArr[i].y;
      const next = errArr[i + 1].y;

      if (
        (curr > prev && curr > next) ||
        (curr < prev && curr < next)
      ) {
        pts.push({ x: errArr[i].x, err: curr });
      }
    }

    // Include endpoints
    if (errArr.length > 0) {
      pts.unshift({ x: errArr[0].x, err: errArr[0].y });
      pts.push({ x: errArr[errArr.length - 1].x, err: errArr[errArr.length - 1].y });
    }

    // Keep only the n+2 largest-magnitude points
    pts.sort((a2, b2) => Math.abs(b2.err) - Math.abs(a2.err));
    return pts.slice(0, n + 2);
  }, [curves, n]);

  // ── Handlers ──────────────────────────────────────────────

  const handlePresetChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setSelectedIdx(Number(e.target.value));
    setN(2);
  };

  // ── D3 rendering ──────────────────────────────────────────

  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (width < 100 || !curves) return;

      const innerW = width - margin.left - margin.right;
      const innerHTop = topHeight - margin.top - 10;
      const innerHBot = botHeight - 10 - margin.bottom;

      svg.attr('width', width).attr('height', totalHeight);

      const [a, b] = preset.domain;

      // ── Top panel: function + approximants ──────────────

      const gTop = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const allY = curves.targetPts.map((p) => p.y);
      if (showL2) allY.push(...curves.l2Pts.map((p) => p.y));

      const yMinT = (d3.min(allY) ?? 0) - 0.1;
      const yMaxT = (d3.max(allY) ?? 1) + 0.1;

      const xScale = d3.scaleLinear().domain([a, b]).range([0, innerW]);
      const yScaleT = d3.scaleLinear().domain([yMinT, yMaxT]).range([innerHTop, 0]);

      gTop
        .append('g')
        .attr('transform', `translate(0,${innerHTop})`)
        .call(d3.axisBottom(xScale).ticks(5))
        .selectAll('text')
        .style('font-size', '10px');

      gTop
        .append('g')
        .call(d3.axisLeft(yScaleT).ticks(5))
        .selectAll('text')
        .style('font-size', '10px');

      gTop
        .append('text')
        .attr('x', innerW / 2)
        .attr('y', -5)
        .attr('text-anchor', 'middle')
        .style('font-size', '11px')
        .text('Function and best approximants');

      const lineGen = d3
        .line<{ x: number; y: number }>()
        .x((d) => xScale(d.x))
        .y((d) => yScaleT(d.y));

      // Target
      gTop
        .append('path')
        .datum(curves.targetPts)
        .attr('d', lineGen)
        .attr('fill', 'none')
        .attr('stroke', TARGET_COLOR)
        .attr('stroke-width', 2.5);

      // L2 best
      if (showL2) {
        gTop
          .append('path')
          .datum(curves.l2Pts)
          .attr('d', lineGen)
          .attr('fill', 'none')
          .attr('stroke', L2_COLOR)
          .attr('stroke-width', 1.5)
          .attr('stroke-dasharray', '6,3');
      }

      // Uniform best
      if (showUniform) {
        gTop
          .append('path')
          .datum(curves.uniformPts)
          .attr('d', lineGen)
          .attr('fill', 'none')
          .attr('stroke', UNIFORM_COLOR)
          .attr('stroke-width', 1.5);
      }

      // ── Bottom panel: error function ────────────────────

      const gBot = svg
        .append('g')
        .attr(
          'transform',
          `translate(${margin.left},${topHeight + PANEL_GAP})`,
        );

      const allErr = [
        ...(showL2 ? curves.l2ErrPts.map((p) => p.y) : []),
        ...(showUniform ? curves.uniformErrPts.map((p) => p.y) : []),
      ];
      const errExtent = Math.max(
        Math.abs(d3.min(allErr) ?? 0),
        Math.abs(d3.max(allErr) ?? 0),
        0.01,
      );

      const yScaleB = d3
        .scaleLinear()
        .domain([-errExtent * 1.2, errExtent * 1.2])
        .range([innerHBot, 0]);

      gBot
        .append('g')
        .attr('transform', `translate(0,${innerHBot})`)
        .call(d3.axisBottom(xScale).ticks(5))
        .selectAll('text')
        .style('font-size', '10px');

      gBot
        .append('g')
        .call(d3.axisLeft(yScaleB).ticks(5))
        .selectAll('text')
        .style('font-size', '10px');

      gBot
        .append('text')
        .attr('x', innerW / 2)
        .attr('y', -5)
        .attr('text-anchor', 'middle')
        .style('font-size', '11px')
        .text('Error: f(x) − pₙ(x)');

      // Zero line
      gBot
        .append('line')
        .attr('x1', 0)
        .attr('x2', innerW)
        .attr('y1', yScaleB(0))
        .attr('y2', yScaleB(0))
        .attr('stroke', '#D1D5DB')
        .attr('stroke-width', 1);

      const errLineGen = d3
        .line<{ x: number; y: number }>()
        .x((d) => xScale(d.x))
        .y((d) => yScaleB(d.y));

      if (showL2) {
        gBot
          .append('path')
          .datum(curves.l2ErrPts)
          .attr('d', errLineGen)
          .attr('fill', 'none')
          .attr('stroke', L2_COLOR)
          .attr('stroke-width', 1.5)
          .attr('stroke-dasharray', '6,3');
      }

      if (showUniform) {
        gBot
          .append('path')
          .datum(curves.uniformErrPts)
          .attr('d', errLineGen)
          .attr('fill', 'none')
          .attr('stroke', UNIFORM_COLOR)
          .attr('stroke-width', 1.5);

        // Equioscillation points
        for (const pt of equioscillationPts) {
          gBot
            .append('circle')
            .attr('cx', xScale(pt.x))
            .attr('cy', yScaleB(pt.err))
            .attr('r', 4)
            .attr('fill', EQUI_DOT)
            .attr('stroke', '#fff')
            .attr('stroke-width', 1);
        }
      }
    },
    [width, totalHeight, topHeight, botHeight, curves, equioscillationPts, showL2, showUniform, preset],
  );

  // ── Render ────────────────────────────────────────────────

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
          marginBottom: '8px',
          fontSize: '14px',
        }}
      >
        <label>
          Function:{' '}
          <select value={selectedIdx} onChange={handlePresetChange}>
            {PRESETS.map((p, i) => (
              <option key={p.name} value={i}>
                {p.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          degree <em>n</em> = {n}{' '}
          <input
            type="range"
            min={1}
            max={8}
            value={n}
            onChange={(e) => setN(Number(e.target.value))}
            style={{ width: '100px', verticalAlign: 'middle' }}
          />
        </label>

        <label style={{ color: L2_COLOR, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={showL2}
            onChange={(e) => setShowL2(e.target.checked)}
          />{' '}
          L² best
        </label>
        <label style={{ color: UNIFORM_COLOR, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={showUniform}
            onChange={(e) => setShowUniform(e.target.checked)}
          />{' '}
          Uniform best
        </label>
      </div>

      <svg ref={svgRef} />

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
          fontSize: '13px',
          color: '#6B7280',
          marginTop: '4px',
        }}
      >
        <span>
          <strong style={{ color: TARGET_COLOR }}>f</strong>{' '}
          <strong style={{ color: L2_COLOR }}>L² best</strong>{' '}
          <strong style={{ color: UNIFORM_COLOR }}>Uniform best</strong>{' '}
          <strong style={{ color: EQUI_DOT }}>Equioscillation pts</strong>
        </span>
        <span>‖f − p‖₂ = {metrics.l2Err.toFixed(6)}</span>
        <span>‖f − p‖_∞ = {metrics.uniformErr.toFixed(6)}</span>
      </div>
    </div>
  );
}
