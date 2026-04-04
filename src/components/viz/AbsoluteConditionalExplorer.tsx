import { useState, useMemo } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { computePartialSums } from './shared/series';
import { buildRearrangement } from '../../data/series-convergence-data';
import { functionColors } from './shared/colorScales';

const margin = { top: 20, right: 20, bottom: 35, left: 50 };
const GAP = 30;

interface TargetPreset {
  label: string;
  value: number;
}

const targets: TargetPreset[] = [
  { label: '(3/2) ln 2 ≈ 1.040', value: 1.5 * Math.LN2 },
  { label: 'π/4 ≈ 0.785', value: Math.PI / 4 },
  { label: '0', value: 0 },
  { label: '2', value: 2 },
  { label: '−1', value: -1 },
];

// Alternating p-series: (-1)^{n+1} / n^p
function altPSeriesTerm(p: number): (n: number) => number {
  return (n: number) => Math.pow(-1, n + 1) / Math.pow(n, p);
}

const seriesOptions = [
  { label: 'Alternating harmonic (p = 1)', p: 1, exactSum: Math.LN2, convergesAbsolutely: false },
  { label: 'Alternating p-series (p = 0.75)', p: 0.75, exactSum: null, convergesAbsolutely: false },
  { label: 'Alternating 1/n² (p = 2)', p: 2, exactSum: null, convergesAbsolutely: true },
];

export default function AbsoluteConditionalExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();

  const [seriesIdx, setSeriesIdx] = useState(0);
  const [targetIdx, setTargetIdx] = useState(0);
  const [maxN, setMaxN] = useState(200);

  const series = seriesOptions[seriesIdx];
  const term = useMemo(() => altPSeriesTerm(series.p), [seriesIdx]);
  const target = targets[targetIdx];

  // Original series partial sums
  const originalData = useMemo(
    () => computePartialSums(term, maxN, series.exactSum ?? undefined),
    [seriesIdx, maxN],
  );

  // Absolute series partial sums: Σ|a_n| = Σ 1/n^p
  const absoluteData = useMemo(
    () => computePartialSums((n) => 1 / Math.pow(n, series.p), maxN),
    [seriesIdx, maxN],
  );

  // Rearrangement (only for p = 1, the alternating harmonic)
  const rearrangeData = useMemo(
    () => series.p === 1 ? buildRearrangement(target.value, maxN) : null,
    [seriesIdx, targetIdx, maxN],
  );

  // Layout: 2 or 3 panels side by side (stacked on narrow screens)
  const showRearrange = rearrangeData !== null;
  const panelCount = showRearrange ? 3 : 2;
  const isNarrow = width < 600;
  const panelW = isNarrow ? width : (width - GAP * (panelCount - 1)) / panelCount;
  const panelH = Math.min(panelW * 0.8, 280);
  const totalHeight = isNarrow ? panelCount * (panelH + GAP) : panelH + margin.top + margin.bottom;
  const totalWidth = isNarrow ? width : width;

  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (width <= 0) return;

      const innerW = panelW - margin.left - margin.right;
      const innerH = panelH - margin.top - margin.bottom;

      // Helper: draw a single panel
      const drawPanel = (
        panelIdx: number,
        label: string,
        data: { n: number; value: number }[],
        color: string,
        refLine: number | null,
      ) => {
        const xOff = isNarrow ? 0 : panelIdx * (panelW + GAP);
        const yOff = isNarrow ? panelIdx * (panelH + GAP) : 0;

        const g = svg.append('g')
          .attr('transform', `translate(${xOff + margin.left},${yOff + margin.top})`);

        if (data.length === 0) return;

        const xScale = d3.scaleLinear().domain([1, maxN]).range([0, innerW]);
        const yExt = d3.extent(data, (d) => d.value) as [number, number];
        const yPad = ((yExt[1] - yExt[0]) * 0.12) || 0.5;
        const yScale = d3.scaleLinear()
          .domain([yExt[0] - yPad, yExt[1] + yPad])
          .range([innerH, 0]);

        // Reference line (exact sum)
        if (refLine !== null && isFinite(refLine)) {
          g.append('line')
            .attr('x1', 0).attr('x2', innerW)
            .attr('y1', yScale(refLine)).attr('y2', yScale(refLine))
            .style('stroke', '#059669')
            .style('stroke-dasharray', '4,3')
            .style('stroke-width', 1);
        }

        // Line
        const line = d3.line<{ n: number; value: number }>()
          .x((d) => xScale(d.n))
          .y((d) => yScale(d.value))
          .defined((d) => isFinite(d.value));

        g.append('path')
          .datum(data)
          .attr('fill', 'none')
          .attr('stroke', color)
          .attr('stroke-width', 1.5)
          .attr('d', line);

        // Panel title
        g.append('text')
          .attr('x', innerW / 2).attr('y', -6)
          .attr('text-anchor', 'middle')
          .style('fill', 'var(--color-text)').style('font-size', '11px').style('font-weight', '600')
          .text(label);

        // Axes
        g.append('g')
          .attr('transform', `translate(0,${innerH})`)
          .call(d3.axisBottom(xScale).ticks(4))
          .call((a) => {
            a.select('.domain').style('stroke', 'var(--color-border)');
            a.selectAll('.tick line').style('stroke', 'var(--color-border)');
            a.selectAll('.tick text').style('fill', 'var(--color-text-muted)').style('font-size', '9px');
          });

        g.append('g')
          .call(d3.axisLeft(yScale).ticks(5))
          .call((a) => {
            a.select('.domain').style('stroke', 'var(--color-border)');
            a.selectAll('.tick line').style('stroke', 'var(--color-border)');
            a.selectAll('.tick text').style('fill', 'var(--color-text-muted)').style('font-size', '9px');
          });
      };

      // Panel 1: Original series
      drawPanel(
        0,
        'Original: Σ(-1)ⁿ⁺¹/nᵖ',
        originalData.map((d) => ({ n: d.n, value: d.Sn })),
        functionColors[0],
        series.exactSum,
      );

      // Panel 2: Absolute series
      drawPanel(
        1,
        `Absolute: Σ 1/nᵖ (p = ${series.p})`,
        absoluteData.map((d) => ({ n: d.n, value: d.Sn })),
        '#7C3AED',
        series.convergesAbsolutely ? absoluteData[absoluteData.length - 1]?.Sn ?? null : null,
      );

      // Panel 3: Rearrangement (only for alternating harmonic)
      if (showRearrange && rearrangeData) {
        const rData = rearrangeData.partialSums.map((v, i) => ({ n: i + 1, value: v }));
        drawPanel(
          2,
          `Rearranged → ${target.label}`,
          rData,
          '#D97706',
          target.value,
        );
      }
    },
    [width, originalData, absoluteData, rearrangeData, seriesIdx, targetIdx, maxN, isNarrow],
  );

  const origSum = originalData.length > 0 ? originalData[originalData.length - 1].Sn.toFixed(6) : '—';
  const absSum = absoluteData.length > 0 ? absoluteData[absoluteData.length - 1].Sn.toFixed(4) : '—';
  const rearSum = rearrangeData
    ? rearrangeData.partialSums[rearrangeData.partialSums.length - 1]?.toFixed(6) ?? '—'
    : '—';

  return (
    <div ref={containerRef} className="w-full my-6">
      <div className="flex flex-wrap items-center gap-4 mb-3">
        <label className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Series:
          <select value={seriesIdx} onChange={(e) => setSeriesIdx(Number(e.target.value))}
            className="ml-2 px-2 py-1 rounded text-sm"
            style={{ background: 'var(--color-surface-alt)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}>
            {seriesOptions.map((s, i) => <option key={i} value={i}>{s.label}</option>)}
          </select>
        </label>

        {series.p === 1 && (
          <label className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Rearrange to:
            <select value={targetIdx} onChange={(e) => setTargetIdx(Number(e.target.value))}
              className="ml-2 px-2 py-1 rounded text-sm"
              style={{ background: 'var(--color-surface-alt)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}>
              {targets.map((t, i) => <option key={i} value={i}>{t.label}</option>)}
            </select>
          </label>
        )}

        <label className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Terms: {maxN}
          <input type="range" min={20} max={500} step={10} value={maxN}
            onChange={(e) => setMaxN(Number(e.target.value))} className="ml-2 w-24" />
        </label>
      </div>

      <svg ref={svgRef} width={totalWidth} height={totalHeight} />

      <div className="flex flex-wrap gap-4 mt-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
        <span><span style={{ color: functionColors[0] }}>─</span> Original S = {origSum}</span>
        <span><span style={{ color: '#7C3AED' }}>─</span> Absolute Σ|aₙ| = {absSum}{!series.convergesAbsolutely ? ' → ∞' : ''}</span>
        {showRearrange && <span><span style={{ color: '#D97706' }}>─</span> Rearranged S = {rearSum}</span>}
        <span className="font-medium" style={{ color: 'var(--color-text)' }}>
          {series.convergesAbsolutely ? 'Absolute convergence' : 'Conditional convergence'}
        </span>
      </div>
    </div>
  );
}
