import { useState, useMemo } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { computePartialSums } from './shared/series';
import { getLearningRateSchedules } from '../../data/series-convergence-data';

const schedules = getLearningRateSchedules();
const margin = { top: 20, right: 20, bottom: 35, left: 55 };
const GAP = 40;

export default function LearningRateSeriesExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();

  const [mode, setMode] = useState<'slider' | 'preset'>('slider');
  const [p, setP] = useState(1.0);
  const [scheduleIdx, setScheduleIdx] = useState(2); // default: p=1
  const [maxT, setMaxT] = useState(200);

  // Current alpha function
  const alphaFn = useMemo(() => {
    if (mode === 'slider') return (t: number) => 1 / Math.pow(t, p);
    return schedules[scheduleIdx].alpha;
  }, [mode, p, scheduleIdx]);

  // Σ α_t partial sums
  const sumAlpha = useMemo(
    () => computePartialSums(alphaFn, maxT),
    [alphaFn, maxT],
  );

  // Σ α_t² partial sums
  const sumAlphaSq = useMemo(
    () => computePartialSums((t) => alphaFn(t) * alphaFn(t), maxT),
    [alphaFn, maxT],
  );

  // Robbins-Monro verdicts
  const verdicts = useMemo(() => {
    if (mode === 'slider') {
      // For polynomial 1/t^p: Σ1/t^p diverges iff p ≤ 1; Σ1/t^{2p} converges iff 2p > 1
      const sumDiverges = p <= 1;
      const sumSqConverges = 2 * p > 1;
      return {
        sumDiverges,
        sumSqConverges,
        valid: sumDiverges && sumSqConverges,
      };
    }
    const s = schedules[scheduleIdx];
    return {
      sumDiverges: s.sumDiverges,
      sumSqConverges: s.sumSquaresConverges,
      valid: s.robbinsMonroValid,
    };
  }, [mode, p, scheduleIdx]);

  // Layout
  const isNarrow = width < 550;
  const panelW = isNarrow ? width : (width - GAP) / 2;
  const panelH = Math.min(panelW * 0.7, 260);
  const totalHeight = isNarrow ? 2 * (panelH + GAP) + margin.top : panelH + margin.top + margin.bottom + 10;

  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (width <= 0) return;

      const innerW = panelW - margin.left - margin.right;
      const innerH = panelH - margin.top - margin.bottom;

      // Helper: draw one panel
      const drawPanel = (
        panelIdx: number,
        label: string,
        data: { n: number; Sn: number }[],
        useLog: boolean,
        diverges: boolean,
      ) => {
        const xOff = isNarrow ? 0 : panelIdx * (panelW + GAP);
        const yOff = isNarrow ? panelIdx * (panelH + GAP) : 0;

        const g = svg.append('g')
          .attr('transform', `translate(${xOff + margin.left},${yOff + margin.top})`);

        if (data.length === 0) return;

        const xScale = d3.scaleLinear().domain([1, maxT]).range([0, innerW]);
        const values = data.map((d) => d.Sn).filter((v) => v > 0);
        if (values.length === 0) return;

        let yScale: d3.ScaleLinear<number, number> | d3.ScaleLogarithmic<number, number>;
        if (useLog && values[values.length - 1] / values[0] > 10) {
          yScale = d3.scaleLog()
            .domain([Math.max(1e-10, d3.min(values)!), d3.max(values)!])
            .range([innerH, 0])
            .clamp(true);
        } else {
          const yMax = d3.max(values)!;
          yScale = d3.scaleLinear()
            .domain([0, yMax * 1.1])
            .range([innerH, 0]);
        }

        // Line
        const line = d3.line<{ n: number; Sn: number }>()
          .x((d) => xScale(d.n))
          .y((d) => yScale(Math.max(1e-10, d.Sn)))
          .defined((d) => isFinite(d.Sn) && d.Sn > 0);

        const lineColor = diverges ? '#DC2626' : '#059669';

        g.append('path')
          .datum(data)
          .attr('fill', 'none')
          .attr('stroke', lineColor)
          .attr('stroke-width', 2)
          .attr('d', line as any);

        // Panel label
        g.append('text')
          .attr('x', innerW / 2).attr('y', -6)
          .attr('text-anchor', 'middle')
          .style('fill', 'var(--color-text)').style('font-size', '11px').style('font-weight', '600')
          .text(label);

        // Axes
        g.append('g')
          .attr('transform', `translate(0,${innerH})`)
          .call(d3.axisBottom(xScale).ticks(5))
          .call((a) => {
            a.select('.domain').style('stroke', 'var(--color-border)');
            a.selectAll('.tick line').style('stroke', 'var(--color-border)');
            a.selectAll('.tick text').style('fill', 'var(--color-text-muted)').style('font-size', '9px');
          });

        g.append('g')
          .call(d3.axisLeft(yScale as any).ticks(4))
          .call((a) => {
            a.select('.domain').style('stroke', 'var(--color-border)');
            a.selectAll('.tick line').style('stroke', 'var(--color-border)');
            a.selectAll('.tick text').style('fill', 'var(--color-text-muted)').style('font-size', '9px');
          });

        // Axis label
        g.append('text')
          .attr('x', innerW / 2).attr('y', innerH + 30)
          .attr('text-anchor', 'middle')
          .style('fill', 'var(--color-text-muted)').style('font-size', '10px')
          .text('t');
      };

      // Panel 1: Σ α_t (should diverge)
      drawPanel(0, 'Σ αₜ (must → ∞)', sumAlpha, true, !verdicts.sumDiverges);

      // Panel 2: Σ α_t² (should converge)
      drawPanel(1, 'Σ αₜ² (must < ∞)', sumAlphaSq, false, !verdicts.sumSqConverges);
    },
    [width, sumAlpha, sumAlphaSq, maxT, verdicts, isNarrow],
  );

  const labelStr = mode === 'slider' ? `αₜ = 1/t^${p.toFixed(2)}` : schedules[scheduleIdx].label;

  return (
    <div ref={containerRef} className="w-full my-6">
      <div className="flex flex-wrap items-center gap-4 mb-3">
        <label className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Mode:
          <select value={mode} onChange={(e) => setMode(e.target.value as 'slider' | 'preset')}
            className="ml-2 px-2 py-1 rounded text-sm"
            style={{ background: 'var(--color-surface-alt)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}>
            <option value="slider">p-slider</option>
            <option value="preset">Schedule presets</option>
          </select>
        </label>

        {mode === 'slider' ? (
          <label className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            p = {p.toFixed(2)}
            <input type="range" min={0.3} max={1.5} step={0.05} value={p}
              onChange={(e) => setP(Number(e.target.value))} className="ml-2 w-32" />
          </label>
        ) : (
          <label className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Schedule:
            <select value={scheduleIdx} onChange={(e) => setScheduleIdx(Number(e.target.value))}
              className="ml-2 px-2 py-1 rounded text-sm"
              style={{ background: 'var(--color-surface-alt)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}>
              {schedules.map((s, i) => <option key={s.name} value={i}>{s.label}</option>)}
            </select>
          </label>
        )}

        <label className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Steps: {maxT}
          <input type="range" min={50} max={500} step={50} value={maxT}
            onChange={(e) => setMaxT(Number(e.target.value))} className="ml-2 w-24" />
        </label>
      </div>

      <svg ref={svgRef} width={width} height={totalHeight} />

      {/* Robbins-Monro verdict */}
      <div className="flex flex-wrap items-center gap-4 mt-3 p-3 rounded text-sm"
        style={{
          background: verdicts.valid ? 'rgba(5, 150, 105, 0.1)' : 'rgba(220, 38, 38, 0.1)',
          border: `1px solid ${verdicts.valid ? '#059669' : '#DC2626'}`,
        }}>
        <span style={{ color: 'var(--color-text)' }}>
          <strong>{labelStr}</strong>
        </span>
        <span style={{ color: verdicts.sumDiverges ? '#059669' : '#DC2626' }}>
          {verdicts.sumDiverges ? '✓' : '✗'} Σαₜ = ∞
        </span>
        <span style={{ color: verdicts.sumSqConverges ? '#059669' : '#DC2626' }}>
          {verdicts.sumSqConverges ? '✓' : '✗'} Σαₜ² {'<'} ∞
        </span>
        <span style={{ color: verdicts.valid ? '#059669' : '#DC2626', fontWeight: 700 }}>
          {verdicts.valid ? 'Robbins-Monro: VALID' : 'Robbins-Monro: FAILS'}
        </span>
        {mode === 'slider' && (
          <span style={{ color: 'var(--color-text-muted)' }}>
            Valid range: p ∈ (1/2, 1]
          </span>
        )}
      </div>
    </div>
  );
}
