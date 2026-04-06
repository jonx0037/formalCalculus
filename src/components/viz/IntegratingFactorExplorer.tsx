import { useState, useMemo, type ChangeEvent } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { computeDirectionField } from './shared/odes';
import { getLinearODEPresets } from '../../data/first-order-odes-data';

// ── Constants ─────────────────────────────────────────────────

const PRESETS = getLinearODEPresets();
const margin = { top: 20, right: 20, bottom: 40, left: 50 };
const MUTED = '#6b7280';
const BLUE = '#2563EB';
const LIGHT_BLUE = '#93C5FD';
const RED = '#DC2626';
const GREEN = '#059669';
const ORANGE = '#D97706';
const NUM_PTS = 300;

// ── Component ─────────────────────────────────────────────────

export default function IntegratingFactorExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();
  const totalHeight = Math.min(width * 0.5, 400);

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [y0, setY0] = useState(3);
  const [showSuperposition, setShowSuperposition] = useState(false);

  const preset = PRESETS[selectedIdx];
  const [tMin, tMax] = preset.domain.t;
  const [yMin, yMax] = preset.domain.y;
  const t0 = tMin > 0 ? tMin : 0;

  // ── Compute solution curves ────────────────────────────────

  const curves = useMemo(() => {
    const dt = (tMax - tMin) / NUM_PTS;
    const solutionPts: { t: number; y: number }[] = [];
    const muPts: { t: number; mu: number }[] = [];
    const muYPts: { t: number; muY: number }[] = [];
    const homPts: { t: number; y: number }[] = [];
    const partPts: { t: number; y: number }[] = [];

    for (let i = 0; i <= NUM_PTS; i++) {
      const t = tMin + i * dt;
      const yVal = preset.generalSolution(t, y0, t0);
      const muVal = preset.mu(t);
      solutionPts.push({ t, y: yVal });
      muPts.push({ t, mu: muVal });
      muYPts.push({ t, muY: muVal * yVal });

      // Superposition: y = y_h + y_p
      // y_h = (y0 - yp(t0)) * e^{-P(t)} homogeneous solution
      // y_p = solution with y_p(t0) = yp0
      const yParticular = preset.generalSolution(t, 0, t0);
      const yHomogeneous = yVal - yParticular;
      homPts.push({ t, y: yHomogeneous });
      partPts.push({ t, y: yParticular });
    }

    return { solutionPts, muPts, muYPts, homPts, partPts };
  }, [preset, y0, tMin, tMax, t0]);

  // ── Direction field for left panel ─────────────────────────

  const fieldPoints = useMemo(
    () =>
      computeDirectionField(
        (t, y) => preset.q(t) - preset.p(t) * y,
        preset.domain.t,
        preset.domain.y,
        18,
        18,
      ),
    [preset],
  );

  // ── D3 rendering ──────────────────────────────────────────

  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (width === 0) return;

      const panelGap = 40;
      const panelW = (width - margin.left - margin.right - panelGap) / 2;
      const innerH = totalHeight - margin.top - margin.bottom;
      if (panelW <= 0 || innerH <= 0) return;

      svg.attr('width', width).attr('height', totalHeight);

      // ── LEFT PANEL: Direction field + solution ──────────────

      const gLeft = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const xL = d3.scaleLinear().domain([tMin, tMax]).range([0, panelW]);
      const yL = d3.scaleLinear().domain([yMin, yMax]).range([innerH, 0]);

      gLeft
        .append('g')
        .attr('transform', `translate(0,${innerH})`)
        .call(d3.axisBottom(xL).ticks(5))
        .selectAll('text')
        .style('font-size', '10px');

      gLeft.call(d3.axisLeft(yL).ticks(6)).selectAll('text').style('font-size', '10px');

      gLeft
        .append('text')
        .attr('x', panelW / 2)
        .attr('y', -6)
        .attr('text-anchor', 'middle')
        .style('font-size', '11px')
        .style('fill', '#374151')
        .text('Direction field + solution');

      // Direction field segments
      const segLen = Math.min(panelW, innerH) / 30;
      fieldPoints.forEach((pt) => {
        const cx = xL(pt.t);
        const cy = yL(pt.y);
        const dx = segLen / (2 * pt.magnitude);
        const dy = (segLen * pt.slope) / (2 * pt.magnitude);
        gLeft
          .append('line')
          .attr('x1', cx - dx)
          .attr('y1', cy + dy)
          .attr('x2', cx + dx)
          .attr('y2', cy - dy)
          .style('stroke', MUTED)
          .style('stroke-width', 0.8)
          .style('stroke-opacity', 0.5);
      });

      // Solution line helper
      const lineFn = (
        pts: { t: number; y: number }[],
        xSc: d3.ScaleLinear<number, number>,
        ySc: d3.ScaleLinear<number, number>,
      ) =>
        d3
          .line<{ t: number; y: number }>()
          .x((d) => xSc(d.t))
          .y((d) => ySc(d.y))
          .defined((d) => isFinite(d.y) && d.y >= yMin - 2 && d.y <= yMax + 2)(pts);

      // Superposition: homogeneous + particular
      if (showSuperposition) {
        gLeft
          .append('path')
          .attr('d', lineFn(curves.homPts, xL, yL))
          .style('fill', 'none')
          .style('stroke', LIGHT_BLUE)
          .style('stroke-width', 1.5)
          .style('stroke-dasharray', '5,3');

        gLeft
          .append('path')
          .attr('d', lineFn(curves.partPts, xL, yL))
          .style('fill', 'none')
          .style('stroke', RED)
          .style('stroke-width', 1.5)
          .style('stroke-dasharray', '5,3');
      }

      // Full solution
      gLeft
        .append('path')
        .attr('d', lineFn(curves.solutionPts, xL, yL))
        .style('fill', 'none')
        .style('stroke', BLUE)
        .style('stroke-width', 2.2);

      // ── RIGHT PANEL: μ(t) and μ(t)y(t) ────────────────────

      const gRight = svg
        .append('g')
        .attr('transform', `translate(${margin.left + panelW + panelGap},${margin.top})`);

      const muValues = curves.muPts.map((d) => d.mu);
      const muYValues = curves.muYPts.map((d) => d.muY);
      const allRightVals = [...muValues, ...muYValues].filter(isFinite);
      const rMin = d3.min(allRightVals) ?? 0;
      const rMax = d3.max(allRightVals) ?? 1;
      const rPad = (rMax - rMin) * 0.1 || 1;

      const xR = d3.scaleLinear().domain([tMin, tMax]).range([0, panelW]);
      const yR = d3
        .scaleLinear()
        .domain([rMin - rPad, rMax + rPad])
        .range([innerH, 0]);

      gRight
        .append('g')
        .attr('transform', `translate(0,${innerH})`)
        .call(d3.axisBottom(xR).ticks(5))
        .selectAll('text')
        .style('font-size', '10px');

      gRight.call(d3.axisLeft(yR).ticks(6)).selectAll('text').style('font-size', '10px');

      gRight
        .append('text')
        .attr('x', panelW / 2)
        .attr('y', -6)
        .attr('text-anchor', 'middle')
        .style('font-size', '11px')
        .style('fill', '#374151')
        .text('Integrating factor μ(t) and μ·y');

      // μ(t)
      const muLine = d3
        .line<{ t: number; mu: number }>()
        .x((d) => xR(d.t))
        .y((d) => yR(d.mu))
        .defined((d) => isFinite(d.mu));

      gRight
        .append('path')
        .datum(curves.muPts)
        .attr('d', muLine)
        .style('fill', 'none')
        .style('stroke', GREEN)
        .style('stroke-width', 2);

      // μ(t)·y(t)
      const muYLine = d3
        .line<{ t: number; muY: number }>()
        .x((d) => xR(d.t))
        .y((d) => yR(d.muY))
        .defined((d) => isFinite(d.muY));

      gRight
        .append('path')
        .datum(curves.muYPts)
        .attr('d', muYLine)
        .style('fill', 'none')
        .style('stroke', ORANGE)
        .style('stroke-width', 2);

      // Legend
      const legend = gRight.append('g').attr('transform', `translate(${panelW - 90}, 10)`);
      [
        { color: GREEN, label: 'μ(t)' },
        { color: ORANGE, label: 'μ·y' },
      ].forEach((item, i) => {
        const row = legend.append('g').attr('transform', `translate(0, ${i * 16})`);
        row
          .append('line')
          .attr('x1', 0)
          .attr('y1', 0)
          .attr('x2', 16)
          .attr('y2', 0)
          .style('stroke', item.color)
          .style('stroke-width', 2);
        row
          .append('text')
          .attr('x', 20)
          .attr('y', 4)
          .style('font-size', '11px')
          .style('fill', '#374151')
          .text(item.label);
      });
    },
    [width, totalHeight, fieldPoints, curves, showSuperposition, tMin, tMax, yMin, yMax],
  );

  // ── JSX ────────────────────────────────────────────────────

  return (
    <div ref={containerRef} style={{ width: '100%', maxWidth: 780 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', marginBottom: 10 }}>
        <label style={{ fontSize: 13, color: '#374151' }}>
          Equation:&nbsp;
          <select
            value={selectedIdx}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => {
              const idx = Number(e.target.value);
              setSelectedIdx(idx);
              setY0(3);
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
          y₀ =&nbsp;
          <input
            type="range"
            min={yMin}
            max={yMax}
            step={0.1}
            value={y0}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setY0(Number(e.target.value))}
            style={{ width: 100, verticalAlign: 'middle' }}
          />
          <span style={{ fontSize: 11, color: '#6b7280', marginLeft: 4 }}>{y0.toFixed(1)}</span>
        </label>

        <label style={{ fontSize: 13, color: '#374151', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={showSuperposition}
            onChange={() => setShowSuperposition(!showSuperposition)}
            style={{ marginRight: 4, verticalAlign: 'middle' }}
          />
          Show y_h + y_p
        </label>
      </div>

      <svg ref={svgRef} />

      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>
        {showSuperposition && (
          <span>
            <span style={{ color: LIGHT_BLUE }}>━━</span> homogeneous y_h &nbsp;
            <span style={{ color: RED }}>━━</span> particular y_p &nbsp;
            <span style={{ color: BLUE }}>━━</span> full solution y = y_h + y_p
          </span>
        )}
      </div>
    </div>
  );
}
