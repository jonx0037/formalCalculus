import { useState, useMemo } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { sampleCurve } from './shared/plotting';
import { getConditionalExpectationScenario } from '../../data/radon-nikodym-data';

// ── Constants ─────────────────────────────────────────────────

const CURVE_COLOR = '#FCD34D'; // amber — E[Y | X] curve over the heatmap
const SLICE_COLOR = '#FFFFFF'; // white — slice indicators
const ACCENT_COLOR = '#4F46E5'; // indigo — secondary elements
const GRID_RES = 60;
const CURVE_SAMPLES = 200;

type ViewKey = 'slice' | 'projection' | 'rn';

interface ScenarioOption {
  id: string;
  label: string;
}

const SCENARIOS: ScenarioOption[] = [
  { id: 'bivariate-normal', label: 'Bivariate Normal (truncated)' },
  { id: 'beta-conditional', label: 'X ~ Uniform, Y | X ~ Beta(X+1, 3−X)' },
  { id: 'independent-uniform', label: 'X, Y i.i.d. Uniform(0,1)' },
];

const SLICE_X_VALUES = [0.2, 0.35, 0.5, 0.65, 0.8];

// ── Helpers (module scope — stable identity) ──────────────────

/**
 * Numerical conditional expectation E_num[Y | X = x] via trapezoidal
 * integration of the joint density along the slice {X = x}, y ∈ yDomain.
 *
 * Returns { mean, normalization, marginalAtX }. Used by the R-N view to
 * display the explicit numerator/denominator integrals.
 */
function numericalConditional(
  jointDensity: (x: number, y: number) => number,
  x: number,
  yDomain: [number, number],
  steps: number = 200,
): { mean: number; numerator: number; denominator: number } {
  const [y0, y1] = yDomain;
  const h = (y1 - y0) / steps;
  let num = 0; // ∫ y · p(x, y) dy
  let den = 0; // ∫ p(x, y) dy = p_X(x)
  for (let i = 0; i <= steps; i++) {
    const y = y0 + i * h;
    const w = i === 0 || i === steps ? 0.5 : 1; // trapezoidal endpoints
    const p = jointDensity(x, y);
    num += w * y * p;
    den += w * p;
  }
  num *= h;
  den *= h;
  const mean = den > 0 ? num / den : 0;
  return { mean, numerator: num, denominator: den };
}

/**
 * Compute the L² error ||Y − g(X)||² for a candidate predictor g, by
 * Monte-Carlo-style integration: ∫∫ (y − g(x))² p(x, y) dx dy on the
 * domain rectangle. Used by the projection view to compare the optimal
 * predictor g* = E[Y | X] against a constant baseline g(x) = E[Y].
 */
function l2Error(
  jointDensity: (x: number, y: number) => number,
  predictor: (x: number) => number,
  xDomain: [number, number],
  yDomain: [number, number],
  nGrid: number = 50,
): number {
  const [x0, x1] = xDomain;
  const [y0, y1] = yDomain;
  const dx = (x1 - x0) / nGrid;
  const dy = (y1 - y0) / nGrid;
  let sum = 0;
  for (let i = 0; i < nGrid; i++) {
    const x = x0 + (i + 0.5) * dx;
    const gX = predictor(x);
    for (let j = 0; j < nGrid; j++) {
      const y = y0 + (j + 0.5) * dy;
      const p = jointDensity(x, y);
      const e = y - gX;
      sum += e * e * p;
    }
  }
  return sum * dx * dy;
}

/**
 * Compute E[Y] = ∫∫ y · p(x, y) dx dy on the domain rectangle. Used as
 * the constant baseline predictor for the L² projection view.
 */
function unconditionalMean(
  jointDensity: (x: number, y: number) => number,
  xDomain: [number, number],
  yDomain: [number, number],
  nGrid: number = 80,
): number {
  const [x0, x1] = xDomain;
  const [y0, y1] = yDomain;
  const dx = (x1 - x0) / nGrid;
  const dy = (y1 - y0) / nGrid;
  let num = 0;
  let den = 0;
  for (let i = 0; i < nGrid; i++) {
    const x = x0 + (i + 0.5) * dx;
    for (let j = 0; j < nGrid; j++) {
      const y = y0 + (j + 0.5) * dy;
      const p = jointDensity(x, y);
      num += y * p;
      den += p;
    }
  }
  return den > 0 ? num / den : 0;
}

// ── Main component ────────────────────────────────────────────

export default function ConditionalExpectationExplorer() {
  const { ref: containerRef, width: containerWidth } =
    useResizeObserver<HTMLDivElement>();

  const [scenarioId, setScenarioId] = useState<string>('bivariate-normal');
  const [view, setView] = useState<ViewKey>('slice');
  const [xSlice, setXSlice] = useState<number>(0.65);

  // ── Scenario and derived data ─────────────────────────────

  const scenario = useMemo(
    () => getConditionalExpectationScenario(scenarioId),
    [scenarioId],
  );

  // Heatmap grid: GRID_RES × GRID_RES cells of joint density values.
  const grid = useMemo(() => {
    const N = GRID_RES;
    const [x0, x1] = scenario.xDomain;
    const [y0, y1] = scenario.yDomain;
    const cells: Array<{ x: number; y: number; value: number }> = [];
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        const x = x0 + ((i + 0.5) / N) * (x1 - x0);
        const y = y0 + ((j + 0.5) / N) * (y1 - y0);
        cells.push({ x, y, value: scenario.jointDensity(x, y) });
      }
    }
    return cells;
  }, [scenario]);

  // Single source of truth: the conditional-mean curve. Used in ALL three
  // views — that's the whole pedagogical point of the toggle.
  const ceCurve = useMemo(
    () => sampleCurve(scenario.conditionalMean, scenario.xDomain, CURVE_SAMPLES),
    [scenario],
  );

  // Unconditional mean E[Y] for the L² projection comparison.
  const eY = useMemo(
    () => unconditionalMean(scenario.jointDensity, scenario.xDomain, scenario.yDomain),
    [scenario],
  );

  // L² errors for the projection view (only computed when needed).
  const projectionErrors = useMemo(() => {
    if (view !== 'projection') return null;
    const optimal = l2Error(
      scenario.jointDensity,
      scenario.conditionalMean,
      scenario.xDomain,
      scenario.yDomain,
    );
    const constant = l2Error(
      scenario.jointDensity,
      () => eY,
      scenario.xDomain,
      scenario.yDomain,
    );
    return { optimal, constant };
  }, [view, scenario, eY]);

  // Numerical conditional at the user-selected x-slice (R-N view).
  const rnReadout = useMemo(() => {
    if (view !== 'rn') return null;
    const result = numericalConditional(
      scenario.jointDensity,
      xSlice,
      scenario.yDomain,
    );
    return {
      ...result,
      analytical: scenario.conditionalMean(xSlice),
    };
  }, [view, scenario, xSlice]);

  // ── Layout ────────────────────────────────────────────────

  const stacked = (containerWidth || 0) > 0 && containerWidth < 760;
  const totalWidth = Math.min(containerWidth || 0, 920);
  const totalHeight = stacked ? 820 : 480;
  const heatmapW = stacked ? totalWidth : Math.floor(totalWidth * 0.58);
  const sideW = stacked ? totalWidth : totalWidth - heatmapW;
  const panelH = stacked ? 380 : totalHeight - 40;
  const margin = { top: 32, right: 16, bottom: 36, left: 48 };

  // Color domain for heatmap — capped at 95th percentile to keep contrast.
  const colorDomain = useMemo(() => {
    const finite = grid.map((c) => c.value).filter(Number.isFinite);
    finite.sort((a, b) => a - b);
    const lo = finite[0] ?? 0;
    const hi95 = finite[Math.floor(finite.length * 0.95)] ?? finite[finite.length - 1] ?? 1;
    return [Math.max(0, lo), Math.max(hi95, 1e-3)] as [number, number];
  }, [grid]);

  // ── D3 render ─────────────────────────────────────────────

  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (!containerWidth || containerWidth === 0) return;

      svg.attr('width', totalWidth).attr('height', totalHeight);

      // ── Panel 1: heatmap with E[Y | X] overlay ─────────────
      {
        const innerW = heatmapW - margin.left - margin.right;
        const innerH = panelH - margin.top - margin.bottom;
        const cellW = innerW / GRID_RES;
        const cellH = innerH / GRID_RES;

        const g = svg
          .append('g')
          .attr('transform', `translate(${margin.left},${margin.top})`);

        const xScale = d3
          .scaleLinear()
          .domain(scenario.xDomain)
          .range([0, innerW]);
        const yScale = d3
          .scaleLinear()
          .domain(scenario.yDomain)
          .range([innerH, 0]);

        const colorScale = d3
          .scaleSequential<string>(d3.interpolateViridis)
          .domain(colorDomain);

        // Title
        g.append('text')
          .attr('x', innerW / 2)
          .attr('y', -12)
          .attr('text-anchor', 'middle')
          .style('font-size', '12px')
          .style('font-weight', '600')
          .style('fill', 'var(--color-text)')
          .text('Joint density p(x, y) with E[Y | X = x] (amber)');

        // Axes
        g.append('g')
          .attr('transform', `translate(0,${innerH})`)
          .call(d3.axisBottom(xScale).ticks(5))
          .selectAll('text')
          .style('font-size', '9px')
          .style('fill', 'var(--color-text-muted)');
        g.append('g')
          .call(d3.axisLeft(yScale).ticks(5))
          .selectAll('text')
          .style('font-size', '9px')
          .style('fill', 'var(--color-text-muted)');

        // Heatmap cells
        g.selectAll('rect.cell')
          .data(grid)
          .enter()
          .append('rect')
          .attr('class', 'cell')
          .attr('x', (d) => xScale(d.x) - cellW / 2)
          .attr('y', (d) => yScale(d.y) - cellH / 2)
          .attr('width', cellW + 0.6)
          .attr('height', cellH + 0.6)
          .style('fill', (d) => {
            if (!Number.isFinite(d.value)) return '#222';
            const v = Math.max(colorDomain[0], Math.min(colorDomain[1], d.value));
            return colorScale(v);
          });

        // E[Y | X] curve overlay (amber, thick) — same in every view
        const lineGen = d3
          .line<[number, number]>()
          .x((d) => xScale(d[0]))
          .y((d) => yScale(d[1]));

        g.append('path')
          .attr('d', lineGen(ceCurve) || '')
          .style('fill', 'none')
          .style('stroke', CURVE_COLOR)
          .style('stroke-width', 3.0)
          .style('stroke-linecap', 'round');

        // View-specific overlays on top of the heatmap
        if (view === 'slice') {
          // Vertical slice indicators with mean markers (white).
          for (const xs of SLICE_X_VALUES) {
            if (xs < scenario.xDomain[0] || xs > scenario.xDomain[1]) continue;
            const meanY = scenario.conditionalMean(xs);
            const xPx = xScale(xs);
            g.append('line')
              .attr('x1', xPx)
              .attr('y1', 0)
              .attr('x2', xPx)
              .attr('y2', innerH)
              .style('stroke', SLICE_COLOR)
              .style('stroke-width', 1.0)
              .style('stroke-dasharray', '3,3')
              .style('opacity', 0.6);
            g.append('circle')
              .attr('cx', xPx)
              .attr('cy', yScale(meanY))
              .attr('r', 4)
              .style('fill', SLICE_COLOR)
              .style('stroke', '#0F172A')
              .style('stroke-width', 1.0);
          }
        } else if (view === 'projection') {
          // Horizontal line at y = E[Y] (the constant baseline predictor).
          g.append('line')
            .attr('x1', 0)
            .attr('y1', yScale(eY))
            .attr('x2', innerW)
            .attr('y2', yScale(eY))
            .style('stroke', SLICE_COLOR)
            .style('stroke-width', 1.5)
            .style('stroke-dasharray', '5,4')
            .style('opacity', 0.85);

          g.append('text')
            .attr('x', innerW - 4)
            .attr('y', yScale(eY) - 6)
            .attr('text-anchor', 'end')
            .style('font-size', '10px')
            .style('font-weight', '600')
            .style('fill', SLICE_COLOR)
            .text(`g(x) = E[Y] = ${eY.toFixed(3)}`);
        } else if (view === 'rn') {
          // Single vertical slice at xSlice; numerator/denominator readout
          // appears in the side panel.
          const xPx = xScale(xSlice);
          g.append('line')
            .attr('x1', xPx)
            .attr('y1', 0)
            .attr('x2', xPx)
            .attr('y2', innerH)
            .style('stroke', SLICE_COLOR)
            .style('stroke-width', 2.0)
            .style('opacity', 0.9);
          if (rnReadout) {
            g.append('circle')
              .attr('cx', xPx)
              .attr('cy', yScale(rnReadout.analytical))
              .attr('r', 5)
              .style('fill', SLICE_COLOR)
              .style('stroke', '#0F172A')
              .style('stroke-width', 1.2);
          }
        }
      }

      // ── Panel 2: side panel (changes per view) ─────────────
      {
        const ox = stacked ? 0 : heatmapW;
        const oy = stacked ? panelH + 30 : 0;
        const innerW = sideW - margin.left - margin.right;
        const innerH = panelH - margin.top - margin.bottom;
        const g = svg
          .append('g')
          .attr('transform', `translate(${ox + margin.left},${oy + margin.top})`);

        if (view === 'slice') {
          // Title
          g.append('text')
            .attr('x', innerW / 2)
            .attr('y', -12)
            .attr('text-anchor', 'middle')
            .style('font-size', '12px')
            .style('font-weight', '600')
            .style('fill', 'var(--color-text)')
            .text('Slice means → connect them → that\'s E[Y | X]');

          // Bar chart of conditional means at the slice positions
          const xScale = d3
            .scaleBand<string>()
            .domain(SLICE_X_VALUES.map((x) => x.toFixed(2)))
            .range([0, innerW])
            .padding(0.18);
          const yScale = d3
            .scaleLinear()
            .domain(scenario.yDomain)
            .range([innerH, 0]);

          g.append('g')
            .attr('transform', `translate(0,${innerH})`)
            .call(d3.axisBottom(xScale))
            .selectAll('text')
            .style('font-size', '9px')
            .style('fill', 'var(--color-text-muted)');
          g.append('g')
            .call(d3.axisLeft(yScale).ticks(5))
            .selectAll('text')
            .style('font-size', '9px')
            .style('fill', 'var(--color-text-muted)');

          g.selectAll('rect.bar')
            .data(SLICE_X_VALUES)
            .enter()
            .append('rect')
            .attr('class', 'bar')
            .attr('x', (d) => xScale(d.toFixed(2)) ?? 0)
            .attr('y', (d) => yScale(scenario.conditionalMean(d)))
            .attr('width', xScale.bandwidth())
            .attr('height', (d) => innerH - yScale(scenario.conditionalMean(d)))
            .style('fill', CURVE_COLOR)
            .style('opacity', 0.85);

          // Connect bar tops with the same amber curve to make the
          // connection to the heatmap overlay visually obvious.
          const linePoints: [number, number][] = SLICE_X_VALUES.map((x) => [
            (xScale(x.toFixed(2)) ?? 0) + xScale.bandwidth() / 2,
            yScale(scenario.conditionalMean(x)),
          ]);
          const path = d3
            .line<[number, number]>()
            .x((d) => d[0])
            .y((d) => d[1]);
          g.append('path')
            .attr('d', path(linePoints) || '')
            .style('fill', 'none')
            .style('stroke', CURVE_COLOR)
            .style('stroke-width', 2.0)
            .style('stroke-dasharray', '4,3');
        } else if (view === 'projection') {
          // Bar chart comparing L² error of constant predictor vs. E[Y | X]
          g.append('text')
            .attr('x', innerW / 2)
            .attr('y', -12)
            .attr('text-anchor', 'middle')
            .style('font-size', '12px')
            .style('font-weight', '600')
            .style('fill', 'var(--color-text)')
            .text('||Y − g(X)||² for two predictors');

          if (projectionErrors) {
            const data = [
              { label: 'g(x) = E[Y]', value: projectionErrors.constant, color: '#94A3B8' },
              { label: 'g(x) = E[Y | X]', value: projectionErrors.optimal, color: CURVE_COLOR },
            ];
            const xScale = d3
              .scaleBand<string>()
              .domain(data.map((d) => d.label))
              .range([0, innerW])
              .padding(0.3);
            const yMax = Math.max(projectionErrors.constant, projectionErrors.optimal) * 1.18;
            const yScale = d3.scaleLinear().domain([0, yMax]).range([innerH, 0]);

            g.append('g')
              .attr('transform', `translate(0,${innerH})`)
              .call(d3.axisBottom(xScale))
              .selectAll('text')
              .style('font-size', '10px')
              .style('fill', 'var(--color-text-muted)');
            g.append('g')
              .call(d3.axisLeft(yScale).ticks(4))
              .selectAll('text')
              .style('font-size', '9px')
              .style('fill', 'var(--color-text-muted)');

            g.selectAll('rect.bar')
              .data(data)
              .enter()
              .append('rect')
              .attr('class', 'bar')
              .attr('x', (d) => xScale(d.label) ?? 0)
              .attr('y', (d) => yScale(d.value))
              .attr('width', xScale.bandwidth())
              .attr('height', (d) => innerH - yScale(d.value))
              .style('fill', (d) => d.color)
              .style('opacity', 0.9);

            g.selectAll('text.barlabel')
              .data(data)
              .enter()
              .append('text')
              .attr('class', 'barlabel')
              .attr('x', (d) => (xScale(d.label) ?? 0) + xScale.bandwidth() / 2)
              .attr('y', (d) => yScale(d.value) - 6)
              .attr('text-anchor', 'middle')
              .style('font-size', '11px')
              .style('font-weight', '600')
              .style('fill', 'var(--color-text)')
              .text((d) => d.value.toFixed(4));
          }
        } else if (view === 'rn') {
          // Conditional density slice p(x_0, y) / p_X(x_0) as a function of y
          g.append('text')
            .attr('x', innerW / 2)
            .attr('y', -12)
            .attr('text-anchor', 'middle')
            .style('font-size', '12px')
            .style('font-weight', '600')
            .style('fill', 'var(--color-text)')
            .text(`Conditional density p(y | X = ${xSlice.toFixed(2)})`);

          if (rnReadout && rnReadout.denominator > 0) {
            const yPoints = sampleCurve(
              (y) => scenario.jointDensity(xSlice, y) / rnReadout.denominator,
              scenario.yDomain,
              200,
            );
            const ySlice = d3
              .scaleLinear()
              .domain(scenario.yDomain)
              .range([0, innerW]);
            const condYMax = Math.max(...yPoints.map(([, v]) => v).filter(Number.isFinite));
            const dScale = d3
              .scaleLinear()
              .domain([0, condYMax * 1.15 || 1])
              .range([innerH, 0]);

            g.append('g')
              .attr('transform', `translate(0,${innerH})`)
              .call(d3.axisBottom(ySlice).ticks(5))
              .selectAll('text')
              .style('font-size', '9px')
              .style('fill', 'var(--color-text-muted)');
            g.append('g')
              .call(d3.axisLeft(dScale).ticks(4))
              .selectAll('text')
              .style('font-size', '9px')
              .style('fill', 'var(--color-text-muted)');

            const lineGen = d3
              .line<[number, number]>()
              .x((d) => ySlice(d[0]))
              .y((d) => dScale(d[1]));

            g.append('path')
              .attr('d', lineGen(yPoints) || '')
              .style('fill', 'none')
              .style('stroke', ACCENT_COLOR)
              .style('stroke-width', 2.0);

            // Vertical line at the conditional mean
            g.append('line')
              .attr('x1', ySlice(rnReadout.analytical))
              .attr('y1', 0)
              .attr('x2', ySlice(rnReadout.analytical))
              .attr('y2', innerH)
              .style('stroke', CURVE_COLOR)
              .style('stroke-width', 2.0);
          }
        }
      }
    },
    [
      grid,
      ceCurve,
      view,
      xSlice,
      colorDomain,
      eY,
      projectionErrors,
      rnReadout,
      scenario,
      containerWidth,
      stacked,
      heatmapW,
      sideW,
      panelH,
      totalWidth,
      totalHeight,
    ],
  );

  // ── Verification text (R-N view only) ──────────────────────

  const verification =
    view === 'rn' && rnReadout ? (
      <span>
        E[Y | X = {xSlice.toFixed(2)}]: numerator ∫ y·p(x, y) dy ={' '}
        <strong>{rnReadout.numerator.toFixed(4)}</strong>, denominator ∫ p(x, y) dy ={' '}
        <strong>{rnReadout.denominator.toFixed(4)}</strong>, ratio ={' '}
        <strong style={{ color: CURVE_COLOR }}>{rnReadout.mean.toFixed(4)}</strong>
        ; closed form ={' '}
        <strong>{rnReadout.analytical.toFixed(4)}</strong>
      </span>
    ) : view === 'projection' && projectionErrors ? (
      <span>
        ||Y − E[Y]||² = <strong>{projectionErrors.constant.toFixed(4)}</strong>;
        ||Y − E[Y | X]||² ={' '}
        <strong style={{ color: CURVE_COLOR }}>{projectionErrors.optimal.toFixed(4)}</strong>
        {' '}— the conditional expectation is the closest function of X (in L²) to Y.
      </span>
    ) : (
      <span>
        The amber curve is E[Y | X = x]. In the slice view, dots mark the mean
        of each vertical slice — connecting them gives the curve. Toggle the
        views to see this same curve as an L² projection or as an R-N derivative.
      </span>
    );

  return (
    <div ref={containerRef} className="flex flex-col items-stretch gap-3 my-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
        <label className="flex items-center gap-2">
          <span style={{ color: 'var(--color-text-muted)' }}>Distribution:</span>
          <select
            value={scenarioId}
            onChange={(e) => setScenarioId(e.target.value)}
            className="px-2 py-1 rounded border text-xs"
            style={{
              background: 'var(--color-surface-alt)',
              color: 'var(--color-text)',
              borderColor: 'var(--color-border)',
            }}
            aria-label="ConditionalExpectationExplorer: joint distribution scenario"
          >
            {SCENARIOS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        <div
          role="group"
          aria-label="ConditionalExpectationExplorer: view mode"
          className="flex rounded overflow-hidden border"
          style={{ borderColor: 'var(--color-border)' }}
        >
          {(
            [
              { id: 'slice', label: 'Slice averaging' },
              { id: 'projection', label: 'L² projection' },
              { id: 'rn', label: 'R-N derivative' },
            ] as Array<{ id: ViewKey; label: string }>
          ).map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setView(v.id)}
              className="px-3 py-1 text-xs"
              style={{
                background:
                  view === v.id ? CURVE_COLOR : 'var(--color-surface-alt)',
                color:
                  view === v.id ? '#0F172A' : 'var(--color-text)',
                fontWeight: view === v.id ? 600 : 400,
                borderRight: '1px solid var(--color-border)',
              }}
              aria-pressed={view === v.id}
              aria-label={`ConditionalExpectationExplorer: ${v.id} view`}
            >
              {v.label}
            </button>
          ))}
        </div>

        {view === 'rn' && (
          <label className="flex items-center gap-2">
            <span style={{ color: 'var(--color-text-muted)' }}>
              x₀ = {xSlice.toFixed(2)}
            </span>
            <input
              type="range"
              min={scenario.xDomain[0] + 0.02}
              max={scenario.xDomain[1] - 0.02}
              step={0.01}
              value={xSlice}
              onChange={(e) => setXSlice(parseFloat(e.target.value))}
              className="w-32"
              aria-label="ConditionalExpectationExplorer: slice position x₀"
            />
          </label>
        )}
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
        aria-label={`Conditional expectation visualization, ${view} view, scenario ${scenarioId}`}
      />

      {/* Verification strip */}
      <div
        className="text-xs text-center px-2"
        style={{ color: 'var(--color-text-muted)' }}
      >
        {verification}
      </div>

      <p
        className="text-xs italic max-w-2xl mx-auto text-center"
        style={{ color: 'var(--color-text-muted)' }}
      >
        Toggle the three views to see one curve from three angles. <strong>Slice averaging</strong>:
        cut the joint density into vertical slices, average Y in each slice, and
        connect the means. <strong>L² projection</strong>: this is the closest
        function of X (in mean-squared error) to Y. <strong>R-N derivative</strong>:
        E[Y | X = x] is the Radon-Nikodym derivative of ν(A) = ∫_A Y dP with
        respect to P, restricted to the σ-algebra generated by X. The amber
        curve is the same in every view — that&apos;s the whole point.
      </p>
    </div>
  );
}
