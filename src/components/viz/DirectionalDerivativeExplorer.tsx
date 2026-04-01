import { useState, useMemo, useCallback, type ChangeEvent } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { DIRECTIONAL_DERIVATIVE_PRESETS } from '../../data/gradient-data';
import { generateContours, directionalDerivative } from './shared/multivariate';
import { functionColors } from './shared/colorScales';

const margin = { top: 20, right: 20, bottom: 40, left: 50 };
const GAP = 30;
const POLAR_SAMPLES = 72;

export default function DirectionalDerivativeExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();
  const height = Math.min(width * 0.55, 440);

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [probePoint, setProbePoint] = useState<[number, number]>(
    DIRECTIONAL_DERIVATIVE_PRESETS[0].defaultPoint,
  );
  const [angle, setAngle] = useState(DIRECTIONAL_DERIVATIVE_PRESETS[0].defaultAngle);

  const preset = DIRECTIONAL_DERIVATIVE_PRESETS[selectedIdx];

  const handlePresetChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    const idx = Number(e.target.value);
    setSelectedIdx(idx);
    setProbePoint(DIRECTIONAL_DERIVATIVE_PRESETS[idx].defaultPoint);
    setAngle(DIRECTIONAL_DERIVATIVE_PRESETS[idx].defaultAngle);
  }, []);

  const contours = useMemo(
    () => generateContours(preset.f, preset.xDomain, preset.yDomain, 12, 80),
    [selectedIdx],
  );

  const grad = useMemo(
    () => preset.grad_f(probePoint[0], probePoint[1]),
    [selectedIdx, probePoint],
  );

  const gradMag = Math.sqrt(grad[0] * grad[0] + grad[1] * grad[1]);

  // Current directional derivative
  const dirDeriv = useMemo(() => {
    const u = [Math.cos(angle), Math.sin(angle)];
    return directionalDerivative(grad, u);
  }, [grad, angle]);

  // Polar plot data: D_u f for all angles
  const polarData = useMemo(() => {
    const data: Array<{ angle: number; value: number }> = [];
    for (let k = 0; k <= POLAR_SAMPLES; k++) {
      const theta = (k / POLAR_SAMPLES) * 2 * Math.PI;
      const u = [Math.cos(theta), Math.sin(theta)];
      const result = directionalDerivative(grad, u);
      data.push({ angle: theta, value: result.value });
    }
    return data;
  }, [grad]);

  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (width <= 0 || height <= 0) return;

      const innerW = width - margin.left - margin.right;
      const innerH = height - margin.top - margin.bottom;
      const leftW = Math.floor((innerW - GAP) * 0.55);
      const rightW = innerW - leftW - GAP;

      // ── Left panel: contour plot ──
      const gLeft = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const xScale = d3.scaleLinear().domain(preset.xDomain).range([0, leftW]);
      const yScale = d3.scaleLinear().domain(preset.yDomain).range([innerH, 0]);

      // Contour lines
      const colorScale = d3.scaleSequential(d3.interpolateBlues)
        .domain(d3.extent(contours, (c) => c.level) as [number, number]);

      for (const contour of contours) {
        const pts = contour.points;
        for (let k = 0; k < pts.length - 1; k += 2) {
          gLeft.append('line')
            .attr('x1', xScale(pts[k][0]))
            .attr('y1', yScale(pts[k][1]))
            .attr('x2', xScale(pts[k + 1][0]))
            .attr('y2', yScale(pts[k + 1][1]))
            .style('stroke', colorScale(contour.level))
            .style('stroke-width', 1)
            .style('opacity', 0.6);
        }
      }

      const arrowLen = Math.min(leftW, innerH) * 0.12;

      // Gradient arrow
      if (gradMag > 1e-8) {
        const gnx = grad[0] / gradMag;
        const gny = grad[1] / gradMag;
        gLeft.append('line')
          .attr('x1', xScale(probePoint[0]))
          .attr('y1', yScale(probePoint[1]))
          .attr('x2', xScale(probePoint[0]) + gnx * arrowLen)
          .attr('y2', yScale(probePoint[1]) - gny * arrowLen)
          .style('stroke', functionColors[1])
          .style('stroke-width', 2.5);

        // Gradient arrow head
        const gAx = xScale(probePoint[0]) + gnx * arrowLen;
        const gAy = yScale(probePoint[1]) - gny * arrowLen;
        gLeft.append('circle')
          .attr('cx', gAx)
          .attr('cy', gAy)
          .attr('r', 3)
          .style('fill', functionColors[1]);
      }

      // Direction arrow u
      const ux = Math.cos(angle);
      const uy = Math.sin(angle);
      gLeft.append('line')
        .attr('x1', xScale(probePoint[0]))
        .attr('y1', yScale(probePoint[1]))
        .attr('x2', xScale(probePoint[0]) + ux * arrowLen)
        .attr('y2', yScale(probePoint[1]) - uy * arrowLen)
        .style('stroke', functionColors[2])
        .style('stroke-width', 2.5);

      const uAx = xScale(probePoint[0]) + ux * arrowLen;
      const uAy = yScale(probePoint[1]) - uy * arrowLen;
      gLeft.append('circle')
        .attr('cx', uAx)
        .attr('cy', uAy)
        .attr('r', 3)
        .style('fill', functionColors[2]);

      // Probe dot
      gLeft.append('circle')
        .attr('cx', xScale(probePoint[0]))
        .attr('cy', yScale(probePoint[1]))
        .attr('r', 5)
        .style('fill', '#fff')
        .style('stroke', functionColors[0])
        .style('stroke-width', 2);

      // Axes
      gLeft.append('g')
        .attr('transform', `translate(0,${innerH})`)
        .call(d3.axisBottom(xScale).ticks(5))
        .selectAll('text')
        .style('fill', 'var(--color-text-muted)')
        .style('font-size', '10px');

      gLeft.append('g')
        .call(d3.axisLeft(yScale).ticks(5))
        .selectAll('text')
        .style('fill', 'var(--color-text-muted)')
        .style('font-size', '10px');

      // Click/drag to move probe
      const dragBehavior = d3.drag<SVGRectElement, unknown>()
        .on('drag', (event) => {
          const [mx, my] = d3.pointer(event, gLeft.node());
          const x = xScale.invert(mx);
          const y = yScale.invert(my);
          if (
            x >= preset.xDomain[0] && x <= preset.xDomain[1] &&
            y >= preset.yDomain[0] && y <= preset.yDomain[1]
          ) {
            setProbePoint([x, y]);
          }
        });

      gLeft.append('rect')
        .attr('width', leftW)
        .attr('height', innerH)
        .style('fill', 'transparent')
        .style('cursor', 'crosshair')
        .call(dragBehavior);

      // ── Right panel: polar plot ──
      const gRight = svg
        .append('g')
        .attr('transform', `translate(${margin.left + leftW + GAP + rightW / 2},${margin.top + innerH / 2})`);

      const polarR = Math.min(rightW, innerH) / 2 - 10;
      const maxVal = Math.max(gradMag, 0.1);
      const rScale = d3.scaleLinear().domain([0, maxVal]).range([0, polarR]);

      // Polar grid circles
      const nCircles = 3;
      for (let k = 1; k <= nCircles; k++) {
        const r = (k / nCircles) * polarR;
        gRight.append('circle')
          .attr('cx', 0)
          .attr('cy', 0)
          .attr('r', r)
          .style('fill', 'none')
          .style('stroke', 'var(--color-border)')
          .style('stroke-width', 0.5)
          .style('opacity', 0.4);
      }

      // Polar axes
      for (let k = 0; k < 4; k++) {
        const theta = (k * Math.PI) / 2;
        gRight.append('line')
          .attr('x1', 0).attr('y1', 0)
          .attr('x2', polarR * Math.cos(theta))
          .attr('y2', -polarR * Math.sin(theta))
          .style('stroke', 'var(--color-border)')
          .style('stroke-width', 0.5)
          .style('opacity', 0.3);
      }

      // Polar curve (D_u f vs angle)
      const polarLine = d3.lineRadial<{ angle: number; value: number }>()
        .angle((d) => -d.angle + Math.PI / 2)
        .radius((d) => rScale(Math.abs(d.value)));

      gRight.append('path')
        .datum(polarData)
        .attr('d', polarLine as unknown as string)
        .style('fill', 'none')
        .style('stroke', functionColors[0])
        .style('stroke-width', 1.5);

      // Current direction marker
      const currentR = rScale(Math.abs(dirDeriv.value));
      const px = currentR * Math.cos(angle);
      const py = -currentR * Math.sin(angle);

      gRight.append('circle')
        .attr('cx', px)
        .attr('cy', py)
        .attr('r', 4)
        .style('fill', functionColors[2])
        .style('stroke', '#fff')
        .style('stroke-width', 1);

      // Direction line from center
      gRight.append('line')
        .attr('x1', 0).attr('y1', 0)
        .attr('x2', px).attr('y2', py)
        .style('stroke', functionColors[2])
        .style('stroke-width', 1.5)
        .style('stroke-dasharray', '4,2');

      // Gradient direction marker (max)
      if (gradMag > 1e-8) {
        const gradAngle = Math.atan2(grad[1], grad[0]);
        const maxR = rScale(gradMag);
        gRight.append('circle')
          .attr('cx', maxR * Math.cos(gradAngle))
          .attr('cy', -maxR * Math.sin(gradAngle))
          .attr('r', 4)
          .style('fill', functionColors[1])
          .style('stroke', '#fff')
          .style('stroke-width', 1);
      }

      // Polar label
      gRight.append('text')
        .attr('x', 0)
        .attr('y', polarR + 20)
        .attr('text-anchor', 'middle')
        .style('fill', 'var(--color-text-muted)')
        .style('font-size', '10px')
        .text('D_u f vs. angle');
    },
    [contours, probePoint, grad, gradMag, angle, dirDeriv, polarData, width, height],
  );

  const angleDeg = ((angle * 180) / Math.PI).toFixed(0);

  return (
    <div ref={containerRef} className="w-full my-6">
      <div className="flex flex-wrap items-center gap-4 mb-3">
        <label className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Function:
          <select
            className="ml-1 rounded px-1 py-0.5 text-sm"
            style={{ background: 'var(--color-bg-secondary)', color: 'var(--color-text)' }}
            value={selectedIdx}
            onChange={handlePresetChange}
          >
            {DIRECTIONAL_DERIVATIVE_PRESETS.map((p, i) => (
              <option key={p.name} value={i}>{p.label}</option>
            ))}
          </select>
        </label>

        <label className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Direction: {angleDeg}°
          <input
            type="range"
            className="ml-2 w-32"
            min={0}
            max={2 * Math.PI}
            step={0.02}
            value={angle}
            onChange={(e) => setAngle(Number(e.target.value))}
          />
        </label>
      </div>

      <svg ref={svgRef} width={width} height={height} />

      <div className="flex flex-wrap gap-4 mt-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
        <span>
          <span style={{ color: functionColors[1] }}>●</span>{' '}
          ∇f = ({grad[0].toFixed(3)}, {grad[1].toFixed(3)})
        </span>
        <span>
          <span style={{ color: functionColors[2] }}>●</span>{' '}
          u = ({Math.cos(angle).toFixed(3)}, {Math.sin(angle).toFixed(3)})
        </span>
        <span>D_u f = {dirDeriv.value.toFixed(3)}</span>
        <span>‖∇f‖ = {gradMag.toFixed(3)}</span>
        <span>Angle(u, ∇f) = {((dirDeriv.angle * 180) / Math.PI).toFixed(1)}°</span>
      </div>
    </div>
  );
}
