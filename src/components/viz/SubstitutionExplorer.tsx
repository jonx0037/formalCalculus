import { useState, useMemo, useCallback, type ChangeEvent } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { riemannSum } from './shared/integration';
import { getSubstitutionPresets } from '../../data/riemann-integral-data';
import { functionColors, regionColors } from './shared/colorScales';

const presets = getSubstitutionPresets();
const margin = { top: 20, right: 20, bottom: 40, left: 50 };
const CURVE_PTS = 300;
const PANEL_GAP = 30;

export default function SubstitutionExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();
  const panelW = (width - PANEL_GAP) / 2;
  const height = Math.min(panelW * 0.8, 320);

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [n, setN] = useState(10);

  const preset = presets[selectedIdx];

  const handlePresetChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    setSelectedIdx(Number(e.target.value));
    setN(10);
  }, []);

  // x-domain curve: f(g(x)) * g'(x)
  const xCurve = useMemo(() => {
    const [a, b] = preset.xDomain;
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i < CURVE_PTS; i++) {
      const x = a + (i / (CURVE_PTS - 1)) * (b - a);
      pts.push({ x, y: preset.integrand(x) });
    }
    return pts;
  }, [selectedIdx]);

  // u-domain curve: f(u)
  const uCurve = useMemo(() => {
    const [ua, ub] = preset.uDomain;
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i < CURVE_PTS; i++) {
      const u = ua + (i / (CURVE_PTS - 1)) * (ub - ua);
      pts.push({ x: u, y: preset.f(u) });
    }
    return pts;
  }, [selectedIdx]);

  // Riemann sums for both domains
  const xSum = useMemo(() => riemannSum(preset.integrand, preset.xDomain[0], preset.xDomain[1], n, 'midpoint'), [selectedIdx, n]);
  const uSum = useMemo(() => riemannSum(preset.f, preset.uDomain[0], preset.uDomain[1], n, 'midpoint'), [selectedIdx, n]);

  // ── Left panel: x-domain ──
  const leftRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (panelW < 40) return;

      const iw = panelW - margin.left - margin.right;
      const ih = height - margin.top - margin.bottom;
      const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      const [a, b] = preset.xDomain;
      const yMax = (d3.max(xCurve, (d) => d.y) ?? 1) * 1.15;

      const xScale = d3.scaleLinear().domain([a, b]).range([0, iw]);
      const yScale = d3.scaleLinear().domain([0, yMax]).range([ih, 0]);

      g.append('g').attr('transform', `translate(0,${ih})`).call(d3.axisBottom(xScale).ticks(5))
        .selectAll('text').style('fill', 'var(--color-text-muted)');
      g.append('g').call(d3.axisLeft(yScale).ticks(5))
        .selectAll('text').style('fill', 'var(--color-text-muted)');
      g.selectAll('.domain, .tick line').style('stroke', 'var(--color-border)');

      // Rectangles
      for (const rect of xSum.rectangles) {
        g.append('rect')
          .attr('x', xScale(rect.x))
          .attr('y', yScale(Math.max(rect.height, 0)))
          .attr('width', Math.max(0, xScale(rect.x + rect.width) - xScale(rect.x) - 0.5))
          .attr('height', Math.abs(yScale(0) - yScale(Math.abs(rect.height))))
          .style('fill', regionColors.integralFill)
          .style('fill-opacity', 0.5)
          .style('stroke', functionColors[2])
          .style('stroke-width', 0.6);
      }

      // Curve
      const line = d3.line<{ x: number; y: number }>().x((d) => xScale(d.x)).y((d) => yScale(d.y));
      g.append('path').datum(xCurve).attr('d', line)
        .style('fill', 'none').style('stroke', functionColors[0]).style('stroke-width', 2.5);

      g.append('text').attr('x', iw / 2).attr('y', -4).attr('text-anchor', 'middle')
        .style('fill', 'var(--color-text-muted)').style('font-size', '12px')
        .text('x-domain: f(g(x))g\'(x)');
    },
    [panelW, selectedIdx, n, xCurve, xSum],
  );

  // ── Right panel: u-domain ──
  const rightRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (panelW < 40) return;

      const iw = panelW - margin.left - margin.right;
      const ih = height - margin.top - margin.bottom;
      const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      const [ua, ub] = preset.uDomain;
      const yMax = (d3.max(uCurve, (d) => d.y) ?? 1) * 1.15;

      const xScale = d3.scaleLinear().domain([ua, ub]).range([0, iw]);
      const yScale = d3.scaleLinear().domain([0, yMax]).range([ih, 0]);

      g.append('g').attr('transform', `translate(0,${ih})`).call(d3.axisBottom(xScale).ticks(5))
        .selectAll('text').style('fill', 'var(--color-text-muted)');
      g.append('g').call(d3.axisLeft(yScale).ticks(5))
        .selectAll('text').style('fill', 'var(--color-text-muted)');
      g.selectAll('.domain, .tick line').style('stroke', 'var(--color-border)');

      // Rectangles
      for (const rect of uSum.rectangles) {
        g.append('rect')
          .attr('x', xScale(rect.x))
          .attr('y', yScale(Math.max(rect.height, 0)))
          .attr('width', Math.max(0, xScale(rect.x + rect.width) - xScale(rect.x) - 0.5))
          .attr('height', Math.abs(yScale(0) - yScale(Math.abs(rect.height))))
          .style('fill', regionColors.deltaBand)
          .style('fill-opacity', 0.5)
          .style('stroke', '#D97706')
          .style('stroke-width', 0.6);
      }

      // Curve
      const line = d3.line<{ x: number; y: number }>().x((d) => xScale(d.x)).y((d) => yScale(d.y));
      g.append('path').datum(uCurve).attr('d', line)
        .style('fill', 'none').style('stroke', functionColors[1]).style('stroke-width', 2.5);

      g.append('text').attr('x', iw / 2).attr('y', -4).attr('text-anchor', 'middle')
        .style('fill', 'var(--color-text-muted)').style('font-size', '12px')
        .text(`u-domain: f(u),  ${preset.uLabel}`);
    },
    [panelW, selectedIdx, n, uCurve, uSum],
  );

  return (
    <div ref={containerRef} className="w-full my-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-3 text-sm">
        <label className="flex items-center gap-1.5">
          <span style={{ color: 'var(--color-text-muted)' }}>Substitution:</span>
          <select
            value={selectedIdx}
            onChange={handlePresetChange}
            className="rounded border px-2 py-1"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-alt)', color: 'var(--color-text)' }}
          >
            {presets.map((p, i) => (
              <option key={p.name} value={i}>{p.label}  ({p.uLabel})</option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-1.5">
          <span style={{ color: 'var(--color-text-muted)' }}>n = {n}</span>
          <input
            type="range" min={2} max={60} value={n}
            onChange={(e) => setN(Number(e.target.value))}
            className="w-28"
          />
        </label>
      </div>

      {/* Side-by-side panels */}
      <div className="flex gap-0" style={{ gap: PANEL_GAP }}>
        <svg ref={leftRef} width={panelW} height={height} />
        <svg ref={rightRef} width={panelW} height={height} />
      </div>

      {/* Readout */}
      <div
        className="flex flex-wrap gap-4 px-3 py-2 rounded text-sm mt-2"
        style={{ background: 'var(--color-surface-alt)', color: 'var(--color-text)' }}
      >
        <span>x-domain sum = <strong>{xSum.value.toFixed(6)}</strong></span>
        <span>u-domain sum = <strong>{uSum.value.toFixed(6)}</strong></span>
        <span>Exact = <strong>{preset.exactValue.toFixed(6)}</strong></span>
        <span style={{ color: 'var(--color-text-muted)' }}>Areas match by the substitution rule</span>
      </div>
    </div>
  );
}
