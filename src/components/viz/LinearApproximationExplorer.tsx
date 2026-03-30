import { useState, useMemo, useCallback, type ChangeEvent } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { getFunctionPresets } from '../../data/derivative-data';
import { computeTangent, tangentLineAt, generateCurve } from './shared/differentiation';
import { functionColors, regionColors } from './shared/colorScales';

const presets = getFunctionPresets();
const margin = { top: 20, right: 30, bottom: 40, left: 50 };
const SAMPLE_PTS = 500;
const GAP = 40;

export default function LinearApproximationExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();
  const height = Math.min(width * 0.6, 460);

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [a, setA] = useState(presets[0].defaultA);
  const [showError, setShowError] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  const preset = presets[selectedIdx];

  // Generate function curve data
  const curveData = useMemo(() => {
    return generateCurve(preset.fn, preset.domain[0], preset.domain[1], SAMPLE_PTS);
  }, [selectedIdx]);

  // Compute tangent line at point a
  const tangent = useMemo(() => {
    return computeTangent(preset.fn, preset.derivative, a);
  }, [selectedIdx, a]);

  // Generate tangent line points across domain
  const tangentData = useMemo(() => {
    const [xMin, xMax] = preset.domain;
    const pts: { x: number; y: number }[] = [];
    const dx = (xMax - xMin) / (SAMPLE_PTS - 1);
    for (let i = 0; i < SAMPLE_PTS; i++) {
      const x = xMin + i * dx;
      const y = tangentLineAt(tangent, x);
      if (isFinite(y)) pts.push({ x, y });
    }
    return pts;
  }, [selectedIdx, a]);

  // Generate error data |f(x) - T(x)|
  const errorData = useMemo(() => {
    const [xMin, xMax] = preset.domain;
    const pts: { x: number; y: number }[] = [];
    const dx = (xMax - xMin) / (SAMPLE_PTS - 1);
    for (let i = 0; i < SAMPLE_PTS; i++) {
      const x = xMin + i * dx;
      const fx = preset.fn(x);
      const tx = tangentLineAt(tangent, x);
      const err = Math.abs(fx - tx);
      if (isFinite(err)) pts.push({ x, y: err });
    }
    return pts;
  }, [selectedIdx, a]);

  const handleAChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setA(Number(e.target.value));
  }, []);

  const aSliderMin = preset.domain[0] + (preset.domain[1] - preset.domain[0]) * 0.02;
  const aSliderMax = preset.domain[1] - (preset.domain[1] - preset.domain[0]) * 0.02;
  const aStep = (preset.domain[1] - preset.domain[0]) / 200;

  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (width <= 0 || height <= 0) return;

      const innerW = width - margin.left - margin.right;
      const innerH = height - margin.top - margin.bottom;
      const leftW = (innerW - GAP) / 2;
      const rightW = (innerW - GAP) / 2;

      const g = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      // ── Left panel: function + tangent line ──────────────────

      const leftG = g.append('g');

      // Compute left panel domains
      let lxMin: number, lxMax: number, lyMin: number, lyMax: number;

      if (zoomed) {
        const pad = 1.5;
        lxMin = a - pad;
        lxMax = a + pad;
      } else {
        [lxMin, lxMax] = preset.domain;
      }

      const leftCurveVisible = curveData.filter((d) => d.x >= lxMin && d.x <= lxMax);
      const leftTangentVisible = tangentData.filter((d) => d.x >= lxMin && d.x <= lxMax);
      const allLeftY = [...leftCurveVisible.map((d) => d.y), ...leftTangentVisible.map((d) => d.y)];
      const lyExtent = d3.extent(allLeftY) as [number, number];

      if (lyExtent[0] !== undefined && lyExtent[1] !== undefined) {
        const lyPad = (lyExtent[1] - lyExtent[0]) * 0.12 || 0.5;
        lyMin = lyExtent[0] - lyPad;
        lyMax = lyExtent[1] + lyPad;
      } else {
        lyMin = -1;
        lyMax = 1;
      }

      const lxScale = d3.scaleLinear().domain([lxMin, lxMax]).range([0, leftW]);
      const lyScale = d3.scaleLinear().domain([lyMin, lyMax]).range([innerH, 0]);

      // Error shading between f and T
      if (showError) {
        const areaAbove = d3.area<{ x: number; y: number }>()
          .x((d) => lxScale(d.x))
          .y0((d) => lyScale(tangentLineAt(tangent, d.x)))
          .y1((d) => lyScale(d.y))
          .defined((d) => d.x >= lxMin && d.x <= lxMax && isFinite(d.y) && isFinite(tangentLineAt(tangent, d.x)));

        leftG.append('path')
          .datum(leftCurveVisible)
          .attr('fill', regionColors.errorFill)
          .attr('opacity', 0.3)
          .attr('stroke', 'none')
          .attr('d', areaAbove);
      }

      // Function curve
      const leftLine = d3.line<{ x: number; y: number }>()
        .x((d) => lxScale(d.x))
        .y((d) => lyScale(d.y))
        .defined((d) => d.x >= lxMin && d.x <= lxMax && isFinite(d.y));

      leftG.append('path')
        .datum(leftCurveVisible)
        .attr('fill', 'none')
        .attr('stroke', functionColors[0])
        .attr('stroke-width', 2)
        .attr('d', leftLine);

      // Tangent line (dashed red)
      const tangentLine = d3.line<{ x: number; y: number }>()
        .x((d) => lxScale(d.x))
        .y((d) => lyScale(d.y))
        .defined((d) => d.x >= lxMin && d.x <= lxMax && isFinite(d.y));

      leftG.append('path')
        .datum(leftTangentVisible)
        .attr('fill', 'none')
        .attr('stroke', functionColors[1])
        .attr('stroke-width', 2)
        .style('stroke-dasharray', '6,4')
        .attr('d', tangentLine);

      // Point of tangency
      const fa = preset.fn(a);
      if (isFinite(fa) && a >= lxMin && a <= lxMax) {
        leftG.append('circle')
          .attr('cx', lxScale(a))
          .attr('cy', lyScale(fa))
          .attr('r', 5)
          .style('fill', functionColors[2])
          .style('stroke', '#fff')
          .style('stroke-width', 1.5);
      }

      // Left panel axes
      leftG.append('g')
        .attr('transform', `translate(0,${innerH})`)
        .call(d3.axisBottom(lxScale).ticks(5))
        .call((ax) => {
          ax.select('.domain').style('stroke', 'var(--color-border)');
          ax.selectAll('.tick line').style('stroke', 'var(--color-border)');
          ax.selectAll('.tick text').style('fill', 'var(--color-text-muted)').style('font-size', '11px');
        });

      leftG.append('g')
        .call(d3.axisLeft(lyScale).ticks(5))
        .call((ax) => {
          ax.select('.domain').style('stroke', 'var(--color-border)');
          ax.selectAll('.tick line').style('stroke', 'var(--color-border)');
          ax.selectAll('.tick text').style('fill', 'var(--color-text-muted)').style('font-size', '11px');
        });

      // Left axis labels
      leftG.append('text')
        .attr('x', leftW / 2).attr('y', innerH + 35)
        .attr('text-anchor', 'middle')
        .style('fill', 'var(--color-text-muted)').style('font-size', '12px')
        .text('x');

      leftG.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -innerH / 2).attr('y', -38)
        .attr('text-anchor', 'middle')
        .style('fill', 'var(--color-text-muted)').style('font-size', '12px')
        .text('f(x)');

      // Label for point a
      if (a >= lxMin && a <= lxMax) {
        leftG.append('text')
          .attr('x', lxScale(a) + 8)
          .attr('y', lyScale(fa) - 8)
          .style('fill', functionColors[2])
          .style('font-size', '11px')
          .style('font-weight', '600')
          .text(`a = ${a.toFixed(2)}`);
      }

      // ── Right panel: error magnitude ─────────────────────────

      const rightG = g.append('g')
        .attr('transform', `translate(${leftW + GAP},0)`);

      // Compute right panel domains
      let rxMin: number, rxMax: number;

      if (zoomed) {
        const pad = 1.5;
        rxMin = a - pad;
        rxMax = a + pad;
      } else {
        [rxMin, rxMax] = preset.domain;
      }

      const rightErrorVisible = errorData.filter((d) => d.x >= rxMin && d.x <= rxMax);
      const ryExtent = d3.extent(rightErrorVisible, (d) => d.y) as [number, number];
      const ryPad = (ryExtent[1] - ryExtent[0]) * 0.12 || 0.1;
      const ryMin = 0;
      const ryMax = Math.max((ryExtent[1] || 0.1) + ryPad, 0.1);

      const rxScale = d3.scaleLinear().domain([rxMin, rxMax]).range([0, rightW]);
      const ryScale = d3.scaleLinear().domain([ryMin, ryMax]).range([innerH, 0]);

      // Error curve
      const errorLine = d3.line<{ x: number; y: number }>()
        .x((d) => rxScale(d.x))
        .y((d) => ryScale(d.y))
        .defined((d) => d.x >= rxMin && d.x <= rxMax && isFinite(d.y));

      rightG.append('path')
        .datum(rightErrorVisible)
        .attr('fill', 'none')
        .attr('stroke', functionColors[1])
        .attr('stroke-width', 2)
        .attr('d', errorLine);

      // Vertical marker at x = a on error panel
      if (a >= rxMin && a <= rxMax) {
        rightG.append('line')
          .attr('x1', rxScale(a)).attr('x2', rxScale(a))
          .attr('y1', 0).attr('y2', innerH)
          .style('stroke', functionColors[2])
          .style('stroke-dasharray', '4,3')
          .style('stroke-width', 1.5);
      }

      // Right panel axes
      rightG.append('g')
        .attr('transform', `translate(0,${innerH})`)
        .call(d3.axisBottom(rxScale).ticks(5))
        .call((ax) => {
          ax.select('.domain').style('stroke', 'var(--color-border)');
          ax.selectAll('.tick line').style('stroke', 'var(--color-border)');
          ax.selectAll('.tick text').style('fill', 'var(--color-text-muted)').style('font-size', '11px');
        });

      rightG.append('g')
        .call(d3.axisLeft(ryScale).ticks(5))
        .call((ax) => {
          ax.select('.domain').style('stroke', 'var(--color-border)');
          ax.selectAll('.tick line').style('stroke', 'var(--color-border)');
          ax.selectAll('.tick text').style('fill', 'var(--color-text-muted)').style('font-size', '11px');
        });

      // Right axis labels
      rightG.append('text')
        .attr('x', rightW / 2).attr('y', innerH + 35)
        .attr('text-anchor', 'middle')
        .style('fill', 'var(--color-text-muted)').style('font-size', '12px')
        .text('x');

      rightG.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -innerH / 2).attr('y', -38)
        .attr('text-anchor', 'middle')
        .style('fill', 'var(--color-text-muted)').style('font-size', '12px')
        .text('|f(x) − T(x)|');
    },
    [curveData, tangentData, errorData, width, height, a, showError, zoomed, selectedIdx],
  );

  const slopeStr = tangent.slope.toFixed(3);
  const faStr = preset.fn(a).toFixed(3);

  return (
    <div ref={containerRef} className="w-full my-6">
      <div className="flex flex-wrap items-center gap-4 mb-3">
        <label className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Function:
          <select
            value={selectedIdx}
            onChange={(e) => {
              const idx = Number(e.target.value);
              setSelectedIdx(idx);
              setA(presets[idx].defaultA);
              setZoomed(false);
            }}
            className="ml-2 px-2 py-1 rounded text-sm"
            style={{
              background: 'var(--color-surface-alt)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
            }}
          >
            {presets.map((p, i) => (
              <option key={p.name} value={i}>{p.label}</option>
            ))}
          </select>
        </label>

        <label className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          a = {a.toFixed(2)}
          <input
            type="range"
            min={aSliderMin}
            max={aSliderMax}
            step={aStep}
            value={a}
            onChange={handleAChange}
            className="ml-2 w-36"
          />
        </label>

        <label className="text-sm flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
          <input
            type="checkbox"
            checked={showError}
            onChange={(e) => setShowError(e.target.checked)}
          />
          Show error
        </label>

        <button
          onClick={() => setZoomed((z) => !z)}
          className="px-3 py-1 rounded text-xs font-medium"
          style={{
            background: zoomed ? 'var(--color-primary)' : 'var(--color-surface-alt)',
            color: zoomed ? '#fff' : 'var(--color-text)',
            border: '1px solid var(--color-border)',
          }}
        >
          {zoomed ? 'Zoom out' : 'Zoom to neighborhood'}
        </button>
      </div>

      <svg ref={svgRef} width={width} height={height} />

      <div className="flex flex-wrap gap-4 mt-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
        <span>
          <span style={{ color: functionColors[0] }}>━</span> f(x)
        </span>
        <span>
          <span style={{ color: functionColors[1] }}>┅</span> T(x) tangent
        </span>
        <span>
          <span style={{ color: functionColors[2] }}>●</span> Point of tangency
        </span>
        <span className="font-medium" style={{ color: 'var(--color-text)' }}>
          a = {a.toFixed(2)} · f(a) = {faStr} · f'(a) = {slopeStr}
        </span>
      </div>
    </div>
  );
}
