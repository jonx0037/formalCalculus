import { useState, useMemo, useCallback, type ChangeEvent } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { computeDirectionField, rk4Method } from './shared/odes';

// ── Constants ────��─────────────────��──────────────────────────

const margin = { top: 20, right: 20, bottom: 40, left: 50 };
const MUTED = '#6b7280';
const BLUE = '#2563EB';
const RED = '#DC2626';
const RED_DOT = '#EF4444';

const T_RANGE: [number, number] = [-1, 4];
const Y_RANGE: [number, number] = [-1, 3];

/** Graduated red shades for branching solutions. */
function branchColor(idx: number, total: number): string {
  const lightness = 55 - (idx / Math.max(total - 1, 1)) * 25;
  return `hsl(0, 70%, ${lightness}%)`;
}

/** Branching solution for y' = y^{2/3}: y_c(t) with delay c. */
function branchingSolution(t: number, c: number): number {
  if (t <= c) return 0;
  return Math.pow((t - c) / 3, 3);
}

// ── Component ───────────────────���─────────────────────────────

export default function UniquenessExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();
  const totalHeight = Math.min(width * 0.5, 400);

  const [branchC, setBranchC] = useState(0.5);
  const [showField, setShowField] = useState(true);

  // ── Direction fields ─────���─────────────────────────────────

  const lipschitzField = useMemo(
    () => (showField ? computeDirectionField((_t, y) => y, T_RANGE, Y_RANGE, 20, 20) : []),
    [showField],
  );

  const nonLipschitzField = useMemo(
    () =>
      showField
        ? computeDirectionField(
            (_t, y) => Math.sign(y) * Math.pow(Math.abs(y), 2 / 3),
            T_RANGE,
            Y_RANGE,
            20,
            20,
          )
        : [],
    [showField],
  );

  // ── Solution curves ──────────────────���─────────────────────

  // Lipschitz side: y' = y, several ICs
  const lipschitzSolutions = useMemo(() => {
    const ics = [-0.5, 0.3, 0.8, 1.5];
    return ics.map((y0) => {
      const fwd = rk4Method((_t, y) => y, 0, y0, T_RANGE[1], 0.01);
      const bwd = rk4Method((_t, y) => y, 0, y0, T_RANGE[0], 0.01);
      return { y0, fwd, bwd };
    });
  }, []);

  // Non-Lipschitz side: branching family y_c(t)
  const branchingSolutions = useMemo(() => {
    const cValues = [0, 0.5, 1.0, 1.5, 2.0, branchC];
    // Deduplicate c values
    const uniqueC = [...new Set(cValues.map((c) => Math.round(c * 100) / 100))].sort();
    const dt = (T_RANGE[1] - T_RANGE[0]) / 300;

    return uniqueC.map((c) => {
      const pts: { t: number; y: number }[] = [];
      for (let i = 0; i <= 300; i++) {
        const t = T_RANGE[0] + i * dt;
        pts.push({ t, y: branchingSolution(t, c) });
      }
      return { c, pts };
    });
  }, [branchC]);

  // Trivial zero solution for non-Lipschitz
  const zeroSolution = useMemo(() => {
    const dt = (T_RANGE[1] - T_RANGE[0]) / 300;
    return Array.from({ length: 301 }, (_, i) => ({
      t: T_RANGE[0] + i * dt,
      y: 0,
    }));
  }, []);

  // ── D3 rendering ��───────────────────��─────────────────────

  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (width === 0) return;

      const panelGap = 40;
      const panelW = (width - margin.left - margin.right - panelGap) / 2;
      const innerH = totalHeight - margin.top - margin.bottom;
      if (panelW <= 0 || innerH <= 0) return;

      svg.attr('width', width).attr('height', totalHeight);

      // ── Helper: draw direction field ───────────────────────

      const drawField = (
        g: d3.Selection<SVGGElement, unknown, null, undefined>,
        pts: ReturnType<typeof computeDirectionField>,
        xScale: d3.ScaleLinear<number, number>,
        yScale: d3.ScaleLinear<number, number>,
        pw: number,
        ih: number,
      ) => {
        const segLen = Math.min(pw, ih) / 32;
        pts.forEach((pt) => {
          const cx = xScale(pt.t);
          const cy = yScale(pt.y);
          const dx = segLen / (2 * pt.magnitude);
          const dy = (segLen * pt.slope) / (2 * pt.magnitude);
          g.append('line')
            .attr('x1', cx - dx)
            .attr('y1', cy + dy)
            .attr('x2', cx + dx)
            .attr('y2', cy - dy)
            .style('stroke', MUTED)
            .style('stroke-width', 0.8)
            .style('stroke-opacity', 0.5);
        });
      };

      // ── LEFT PANEL: Lipschitz (y' = y, unique) ─────────────

      const gLeft = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const xL = d3.scaleLinear().domain(T_RANGE).range([0, panelW]);
      const yL = d3.scaleLinear().domain(Y_RANGE).range([innerH, 0]);

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
        .text("Lipschitz: y' = y (unique)");

      if (showField) drawField(gLeft, lipschitzField, xL, yL, panelW, innerH);

      // Solution curves
      const lineFn = d3
        .line<{ t: number; y: number }>()
        .x((d) => xL(d.t))
        .y((d) => yL(d.y))
        .defined((d) => isFinite(d.y) && d.y >= Y_RANGE[0] - 1 && d.y <= Y_RANGE[1] + 1);

      lipschitzSolutions.forEach((sol, idx) => {
        const shade = d3.interpolateBlues(0.4 + (idx / 4) * 0.5);
        const backPts = sol.bwd.t.map((t, i) => ({ t, y: sol.bwd.y[i] })).reverse();
        const fwdPts = sol.fwd.t.map((t, i) => ({ t, y: sol.fwd.y[i] }));
        const allPts = [...backPts.slice(0, -1), ...fwdPts];

        gLeft
          .append('path')
          .datum(allPts)
          .attr('d', lineFn)
          .style('fill', 'none')
          .style('stroke', shade)
          .style('stroke-width', 2);

        // IC dot
        gLeft
          .append('circle')
          .attr('cx', xL(0))
          .attr('cy', yL(sol.y0))
          .attr('r', 3)
          .style('fill', shade);
      });

      // ── RIGHT PANEL: Non-Lipschitz (y' = y^{2/3}, branching)

      const gRight = svg
        .append('g')
        .attr('transform', `translate(${margin.left + panelW + panelGap},${margin.top})`);

      const xR = d3.scaleLinear().domain(T_RANGE).range([0, panelW]);
      const yR = d3.scaleLinear().domain(Y_RANGE).range([innerH, 0]);

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
        .text("Non-Lipschitz: y' = y^{2/3} (branching)");

      if (showField) drawField(gRight, nonLipschitzField, xR, yR, panelW, innerH);

      // Zero solution (trivial)
      const lineR = d3
        .line<{ t: number; y: number }>()
        .x((d) => xR(d.t))
        .y((d) => yR(d.y))
        .defined((d) => isFinite(d.y) && d.y >= Y_RANGE[0] - 1 && d.y <= Y_RANGE[1] + 1);

      gRight
        .append('path')
        .datum(zeroSolution)
        .attr('d', lineR)
        .style('fill', 'none')
        .style('stroke', RED)
        .style('stroke-width', 2)
        .style('stroke-dasharray', '6,3');

      // Branching solutions
      branchingSolutions.forEach((sol, idx) => {
        const color = branchColor(idx, branchingSolutions.length);
        gRight
          .append('path')
          .datum(sol.pts)
          .attr('d', lineR)
          .style('fill', 'none')
          .style('stroke', color)
          .style('stroke-width', 1.8);
      });

      // Branching point at origin
      gRight
        .append('circle')
        .attr('cx', xR(0))
        .attr('cy', yR(0))
        .attr('r', 5)
        .style('fill', RED_DOT)
        .style('stroke', '#fff')
        .style('stroke-width', 2);
    },
    [width, totalHeight, lipschitzField, nonLipschitzField, lipschitzSolutions, branchingSolutions, zeroSolution, showField],
  );

  // ── JSX ──────────────────────────────────────────���─────────

  return (
    <div ref={containerRef} style={{ width: '100%', maxWidth: 780 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', marginBottom: 10 }}>
        <label style={{ fontSize: 13, color: '#374151' }}>
          Branch delay c =&nbsp;
          <input
            type="range"
            min={0}
            max={3}
            step={0.1}
            value={branchC}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setBranchC(Number(e.target.value))}
            style={{ width: 120, verticalAlign: 'middle' }}
          />
          <span style={{ fontSize: 12, fontWeight: 600, marginLeft: 4 }}>{branchC.toFixed(1)}</span>
        </label>

        <label style={{ fontSize: 13, color: '#374151', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={showField}
            onChange={() => setShowField(!showField)}
            style={{ marginRight: 4, verticalAlign: 'middle' }}
          />
          Direction field
        </label>
      </div>

      <svg ref={svgRef} />

      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>
        Left: unique solutions through every point (Lipschitz). &nbsp;
        Right: infinitely many solutions through the origin (non-Lipschitz). &nbsp;
        <span style={{ color: RED_DOT, fontWeight: 600 }}>●</span> branching point.
      </div>
    </div>
  );
}
