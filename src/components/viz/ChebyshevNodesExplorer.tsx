import { useState, useMemo, type ChangeEvent } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { chebyshevNodes } from './shared/series';

// ── Constants ─────────────────────────────────────────────────

const margin = { top: 20, right: 20, bottom: 40, left: 55 };
const GAP = 40;
const GRID_PTS = 500;
const TARGET_COLOR = '#2563EB';     // blue
const EQUISPACED_COLOR = '#DC2626'; // red
const CHEBYSHEV_COLOR = '#16A34A';  // green

interface InterpolationPreset {
  name: string;
  label: string;
  f: (x: number) => number;
}

const PRESETS: InterpolationPreset[] = [
  {
    name: 'runge',
    label: '1/(1 + 25x²) — Runge function',
    f: (x) => 1 / (1 + 25 * x * x),
  },
  {
    name: 'abs-x',
    label: '|x| — non-differentiable at 0',
    f: (x) => Math.abs(x),
  },
  {
    name: 'sign-x-sq',
    label: 'sign(x)·x² — C⁰ but not C¹',
    f: (x) => Math.sign(x) * x * x,
  },
];

// ── Barycentric interpolation ─────────────────────────────────

function barycentricInterpolate(
  nodes: number[],
  fvals: number[],
  x: number,
): number {
  const len = nodes.length;
  for (let j = 0; j < len; j++) {
    if (Math.abs(x - nodes[j]) < 1e-14) return fvals[j];
  }

  const weights = new Array(len);
  for (let j = 0; j < len; j++) {
    let w = 1;
    for (let k = 0; k < len; k++) {
      if (k !== j) w *= nodes[j] - nodes[k];
    }
    weights[j] = 1 / w;
  }

  let num = 0;
  let den = 0;
  for (let j = 0; j < len; j++) {
    const t = weights[j] / (x - nodes[j]);
    num += t * fvals[j];
    den += t;
  }
  return num / den;
}

function equispacedNodes(n: number): number[] {
  const nodes: number[] = [];
  for (let i = 0; i < n; i++) {
    nodes.push(-1 + (2 * i) / (n - 1));
  }
  return nodes;
}

// ── Component ─────────────────────────────────────────────────

export default function ChebyshevNodesExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();
  const totalHeight = Math.min(width * 0.5, 380);

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [n, setN] = useState(11);
  const [nodeType, setNodeType] = useState<'both' | 'equispaced' | 'chebyshev'>('both');

  const preset = PRESETS[selectedIdx];

  // ── Compute interpolants ──────────────────────────────────

  const data = useMemo(() => {
    const eqNodes = equispacedNodes(n);
    const chNodes = chebyshevNodes(n);
    const eqVals = eqNodes.map(preset.f);
    const chVals = chNodes.map(preset.f);

    const step = 2 / GRID_PTS;
    const targetPts: { x: number; y: number }[] = [];
    const eqPts: { x: number; y: number }[] = [];
    const chPts: { x: number; y: number }[] = [];
    const eqErrPts: { x: number; y: number }[] = [];
    const chErrPts: { x: number; y: number }[] = [];

    let maxEqErr = 0;
    let maxChErr = 0;

    for (let i = 0; i <= GRID_PTS; i++) {
      const x = -1 + i * step;
      const fVal = preset.f(x);
      targetPts.push({ x, y: fVal });

      const eqVal = barycentricInterpolate(eqNodes, eqVals, x);
      const chVal = barycentricInterpolate(chNodes, chVals, x);

      const clamp = (v: number) => (isFinite(v) && Math.abs(v) < 100 ? v : NaN);

      eqPts.push({ x, y: clamp(eqVal) });
      chPts.push({ x, y: clamp(chVal) });

      const eqErr = Math.abs(fVal - eqVal);
      const chErr = Math.abs(fVal - chVal);
      eqErrPts.push({ x, y: isFinite(eqErr) ? eqErr : NaN });
      chErrPts.push({ x, y: isFinite(chErr) ? chErr : NaN });

      if (isFinite(eqErr)) maxEqErr = Math.max(maxEqErr, eqErr);
      if (isFinite(chErr)) maxChErr = Math.max(maxChErr, chErr);
    }

    return {
      targetPts,
      eqPts,
      chPts,
      eqErrPts,
      chErrPts,
      eqNodes,
      chNodes,
      maxEqErr,
      maxChErr,
    };
  }, [preset, n]);

  // ── Handlers ──────────────────────────────────────────────

  const handlePresetChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setSelectedIdx(Number(e.target.value));
    setN(11);
  };

  // ── D3 rendering ──────────────────────────────────────────

  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (width < 100) return;

      const panelW = (width - margin.left - margin.right - GAP) / 2;
      const innerH = totalHeight - margin.top - margin.bottom;

      svg.attr('width', width).attr('height', totalHeight);

      const showEq = nodeType === 'both' || nodeType === 'equispaced';
      const showCh = nodeType === 'both' || nodeType === 'chebyshev';

      // ── Left panel: interpolants ────────────────────────

      const gLeft = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const allY = data.targetPts.map((p) => p.y);
      if (showEq) allY.push(...data.eqPts.filter((p) => isFinite(p.y)).map((p) => p.y));
      if (showCh) allY.push(...data.chPts.filter((p) => isFinite(p.y)).map((p) => p.y));

      const yMinL = Math.max(d3.min(allY) ?? -1, -5) - 0.2;
      const yMaxL = Math.min(d3.max(allY) ?? 2, 5) + 0.2;

      const xScaleL = d3.scaleLinear().domain([-1, 1]).range([0, panelW]);
      const yScaleL = d3.scaleLinear().domain([yMinL, yMaxL]).range([innerH, 0]);

      gLeft
        .append('g')
        .attr('transform', `translate(0,${innerH})`)
        .call(d3.axisBottom(xScaleL).ticks(5))
        .selectAll('text')
        .style('font-size', '10px');

      gLeft
        .append('g')
        .call(d3.axisLeft(yScaleL).ticks(5))
        .selectAll('text')
        .style('font-size', '10px');

      gLeft
        .append('text')
        .attr('x', panelW / 2)
        .attr('y', -5)
        .attr('text-anchor', 'middle')
        .style('font-size', '11px')
        .text('Interpolating polynomial');

      const lineGen = d3
        .line<{ x: number; y: number }>()
        .x((d) => xScaleL(d.x))
        .y((d) => yScaleL(d.y))
        .defined((d) => isFinite(d.y));

      // Target function
      gLeft
        .append('path')
        .datum(data.targetPts)
        .attr('d', lineGen)
        .attr('fill', 'none')
        .attr('stroke', TARGET_COLOR)
        .attr('stroke-width', 2.5);

      // Equispaced interpolant
      if (showEq) {
        gLeft
          .append('path')
          .datum(data.eqPts)
          .attr('d', lineGen)
          .attr('fill', 'none')
          .attr('stroke', EQUISPACED_COLOR)
          .attr('stroke-width', 1.5)
          .attr('stroke-dasharray', '5,3');

        // Node dots
        for (const xn of data.eqNodes) {
          gLeft
            .append('circle')
            .attr('cx', xScaleL(xn))
            .attr('cy', yScaleL(preset.f(xn)))
            .attr('r', 3)
            .attr('fill', EQUISPACED_COLOR);
        }
      }

      // Chebyshev interpolant
      if (showCh) {
        gLeft
          .append('path')
          .datum(data.chPts)
          .attr('d', lineGen)
          .attr('fill', 'none')
          .attr('stroke', CHEBYSHEV_COLOR)
          .attr('stroke-width', 1.5);

        // Node dots
        for (const xn of data.chNodes) {
          gLeft
            .append('circle')
            .attr('cx', xScaleL(xn))
            .attr('cy', yScaleL(preset.f(xn)))
            .attr('r', 3)
            .attr('fill', CHEBYSHEV_COLOR);
        }
      }

      // ── Right panel: interpolation error ────────────────

      const gRight = svg
        .append('g')
        .attr(
          'transform',
          `translate(${margin.left + panelW + GAP},${margin.top})`,
        );

      const allErr: number[] = [];
      if (showEq) allErr.push(...data.eqErrPts.filter((p) => isFinite(p.y) && p.y > 0).map((p) => p.y));
      if (showCh) allErr.push(...data.chErrPts.filter((p) => isFinite(p.y) && p.y > 0).map((p) => p.y));
      const errMax = Math.min(d3.max(allErr) ?? 1, 100);

      const xScaleR = d3.scaleLinear().domain([-1, 1]).range([0, panelW]);
      const yScaleR = d3.scaleLinear().domain([0, errMax * 1.1]).range([innerH, 0]);

      gRight
        .append('g')
        .attr('transform', `translate(0,${innerH})`)
        .call(d3.axisBottom(xScaleR).ticks(5))
        .selectAll('text')
        .style('font-size', '10px');

      gRight
        .append('g')
        .call(d3.axisLeft(yScaleR).ticks(5))
        .selectAll('text')
        .style('font-size', '10px');

      gRight
        .append('text')
        .attr('x', panelW / 2)
        .attr('y', -5)
        .attr('text-anchor', 'middle')
        .style('font-size', '11px')
        .text('Interpolation error |f(x) − pₙ(x)|');

      const errLine = d3
        .line<{ x: number; y: number }>()
        .x((d) => xScaleR(d.x))
        .y((d) => yScaleR(d.y))
        .defined((d) => isFinite(d.y));

      if (showEq) {
        gRight
          .append('path')
          .datum(data.eqErrPts)
          .attr('d', errLine)
          .attr('fill', 'none')
          .attr('stroke', EQUISPACED_COLOR)
          .attr('stroke-width', 1.5);
      }

      if (showCh) {
        gRight
          .append('path')
          .datum(data.chErrPts)
          .attr('d', errLine)
          .attr('fill', 'none')
          .attr('stroke', CHEBYSHEV_COLOR)
          .attr('stroke-width', 1.5);
      }
    },
    [width, totalHeight, data, nodeType, preset],
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
          <em>n</em> = {n} nodes{' '}
          <input
            type="range"
            min={3}
            max={30}
            value={n}
            onChange={(e) => setN(Number(e.target.value))}
            style={{ width: '100px', verticalAlign: 'middle' }}
          />
        </label>

        <label>
          Nodes:{' '}
          <select
            value={nodeType}
            onChange={(e) =>
              setNodeType(e.target.value as 'both' | 'equispaced' | 'chebyshev')
            }
          >
            <option value="both">Both</option>
            <option value="equispaced">Equispaced only</option>
            <option value="chebyshev">Chebyshev only</option>
          </select>
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
          <strong style={{ color: TARGET_COLOR }}>f(x)</strong>
        </span>
        {(nodeType === 'both' || nodeType === 'equispaced') && (
          <span style={{ color: EQUISPACED_COLOR }}>
            Equispaced: max |err| = {data.maxEqErr < 100 ? data.maxEqErr.toFixed(4) : '> 100'}
          </span>
        )}
        {(nodeType === 'both' || nodeType === 'chebyshev') && (
          <span style={{ color: CHEBYSHEV_COLOR }}>
            Chebyshev: max |err| = {data.maxChErr.toFixed(6)}
          </span>
        )}
      </div>
    </div>
  );
}
