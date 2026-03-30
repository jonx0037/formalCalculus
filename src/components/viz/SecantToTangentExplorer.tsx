import { useState, useMemo, useCallback, useEffect, useRef, type ChangeEvent } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { computeSecant, computeTangent, tangentLineAt, secantLineAt, generateCurve } from './shared/differentiation';
import { getFunctionPresets } from '../../data/derivative-data';
import { functionColors, regionColors } from './shared/colorScales';

const presets = getFunctionPresets();
const margin = { top: 20, right: 30, bottom: 40, left: 50 };

export default function SecantToTangentExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();
  const height = Math.min(width * 0.6, 460);

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [a, setA] = useState(presets[0].defaultA);
  const [hLog, setHLog] = useState(0.3);
  const [hSign, setHSign] = useState<1 | -1>(1);
  const [playing, setPlaying] = useState(false);

  const animRef = useRef<number | null>(null);

  const preset = presets[selectedIdx];
  const h = hSign * Math.pow(10, hLog);

  // Reset a when switching presets
  const handlePresetChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    const idx = Number(e.target.value);
    setSelectedIdx(idx);
    setA(presets[idx].defaultA);
    setPlaying(false);
    setHLog(0.3);
  }, []);

  const handleAChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setA(Number(e.target.value));
  }, []);

  const handleHLogChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setHLog(Number(e.target.value));
  }, []);

  // Auto-animation: decrement hLog toward -4
  useEffect(() => {
    if (!playing) {
      if (animRef.current !== null) {
        cancelAnimationFrame(animRef.current);
        animRef.current = null;
      }
      return;
    }

    let currentHLog = hLog;

    const step = () => {
      currentHLog -= 0.02;
      if (currentHLog <= -4) {
        currentHLog = -4;
        setHLog(currentHLog);
        setPlaying(false);
        return;
      }
      setHLog(currentHLog);
      animRef.current = requestAnimationFrame(step);
    };

    animRef.current = requestAnimationFrame(step);

    return () => {
      if (animRef.current !== null) {
        cancelAnimationFrame(animRef.current);
        animRef.current = null;
      }
    };
  }, [playing]); // intentionally only depend on playing — hLog is tracked via currentHLog closure

  // Generate function curve data
  const curveData = useMemo(() => {
    return generateCurve(preset.fn, preset.domain[0], preset.domain[1], 500);
  }, [selectedIdx]);

  // Clamp a+h within domain to avoid drawing off-screen points
  const clampedAH = Math.max(preset.domain[0], Math.min(preset.domain[1], a + h));
  const effectiveH = clampedAH - a;

  // Compute secant and tangent
  const secant = useMemo(() => {
    if (Math.abs(effectiveH) < 1e-15) {
      // h effectively zero — fall back to tangent slope
      const slope = preset.derivative(a);
      return { x1: a, y1: preset.fn(a), x2: a, y2: preset.fn(a), slope };
    }
    return computeSecant(preset.fn, a, effectiveH);
  }, [selectedIdx, a, effectiveH]);

  const tangent = useMemo(() => {
    return computeTangent(preset.fn, preset.derivative, a);
  }, [selectedIdx, a]);

  const exactDerivative = preset.derivative(a);
  const slopeError = Math.abs(secant.slope - exactDerivative);

  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (width <= 0 || height <= 0) return;

      const innerW = width - margin.left - margin.right;
      const innerH = height - margin.top - margin.bottom;

      const g = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      // Compute domains
      const [xMin, xMax] = preset.domain;
      const yExtent = d3.extent(curveData, (d) => d.y) as [number, number];
      const yPad = (yExtent[1] - yExtent[0]) * 0.12 || 0.5;
      const yMin = yExtent[0] - yPad;
      const yMax = yExtent[1] + yPad;

      const xScale = d3.scaleLinear().domain([xMin, xMax]).range([0, innerW]);
      const yScale = d3.scaleLinear().domain([yMin, yMax]).range([innerH, 0]);

      // Function curve
      const line = d3.line<{ x: number; y: number }>()
        .x((d) => xScale(d.x))
        .y((d) => yScale(d.y))
        .defined((d) => d.x >= xMin && d.x <= xMax && isFinite(d.y));

      g.append('path')
        .datum(curveData.filter((d) => d.x >= xMin && d.x <= xMax))
        .attr('fill', 'none')
        .attr('stroke', functionColors[0])
        .attr('stroke-width', 2)
        .attr('d', line);

      // Tangent line (dashed red) across full visible x range
      const tangentY1 = tangentLineAt(tangent, xMin);
      const tangentY2 = tangentLineAt(tangent, xMax);
      g.append('line')
        .attr('x1', xScale(xMin))
        .attr('y1', yScale(tangentY1))
        .attr('x2', xScale(xMax))
        .attr('y2', yScale(tangentY2))
        .style('stroke', functionColors[1])
        .style('stroke-width', 2)
        .style('stroke-dasharray', '6,4');

      // Secant line (amber) across full visible x range
      if (Math.abs(effectiveH) >= 1e-15) {
        const secantY1 = secantLineAt(secant, xMin);
        const secantY2 = secantLineAt(secant, xMax);
        g.append('line')
          .attr('x1', xScale(xMin))
          .attr('y1', yScale(secantY1))
          .attr('x2', xScale(xMax))
          .attr('y2', yScale(secantY2))
          .style('stroke', '#D97706')
          .style('stroke-width', 2);
      }

      // Point (a, f(a)) — green
      const fa = preset.fn(a);
      if (isFinite(fa)) {
        g.append('circle')
          .attr('cx', xScale(a))
          .attr('cy', yScale(fa))
          .attr('r', 5)
          .style('fill', functionColors[2])
          .style('stroke', '#fff')
          .style('stroke-width', 1.5);
      }

      // Point (a+h, f(a+h)) — amber
      const fah = preset.fn(clampedAH);
      if (isFinite(fah) && Math.abs(effectiveH) >= 1e-15) {
        g.append('circle')
          .attr('cx', xScale(clampedAH))
          .attr('cy', yScale(fah))
          .attr('r', 5)
          .style('fill', '#D97706')
          .style('stroke', '#fff')
          .style('stroke-width', 1.5);
      }

      // Axes
      g.append('g')
        .attr('transform', `translate(0,${innerH})`)
        .call(d3.axisBottom(xScale).ticks(6))
        .call((a) => {
          a.select('.domain').style('stroke', 'var(--color-border)');
          a.selectAll('.tick line').style('stroke', 'var(--color-border)');
          a.selectAll('.tick text').style('fill', 'var(--color-text-muted)').style('font-size', '11px');
        });

      g.append('g')
        .call(d3.axisLeft(yScale).ticks(6))
        .call((a) => {
          a.select('.domain').style('stroke', 'var(--color-border)');
          a.selectAll('.tick line').style('stroke', 'var(--color-border)');
          a.selectAll('.tick text').style('fill', 'var(--color-text-muted)').style('font-size', '11px');
        });

      // Axis labels
      g.append('text')
        .attr('x', innerW / 2).attr('y', innerH + 35)
        .attr('text-anchor', 'middle')
        .style('fill', 'var(--color-text-muted)').style('font-size', '12px')
        .text('x');

      g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -innerH / 2).attr('y', -38)
        .attr('text-anchor', 'middle')
        .style('fill', 'var(--color-text-muted)').style('font-size', '12px')
        .text('f(x)');
    },
    [curveData, width, height, a, hLog, hSign, selectedIdx],
  );

  const aMin = preset.domain[0] + 0.1;
  const aMax = preset.domain[1] - 0.1;

  return (
    <div ref={containerRef} className="w-full my-6">
      <div className="flex flex-wrap items-center gap-4 mb-3">
        <label className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Function:
          <select
            value={selectedIdx}
            onChange={handlePresetChange}
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
            min={aMin}
            max={aMax}
            step={0.01}
            value={a}
            onChange={handleAChange}
            className="ml-2 w-28"
          />
        </label>

        <label className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          h {hSign > 0 ? '>' : '<'} 0, |h| = {Math.abs(h).toFixed(h < 0.01 && h > -0.01 ? 4 : 2)}
          <input
            type="range"
            min={-4}
            max={0.3}
            step={0.02}
            value={hLog}
            onChange={handleHLogChange}
            className="ml-2 w-36"
          />
        </label>

        <button
          onClick={() => setHSign((s) => (s === 1 ? -1 : 1))}
          className="px-3 py-1 rounded text-xs font-medium"
          style={{
            background: 'var(--color-surface-alt)',
            color: 'var(--color-text)',
            border: '1px solid var(--color-border)',
          }}
        >
          {hSign > 0 ? 'h > 0 (right)' : 'h < 0 (left)'}
        </button>

        <button
          onClick={() => {
            if (playing) {
              setPlaying(false);
            } else {
              // Reset to start if already at minimum
              if (hLog <= -4) setHLog(0.3);
              setPlaying(true);
            }
          }}
          className="px-3 py-1 rounded text-xs font-medium"
          style={{
            background: playing ? 'var(--color-primary)' : 'var(--color-surface-alt)',
            color: playing ? '#fff' : 'var(--color-text)',
            border: '1px solid var(--color-border)',
          }}
        >
          {playing ? 'Pause' : 'Play'}
        </button>
      </div>

      <svg ref={svgRef} width={width} height={height} />

      <div className="flex flex-wrap gap-4 mt-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
        <span>
          <span style={{ color: functionColors[0] }}>&#9644;</span> f(x)
        </span>
        <span>
          <span style={{ color: '#D97706' }}>&#9644;</span> Secant
        </span>
        <span>
          <span style={{ color: functionColors[1] }}>- -</span> Tangent
        </span>
        <span className="font-medium" style={{ color: 'var(--color-text)' }}>
          h = {h.toFixed(6)}
          {' · '}Secant slope = {secant.slope.toFixed(4)}
          {' · '}f&apos;(a) = {exactDerivative.toFixed(4)}
          {' · '}|Error| = {slopeError.toFixed(6)}
        </span>
      </div>
    </div>
  );
}
