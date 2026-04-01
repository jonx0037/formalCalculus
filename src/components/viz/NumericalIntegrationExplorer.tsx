import { useState, useMemo, useCallback, type ChangeEvent } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { quadratureConvergence, riemannSum } from './shared/integration';
import { getQuadraturePresets } from '../../data/riemann-integral-data';
import { functionColors } from './shared/colorScales';

const presets = getQuadraturePresets();
const margin = { top: 20, right: 30, bottom: 45, left: 55 };
const GAP = 40;
const CURVE_PTS = 300;

type Rule = 'left' | 'right' | 'midpoint' | 'trapezoidal' | 'simpson';

const RULE_META: { key: Rule; label: string; color: string; slope: string }[] = [
  { key: 'left', label: 'Left', color: '#94A3B8', slope: 'O(1/n)' },
  { key: 'right', label: 'Right', color: '#94A3B8', slope: 'O(1/n)' },
  { key: 'midpoint', label: 'Midpoint', color: functionColors[2], slope: 'O(1/n²)' },
  { key: 'trapezoidal', label: 'Trapezoidal', color: functionColors[0], slope: 'O(1/n²)' },
  { key: 'simpson', label: 'Simpson', color: functionColors[1], slope: 'O(1/n⁴)' },
];

export default function NumericalIntegrationExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();
  const totalH = Math.min(width * 0.75, 560);
  const topH = totalH * 0.4;
  const botH = totalH - topH - GAP;

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [checkedRules, setCheckedRules] = useState<Set<Rule>>(new Set(['left', 'midpoint', 'trapezoidal', 'simpson']));
  const [currentN, setCurrentN] = useState(10);
  const [selectedRule, setSelectedRule] = useState<Rule>('trapezoidal');

  const preset = presets[selectedIdx];

  const handlePresetChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    setSelectedIdx(Number(e.target.value));
    setCurrentN(10);
  }, []);

  const toggleRule = useCallback((r: Rule) => {
    setCheckedRules((prev) => {
      const next = new Set(prev);
      if (next.has(r)) next.delete(r); else next.add(r);
      return next;
    });
  }, []);

  // Convergence data
  const convergenceData = useMemo(() => {
    const nVals: number[] = [];
    for (let k = 2; k <= 200; k++) nVals.push(k);
    return quadratureConvergence(
      preset.f,
      preset.domain[0],
      preset.domain[1],
      preset.exactIntegral,
      nVals,
      Array.from(checkedRules),
    );
  }, [selectedIdx, checkedRules]);

  // Function curve
  const fCurve = useMemo(() => {
    const [a, b] = preset.domain;
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i < CURVE_PTS; i++) {
      const x = a + (i / (CURVE_PTS - 1)) * (b - a);
      pts.push({ x, y: preset.f(x) });
    }
    return pts;
  }, [selectedIdx]);

  // Current rule's Riemann sum for top panel
  const currentSum = useMemo(() => {
    return riemannSum(preset.f, preset.domain[0], preset.domain[1], currentN, selectedRule);
  }, [selectedIdx, currentN, selectedRule]);

  // ── Top panel: function with quadrature geometry ──
  const topRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (width < 50) return;

      const iw = width - margin.left - margin.right;
      const ih = topH - margin.top - margin.bottom;
      const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      const [a, b] = preset.domain;
      const yMax = (d3.max(fCurve, (d) => d.y) ?? 1) * 1.15;
      const yMin = Math.min(d3.min(fCurve, (d) => d.y) ?? 0, 0);

      const xScale = d3.scaleLinear().domain([a, b]).range([0, iw]);
      const yScale = d3.scaleLinear().domain([yMin, yMax]).range([ih, 0]);

      g.append('g').attr('transform', `translate(0,${ih})`).call(d3.axisBottom(xScale).ticks(6))
        .selectAll('text').style('fill', 'var(--color-text-muted)');
      g.append('g').call(d3.axisLeft(yScale).ticks(5))
        .selectAll('text').style('fill', 'var(--color-text-muted)');
      g.selectAll('.domain, .tick line').style('stroke', 'var(--color-border)');

      const ruleMeta = RULE_META.find((r) => r.key === selectedRule);
      const rColor = ruleMeta?.color ?? '#888';

      for (const rect of currentSum.rectangles) {
        const h = rect.height;
        const yTop = h >= 0 ? yScale(h) : yScale(0);
        const barH = Math.abs(yScale(0) - yScale(h));
        g.append('rect')
          .attr('x', xScale(rect.x))
          .attr('y', yTop)
          .attr('width', Math.max(0, xScale(rect.x + rect.width) - xScale(rect.x) - 0.5))
          .attr('height', barH)
          .style('fill', rColor).style('fill-opacity', 0.2)
          .style('stroke', rColor).style('stroke-width', 0.7);
      }

      const line = d3.line<{ x: number; y: number }>().x((d) => xScale(d.x)).y((d) => yScale(d.y));
      g.append('path').datum(fCurve).attr('d', line)
        .style('fill', 'none').style('stroke', functionColors[0]).style('stroke-width', 2.5);

      g.append('text').attr('x', iw / 2).attr('y', -4).attr('text-anchor', 'middle')
        .style('fill', 'var(--color-text-muted)').style('font-size', '12px')
        .text(`${preset.label},  ${selectedRule} rule,  n = ${currentN}`);
    },
    [width, selectedIdx, currentN, selectedRule, fCurve, currentSum],
  );

  // ── Bottom panel: log-log convergence ──
  const botRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (width < 50 || convergenceData.length === 0) return;

      const iw = width - margin.left - margin.right;
      const ih = botH - margin.top - margin.bottom;
      const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      const xScale = d3.scaleLog().domain([2, 200]).range([0, iw]);
      const allErrs = convergenceData.flatMap((r) => r.data.map((d) => d.error));
      const eMin = d3.min(allErrs) ?? 1e-14;
      const eMax = d3.max(allErrs) ?? 1;
      const yScale = d3.scaleLog().domain([Math.max(eMin * 0.3, 1e-16), eMax * 3]).range([ih, 0]);

      g.append('g').attr('transform', `translate(0,${ih})`).call(d3.axisBottom(xScale).ticks(5, '~s'))
        .selectAll('text').style('fill', 'var(--color-text-muted)');
      g.append('g').call(d3.axisLeft(yScale).ticks(6, '.0e'))
        .selectAll('text').style('fill', 'var(--color-text-muted)');
      g.selectAll('.domain, .tick line').style('stroke', 'var(--color-border)');

      const lineGen = d3.line<{ n: number; error: number }>()
        .x((d) => xScale(d.n))
        .y((d) => yScale(d.error));

      for (const series of convergenceData) {
        const meta = RULE_META.find((r) => r.key === series.rule);
        g.append('path')
          .datum(series.data)
          .attr('d', lineGen)
          .style('fill', 'none')
          .style('stroke', meta?.color ?? '#888')
          .style('stroke-width', 2);
      }

      // Reference slopes
      const refSlopes = [
        { slope: -1, label: 'O(1/n)', dash: '6,4' },
        { slope: -2, label: 'O(1/n²)', dash: '4,3' },
        { slope: -4, label: 'O(1/n⁴)', dash: '2,2' },
      ];
      for (const ref of refSlopes) {
        const n0 = 5;
        const n1 = 150;
        const e0 = Math.pow(n0, ref.slope) * 0.5;
        const e1 = Math.pow(n1, ref.slope) * 0.5;
        if (e0 > yScale.domain()[1] || e1 < yScale.domain()[0]) continue;
        g.append('line')
          .attr('x1', xScale(n0)).attr('x2', xScale(n1))
          .attr('y1', yScale(e0)).attr('y2', yScale(e1))
          .style('stroke', 'var(--color-border)')
          .style('stroke-dasharray', ref.dash)
          .style('stroke-width', 1);
        g.append('text')
          .attr('x', xScale(n1) + 3).attr('y', yScale(e1) + 4)
          .style('fill', 'var(--color-text-muted)').style('font-size', '10px')
          .text(ref.label);
      }

      // Axis labels
      g.append('text').attr('x', iw / 2).attr('y', ih + 38).attr('text-anchor', 'middle')
        .style('fill', 'var(--color-text-muted)').style('font-size', '12px').text('n (subintervals)');
      g.append('text').attr('transform', 'rotate(-90)').attr('x', -ih / 2).attr('y', -42)
        .attr('text-anchor', 'middle').style('fill', 'var(--color-text-muted)').style('font-size', '12px')
        .text('|error|');

      // Current n marker
      const currErr = Math.abs(currentSum.value - preset.exactIntegral);
      if (currErr > 0 && checkedRules.has(selectedRule)) {
        g.append('circle')
          .attr('cx', xScale(currentN))
          .attr('cy', yScale(Math.max(currErr, 1e-16)))
          .attr('r', 5)
          .style('fill', RULE_META.find((r) => r.key === selectedRule)?.color ?? '#888')
          .style('stroke', '#fff').style('stroke-width', 2);
      }
    },
    [width, selectedIdx, convergenceData, currentN, selectedRule, currentSum],
  );

  const currError = Math.abs(currentSum.value - preset.exactIntegral);

  return (
    <div ref={containerRef} className="w-full my-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-3 text-sm">
        <label className="flex items-center gap-1.5">
          <span style={{ color: 'var(--color-text-muted)' }}>Function:</span>
          <select
            value={selectedIdx}
            onChange={handlePresetChange}
            className="rounded border px-2 py-1"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-alt)', color: 'var(--color-text)' }}
          >
            {presets.map((p, i) => (
              <option key={p.name} value={i}>{p.label}{p.notes ? ` (${p.notes})` : ''}</option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-1.5">
          <span style={{ color: 'var(--color-text-muted)' }}>n = {currentN}</span>
          <input
            type="range" min={2} max={100} value={currentN}
            onChange={(e) => setCurrentN(Number(e.target.value))}
            className="w-28"
          />
        </label>

        <div className="flex gap-2">
          {RULE_META.map((r) => (
            <label key={r.key} className="flex items-center gap-1 text-xs" style={{ color: r.color }}>
              <input
                type="checkbox"
                checked={checkedRules.has(r.key)}
                onChange={() => toggleRule(r.key)}
              />
              {r.label}
            </label>
          ))}
        </div>

        <label className="flex items-center gap-1.5 text-xs">
          <span style={{ color: 'var(--color-text-muted)' }}>Show:</span>
          <select
            value={selectedRule}
            onChange={(e) => setSelectedRule(e.target.value as Rule)}
            className="rounded border px-1 py-0.5 text-xs"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-alt)', color: 'var(--color-text)' }}
          >
            {RULE_META.map((r) => (
              <option key={r.key} value={r.key}>{r.label}</option>
            ))}
          </select>
        </label>
      </div>

      {/* Top panel: function with quadrature */}
      <svg ref={topRef} width={width} height={topH} />

      {/* Readout */}
      <div
        className="flex flex-wrap gap-4 px-3 py-1.5 rounded text-sm my-1"
        style={{ background: 'var(--color-surface-alt)', color: 'var(--color-text)' }}
      >
        <span>Sum = <strong>{currentSum.value.toFixed(8)}</strong></span>
        <span>Exact = <strong>{preset.exactIntegral.toFixed(8)}</strong></span>
        <span>|Error| = <strong>{currError.toExponential(3)}</strong></span>
      </div>

      {/* Bottom panel: convergence */}
      <svg ref={botRef} width={width} height={botH} />
    </div>
  );
}
