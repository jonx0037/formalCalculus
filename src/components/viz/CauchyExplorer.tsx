import { useState, useMemo, useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { functionColors } from './shared/colorScales';
import { checkCauchy } from './shared/limits';

const margin = { top: 20, right: 20, bottom: 40, left: 50 };
const MAX_TERMS = 150;

// Partial sums of 1/k^2 (Cauchy — converges to π²/6)
function partialSumInvSquared(n: number): number {
  let sum = 0;
  for (let k = 1; k <= n; k++) sum += 1 / (k * k);
  return sum;
}

// Partial sums of 1/k (harmonic — diverges)
function harmonicPartialSum(n: number): number {
  let sum = 0;
  for (let k = 1; k <= n; k++) sum += 1 / k;
  return sum;
}

interface PanelData {
  title: string;
  fn: (n: number) => number;
  isCauchy: boolean;
  color: string;
}

const panels: PanelData[] = [
  {
    title: 'Cauchy: Σ 1/k²',
    fn: partialSumInvSquared,
    isCauchy: true,
    color: functionColors[0],
  },
  {
    title: 'Not Cauchy: Σ 1/k',
    fn: harmonicPartialSum,
    isCauchy: false,
    color: functionColors[1],
  },
];

export default function CauchyExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();
  const panelWidth = Math.max(200, (width - 24) / 2);
  const panelHeight = Math.min(panelWidth * 0.7, 320);

  const [threshold, setThreshold] = useState(20);

  const cauchyChecks = useMemo(
    () => panels.map((p) => checkCauchy(p.fn, threshold, 40)),
    [threshold],
  );

  const leftRef = useRef<SVGSVGElement>(null);
  const rightRef = useRef<SVGSVGElement>(null);
  const refs = [leftRef, rightRef];

  useEffect(() => {
    panels.forEach((panel, idx) => {
      const svgEl = refs[idx].current;
      if (!svgEl || panelWidth <= 0) return;

      const svg = d3.select(svgEl);
      svg.selectAll('*').remove();

      const innerW = panelWidth - margin.left - margin.right;
      const innerH = panelHeight - margin.top - margin.bottom;
      const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      // Generate data
      const data: { n: number; value: number }[] = [];
      for (let n = 1; n <= MAX_TERMS; n++) {
        data.push({ n, value: panel.fn(n) });
      }

      const xScale = d3.scaleLinear().domain([1, MAX_TERMS]).range([0, innerW]);
      const yExtent = d3.extent(data, (d) => d.value) as [number, number];
      const yPad = (yExtent[1] - yExtent[0]) * 0.1;
      const yScale = d3.scaleLinear().domain([yExtent[0] - yPad, yExtent[1] + yPad]).range([innerH, 0]);

      // Axes
      g.append('g')
        .attr('transform', `translate(0,${innerH})`)
        .call(d3.axisBottom(xScale).ticks(4))
        .call((a) => {
          a.select('.domain').style('stroke', 'var(--color-border)');
          a.selectAll('.tick line').style('stroke', 'var(--color-border)');
          a.selectAll('.tick text').style('fill', 'var(--color-text-muted)').style('font-size', '10px');
        });

      g.append('g')
        .call(d3.axisLeft(yScale).ticks(4))
        .call((a) => {
          a.select('.domain').style('stroke', 'var(--color-border)');
          a.selectAll('.tick line').style('stroke', 'var(--color-border)');
          a.selectAll('.tick text').style('fill', 'var(--color-text-muted)').style('font-size', '10px');
        });

      // N threshold line
      const xN = xScale(threshold);
      g.append('line')
        .attr('x1', xN).attr('x2', xN)
        .attr('y1', 0).attr('y2', innerH)
        .style('stroke', '#059669')
        .style('stroke-dasharray', '4,3')
        .style('stroke-width', 1.5);

      g.append('text')
        .attr('x', xN + 3).attr('y', 12)
        .style('fill', '#059669').style('font-size', '10px')
        .text(`N=${threshold}`);

      // Points
      g.selectAll('.point')
        .data(data)
        .join('circle')
        .attr('cx', (d) => xScale(d.n))
        .attr('cy', (d) => yScale(d.value))
        .attr('r', 2)
        .style('fill', (d) => (d.n >= threshold ? panel.color : 'var(--color-border-strong)'))
        .style('opacity', (d) => (d.n >= threshold ? 0.9 : 0.35));

      // Title
      g.append('text')
        .attr('x', innerW / 2).attr('y', -6)
        .attr('text-anchor', 'middle')
        .style('fill', 'var(--color-text)').style('font-size', '12px').style('font-weight', '600')
        .text(panel.title);
    });
  }, [panelWidth, panelHeight, threshold]);

  return (
    <div ref={containerRef} className="w-full my-6">
      <label className="text-sm mb-3 block" style={{ color: 'var(--color-text-muted)' }}>
        Threshold N: {threshold}
        <input
          type="range"
          min={5}
          max={100}
          value={threshold}
          onChange={(e) => setThreshold(Number(e.target.value))}
          className="ml-2 w-36"
        />
      </label>

      <div className="flex flex-wrap gap-3">
        {panels.map((panel, idx) => (
          <div key={panel.title}>
            <svg ref={refs[idx]} width={panelWidth} height={panelHeight} />
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
              max |a<sub>m</sub> − a<sub>n</sub>| for m,n ≥ {threshold}:{' '}
              <span className="font-mono font-medium" style={{ color: panel.isCauchy ? '#059669' : '#D97706' }}>
                {cauchyChecks[idx].maxGap.toFixed(4)}
              </span>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
