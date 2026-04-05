import { useState, useMemo } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { functionColors } from './shared/colorScales';
import { getFourierPresets, getDecayComparison } from '../../data/fourier-series-data';
import type { FourierPreset } from '../../data/fourier-series-data';

const presets = getFourierPresets();
const decayComparisons = getDecayComparison();
const margin = { top: 20, right: 20, bottom: 40, left: 55 };

// Color constants
const AN_COLOR = functionColors[0];           // #2563EB blue
const BN_COLOR = '#F59E0B';                   // orange
const REF_1_OVER_N = '#DC2626';               // red
const REF_1_OVER_N2 = '#059669';              // green
const REF_EXP = '#7C3AED';                    // purple

type CoeffMode = 'both' | 'an' | 'bn';

/**
 * Maps a preset's smoothnessClass to the set of reference decay lines
 * that should be displayed alongside it.
 */
function getRelevantDecayRefs(preset: FourierPreset): {
  label: string;
  fn: (n: number) => number;
  color: string;
  dash: string;
}[] {
  const refs: { label: string; fn: (n: number) => number; color: string; dash: string }[] = [];

  // Find the specific reference from decayComparisons if available
  const specific = decayComparisons.find((d) => d.preset.name === preset.name);

  switch (preset.smoothnessClass) {
    case 'discontinuous':
      refs.push({
        label: 'O(1/n)',
        fn: specific ? specific.referenceDecay : (n: number) => 1 / n,
        color: REF_1_OVER_N,
        dash: '6,3',
      });
      break;
    case 'C0':
      refs.push({
        label: 'O(1/n)',
        fn: (n: number) => 4 / (n * Math.PI),
        color: REF_1_OVER_N,
        dash: '6,3',
      });
      refs.push({
        label: 'O(1/n\u00B2)',
        fn: specific ? specific.referenceDecay : (n: number) => 1 / (n * n),
        color: REF_1_OVER_N2,
        dash: '6,3',
      });
      break;
    case 'C1':
    case 'C2':
      refs.push({
        label: 'O(1/n)',
        fn: (n: number) => 4 / (n * Math.PI),
        color: REF_1_OVER_N,
        dash: '6,3',
      });
      refs.push({
        label: 'O(1/n\u00B2)',
        fn: (n: number) => 4 / (n * n * Math.PI),
        color: REF_1_OVER_N2,
        dash: '6,3',
      });
      if (specific) {
        refs.push({
          label: specific.referenceLabel.split(' \u2014 ')[1] || specific.referenceLabel,
          fn: specific.referenceDecay,
          color: REF_EXP,
          dash: '6,3',
        });
      }
      break;
    case 'Cinfty':
    case 'analytic':
      refs.push({
        label: 'O(1/n)',
        fn: (n: number) => 4 / (n * Math.PI),
        color: REF_1_OVER_N,
        dash: '6,3',
      });
      refs.push({
        label: 'O(1/n\u00B2)',
        fn: (n: number) => 4 / (n * n * Math.PI),
        color: REF_1_OVER_N2,
        dash: '6,3',
      });
      refs.push({
        label: 'O(e\u207B\u1D9C\u207F)',
        fn: specific ? specific.referenceDecay : (n: number) => Math.exp(-0.5 * n),
        color: REF_EXP,
        dash: '6,3',
      });
      break;
  }

  return refs;
}

/**
 * Describe smoothness class and whether observed decay matches prediction.
 */
function getSmoothnessLabel(preset: FourierPreset): string {
  const map: Record<string, string> = {
    discontinuous: 'Discontinuous',
    C0: 'Continuous (C\u2070)',
    C1: 'C\u00B9',
    C2: 'C\u00B2',
    Cinfty: 'C\u221E (smooth)',
    analytic: 'Analytic',
  };
  return map[preset.smoothnessClass] || preset.smoothnessClass;
}

export default function CoefficientDecayExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [coeffMode, setCoeffMode] = useState<CoeffMode>('both');
  const [maxN, setMaxN] = useState(40);

  const preset = presets[selectedIdx];

  // Compute coefficient magnitudes
  const coeffData = useMemo(() => {
    const pts: { n: number; an: number; bn: number }[] = [];
    for (let n = 1; n <= maxN; n++) {
      pts.push({ n, an: Math.abs(preset.an(n)), bn: Math.abs(preset.bn(n)) });
    }
    return pts;
  }, [preset, maxN]);

  // Compute function curve on [-pi, pi]
  const curveData = useMemo(() => {
    const pts: { x: number; y: number }[] = [];
    const nPts = 400;
    for (let i = 0; i <= nPts; i++) {
      const x = -Math.PI + (i / nPts) * 2 * Math.PI;
      pts.push({ x, y: preset.f(x) });
    }
    return pts;
  }, [preset]);

  // Layout: side-by-side when wide enough, stacked otherwise
  const stacked = width < 550;
  const height = Math.min(width * 0.5, 420);

  const panelGap = stacked ? 0 : 30;
  const panelWidth = stacked
    ? width - margin.left - margin.right
    : (width - margin.left - margin.right - panelGap) / 2;
  const panelHeight = stacked
    ? Math.min(width * 0.35, 200)
    : height - margin.top - margin.bottom;
  const totalHeight = stacked
    ? margin.top + panelHeight + 30 + panelHeight + margin.bottom
    : margin.top + panelHeight + margin.bottom;

  // Reference decay lines for current preset
  const decayRefs = useMemo(() => getRelevantDecayRefs(preset), [preset]);

  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (width < 100 || panelWidth < 40) return;

      svg.attr('width', width).attr('height', totalHeight);

      // ── Left panel: Function plot ──

      const leftG = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const xScaleF = d3
        .scaleLinear()
        .domain([-Math.PI, Math.PI])
        .range([0, panelWidth]);

      const yVals = curveData.map((d) => d.y);
      const yMinF = d3.min(yVals) ?? -1;
      const yMaxF = d3.max(yVals) ?? 1;
      const yPad = (yMaxF - yMinF) * 0.1 || 0.5;
      const yScaleF = d3
        .scaleLinear()
        .domain([yMinF - yPad, yMaxF + yPad])
        .range([panelHeight, 0]);

      // Light gray gridlines
      const xTicksF = xScaleF.ticks(6);
      const yTicksF = yScaleF.ticks(5);

      xTicksF.forEach((t) => {
        leftG
          .append('line')
          .attr('x1', xScaleF(t))
          .attr('x2', xScaleF(t))
          .attr('y1', 0)
          .attr('y2', panelHeight)
          .attr('stroke', '#e5e7eb')
          .attr('stroke-width', 0.5);
      });
      yTicksF.forEach((t) => {
        leftG
          .append('line')
          .attr('x1', 0)
          .attr('x2', panelWidth)
          .attr('y1', yScaleF(t))
          .attr('y2', yScaleF(t))
          .attr('stroke', '#e5e7eb')
          .attr('stroke-width', 0.5);
      });

      // Axes
      const piFormat = (v: number) => {
        if (Math.abs(v - Math.PI) < 0.01) return '\u03C0';
        if (Math.abs(v + Math.PI) < 0.01) return '\u2212\u03C0';
        if (Math.abs(v) < 0.01) return '0';
        return '';
      };

      leftG
        .append('g')
        .attr('transform', `translate(0,${panelHeight})`)
        .call(
          d3
            .axisBottom(xScaleF)
            .tickValues([-Math.PI, 0, Math.PI])
            .tickFormat((d) => piFormat(d as number)),
        )
        .selectAll('text')
        .style('fill', 'var(--color-text-secondary, #6b7280)')
        .style('font-size', '11px');

      leftG
        .append('g')
        .call(d3.axisLeft(yScaleF).ticks(5))
        .selectAll('text')
        .style('fill', 'var(--color-text-secondary, #6b7280)')
        .style('font-size', '10px');

      // Clip path for left panel
      const defs = svg.append('defs');
      defs
        .append('clipPath')
        .attr('id', 'clip-fn')
        .append('rect')
        .attr('width', panelWidth)
        .attr('height', panelHeight);

      const leftClip = leftG.append('g').attr('clip-path', 'url(#clip-fn)');

      // Function curve
      const lineGen = d3
        .line<{ x: number; y: number }>()
        .x((d) => xScaleF(d.x))
        .y((d) => yScaleF(d.y));

      leftClip
        .append('path')
        .datum(curveData)
        .attr('d', lineGen)
        .attr('fill', 'none')
        .attr('stroke', AN_COLOR)
        .attr('stroke-width', 2.5);

      // Title
      leftG
        .append('text')
        .attr('x', panelWidth / 2)
        .attr('y', -6)
        .attr('text-anchor', 'middle')
        .attr('font-size', '12px')
        .attr('font-weight', 600)
        .style('fill', 'var(--color-text-primary, #1f2937)')
        .text('f(x)');

      // x-axis label
      leftG
        .append('text')
        .attr('x', panelWidth / 2)
        .attr('y', panelHeight + 32)
        .attr('text-anchor', 'middle')
        .attr('font-size', '11px')
        .style('fill', 'var(--color-text-secondary, #6b7280)')
        .text('x');

      // ── Right panel: Coefficient magnitudes (log scale) ──

      const rightOffsetX = stacked ? margin.left : margin.left + panelWidth + panelGap;
      const rightOffsetY = stacked ? margin.top + panelHeight + 30 : margin.top;

      const rightG = svg
        .append('g')
        .attr('transform', `translate(${rightOffsetX},${rightOffsetY})`);

      // Gather visible coefficient values (filtering out zeros for log scale)
      const visibleAn = coeffMode !== 'bn' ? coeffData.filter((d) => d.an > 0) : [];
      const visibleBn = coeffMode !== 'an' ? coeffData.filter((d) => d.bn > 0) : [];

      // Compute reference decay values for domain
      const refVals: number[] = [];
      for (let n = 1; n <= maxN; n++) {
        decayRefs.forEach((r) => {
          const v = r.fn(n);
          if (v > 0 && isFinite(v)) refVals.push(v);
        });
      }

      // Determine y-domain from all visible values
      const allVals = [
        ...visibleAn.map((d) => d.an),
        ...visibleBn.map((d) => d.bn),
        ...refVals,
      ].filter((v) => v > 0 && isFinite(v));

      // Fall back to sensible defaults if no visible data
      const yMinCoeff = allVals.length > 0 ? (d3.min(allVals) as number) : 1e-8;
      const yMaxCoeff = allVals.length > 0 ? (d3.max(allVals) as number) : 10;

      // Expand the log domain slightly for breathing room
      const logMin = yMinCoeff * 0.3;
      const logMax = yMaxCoeff * 3;

      const xScaleC = d3
        .scaleLinear()
        .domain([1, maxN])
        .range([0, panelWidth]);

      const yScaleC = d3
        .scaleLog()
        .domain([Math.max(logMin, 1e-16), logMax])
        .range([panelHeight, 0])
        .clamp(true);

      // Clip path for right panel
      defs
        .append('clipPath')
        .attr('id', 'clip-coeff')
        .append('rect')
        .attr('width', panelWidth)
        .attr('height', panelHeight);

      // Light gridlines
      const xTicksC = xScaleC.ticks(6);
      xTicksC.forEach((t) => {
        rightG
          .append('line')
          .attr('x1', xScaleC(t))
          .attr('x2', xScaleC(t))
          .attr('y1', 0)
          .attr('y2', panelHeight)
          .attr('stroke', '#e5e7eb')
          .attr('stroke-width', 0.5);
      });

      // Horizontal gridlines at log ticks
      const yTicksC = yScaleC.ticks(6);
      yTicksC.forEach((t) => {
        rightG
          .append('line')
          .attr('x1', 0)
          .attr('x2', panelWidth)
          .attr('y1', yScaleC(t))
          .attr('y2', yScaleC(t))
          .attr('stroke', '#e5e7eb')
          .attr('stroke-width', 0.5);
      });

      // Axes
      rightG
        .append('g')
        .attr('transform', `translate(0,${panelHeight})`)
        .call(d3.axisBottom(xScaleC).ticks(6).tickFormat(d3.format('d')))
        .selectAll('text')
        .style('fill', 'var(--color-text-secondary, #6b7280)')
        .style('font-size', '10px');

      rightG
        .append('g')
        .call(
          d3
            .axisLeft(yScaleC)
            .ticks(6, '.0e'),
        )
        .selectAll('text')
        .style('fill', 'var(--color-text-secondary, #6b7280)')
        .style('font-size', '10px');

      const rightClip = rightG.append('g').attr('clip-path', 'url(#clip-coeff)');

      // Reference decay lines
      decayRefs.forEach((ref) => {
        const refPts: { n: number; v: number }[] = [];
        for (let n = 1; n <= maxN; n++) {
          const v = ref.fn(n);
          if (v > 0 && isFinite(v) && v >= logMin) {
            refPts.push({ n, v });
          }
        }
        if (refPts.length < 2) return;

        const refLine = d3
          .line<{ n: number; v: number }>()
          .x((d) => xScaleC(d.n))
          .y((d) => yScaleC(d.v));

        rightClip
          .append('path')
          .datum(refPts)
          .attr('d', refLine)
          .attr('fill', 'none')
          .attr('stroke', ref.color)
          .attr('stroke-width', 1.5)
          .attr('stroke-dasharray', ref.dash)
          .attr('opacity', 0.7);
      });

      // |a_n| circles
      if (coeffMode !== 'bn') {
        visibleAn.forEach((d) => {
          rightClip
            .append('circle')
            .attr('cx', xScaleC(d.n))
            .attr('cy', yScaleC(d.an))
            .attr('r', 3)
            .attr('fill', AN_COLOR)
            .attr('opacity', 0.85);
        });
      }

      // |b_n| circles
      if (coeffMode !== 'an') {
        visibleBn.forEach((d) => {
          rightClip
            .append('circle')
            .attr('cx', xScaleC(d.n))
            .attr('cy', yScaleC(d.bn))
            .attr('r', 3)
            .attr('fill', BN_COLOR)
            .attr('opacity', 0.85);
        });
      }

      // Title
      rightG
        .append('text')
        .attr('x', panelWidth / 2)
        .attr('y', -6)
        .attr('text-anchor', 'middle')
        .attr('font-size', '12px')
        .attr('font-weight', 600)
        .style('fill', 'var(--color-text-primary, #1f2937)')
        .text('|Coefficients| (log scale)');

      // x-axis label
      rightG
        .append('text')
        .attr('x', panelWidth / 2)
        .attr('y', panelHeight + 32)
        .attr('text-anchor', 'middle')
        .attr('font-size', '11px')
        .style('fill', 'var(--color-text-secondary, #6b7280)')
        .text('Harmonic n');

      // y-axis label
      rightG
        .append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -panelHeight / 2)
        .attr('y', -42)
        .attr('text-anchor', 'middle')
        .attr('font-size', '11px')
        .style('fill', 'var(--color-text-secondary, #6b7280)')
        .text('Magnitude');

      // ── Legend (inside right panel) ──

      const legendX = panelWidth - 120;
      const legendY = 10;
      const legendG = rightG.append('g').attr('transform', `translate(${legendX},${legendY})`);
      let row = 0;

      if (coeffMode !== 'bn') {
        legendG
          .append('circle')
          .attr('cx', 0)
          .attr('cy', row * 16)
          .attr('r', 3)
          .attr('fill', AN_COLOR);
        legendG
          .append('text')
          .attr('x', 8)
          .attr('y', row * 16 + 4)
          .attr('font-size', '10px')
          .style('fill', 'var(--color-text-primary, #1f2937)')
          .text('|a\u2099|');
        row++;
      }

      if (coeffMode !== 'an') {
        legendG
          .append('circle')
          .attr('cx', 0)
          .attr('cy', row * 16)
          .attr('r', 3)
          .attr('fill', BN_COLOR);
        legendG
          .append('text')
          .attr('x', 8)
          .attr('y', row * 16 + 4)
          .attr('font-size', '10px')
          .style('fill', 'var(--color-text-primary, #1f2937)')
          .text('|b\u2099|');
        row++;
      }

      decayRefs.forEach((ref) => {
        legendG
          .append('line')
          .attr('x1', -5)
          .attr('x2', 5)
          .attr('y1', row * 16)
          .attr('y2', row * 16)
          .attr('stroke', ref.color)
          .attr('stroke-width', 1.5)
          .attr('stroke-dasharray', ref.dash);
        legendG
          .append('text')
          .attr('x', 8)
          .attr('y', row * 16 + 4)
          .attr('font-size', '10px')
          .style('fill', ref.color)
          .text(ref.label);
        row++;
      });
    },
    [width, preset, coeffData, curveData, coeffMode, maxN, totalHeight, panelWidth, panelHeight, stacked, decayRefs],
  );

  // Determine if observed decay matches the prediction
  const matchLabel = useMemo(() => {
    if (coeffData.length < 10) return 'insufficient data';
    // Compare the last few coefficients to the primary reference
    const primaryRef = decayRefs[decayRefs.length - 1];
    if (!primaryRef) return 'N/A';

    let ratioSum = 0;
    let count = 0;
    for (let i = Math.max(1, coeffData.length - 10); i < coeffData.length; i++) {
      const d = coeffData[i];
      const an = d.an > 0 ? d.an : d.bn;
      if (an <= 0) continue;
      const ref = primaryRef.fn(d.n);
      if (ref <= 0 || !isFinite(ref)) continue;
      ratioSum += an / ref;
      count++;
    }
    if (count === 0) return 'N/A';
    const avgRatio = ratioSum / count;
    if (avgRatio > 2) return 'slower';
    if (avgRatio < 0.1) return 'faster';
    return 'matches';
  }, [coeffData, decayRefs]);

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <svg ref={svgRef} style={{ display: 'block', width: '100%' }} />

      {/* Controls */}
      <div
        className="flex flex-wrap items-center gap-3 py-2 text-sm"
        style={{ color: 'var(--color-text)' }}
      >
        <label className="flex items-center gap-1">
          Function:
          <select
            value={selectedIdx}
            onChange={(e) => {
              setSelectedIdx(Number(e.target.value));
              setCoeffMode('both');
            }}
            className="text-sm rounded px-2 py-1"
            style={{
              background: 'var(--color-surface-alt)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
            }}
          >
            {presets.map((p, i) => (
              <option key={p.name} value={i}>
                {p.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-1">
          Show:
          <select
            value={coeffMode}
            onChange={(e) => setCoeffMode(e.target.value as CoeffMode)}
            className="text-sm rounded px-2 py-1"
            style={{
              background: 'var(--color-surface-alt)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
            }}
          >
            <option value="both">Both a&#x2099; and b&#x2099;</option>
            <option value="an">a&#x2099; only</option>
            <option value="bn">b&#x2099; only</option>
          </select>
        </label>

        <label className="flex items-center gap-1">
          N&#x2098;&#x2090;&#x2093; = {maxN}
          <input
            type="range"
            min={5}
            max={100}
            step={1}
            value={maxN}
            onChange={(e) => setMaxN(Number(e.target.value))}
            className="w-24"
          />
        </label>
      </div>

      {/* Readout */}
      <div
        className="flex flex-wrap gap-4 py-1 pb-2 text-xs font-mono"
        style={{ color: 'var(--color-text-muted)' }}
      >
        <span>
          <strong>Smoothness:</strong> {getSmoothnessLabel(preset)}
        </span>
        <span>
          <strong>Predicted decay:</strong> {preset.decayRate}
        </span>
        <span>
          <strong>Observed:</strong> {matchLabel}
        </span>
      </div>
    </div>
  );
}
