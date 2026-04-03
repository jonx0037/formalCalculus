import { useState, useMemo, useCallback, type ChangeEvent } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { POLAR_INTEGRAL_PRESETS } from '../../data/change-of-variables-data';
import { polarIntegral } from './shared/integration';
import { functionColors, regionColors } from './shared/colorScales';

const margin = { top: 20, right: 16, bottom: 36, left: 42 };
const GAP = 24;

export default function PolarIntegralExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();
  const totalHeight = Math.min(width * 0.55, 460);

  const [presetIdx, setPresetIdx] = useState(0);
  const [nPartitions, setNPartitions] = useState(10);
  const [viewMode, setViewMode] = useState<'both' | 'cartesian' | 'polar'>('both');

  const preset = POLAR_INTEGRAL_PRESETS[presetIdx];

  const handlePresetChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    setPresetIdx(Number(e.target.value));
  }, []);

  // Compute polar Riemann sum
  const polarResult = useMemo(
    () => polarIntegral(preset.fPolar, preset.region.rRange, preset.region.thetaRange, nPartitions, nPartitions),
    [presetIdx, nPartitions],
  );

  const error = Math.abs(polarResult - preset.exactValue);

  // Generate polar grid cells for visualization
  const polarCells = useMemo(() => {
    const { rRange, thetaRange } = preset.region;
    const dr = (rRange[1] - rRange[0]) / nPartitions;
    const dtheta = (thetaRange[1] - thetaRange[0]) / nPartitions;
    const cells: Array<{
      rLo: number; rHi: number; thetaLo: number; thetaHi: number;
      fVal: number; rMid: number; thetaMid: number;
    }> = [];

    for (let i = 0; i < nPartitions; i++) {
      const rLo = rRange[0] + i * dr;
      const rHi = rLo + dr;
      const rMid = rLo + dr / 2;
      for (let j = 0; j < nPartitions; j++) {
        const thetaLo = thetaRange[0] + j * dtheta;
        const thetaHi = thetaLo + dtheta;
        const thetaMid = thetaLo + dtheta / 2;
        cells.push({ rLo, rHi, thetaLo, thetaHi, fVal: preset.fPolar(rMid, thetaMid), rMid, thetaMid });
      }
    }
    return cells;
  }, [presetIdx, nPartitions]);

  // D3 rendering
  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      if (width < 100) return;
      svg.selectAll('*').remove();

      const showLeft = viewMode !== 'polar';
      const showRight = viewMode !== 'cartesian';
      const numPanels = showLeft && showRight ? 2 : 1;
      const panelW = (width - (numPanels > 1 ? GAP : 0)) / numPanels - margin.left - margin.right;
      const panelH = totalHeight - margin.top - margin.bottom;
      if (panelW < 50 || panelH < 50) return;

      const rMax = preset.region.rRange[1];

      // Color scale for function values
      const fMax = Math.max(...polarCells.map(c => Math.abs(c.fVal)), 0.01);
      const colorScale = d3.scaleSequential(d3.interpolateYlOrRd).domain([0, fMax]);

      // --- Left panel: Cartesian view of the region ---
      if (showLeft) {
        const gLeft = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
        const bound = rMax * 1.2;
        const xScale = d3.scaleLinear().domain([-bound, bound]).range([0, panelW]);
        const yScale = d3.scaleLinear().domain([-bound, bound]).range([panelH, 0]);

        gLeft.append('g').attr('transform', `translate(0,${panelH})`)
          .call(d3.axisBottom(xScale).ticks(5))
          .selectAll('text').style('font-size', '10px');
        gLeft.append('g').call(d3.axisLeft(yScale).ticks(5))
          .selectAll('text').style('font-size', '10px');

        gLeft.append('text')
          .attr('x', panelW / 2).attr('y', -6)
          .attr('text-anchor', 'middle')
          .style('font-size', '12px').style('font-weight', '600')
          .style('fill', 'var(--color-text-primary)')
          .text('Cartesian (x, y)');

        // Draw polar cells mapped to Cartesian
        for (const cell of polarCells) {
          const arc = d3.arc<unknown>()
            .innerRadius(xScale(cell.rLo) - xScale(0))
            .outerRadius(xScale(cell.rHi) - xScale(0))
            .startAngle(cell.thetaLo - Math.PI / 2)
            .endAngle(cell.thetaHi - Math.PI / 2);

          gLeft.append('path')
            .attr('d', arc({}) as string)
            .attr('transform', `translate(${xScale(0)},${yScale(0)})`)
            .style('fill', colorScale(Math.abs(cell.fVal)))
            .style('opacity', 0.6)
            .style('stroke', '#94A3B8')
            .style('stroke-width', 0.5);
        }

        // Region boundary
        const arcBoundary = d3.arc<unknown>()
          .innerRadius(xScale(preset.region.rRange[0]) - xScale(0))
          .outerRadius(xScale(preset.region.rRange[1]) - xScale(0))
          .startAngle(preset.region.thetaRange[0] - Math.PI / 2)
          .endAngle(preset.region.thetaRange[1] - Math.PI / 2);

        gLeft.append('path')
          .attr('d', arcBoundary({}) as string)
          .attr('transform', `translate(${xScale(0)},${yScale(0)})`)
          .style('fill', 'none')
          .style('stroke', functionColors[0])
          .style('stroke-width', 2);
      }

      // --- Right panel: Polar parameter space (r, θ rectangle) ---
      if (showRight) {
        const offset = showLeft ? margin.left + panelW + GAP + margin.right + margin.left : margin.left;
        const gRight = svg.append('g').attr('transform', `translate(${offset},${margin.top})`);

        const rScale = d3.scaleLinear().domain(preset.region.rRange).range([0, panelW]);
        const thetaScale = d3.scaleLinear().domain(preset.region.thetaRange).range([panelH, 0]);

        gRight.append('g').attr('transform', `translate(0,${panelH})`)
          .call(d3.axisBottom(rScale).ticks(5))
          .selectAll('text').style('font-size', '10px');
        gRight.append('g')
          .call(d3.axisLeft(thetaScale).ticks(5).tickFormat((d) => {
            const v = d as number;
            if (Math.abs(v) < 0.01) return '0';
            const piMult = v / Math.PI;
            if (Math.abs(piMult - Math.round(piMult)) < 0.01) {
              const n = Math.round(piMult);
              return n === 1 ? 'π' : n === -1 ? '-π' : `${n}π`;
            }
            return v.toFixed(1);
          }))
          .selectAll('text').style('font-size', '10px');

        gRight.append('text')
          .attr('x', panelW / 2).attr('y', panelH + 30)
          .attr('text-anchor', 'middle')
          .style('font-size', '11px').style('fill', 'var(--color-text-secondary)')
          .text('r');
        gRight.append('text')
          .attr('x', -panelH / 2).attr('y', -30)
          .attr('text-anchor', 'middle').attr('transform', 'rotate(-90)')
          .style('font-size', '11px').style('fill', 'var(--color-text-secondary)')
          .text('θ');

        gRight.append('text')
          .attr('x', panelW / 2).attr('y', -6)
          .attr('text-anchor', 'middle')
          .style('font-size', '12px').style('font-weight', '600')
          .style('fill', 'var(--color-text-primary)')
          .text('Polar parameter space (r, θ)');

        // Draw rectangular cells in (r, θ) space
        const dr = (preset.region.rRange[1] - preset.region.rRange[0]) / nPartitions;
        const dtheta = (preset.region.thetaRange[1] - preset.region.thetaRange[0]) / nPartitions;

        for (const cell of polarCells) {
          gRight.append('rect')
            .attr('x', rScale(cell.rLo))
            .attr('y', thetaScale(cell.thetaHi))
            .attr('width', Math.abs(rScale(cell.rLo + dr) - rScale(cell.rLo)))
            .attr('height', Math.abs(thetaScale(cell.thetaLo) - thetaScale(cell.thetaLo + dtheta)))
            .style('fill', colorScale(Math.abs(cell.fVal)))
            .style('opacity', 0.6)
            .style('stroke', '#94A3B8')
            .style('stroke-width', 0.5);
        }
      }
    },
    [width, totalHeight, polarCells, presetIdx, viewMode, nPartitions],
  );

  return (
    <div ref={containerRef} className="viz-container">
      <div className="viz-controls">
        <label>
          Function:{' '}
          <select value={presetIdx} onChange={handlePresetChange}>
            {POLAR_INTEGRAL_PRESETS.map((p, i) => (
              <option key={p.name} value={i}>{p.label}</option>
            ))}
          </select>
        </label>
        <label>
          Partitions:{' '}
          <input
            type="range" min={2} max={30} value={nPartitions}
            onChange={(e) => setNPartitions(Number(e.target.value))}
          />
          <span className="viz-value">{nPartitions}×{nPartitions}</span>
        </label>
        <label>
          View:{' '}
          <select value={viewMode} onChange={(e) => setViewMode(e.target.value as typeof viewMode)}>
            <option value="both">Both</option>
            <option value="cartesian">Cartesian only</option>
            <option value="polar">Polar only</option>
          </select>
        </label>
      </div>

      <svg ref={svgRef} width={width} height={totalHeight} />

      <div className="viz-readout">
        <p>
          Polar Riemann sum: <strong>{polarResult.toFixed(6)}</strong>{' '}
          | Exact: <strong>{preset.exactValue.toFixed(6)}</strong>{' '}
          | Error: {error.toExponential(2)}
        </p>
      </div>
    </div>
  );
}
