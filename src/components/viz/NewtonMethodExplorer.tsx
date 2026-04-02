import { useState, useMemo, useCallback, type ChangeEvent } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { NEWTON_PRESETS } from '../../data/hessian-data';
import { generateContours } from './shared/multivariate';
import { convergenceColors } from './shared/colorScales';

const margin = { top: 20, right: 16, bottom: 36, left: 42 };
const GAP = 16;

interface OptStep {
  point: [number, number];
  fVal: number;
  gradNorm: number;
}

function runGD(
  preset: (typeof NEWTON_PRESETS)[0],
  start: [number, number],
  eta: number,
  maxSteps: number,
): OptStep[] {
  const steps: OptStep[] = [];
  let [x, y] = start;
  for (let k = 0; k < maxSteps; k++) {
    const fVal = preset.f(x, y);
    const g = preset.grad(x, y);
    const gradNorm = Math.sqrt(g[0] * g[0] + g[1] * g[1]);
    steps.push({ point: [x, y], fVal, gradNorm });
    if (gradNorm < 1e-8) break;
    x -= eta * g[0];
    y -= eta * g[1];
    // Clamp to domain
    x = Math.max(preset.xDomain[0], Math.min(preset.xDomain[1], x));
    y = Math.max(preset.yDomain[0], Math.min(preset.yDomain[1], y));
  }
  return steps;
}

function runNewton(
  preset: (typeof NEWTON_PRESETS)[0],
  start: [number, number],
  maxSteps: number,
): OptStep[] {
  const steps: OptStep[] = [];
  let [x, y] = start;
  for (let k = 0; k < maxSteps; k++) {
    const fVal = preset.f(x, y);
    const g = preset.grad(x, y);
    const gradNorm = Math.sqrt(g[0] * g[0] + g[1] * g[1]);
    steps.push({ point: [x, y], fVal, gradNorm });
    if (gradNorm < 1e-8) break;

    const H = preset.hessian(x, y);
    const det = H[0][0] * H[1][1] - H[0][1] * H[1][0];

    let dx: number, dy: number;
    if (Math.abs(det) < 1e-12) {
      // Fallback to GD step
      dx = -0.01 * g[0];
      dy = -0.01 * g[1];
    } else {
      // Newton step: -H^{-1} grad
      dx = -(H[1][1] * g[0] - H[0][1] * g[1]) / det;
      dy = -(-H[1][0] * g[0] + H[0][0] * g[1]) / det;
    }

    // Damped Newton: halve step if f increases
    let alpha = 1.0;
    for (let backtrack = 0; backtrack < 10; backtrack++) {
      const nx = x + alpha * dx;
      const ny = y + alpha * dy;
      if (preset.f(nx, ny) < fVal + 1e-4) break;
      alpha *= 0.5;
    }

    x += alpha * dx;
    y += alpha * dy;
    x = Math.max(preset.xDomain[0], Math.min(preset.xDomain[1], x));
    y = Math.max(preset.yDomain[0], Math.min(preset.yDomain[1], y));
  }
  return steps;
}

export default function NewtonMethodExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();
  const totalHeight = Math.min(width * 0.45, 380);

  const [selectedIdx, setSelectedIdx] = useState(1); // elliptic by default
  const [startPoint, setStartPoint] = useState<[number, number]>(NEWTON_PRESETS[1].defaultStart);
  const [eta, setEta] = useState(0.05);
  const [maxIter] = useState(50);

  const preset = NEWTON_PRESETS[selectedIdx];

  const handlePresetChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    const idx = Number(e.target.value);
    setSelectedIdx(idx);
    setStartPoint(NEWTON_PRESETS[idx].defaultStart);
    // Adjust learning rate to preset
    setEta(idx === 2 ? 0.001 : idx === 3 ? 0.01 : 0.05);
  }, []);

  // Contour data
  const contours = useMemo(
    () => generateContours(
      (x, y) => preset.f(x, y),
      preset.xDomain,
      preset.yDomain,
      15,
      60,
    ),
    [selectedIdx],
  );

  // Run both optimizers
  const gdSteps = useMemo(
    () => runGD(preset, startPoint, eta, maxIter),
    [selectedIdx, startPoint, eta, maxIter],
  );
  const newtonSteps = useMemo(
    () => runNewton(preset, startPoint, maxIter),
    [selectedIdx, startPoint, maxIter],
  );

  // D3 rendering
  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (width <= 0 || totalHeight <= 0) return;

      const panelW = (width - GAP * 2) / 3 - margin.left - margin.right;
      const panelH = totalHeight - margin.top - margin.bottom;
      if (panelW <= 0 || panelH <= 0) return;

      const colorScale = d3.scaleSequential(d3.interpolateRdYlBu)
        .domain(d3.extent(contours, (c) => c.level) as [number, number]);

      const xScale = d3.scaleLinear().domain(preset.xDomain).range([0, panelW]);
      const yScale = d3.scaleLinear().domain(preset.yDomain).range([panelH, 0]);

      // Helper: draw contours on a panel
      function drawContours(g: d3.Selection<SVGGElement, unknown, null, undefined>) {
        for (const contour of contours) {
          const pts = contour.points;
          for (let k = 0; k < pts.length - 1; k += 2) {
            g.append('line')
              .attr('x1', xScale(pts[k][0]))
              .attr('y1', yScale(pts[k][1]))
              .attr('x2', xScale(pts[k + 1][0]))
              .attr('y2', yScale(pts[k + 1][1]))
              .attr('stroke', colorScale(contour.level))
              .attr('stroke-width', 0.8)
              .attr('opacity', 0.5);
          }
        }
        // Axes
        g.append('g')
          .attr('transform', `translate(0,${panelH})`)
          .call(d3.axisBottom(xScale).ticks(4))
          .selectAll('text').style('font-size', '9px');
        g.append('g')
          .call(d3.axisLeft(yScale).ticks(4))
          .selectAll('text').style('font-size', '9px');
      }

      // Helper: draw trajectory
      function drawTrajectory(
        g: d3.Selection<SVGGElement, unknown, null, undefined>,
        steps: OptStep[],
        color: string,
      ) {
        for (let i = 0; i < steps.length - 1; i++) {
          const [x1, y1] = steps[i].point;
          const [x2, y2] = steps[i + 1].point;
          g.append('line')
            .attr('x1', xScale(x1)).attr('y1', yScale(y1))
            .attr('x2', xScale(x2)).attr('y2', yScale(y2))
            .attr('stroke', color)
            .attr('stroke-width', 1.5)
            .attr('opacity', 0.8);
        }
        // Draw points
        for (let i = 0; i < steps.length; i++) {
          g.append('circle')
            .attr('cx', xScale(steps[i].point[0]))
            .attr('cy', yScale(steps[i].point[1]))
            .attr('r', i === 0 ? 4 : 2.5)
            .attr('fill', i === 0 ? '#fff' : color)
            .attr('stroke', color)
            .attr('stroke-width', i === 0 ? 2 : 0);
        }
        // Minimum marker
        g.append('circle')
          .attr('cx', xScale(preset.minimum[0]))
          .attr('cy', yScale(preset.minimum[1]))
          .attr('r', 5)
          .attr('fill', 'none')
          .attr('stroke', '#059669')
          .attr('stroke-width', 2)
          .attr('stroke-dasharray', '3,2');
      }

      // Panel 1: GD
      const g1 = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
      drawContours(g1);
      drawTrajectory(g1, gdSteps, convergenceColors.linear);
      g1.append('text')
        .attr('x', panelW / 2).attr('y', -6)
        .attr('text-anchor', 'middle')
        .style('font-size', '11px')
        .style('fill', convergenceColors.linear)
        .text(`Gradient Descent (${gdSteps.length} steps)`);

      // Click handler on panel 1
      g1.append('rect')
        .attr('width', panelW).attr('height', panelH)
        .attr('fill', 'transparent').style('cursor', 'crosshair')
        .on('click', (event: MouseEvent) => {
          const [mx, my] = d3.pointer(event);
          setStartPoint([
            Math.max(preset.xDomain[0], Math.min(preset.xDomain[1], xScale.invert(mx))),
            Math.max(preset.yDomain[0], Math.min(preset.yDomain[1], yScale.invert(my))),
          ]);
        });

      // Panel 2: Newton
      const offset2 = panelW + margin.left + margin.right + GAP;
      const g2 = svg.append('g')
        .attr('transform', `translate(${offset2 + margin.left},${margin.top})`);
      drawContours(g2);
      drawTrajectory(g2, newtonSteps, convergenceColors.quadratic);
      g2.append('text')
        .attr('x', panelW / 2).attr('y', -6)
        .attr('text-anchor', 'middle')
        .style('font-size', '11px')
        .style('fill', convergenceColors.quadratic)
        .text(`Newton's Method (${newtonSteps.length} steps)`);

      // Panel 3: Convergence curves
      const offset3 = 2 * (panelW + margin.left + margin.right + GAP);
      const g3 = svg.append('g')
        .attr('transform', `translate(${offset3 + margin.left},${margin.top})`);

      const maxK = Math.max(gdSteps.length, newtonSteps.length, 2);
      const allF = [...gdSteps.map((s) => s.fVal), ...newtonSteps.map((s) => s.fVal)].filter((v) => v > 0);
      const fMin = Math.max(Math.min(...allF), 1e-16);
      const fMax = Math.max(...allF, 1);

      const kScale = d3.scaleLinear().domain([0, maxK]).range([0, panelW]);
      const fScale = d3.scaleLog().domain([fMin, fMax]).range([panelH, 0]).clamp(true);

      g3.append('g')
        .attr('transform', `translate(0,${panelH})`)
        .call(d3.axisBottom(kScale).ticks(5))
        .selectAll('text').style('font-size', '9px');
      g3.append('g')
        .call(d3.axisLeft(fScale).ticks(4, '.0e'))
        .selectAll('text').style('font-size', '9px');

      // GD convergence curve
      const gdLine = d3.line<OptStep>()
        .x((_, i) => kScale(i))
        .y((d) => fScale(Math.max(d.fVal, fMin)))
        .defined((d) => d.fVal > 0);
      g3.append('path')
        .datum(gdSteps)
        .attr('d', gdLine)
        .attr('fill', 'none')
        .attr('stroke', convergenceColors.linear)
        .attr('stroke-width', 2);

      // Newton convergence curve
      const newtonLine = d3.line<OptStep>()
        .x((_, i) => kScale(i))
        .y((d) => fScale(Math.max(d.fVal, fMin)))
        .defined((d) => d.fVal > 0);
      g3.append('path')
        .datum(newtonSteps)
        .attr('d', newtonLine)
        .attr('fill', 'none')
        .attr('stroke', convergenceColors.quadratic)
        .attr('stroke-width', 2);

      // Legend
      const legendY = 10;
      g3.append('line').attr('x1', 5).attr('x2', 20).attr('y1', legendY).attr('y2', legendY)
        .attr('stroke', convergenceColors.linear).attr('stroke-width', 2);
      g3.append('text').attr('x', 24).attr('y', legendY + 4)
        .style('font-size', '9px').style('fill', 'var(--color-text-secondary, #6B7280)')
        .text('GD');
      g3.append('line').attr('x1', 45).attr('x2', 60).attr('y1', legendY).attr('y2', legendY)
        .attr('stroke', convergenceColors.quadratic).attr('stroke-width', 2);
      g3.append('text').attr('x', 64).attr('y', legendY + 4)
        .style('font-size', '9px').style('fill', 'var(--color-text-secondary, #6B7280)')
        .text('Newton');

      g3.append('text')
        .attr('x', panelW / 2).attr('y', -6)
        .attr('text-anchor', 'middle')
        .style('font-size', '11px')
        .style('fill', 'var(--color-text-secondary, #6B7280)')
        .text('f(xₖ) vs iteration (log scale)');
    },
    [width, totalHeight, selectedIdx, startPoint, eta, maxIter, contours, gdSteps, newtonSteps],
  );

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.75rem', alignItems: 'center', fontSize: '0.85rem' }}>
        <label>
          Function:{' '}
          <select value={selectedIdx} onChange={handlePresetChange} style={{ fontSize: '0.85rem' }}>
            {NEWTON_PRESETS.map((p, i) => (
              <option key={p.name} value={i}>{p.label}</option>
            ))}
          </select>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          GD step size η:
          <input
            type="range" min={0.001} max={0.2} step={0.001} value={eta}
            onChange={(e) => setEta(Number(e.target.value))}
            style={{ width: '80px' }}
          />
          {eta.toFixed(3)}
        </label>
        <span style={{ color: 'var(--color-text-secondary, #6B7280)' }}>
          Click left panel to set start point | κ ≈ {preset.conditionNumber}
        </span>
      </div>

      <svg ref={svgRef} style={{ width: '100%', height: totalHeight }} />
    </div>
  );
}
