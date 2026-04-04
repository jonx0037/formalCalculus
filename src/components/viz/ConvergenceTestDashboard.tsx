import { useState, useMemo, useCallback, type ChangeEvent } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { ratioTest, rootTest, divergenceTest } from './shared/series';
import { getSeriesPresets, getTestResults } from '../../data/series-convergence-data';
import type { ConvergenceTestResult } from '../../data/series-convergence-data';
import { functionColors } from './shared/colorScales';

const presets = getSeriesPresets();
const margin = { top: 10, right: 20, bottom: 30, left: 45 };

const verdictColor = (v: string) =>
  v === 'converges' ? '#059669' : v === 'diverges' ? '#DC2626' : '#D97706';

export default function ConvergenceTestDashboard() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [maxN, setMaxN] = useState(100);
  const [showRatio, setShowRatio] = useState(true);
  const [showRoot, setShowRoot] = useState(true);
  const [showDivergence, setShowDivergence] = useState(true);

  const preset = presets[selectedIdx];

  // Compute test results from the data module
  const testResults = useMemo(() => getTestResults(preset), [selectedIdx]);

  // Compute diagnostics from the shared module for plotting
  const ratioDiag = useMemo(
    () => showRatio ? ratioTest(preset.term, maxN) : null,
    [selectedIdx, maxN, showRatio],
  );

  const rootDiag = useMemo(
    () => showRoot ? rootTest(preset.term, maxN) : null,
    [selectedIdx, maxN, showRoot],
  );

  const divVerdict = useMemo(
    () => showDivergence ? divergenceTest(preset.term, maxN) : null,
    [selectedIdx, maxN, showDivergence],
  );

  // Count active panels
  const panelCount = [showRatio, showRoot, showDivergence].filter(Boolean).length;
  const panelHeight = 150;
  const totalHeight = Math.max(180, panelCount * (panelHeight + 10) + 10);

  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (width <= 0 || panelCount === 0) return;

      const innerW = width - margin.left - margin.right;
      let yOffset = margin.top;

      // Helper: draw a diagnostic panel
      const drawPanel = (
        label: string,
        data: { n: number; value: number }[],
        threshold: number,
        verdict: string,
        diagnosticL: number | null,
      ) => {
        const g = svg.append('g')
          .attr('transform', `translate(${margin.left},${yOffset})`);

        const pH = panelHeight - 30;

        if (data.length === 0) {
          g.append('text')
            .attr('x', innerW / 2).attr('y', pH / 2)
            .attr('text-anchor', 'middle')
            .style('fill', 'var(--color-text-muted)').style('font-size', '12px')
            .text('Insufficient data');
          yOffset += panelHeight + 10;
          return;
        }

        const xScale = d3.scaleLinear()
          .domain(d3.extent(data, (d) => d.n) as [number, number])
          .range([0, innerW]);

        const yValues = data.map((d) => d.value).filter(isFinite);
        const yExt = d3.extent(yValues) as [number, number];
        const yPad = ((yExt[1] - yExt[0]) * 0.15) || 0.2;
        const yScale = d3.scaleLinear()
          .domain([Math.min(yExt[0] - yPad, threshold - yPad), Math.max(yExt[1] + yPad, threshold + yPad)])
          .range([pH, 0]);

        // Threshold line at L = 1
        g.append('line')
          .attr('x1', 0).attr('x2', innerW)
          .attr('y1', yScale(threshold)).attr('y2', yScale(threshold))
          .style('stroke', 'var(--color-border)')
          .style('stroke-dasharray', '4,3')
          .style('stroke-width', 1);

        // Diagnostic curve
        const line = d3.line<{ n: number; value: number }>()
          .x((d) => xScale(d.n))
          .y((d) => yScale(d.value))
          .defined((d) => isFinite(d.value));

        g.append('path')
          .datum(data)
          .attr('fill', 'none')
          .attr('stroke', functionColors[0])
          .attr('stroke-width', 1.5)
          .attr('d', line);

        // Panel label
        g.append('text')
          .attr('x', 0).attr('y', -4)
          .style('fill', 'var(--color-text)').style('font-size', '11px').style('font-weight', '600')
          .text(label);

        // Verdict badge
        const vColor = verdictColor(verdict);
        const vLabel = verdict === 'converges' ? 'Converges' : verdict === 'diverges' ? 'Diverges' : 'Inconclusive';
        const lStr = diagnosticL !== null ? ` (L ≈ ${diagnosticL.toFixed(4)})` : '';

        g.append('text')
          .attr('x', innerW).attr('y', -4)
          .attr('text-anchor', 'end')
          .style('fill', vColor).style('font-size', '11px').style('font-weight', '700')
          .text(vLabel + lStr);

        // Mini axes
        g.append('g')
          .attr('transform', `translate(0,${pH})`)
          .call(d3.axisBottom(xScale).ticks(5))
          .call((a) => {
            a.select('.domain').style('stroke', 'var(--color-border)');
            a.selectAll('.tick line').style('stroke', 'var(--color-border)');
            a.selectAll('.tick text').style('fill', 'var(--color-text-muted)').style('font-size', '9px');
          });

        g.append('g')
          .call(d3.axisLeft(yScale).ticks(4))
          .call((a) => {
            a.select('.domain').style('stroke', 'var(--color-border)');
            a.selectAll('.tick line').style('stroke', 'var(--color-border)');
            a.selectAll('.tick text').style('fill', 'var(--color-text-muted)').style('font-size', '9px');
          });

        yOffset += panelHeight + 10;
      };

      // Divergence test panel
      if (showDivergence && divVerdict) {
        // Plot |a_n| to show whether terms → 0
        const termData: { n: number; value: number }[] = [];
        for (let n = 1; n <= maxN; n++) {
          termData.push({ n, value: Math.abs(preset.term(n)) });
        }
        const dResult = testResults.find((r) => r.test === 'divergence');
        drawPanel(
          'Divergence Test: |aₙ|',
          termData,
          0,
          dResult?.verdict ?? 'inconclusive',
          null,
        );
      }

      // Ratio test panel
      if (showRatio && ratioDiag) {
        const plotData = ratioDiag.diagnostics.map((d) => ({ n: d.n, value: d.ratio }));
        drawPanel(
          'Ratio Test: |aₙ₊₁/aₙ|',
          plotData,
          1,
          ratioDiag.verdict.converges === true ? 'converges' : ratioDiag.verdict.converges === false ? 'diverges' : 'inconclusive',
          ratioDiag.verdict.diagnostic,
        );
      }

      // Root test panel
      if (showRoot && rootDiag) {
        const plotData = rootDiag.diagnostics.map((d) => ({ n: d.n, value: d.root }));
        drawPanel(
          'Root Test: |aₙ|^(1/n)',
          plotData,
          1,
          rootDiag.verdict.converges === true ? 'converges' : rootDiag.verdict.converges === false ? 'diverges' : 'inconclusive',
          rootDiag.verdict.diagnostic,
        );
      }
    },
    [width, selectedIdx, maxN, showRatio, showRoot, showDivergence, testResults, ratioDiag, rootDiag, divVerdict],
  );

  return (
    <div ref={containerRef} className="w-full my-6">
      <div className="flex flex-wrap items-center gap-4 mb-3">
        <label className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Series:
          <select
            value={selectedIdx}
            onChange={(e) => setSelectedIdx(Number(e.target.value))}
            className="ml-2 px-2 py-1 rounded text-sm"
            style={{ background: 'var(--color-surface-alt)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
          >
            {presets.map((p, i) => (
              <option key={p.name} value={i}>{p.label}</option>
            ))}
          </select>
        </label>

        <label className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          n: {maxN}
          <input type="range" min={20} max={300} step={10} value={maxN}
            onChange={(e) => setMaxN(Number(e.target.value))} className="ml-2 w-24" />
        </label>

        <label className="text-sm flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
          <input type="checkbox" checked={showDivergence} onChange={(e) => setShowDivergence(e.target.checked)} /> Divergence
        </label>
        <label className="text-sm flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
          <input type="checkbox" checked={showRatio} onChange={(e) => setShowRatio(e.target.checked)} /> Ratio
        </label>
        <label className="text-sm flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
          <input type="checkbox" checked={showRoot} onChange={(e) => setShowRoot(e.target.checked)} /> Root
        </label>
      </div>

      <svg ref={svgRef} width={width} height={totalHeight} />

      <div className="flex flex-wrap gap-3 mt-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
        <span>Series: <strong style={{ color: 'var(--color-text)' }}>{preset.label}</strong></span>
        <span>Type: <strong style={{ color: verdictColor(preset.convergenceType === 'divergent' ? 'diverges' : 'converges') }}>
          {preset.convergenceType}
        </strong></span>
        {preset.exactSum !== null && <span>Sum = {preset.exactSum.toFixed(4)}</span>}
      </div>
    </div>
  );
}
