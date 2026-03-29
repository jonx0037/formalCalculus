import { useState, useMemo } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { functionColors } from './shared/colorScales';
import { generateSequence } from './shared/limits';

type Tab = 'monotone' | 'squeeze' | 'algebra';

const margin = { top: 20, right: 30, bottom: 40, left: 50 };
const N_TERMS = 80;

function drawAxes(
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  xScale: d3.ScaleLinear<number, number>,
  yScale: d3.ScaleLinear<number, number>,
  innerW: number,
  innerH: number,
) {
  g.append('g')
    .attr('transform', `translate(0,${innerH})`)
    .call(d3.axisBottom(xScale).ticks(6))
    .call((a) => {
      a.select('.domain').style('stroke', 'var(--color-border)');
      a.selectAll('.tick line').style('stroke', 'var(--color-border)');
      a.selectAll('.tick text').style('fill', 'var(--color-text-muted)').style('font-size', '11px');
    });

  g.append('g')
    .call(d3.axisLeft(yScale).ticks(5))
    .call((a) => {
      a.select('.domain').style('stroke', 'var(--color-border)');
      a.selectAll('.tick line').style('stroke', 'var(--color-border)');
      a.selectAll('.tick text').style('fill', 'var(--color-text-muted)').style('font-size', '11px');
    });
}

export default function ConvergenceTheoremsExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();
  const height = Math.min(width * 0.55, 420);

  const [tab, setTab] = useState<Tab>('monotone');
  const [squeezeWidth, setSqueezeWidth] = useState(0.5);

  // Monotone: a_n = 1 - 1/n (increasing, bounded above by 1)
  const monotoneData = useMemo(
    () => generateSequence((n) => 1 - 1 / n, 1, N_TERMS),
    [],
  );

  // Squeeze: b_n trapped between a_n and c_n
  const squeezeData = useMemo(() => {
    const lower = generateSequence((n) => -squeezeWidth / n, 1, N_TERMS);
    const upper = generateSequence((n) => squeezeWidth / n, 1, N_TERMS);
    const middle = generateSequence(
      (n) => (squeezeWidth * Math.cos(n)) / n,
      1,
      N_TERMS,
    );
    return { lower, upper, middle };
  }, [squeezeWidth]);

  // Algebra: sum and product of 1/n and (n+1)/n
  const algebraData = useMemo(() => {
    const a = generateSequence((n) => 1 / n, 1, N_TERMS); // → 0
    const b = generateSequence((n) => (n + 1) / n, 1, N_TERMS); // → 1
    const sum = generateSequence((n) => 1 / n + (n + 1) / n, 1, N_TERMS); // → 1
    const product = generateSequence((n) => (1 / n) * ((n + 1) / n), 1, N_TERMS); // → 0
    return { a, b, sum, product };
  }, []);

  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (width <= 0 || height <= 0) return;

      const innerW = width - margin.left - margin.right;
      const innerH = height - margin.top - margin.bottom;
      const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
      const xScale = d3.scaleLinear().domain([1, N_TERMS]).range([0, innerW]);

      if (tab === 'monotone') {
        const yScale = d3.scaleLinear().domain([-0.1, 1.15]).range([innerH, 0]);
        drawAxes(g, xScale, yScale, innerW, innerH);

        // Bound line
        g.append('line')
          .attr('x1', 0).attr('x2', innerW)
          .attr('y1', yScale(1)).attr('y2', yScale(1))
          .style('stroke', functionColors[1]).style('stroke-dasharray', '6,4').style('stroke-width', 1.5);

        g.append('text')
          .attr('x', innerW - 4).attr('y', yScale(1) - 6)
          .attr('text-anchor', 'end')
          .style('fill', functionColors[1]).style('font-size', '11px')
          .text('sup = 1');

        // Points
        g.selectAll('.point')
          .data(monotoneData)
          .join('circle')
          .attr('cx', (d) => xScale(d.n))
          .attr('cy', (d) => yScale(d.value))
          .attr('r', 3)
          .style('fill', functionColors[0]).style('opacity', 0.8);
      }

      if (tab === 'squeeze') {
        const yScale = d3.scaleLinear().domain([-squeezeWidth - 0.2, squeezeWidth + 0.2]).range([innerH, 0]);
        drawAxes(g, xScale, yScale, innerW, innerH);

        // Limit line
        g.append('line')
          .attr('x1', 0).attr('x2', innerW)
          .attr('y1', yScale(0)).attr('y2', yScale(0))
          .style('stroke', 'var(--color-border-strong)').style('stroke-dasharray', '4,3');

        // Upper bound line
        const upperLine = d3.line<{ n: number; value: number }>()
          .x((d) => xScale(d.n))
          .y((d) => yScale(d.value));

        g.append('path')
          .datum(squeezeData.upper)
          .attr('d', upperLine)
          .style('fill', 'none')
          .style('stroke', functionColors[1])
          .style('stroke-width', 1.5)
          .style('opacity', 0.6);

        g.append('path')
          .datum(squeezeData.lower)
          .attr('d', upperLine)
          .style('fill', 'none')
          .style('stroke', functionColors[1])
          .style('stroke-width', 1.5)
          .style('opacity', 0.6);

        // Trapped sequence
        g.selectAll('.point')
          .data(squeezeData.middle)
          .join('circle')
          .attr('cx', (d) => xScale(d.n))
          .attr('cy', (d) => yScale(d.value))
          .attr('r', 3)
          .style('fill', functionColors[0]).style('opacity', 0.8);
      }

      if (tab === 'algebra') {
        const yScale = d3.scaleLinear().domain([-0.2, 2.3]).range([innerH, 0]);
        drawAxes(g, xScale, yScale, innerW, innerH);

        const colors = [functionColors[0], functionColors[1], functionColors[2], '#7C3AED'];
        const datasets = [algebraData.a, algebraData.b, algebraData.sum, algebraData.product];
        const labels = ['aₙ = 1/n → 0', 'bₙ = (n+1)/n → 1', 'aₙ + bₙ → 1', 'aₙ · bₙ → 0'];

        datasets.forEach((ds, i) => {
          g.selectAll(`.p${i}`)
            .data(ds)
            .join('circle')
            .attr('cx', (d) => xScale(d.n))
            .attr('cy', (d) => yScale(d.value))
            .attr('r', 2.5)
            .style('fill', colors[i])
            .style('opacity', 0.7);
        });

        // Legend
        labels.forEach((label, i) => {
          g.append('circle')
            .attr('cx', innerW - 130).attr('cy', 10 + i * 16)
            .attr('r', 4).style('fill', colors[i]);
          g.append('text')
            .attr('x', innerW - 122).attr('y', 14 + i * 16)
            .style('fill', 'var(--color-text)').style('font-size', '10px')
            .text(label);
        });
      }
    },
    [tab, width, height, squeezeWidth, monotoneData, squeezeData, algebraData],
  );

  const tabs: { key: Tab; label: string }[] = [
    { key: 'monotone', label: 'Monotone Convergence' },
    { key: 'squeeze', label: 'Squeeze Theorem' },
    { key: 'algebra', label: 'Algebra of Limits' },
  ];

  return (
    <div ref={containerRef} className="w-full my-6">
      <div className="flex gap-1 mb-3">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="px-3 py-1.5 rounded text-xs font-medium transition-colors"
            style={{
              background: tab === t.key ? 'var(--color-primary)' : 'var(--color-surface-alt)',
              color: tab === t.key ? '#fff' : 'var(--color-text)',
              border: '1px solid var(--color-border)',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'squeeze' && (
        <label className="text-sm mb-2 block" style={{ color: 'var(--color-text-muted)' }}>
          Squeeze width: {squeezeWidth.toFixed(1)}
          <input
            type="range"
            min={0.1}
            max={2}
            step={0.1}
            value={squeezeWidth}
            onChange={(e) => setSqueezeWidth(Number(e.target.value))}
            className="ml-2 w-32"
          />
        </label>
      )}

      <svg ref={svgRef} width={width} height={height} />
    </div>
  );
}
