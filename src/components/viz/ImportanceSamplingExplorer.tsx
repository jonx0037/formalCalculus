import { useState, useMemo } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { sampleCurve, finiteYMax } from './shared/plotting';
import { importanceSamplingEstimate } from './shared/measure';
import { getImportanceSamplingScenario } from '../../data/radon-nikodym-data';

// ── Constants ─────────────────────────────────────────────────

const COLOR_P = '#2563EB'; // blue — target P
const COLOR_Q = '#DC2626'; // red — proposal Q
const COLOR_W = '#059669'; // green — weight w(x) = p/q
const COLOR_TRUE = '#6366F1'; // indigo — true E_P[f] horizontal line
const COLOR_TRACE = '#0F172A'; // slate — running estimate trace

const N_SAMPLES_MIN = 10;
const N_SAMPLES_MAX = 5000;

type FKey = 'x' | 'x2' | 'indicatorGt2';

// Module-scope: stable identity, safe to reference inside useMemo
// without including in dep arrays. Hoisted per the React best-practice
// rerender-dependencies rule.
const F_MAP: Record<FKey, (x: number) => number> = {
  x: (x) => x,
  x2: (x) => x * x,
  indicatorGt2: (x) => (x > 2 ? 1 : 0),
};

const F_LABELS: Record<FKey, string> = {
  x: 'f(x) = x',
  x2: 'f(x) = x²',
  indicatorGt2: 'f(x) = 𝟙{x > 2}',
};

interface ScenarioOption {
  id: string;
  label: string;
}

const SCENARIOS: ScenarioOption[] = [
  { id: 'normal-shift', label: 'P = N(0,1) via Q = N(2,1)' },
  { id: 'normal-scale', label: 'P = N(0,1) via Q = N(0, √3)' },
  { id: 'exponential', label: 'P = Exp(1) via Q = Exp(0.5)' },
];

// ── Main component ────────────────────────────────────────────

export default function ImportanceSamplingExplorer() {
  const { ref: containerRef, width: containerWidth } =
    useResizeObserver<HTMLDivElement>();

  const [scenarioId, setScenarioId] = useState<string>('normal-shift');
  const [n, setN] = useState<number>(500);
  const [fKey, setFKey] = useState<FKey>('x2');

  // ── Scenario and computed data ────────────────────────────

  const scenario = useMemo(
    () => getImportanceSamplingScenario(scenarioId),
    [scenarioId],
  );

  const samples = useMemo(
    () => scenario.sampleProposal(n, 42),
    [scenario, n],
  );

  const weights = useMemo(
    () => samples.map((x) => scenario.weight(x)),
    [samples, scenario],
  );

  // F_MAP is module-scope → primitive fKey suffices in deps.
  const estimate = useMemo(
    () => importanceSamplingEstimate(F_MAP[fKey], samples, weights),
    [fKey, samples, weights],
  );

  // Running estimate trace for the convergence panel.
  const runningTrace = useMemo(() => {
    const f = F_MAP[fKey];
    const trace: Array<[number, number]> = [];
    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
      sum += f(samples[i]) * weights[i];
      trace.push([i + 1, sum / (i + 1)]);
    }
    return trace;
  }, [samples, weights, fKey]);

  // Density and weight curves over the proposal's domain.
  const targetCurve = useMemo(
    () => sampleCurve(scenario.targetDensity, scenario.domain, 300),
    [scenario],
  );
  const proposalCurve = useMemo(
    () => sampleCurve(scenario.proposalDensity, scenario.domain, 300),
    [scenario],
  );
  const weightCurve = useMemo(() => {
    // Cap the weight at a finite ceiling so the green curve doesn't blow up
    // in regions where q(x) ≈ 0. The cap value is chosen so the weight
    // function fits inside the density panel's y-axis.
    const raw = sampleCurve(scenario.weight, scenario.domain, 300);
    const cap = 3.0;
    return raw.map(([x, w]) => [x, Math.min(w, cap)] as [number, number]);
  }, [scenario]);

  // ── Layout ────────────────────────────────────────────────

  const stacked = (containerWidth || 0) > 0 && containerWidth < 720;
  const totalWidth = Math.min(containerWidth || 0, 880);
  const totalHeight = stacked ? 720 : 460;
  const panelW = stacked ? totalWidth : totalWidth;
  const panelH = stacked ? 320 : 200;
  const margin = { top: 28, right: 16, bottom: 32, left: 48 };

  const yMaxDensity = useMemo(
    () => Math.min(finiteYMax([targetCurve, proposalCurve, weightCurve]), 4),
    [targetCurve, proposalCurve, weightCurve],
  );

  // y-domain for the convergence trace: pad around the true value
  const trueValue = scenario.trueExpectations[fKey] ?? 0;
  const traceYDomain = useMemo(() => {
    const finite = runningTrace.map(([, y]) => y).filter(Number.isFinite);
    const lo = Math.min(...finite, trueValue);
    const hi = Math.max(...finite, trueValue);
    const pad = Math.max((hi - lo) * 0.15, 0.1);
    return [lo - pad, hi + pad] as [number, number];
  }, [runningTrace, trueValue]);

  // ── D3 render ─────────────────────────────────────────────

  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (!containerWidth || containerWidth === 0) return;

      svg.attr('width', totalWidth).attr('height', totalHeight);

      // ── Panel 1: target/proposal/weight overlay ─────────────
      {
        const innerW = panelW - margin.left - margin.right;
        const innerH = panelH - margin.top - margin.bottom;
        const g = svg
          .append('g')
          .attr('transform', `translate(${margin.left},${margin.top})`);

        const xScale = d3
          .scaleLinear()
          .domain(scenario.domain)
          .range([0, innerW]);
        const yScale = d3
          .scaleLinear()
          .domain([0, yMaxDensity])
          .range([innerH, 0]);

        g.append('text')
          .attr('x', innerW / 2)
          .attr('y', -10)
          .attr('text-anchor', 'middle')
          .style('font-size', '12px')
          .style('font-weight', '600')
          .style('fill', 'var(--color-text)')
          .text('Target p(x), proposal q(x), and weight w(x) = dP/dQ');

        g.append('g')
          .attr('transform', `translate(0,${innerH})`)
          .call(d3.axisBottom(xScale).ticks(6))
          .selectAll('text')
          .style('font-size', '9px')
          .style('fill', 'var(--color-text-muted)');
        g.append('g')
          .call(d3.axisLeft(yScale).ticks(4))
          .selectAll('text')
          .style('font-size', '9px')
          .style('fill', 'var(--color-text-muted)');

        const lineGen = d3
          .line<[number, number]>()
          .x((d) => xScale(d[0]))
          .y((d) => yScale(Math.min(d[1], yMaxDensity)));

        // Order: weight (dashed, behind), proposal (red), target (blue)
        g.append('path')
          .attr('d', lineGen(weightCurve) || '')
          .style('fill', 'none')
          .style('stroke', COLOR_W)
          .style('stroke-width', 1.6)
          .style('stroke-dasharray', '5,3');

        g.append('path')
          .attr('d', lineGen(proposalCurve) || '')
          .style('fill', 'none')
          .style('stroke', COLOR_Q)
          .style('stroke-width', 2.0);

        g.append('path')
          .attr('d', lineGen(targetCurve) || '')
          .style('fill', 'none')
          .style('stroke', COLOR_P)
          .style('stroke-width', 2.0);

        // Legend
        const legendItems = [
          { color: COLOR_P, label: 'p(x) — target', dashed: false },
          { color: COLOR_Q, label: 'q(x) — proposal', dashed: false },
          { color: COLOR_W, label: 'w(x) = p/q', dashed: true },
        ];
        const legend = g
          .append('g')
          .attr('transform', `translate(${innerW - 130},6)`);
        legendItems.forEach((item, i) => {
          legend
            .append('line')
            .attr('x1', 0)
            .attr('y1', i * 14)
            .attr('x2', 18)
            .attr('y2', i * 14)
            .style('stroke', item.color)
            .style('stroke-width', 2)
            .style('stroke-dasharray', item.dashed ? '4,2' : 'none');
          legend
            .append('text')
            .attr('x', 22)
            .attr('y', i * 14 + 3)
            .style('font-size', '9px')
            .style('fill', 'var(--color-text-muted)')
            .text(item.label);
        });
      }

      // ── Panel 2: running estimate convergence ──────────────
      {
        const ox = 0;
        const oy = stacked ? panelH + 24 : panelH + 24;
        const innerW = panelW - margin.left - margin.right;
        const innerH = panelH - margin.top - margin.bottom;
        const g = svg
          .append('g')
          .attr('transform', `translate(${ox + margin.left},${oy + margin.top})`);

        const xScale = d3
          .scaleLog()
          .domain([1, Math.max(samples.length, 2)])
          .range([0, innerW]);
        const yScale = d3
          .scaleLinear()
          .domain(traceYDomain)
          .range([innerH, 0]);

        g.append('text')
          .attr('x', innerW / 2)
          .attr('y', -10)
          .attr('text-anchor', 'middle')
          .style('font-size', '12px')
          .style('font-weight', '600')
          .style('fill', 'var(--color-text)')
          .text(
            `Running estimate Ê_P[${F_LABELS[fKey].replace('f(x) = ', '')}] vs sample size`,
          );

        g.append('g')
          .attr('transform', `translate(0,${innerH})`)
          .call(d3.axisBottom(xScale).ticks(5, '~s'))
          .selectAll('text')
          .style('font-size', '9px')
          .style('fill', 'var(--color-text-muted)');
        g.append('g')
          .call(d3.axisLeft(yScale).ticks(5))
          .selectAll('text')
          .style('font-size', '9px')
          .style('fill', 'var(--color-text-muted)');

        // True value horizontal line
        g.append('line')
          .attr('x1', 0)
          .attr('y1', yScale(trueValue))
          .attr('x2', innerW)
          .attr('y2', yScale(trueValue))
          .style('stroke', COLOR_TRUE)
          .style('stroke-width', 1.5)
          .style('stroke-dasharray', '5,3');
        g.append('text')
          .attr('x', innerW - 4)
          .attr('y', yScale(trueValue) - 4)
          .attr('text-anchor', 'end')
          .style('font-size', '10px')
          .style('font-weight', '600')
          .style('fill', COLOR_TRUE)
          .text(`E_P[${F_LABELS[fKey].replace('f(x) = ', '')}] = ${trueValue.toFixed(3)}`);

        // Running estimate trace
        const lineGen = d3
          .line<[number, number]>()
          .x((d) => xScale(d[0]))
          .y((d) => yScale(d[1]))
          .defined((d) => Number.isFinite(d[1]));

        g.append('path')
          .attr('d', lineGen(runningTrace) || '')
          .style('fill', 'none')
          .style('stroke', COLOR_TRACE)
          .style('stroke-width', 1.6);

        // Final point marker
        if (runningTrace.length > 0) {
          const last = runningTrace[runningTrace.length - 1];
          g.append('circle')
            .attr('cx', xScale(last[0]))
            .attr('cy', yScale(last[1]))
            .attr('r', 4)
            .style('fill', COLOR_TRACE);
        }
      }
    },
    [
      targetCurve,
      proposalCurve,
      weightCurve,
      runningTrace,
      yMaxDensity,
      traceYDomain,
      trueValue,
      samples.length,
      fKey,
      containerWidth,
      stacked,
      panelW,
      panelH,
      totalWidth,
      totalHeight,
    ],
  );

  return (
    <div ref={containerRef} className="flex flex-col items-stretch gap-3 my-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
        <label className="flex items-center gap-2">
          <span style={{ color: 'var(--color-text-muted)' }}>Pair:</span>
          <select
            value={scenarioId}
            onChange={(e) => setScenarioId(e.target.value)}
            className="px-2 py-1 rounded border text-xs"
            style={{
              background: 'var(--color-surface-alt)',
              color: 'var(--color-text)',
              borderColor: 'var(--color-border)',
            }}
            aria-label="ImportanceSamplingExplorer: target/proposal scenario"
          >
            {SCENARIOS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2">
          <span style={{ color: 'var(--color-text-muted)' }}>Integrand:</span>
          <select
            value={fKey}
            onChange={(e) => setFKey(e.target.value as FKey)}
            className="px-2 py-1 rounded border text-xs"
            style={{
              background: 'var(--color-surface-alt)',
              color: 'var(--color-text)',
              borderColor: 'var(--color-border)',
            }}
            aria-label="ImportanceSamplingExplorer: integrand f"
          >
            {(['x', 'x2', 'indicatorGt2'] as FKey[]).map((k) => (
              <option key={k} value={k}>
                {F_LABELS[k]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2">
          <span style={{ color: 'var(--color-text-muted)' }}>n = {n}</span>
          <input
            type="range"
            min={Math.log(N_SAMPLES_MIN)}
            max={Math.log(N_SAMPLES_MAX)}
            step={0.05}
            value={Math.log(n)}
            onChange={(e) => setN(Math.round(Math.exp(parseFloat(e.target.value))))}
            className="w-40"
            aria-label="ImportanceSamplingExplorer: sample size n (log scale)"
          />
        </label>
      </div>

      {/* SVG */}
      <svg
        ref={svgRef}
        className="rounded w-full"
        style={{
          border: '1px solid var(--color-border)',
          background: 'var(--color-viz-bg)',
        }}
        role="img"
        aria-label={`Importance sampling: ${scenarioId}, integrand ${F_LABELS[fKey]}, n=${n}`}
      />

      {/* Verification strip */}
      <div
        className="text-xs text-center px-2"
        style={{ color: 'var(--color-text-muted)' }}
      >
        n = <strong>{n}</strong>, Ê_P[{F_LABELS[fKey].replace('f(x) = ', '')}] ={' '}
        <strong>{estimate.estimate.toFixed(4)}</strong>, true value ={' '}
        <strong style={{ color: COLOR_TRUE }}>{trueValue.toFixed(4)}</strong>, ESS ={' '}
        <strong>{Math.round(estimate.effectiveSampleSize)}</strong> / {n}
      </div>

      <p
        className="text-xs italic max-w-2xl mx-auto text-center"
        style={{ color: 'var(--color-text-muted)' }}
      >
        Estimate E_P[f] using samples from the proposal Q. The importance weight
        w(x) = dP/dQ is a Radon-Nikodym derivative — the function that converts
        integration with respect to Q into integration with respect to P. The
        running estimate (slate) converges toward the true value (indigo dashed)
        as n grows. The effective sample size (ESS) measures how many of the n
        samples are doing meaningful work — an ESS far below n means the proposal
        is poorly matched to the target and most of the variance is concentrated
        in a few high-weight points.
      </p>
    </div>
  );
}
