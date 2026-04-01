import { useState, useMemo, useCallback, useEffect, type ChangeEvent } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { riemannSum, quadratureConvergence } from './shared/integration';
import { getRiemannSumPresets } from '../../data/riemann-integral-data';
import { functionColors, regionColors } from './shared/colorScales';

const presets = getRiemannSumPresets();
const margin = { top: 20, right: 30, bottom: 40, left: 55 };
const CURVE_PTS = 400;
const GAP = 40;

type Rule = 'left' | 'right' | 'midpoint' | 'trapezoidal' | 'simpson';
const RULES: { key: Rule; label: string }[] = [
  { key: 'left', label: 'Left' },
  { key: 'right', label: 'Right' },
  { key: 'midpoint', label: 'Midpoint' },
  { key: 'trapezoidal', label: 'Trapez.' },
  { key: 'simpson', label: 'Simpson' },
];

export default function RiemannSumExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();
  const totalHeight = Math.min(width * 0.85, 680);
  const topH = totalHeight * 0.58;
  const botH = totalHeight - topH - GAP;

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [n, setN] = useState(8);
  const [rule, setRule] = useState<Rule>('left');
  const [playing, setPlaying] = useState(false);
  const [showConvergence, setShowConvergence] = useState(true);

  const preset = presets[selectedIdx];

  const handlePresetChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    const idx = Number(e.target.value);
    setSelectedIdx(idx);
    setN(8);
    setPlaying(false);
  }, []);

  // Animation: auto-increment n
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setN((prev) => {
        const next = prev < 20 ? prev + 1 : prev < 50 ? prev + 2 : prev + 5;
        if (next >= 200) {
          setPlaying(false);
          return 200;
        }
        return next;
      });
    }, 120);
    return () => clearInterval(id);
  }, [playing]);

  // Function curve data
  const curveData = useMemo(() => {
    const [a, b] = [preset.defaultA, preset.defaultB];
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i < CURVE_PTS; i++) {
      const x = a + (i / (CURVE_PTS - 1)) * (b - a);
      pts.push({ x, y: preset.f(x) });
    }
    return pts;
  }, [selectedIdx]);

  // Riemann sum result
  const rsResult = useMemo(() => {
    return riemannSum(preset.f, preset.defaultA, preset.defaultB, n, rule);
  }, [selectedIdx, n, rule]);

  // Exact integral
  const exact = useMemo(() => {
    if (preset.exactIntegral) return preset.exactIntegral(preset.defaultA, preset.defaultB);
    return null;
  }, [selectedIdx]);

  // Convergence data
  const convergenceData = useMemo(() => {
    if (!exact) return null;
    const nVals = [];
    for (let k = 2; k <= 200; k++) nVals.push(k);
    return quadratureConvergence(
      preset.f,
      preset.defaultA,
      preset.defaultB,
      exact,
      nVals,
      ['left', 'right', 'midpoint', 'trapezoidal', 'simpson'],
    );
  }, [selectedIdx]);

  // ── Top panel: function + rectangles ──
  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (width < 50) return;

      const iw = width - margin.left - margin.right;
      const ih = topH - margin.top - margin.bottom;
      const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      const [a, b] = [preset.defaultA, preset.defaultB];
      const yMin = d3.min(curveData, (d) => d.y) ?? 0;
      const yMax = d3.max(curveData, (d) => d.y) ?? 1;
      const yPad = (yMax - yMin) * 0.1 || 0.5;

      const xScale = d3.scaleLinear().domain([a, b]).range([0, iw]);
      const yScale = d3.scaleLinear().domain([Math.min(yMin - yPad, 0), yMax + yPad]).range([ih, 0]);

      // Axes
      g.append('g').attr('transform', `translate(0,${ih})`).call(d3.axisBottom(xScale).ticks(8))
        .selectAll('text').style('fill', 'var(--color-text-muted)');
      g.append('g').call(d3.axisLeft(yScale).ticks(6))
        .selectAll('text').style('fill', 'var(--color-text-muted)');
      g.selectAll('.domain, .tick line').style('stroke', 'var(--color-border)');

      // Zero line
      if (yScale.domain()[0] < 0 && yScale.domain()[1] > 0) {
        g.append('line')
          .attr('x1', 0).attr('x2', iw)
          .attr('y1', yScale(0)).attr('y2', yScale(0))
          .style('stroke', 'var(--color-border)').style('stroke-dasharray', '4,3');
      }

      // Rectangles / trapezoids
      for (const rect of rsResult.rectangles) {
        if (rule === 'trapezoidal' && rect.heightLeft !== undefined && rect.heightRight !== undefined) {
          const x0 = xScale(rect.x);
          const x1 = xScale(rect.x + rect.width);
          const yL = yScale(rect.heightLeft);
          const yR = yScale(rect.heightRight);
          const y0 = yScale(0);
          g.append('polygon')
            .attr('points', `${x0},${y0} ${x0},${yL} ${x1},${yR} ${x1},${y0}`)
            .style('fill', regionColors.integralFill)
            .style('fill-opacity', 0.5)
            .style('stroke', functionColors[2])
            .style('stroke-width', 0.8);
        } else {
          const h = rect.height;
          const yTop = h >= 0 ? yScale(h) : yScale(0);
          const barH = Math.abs(yScale(0) - yScale(h));
          g.append('rect')
            .attr('x', xScale(rect.x))
            .attr('y', yTop)
            .attr('width', Math.max(0, xScale(rect.x + rect.width) - xScale(rect.x) - 0.5))
            .attr('height', barH)
            .style('fill', regionColors.integralFill)
            .style('fill-opacity', 0.5)
            .style('stroke', functionColors[2])
            .style('stroke-width', 0.8);
        }
      }

      // Function curve
      const line = d3.line<{ x: number; y: number }>()
        .x((d) => xScale(d.x))
        .y((d) => yScale(d.y));
      g.append('path')
        .datum(curveData)
        .attr('d', line)
        .style('fill', 'none')
        .style('stroke', functionColors[0])
        .style('stroke-width', 2.5);

      // Label
      g.append('text')
        .attr('x', iw / 2).attr('y', -4)
        .attr('text-anchor', 'middle')
        .style('fill', 'var(--color-text-muted)')
        .style('font-size', '13px')
        .text(`${preset.label} on [${a.toFixed(1)}, ${b.toFixed(2)}]  —  n = ${n}, ${rule} rule`);
    },
    [width, selectedIdx, n, rule, curveData, rsResult],
  );

  // ── Bottom panel: convergence log-log ──
  const convRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (width < 50 || !convergenceData || !showConvergence) return;

      const iw = width - margin.left - margin.right;
      const ih = botH - margin.top - margin.bottom;
      const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      const xScale = d3.scaleLog().domain([2, 200]).range([0, iw]);
      const allErrors = convergenceData.flatMap((r) => r.data.map((d) => d.error));
      const eMin = d3.min(allErrors) ?? 1e-14;
      const eMax = d3.max(allErrors) ?? 1;
      const yScale = d3.scaleLog().domain([Math.max(eMin * 0.5, 1e-16), eMax * 2]).range([ih, 0]);

      g.append('g').attr('transform', `translate(0,${ih})`)
        .call(d3.axisBottom(xScale).ticks(5, '~s'))
        .selectAll('text').style('fill', 'var(--color-text-muted)');
      g.append('g').call(d3.axisLeft(yScale).ticks(5, '.0e'))
        .selectAll('text').style('fill', 'var(--color-text-muted)');
      g.selectAll('.domain, .tick line').style('stroke', 'var(--color-border)');

      const ruleColors: Record<string, string> = {
        left: '#94A3B8',
        right: '#94A3B8',
        midpoint: functionColors[2],
        trapezoidal: functionColors[0],
        simpson: functionColors[1],
      };

      const lineGen = d3.line<{ n: number; error: number }>()
        .x((d) => xScale(d.n))
        .y((d) => yScale(d.error));

      for (const series of convergenceData) {
        g.append('path')
          .datum(series.data)
          .attr('d', lineGen)
          .style('fill', 'none')
          .style('stroke', ruleColors[series.rule] ?? '#888')
          .style('stroke-width', series.rule === rule ? 2.5 : 1.2)
          .style('stroke-opacity', series.rule === rule ? 1 : 0.4);
      }

      // Current n marker
      const currentErr = Math.abs(rsResult.value - (exact ?? 0));
      if (currentErr > 0) {
        g.append('circle')
          .attr('cx', xScale(n))
          .attr('cy', yScale(Math.max(currentErr, 1e-16)))
          .attr('r', 5)
          .style('fill', ruleColors[rule])
          .style('stroke', '#fff')
          .style('stroke-width', 2);
      }

      // Axis labels
      g.append('text')
        .attr('x', iw / 2).attr('y', ih + 35)
        .attr('text-anchor', 'middle')
        .style('fill', 'var(--color-text-muted)')
        .style('font-size', '12px')
        .text('n (subintervals)');
      g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -ih / 2).attr('y', -42)
        .attr('text-anchor', 'middle')
        .style('fill', 'var(--color-text-muted)')
        .style('font-size', '12px')
        .text('|error|');
    },
    [width, selectedIdx, convergenceData, showConvergence, n, rule],
  );

  const error = exact !== null ? Math.abs(rsResult.value - exact) : null;

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
              <option key={p.name} value={i}>{p.label}</option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-1.5">
          <span style={{ color: 'var(--color-text-muted)' }}>n = {n}</span>
          <input
            type="range"
            min={2}
            max={200}
            value={n}
            onChange={(e) => { setN(Number(e.target.value)); setPlaying(false); }}
            className="w-32"
          />
        </label>

        <div className="flex gap-1">
          {RULES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRule(r.key)}
              className="px-2 py-0.5 rounded text-xs border"
              style={{
                borderColor: rule === r.key ? functionColors[0] : 'var(--color-border)',
                background: rule === r.key ? functionColors[0] : 'var(--color-surface-alt)',
                color: rule === r.key ? '#fff' : 'var(--color-text)',
              }}
            >
              {r.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => { if (!playing) setN(2); setPlaying(!playing); }}
          className="px-3 py-0.5 rounded text-xs border"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-alt)', color: 'var(--color-text)' }}
        >
          {playing ? '■ Stop' : '▶ Animate'}
        </button>

        <label className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
          <input
            type="checkbox"
            checked={showConvergence}
            onChange={(e) => setShowConvergence(e.target.checked)}
          />
          Convergence
        </label>
      </div>

      {/* Top panel: function + rectangles */}
      <svg ref={svgRef} width={width} height={topH} />

      {/* Readout */}
      <div
        className="flex flex-wrap gap-4 px-3 py-2 rounded text-sm my-2"
        style={{ background: 'var(--color-surface-alt)', color: 'var(--color-text)' }}
      >
        <span>S<sub>{n}</sub> = <strong>{rsResult.value.toFixed(6)}</strong></span>
        {exact !== null && <span>Exact = <strong>{exact.toFixed(6)}</strong></span>}
        {error !== null && <span>|Error| = <strong>{error.toExponential(3)}</strong></span>}
      </div>

      {/* Bottom panel: convergence */}
      {showConvergence && <svg ref={convRef} width={width} height={botH} />}
    </div>
  );
}
