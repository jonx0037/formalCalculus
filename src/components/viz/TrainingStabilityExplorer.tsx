import { useState, useMemo, useCallback } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { getTrainingStabilityPresets } from '../../data/stability-dynamics-data';
import { seededRandom } from './shared/odes';

// ── Constants ─────────────────────────────────────────────────

const PRESETS = getTrainingStabilityPresets();
const TRAJECTORY_COLORS = ['#2563EB', '#DC2626', '#059669'];

interface TrajectoryResult {
  positions: Array<[number, number]>;
  lossValues: number[];
  /** Time or iteration values for the x-axis */
  timeValues: number[];
  isContinuous: boolean;
}

// ── Main component ──────────────────────────────────────────

export default function TrainingStabilityExplorer() {
  const { ref: containerRef, width: containerWidth } = useResizeObserver<HTMLDivElement>();

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [learningRate, setLearningRate] = useState(0.05);
  const [isContinuous, setIsContinuous] = useState(true);
  const [addNoise, setAddNoise] = useState(false);
  const [trajectories, setTrajectories] = useState<TrajectoryResult[]>([]);

  const preset = PRESETS[selectedIdx];
  const totalWidth = Math.min(containerWidth, 900);
  const leftWidth = Math.floor(totalWidth * 0.52);
  const rightWidth = totalWidth - leftWidth - 10;
  const panelHeight = Math.min(leftWidth * 0.8, 380);

  const margin = { top: 20, right: 20, bottom: 40, left: 50 };

  // ── Contour data ──────────────────────────────────────────

  const contourData = useMemo(() => {
    const n = 80;
    const [xMin, xMax] = preset.domain.x;
    const [yMin, yMax] = preset.domain.y;
    const dx = (xMax - xMin) / (n - 1);
    const dy = (yMax - yMin) / (n - 1);
    const values: number[] = [];

    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        values.push(preset.loss(xMin + i * dx, yMin + j * dy));
      }
    }

    return { values, n, xMin, xMax, yMin, yMax };
  }, [preset]);

  // ── Compute trajectory ────────────────────────────────────

  const computeTrajectory = useCallback(
    (x0: number, y0: number): TrajectoryResult => {
      const positions: Array<[number, number]> = [[x0, y0]];
      const lossValues: number[] = [preset.loss(x0, y0)];
      const timeValues: number[] = [0];
      let x = x0;
      let y = y0;
      const maxSteps = isContinuous ? 2000 : 500;
      const eta = isContinuous ? learningRate * 0.01 : learningRate;
      const rng = seededRandom(42);

      for (let k = 0; k < maxSteps; k++) {
        const [gx, gy] = preset.gradLoss(x, y);
        let nx = 0;
        let ny = 0;
        if (addNoise) {
          nx = (rng() - 0.5) * 0.3;
          ny = (rng() - 0.5) * 0.3;
        }

        x -= eta * (gx + nx);
        y -= eta * (gy + ny);

        if (!isFinite(x) || !isFinite(y) || Math.abs(x) > 20 || Math.abs(y) > 20) break;

        positions.push([x, y]);
        lossValues.push(preset.loss(x, y));
        // In continuous mode, x-axis is time = (k+1) * dt; in discrete mode, it's iteration index
        timeValues.push(isContinuous ? (k + 1) * eta : k + 1);
      }

      return { positions, lossValues, timeValues, isContinuous };
    },
    [preset, learningRate, isContinuous, addNoise],
  );

  // ── Handlers ──────────────────────────────────────────────

  const handleClick = useCallback(
    (x: number, y: number) => {
      if (trajectories.length >= 3) return;
      setTrajectories((prev) => [...prev, computeTrajectory(x, y)]);
    },
    [computeTrajectory, trajectories.length],
  );

  const handlePresetChange = useCallback((idx: number) => {
    setSelectedIdx(idx);
    setTrajectories([]);
  }, []);

  // ── D3: Loss contour + trajectories (left) ────────────────

  const contourRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (leftWidth === 0) return;

      const innerW = leftWidth - margin.left - margin.right;
      const innerH = panelHeight - margin.top - margin.bottom;

      const g = svg
        .attr('width', leftWidth).attr('height', panelHeight)
        .append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      const { n, xMin, xMax, yMin, yMax, values } = contourData;
      const xScale = d3.scaleLinear().domain([xMin, xMax]).range([0, innerW]);
      const yScale = d3.scaleLinear().domain([yMin, yMax]).range([innerH, 0]);

      g.append('g').attr('transform', `translate(0,${innerH})`).call(d3.axisBottom(xScale).ticks(6))
        .selectAll('text').style('font-size', '9px');
      g.append('g').call(d3.axisLeft(yScale).ticks(6))
        .selectAll('text').style('font-size', '9px');

      g.append('text').attr('x', innerW / 2).attr('y', innerH + 32)
        .attr('text-anchor', 'middle').style('font-size', '10px').style('fill', 'var(--color-text-muted)')
        .text('θ₁');
      g.append('text').attr('x', -innerH / 2).attr('y', -35)
        .attr('text-anchor', 'middle').attr('transform', 'rotate(-90)')
        .style('font-size', '10px').style('fill', 'var(--color-text-muted)')
        .text('θ₂');

      g.append('defs').append('clipPath').attr('id', 'ts-clip')
        .append('rect').attr('width', innerW).attr('height', innerH);
      const plotArea = g.append('g').attr('clip-path', 'url(#ts-clip)');

      // Contour plot
      const maxV = Math.max(...values.filter(isFinite));
      const minV = Math.min(...values.filter(isFinite));
      const thresholds = d3.range(minV, maxV, (maxV - minV) / 15);

      const contours = d3.contours().size([n, n]).thresholds(thresholds);
      const contourPaths = contours(values);
      const colorScale = d3.scaleSequential(d3.interpolateBlues).domain([maxV, minV]);

      const geoScale = d3.geoTransform({
        point(px, py) {
          const cx = xMin + (px / (n - 1)) * (xMax - xMin);
          const cy = yMin + (py / (n - 1)) * (yMax - yMin);
          this.stream.point(xScale(cx), yScale(cy));
        },
      });
      const path = d3.geoPath(geoScale);

      plotArea.selectAll('path.contour')
        .data(contourPaths)
        .enter().append('path')
        .attr('d', path as unknown as string)
        .style('fill', (d) => colorScale(d.value))
        .style('fill-opacity', 0.15)
        .style('stroke', (d) => colorScale(d.value))
        .style('stroke-width', 0.6)
        .style('opacity', 0.7);

      // Critical point
      plotArea.append('circle')
        .attr('cx', xScale(preset.criticalPoint[0])).attr('cy', yScale(preset.criticalPoint[1]))
        .attr('r', 5)
        .style('fill', preset.classification === 'minimum' ? '#059669' : '#fff')
        .style('stroke', preset.classification === 'minimum' ? '#059669' : '#DC2626')
        .style('stroke-width', 2);

      // Trajectories
      const lineGen = d3.line<[number, number]>()
        .x((d) => xScale(d[0])).y((d) => yScale(d[1]));

      for (let i = 0; i < trajectories.length; i++) {
        const { positions } = trajectories[i];
        const color = TRAJECTORY_COLORS[i % TRAJECTORY_COLORS.length];

        plotArea.append('path').datum(positions).attr('d', lineGen)
          .style('fill', 'none').style('stroke', color)
          .style('stroke-width', 1.5).style('opacity', 0.85);

        // Start marker
        plotArea.append('circle')
          .attr('cx', xScale(positions[0][0])).attr('cy', yScale(positions[0][1]))
          .attr('r', 3).style('fill', color).style('stroke', '#fff').style('stroke-width', 1);

        // End marker (if not blown up)
        const last = positions[positions.length - 1];
        if (isFinite(last[0]) && isFinite(last[1])) {
          plotArea.append('circle')
            .attr('cx', xScale(last[0])).attr('cy', yScale(last[1]))
            .attr('r', 2.5).style('fill', '#fff').style('stroke', color).style('stroke-width', 1.5);
        }
      }

      // Click
      g.append('rect')
        .attr('width', innerW).attr('height', innerH)
        .style('fill', 'transparent').style('cursor', 'crosshair')
        .on('click', (event: MouseEvent) => {
          const [mx, my] = d3.pointer(event);
          handleClick(xScale.invert(mx), yScale.invert(my));
        });
    },
    [contourData, trajectories, preset, leftWidth, panelHeight, handleClick],
  );

  // ── D3: Loss vs. time/iteration (right) ───────────────────

  const lossRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (rightWidth === 0 || trajectories.length === 0) return;

      const innerW = rightWidth - margin.left - margin.right;
      const innerH = panelHeight - margin.top - margin.bottom;

      const g = svg
        .attr('width', rightWidth).attr('height', panelHeight)
        .append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      const allLoss = trajectories.flatMap((t) => t.lossValues.filter(isFinite));
      const allTime = trajectories.flatMap((t) => t.timeValues.filter(isFinite));
      const maxTime = Math.max(...allTime, 1);
      const maxLoss = Math.max(...allLoss, 0.01);

      const xScale = d3.scaleLinear().domain([0, maxTime]).range([0, innerW]);
      const yScale = d3.scaleLinear().domain([0, maxLoss * 1.1]).range([innerH, 0]);

      g.append('g').attr('transform', `translate(0,${innerH})`).call(d3.axisBottom(xScale).ticks(5))
        .selectAll('text').style('font-size', '9px');
      g.append('g').call(d3.axisLeft(yScale).ticks(5))
        .selectAll('text').style('font-size', '9px');

      g.append('text').attr('x', innerW / 2).attr('y', innerH + 32)
        .attr('text-anchor', 'middle').style('font-size', '10px').style('fill', 'var(--color-text-muted)')
        .text(isContinuous ? 't' : 'iteration k');
      g.append('text').attr('x', -innerH / 2).attr('y', -35)
        .attr('text-anchor', 'middle').attr('transform', 'rotate(-90)')
        .style('font-size', '10px').style('fill', 'var(--color-text-muted)')
        .text('L(θ)');

      const lineGen = d3.line<[number, number]>()
        .x((d) => xScale(d[0])).y((d) => yScale(d[1]))
        .defined((d) => isFinite(d[1]));

      for (let i = 0; i < trajectories.length; i++) {
        const { lossValues, timeValues } = trajectories[i];
        const color = TRAJECTORY_COLORS[i % TRAJECTORY_COLORS.length];
        const pts: [number, number][] = lossValues.map((v, j) => [timeValues[j], v]);

        g.append('path').datum(pts).attr('d', lineGen)
          .style('fill', 'none').style('stroke', color)
          .style('stroke-width', 1.5).style('opacity', 0.9);
      }
    },
    [trajectories, isContinuous, rightWidth, panelHeight],
  );

  return (
    <div ref={containerRef} className="flex flex-col gap-3 my-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-1.5 font-medium" style={{ color: 'var(--color-text-muted)' }}>
          Critical point:
          <select
            value={selectedIdx}
            onChange={(e) => handlePresetChange(parseInt(e.target.value))}
            className="rounded px-2 py-1 text-sm"
            style={{ background: 'var(--color-surface-alt)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
          >
            {PRESETS.map((p, i) => (
              <option key={p.name} value={i}>{p.label}</option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-1.5" style={{ color: 'var(--color-text-muted)' }}>
          η = {learningRate.toFixed(3)}
          <input
            type="range" min={0.001} max={0.5} step={0.001}
            value={learningRate}
            onChange={(e) => { setLearningRate(parseFloat(e.target.value)); setTrajectories([]); }}
            className="w-28"
          />
        </label>

        <label className="flex items-center gap-1">
          <input type="checkbox" checked={!isContinuous} onChange={(e) => { setIsContinuous(!e.target.checked); setTrajectories([]); }} />
          <span style={{ color: 'var(--color-text-muted)' }}>Discrete (GD)</span>
        </label>

        <label className="flex items-center gap-1">
          <input type="checkbox" checked={addNoise} onChange={(e) => { setAddNoise(e.target.checked); setTrajectories([]); }} />
          <span style={{ color: 'var(--color-text-muted)' }}>SGD noise</span>
        </label>

        <button
          onClick={() => setTrajectories([])}
          className="rounded px-2 py-1 text-xs"
          style={{ background: 'var(--color-surface-alt)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
        >
          Clear
        </button>
      </div>

      {/* Panels */}
      <div className="flex gap-2.5 flex-wrap">
        <div>
          <div className="text-xs mb-1 font-medium" style={{ color: 'var(--color-text-muted)' }}>
            Loss contours (click to start {isContinuous ? 'gradient flow' : 'gradient descent'})
          </div>
          <svg ref={contourRef} className="rounded"
            style={{ border: '1px solid var(--color-border)', background: 'var(--color-viz-bg)' }} />
        </div>
        {trajectories.length > 0 && (
          <div>
            <div className="text-xs mb-1 font-medium" style={{ color: 'var(--color-text-muted)' }}>
              Loss vs. {isContinuous ? 'time' : 'iteration'}
            </div>
            <svg ref={lossRef} className="rounded"
              style={{ border: '1px solid var(--color-border)', background: 'var(--color-viz-bg)' }} />
          </div>
        )}
      </div>

      {/* Eigenvalue info */}
      <div className="flex flex-wrap gap-4 text-xs" style={{ color: 'var(--color-text-muted)' }}>
        <div>
          <strong>Hessian eigenvalues:</strong> λ₁ = {preset.hessianEigs[0]}, λ₂ = {preset.hessianEigs[1]}
          {' — '}
          <span className="font-medium" style={{
            color: preset.classification === 'minimum' ? '#059669' : preset.classification === 'saddle' ? '#DC2626' : '#D97706'
          }}>
            {preset.classification === 'minimum' ? 'Positive-definite (stable)' :
             preset.classification === 'saddle' ? 'Indefinite (unstable)' :
             'Near-degenerate (slow convergence)'}
          </span>
        </div>
        <div className="italic">{preset.description}</div>
      </div>
    </div>
  );
}
