import { useState, useMemo, useCallback, type ChangeEvent, type MouseEvent } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { getTrainingDynamicsPresets } from '../../data/linear-systems-data';

// ── Constants ─────────────────────────────────────────────────

const PRESETS = getTrainingDynamicsPresets();
const margin = { top: 24, right: 20, bottom: 44, left: 50 };
const BLUE = '#2563EB';
const RED = '#DC2626';
const GREEN = '#059669';
const ORANGE = '#D97706';
const CONTOUR_LO = '#DBEAFE';
const CONTOUR_HI = '#1E40AF';
const NUM_CONTOURS = 8;

// ── Component ─────────────────────────────────────────────────

export default function TrainingDynamicsExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();

  // ── State ────────────────────────────────────────────────────

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [lam1, setLam1] = useState(PRESETS[0].eigenvalues[0]);
  const [lam2, setLam2] = useState(PRESETS[0].eigenvalues[1]);
  const [mode, setMode] = useState<'continuous' | 'discrete'>('continuous');
  const [eta, setEta] = useState(0.1);
  const [theta0, setTheta0] = useState<[number, number]>([3, 2]);

  const conditionNumber = Math.max(lam1, lam2) / Math.min(lam1, lam2);

  // ── Computed data ────────────────────────────────────────────

  const trajectoryData = useMemo(() => {
    const loss = (t1: number, t2: number) => 0.5 * (lam1 * t1 * t1 + lam2 * t2 * t2);

    if (mode === 'continuous') {
      // Continuous: theta_i(t) = theta_i_0 * e^{-lam_i * t}
      const tMax = Math.min(5 / Math.min(lam1, lam2), 20);
      const nPts = 400;
      const dt = tMax / nPts;

      const tArr: number[] = [];
      const th1Arr: number[] = [];
      const th2Arr: number[] = [];
      const lossArr: number[] = [];
      const loss1Arr: number[] = [];
      const loss2Arr: number[] = [];

      for (let i = 0; i <= nPts; i++) {
        const t = i * dt;
        const th1 = theta0[0] * Math.exp(-lam1 * t);
        const th2 = theta0[1] * Math.exp(-lam2 * t);
        tArr.push(t);
        th1Arr.push(th1);
        th2Arr.push(th2);
        lossArr.push(loss(th1, th2));
        loss1Arr.push(0.5 * lam1 * th1 * th1);
        loss2Arr.push(0.5 * lam2 * th2 * th2);
      }

      return { t: tArr, th1: th1Arr, th2: th2Arr, loss: lossArr, loss1: loss1Arr, loss2: loss2Arr, isDiscrete: false as const };
    } else {
      // Discrete: theta_i^(k) = (1 - eta * lam_i)^k * theta_i_0
      const factor1 = 1 - eta * lam1;
      const factor2 = 1 - eta * lam2;

      // Determine max steps: converge or diverge
      const maxSteps = 500;
      const kArr: number[] = [];
      const th1Arr: number[] = [];
      const th2Arr: number[] = [];
      const lossArr: number[] = [];
      const loss1Arr: number[] = [];
      const loss2Arr: number[] = [];

      for (let k = 0; k <= maxSteps; k++) {
        const th1 = Math.pow(factor1, k) * theta0[0];
        const th2 = Math.pow(factor2, k) * theta0[1];

        // Check for divergence
        if (!isFinite(th1) || !isFinite(th2) || Math.abs(th1) > 1e8 || Math.abs(th2) > 1e8) {
          break;
        }

        kArr.push(k);
        th1Arr.push(th1);
        th2Arr.push(th2);
        const L = loss(th1, th2);
        lossArr.push(L);
        loss1Arr.push(0.5 * lam1 * th1 * th1);
        loss2Arr.push(0.5 * lam2 * th2 * th2);

        // Converged
        if (L < 1e-10) break;
      }

      return { t: kArr, th1: th1Arr, th2: th2Arr, loss: lossArr, loss1: loss1Arr, loss2: loss2Arr, isDiscrete: true as const };
    }
  }, [lam1, lam2, mode, eta, theta0]);

  // ── Contour levels ──────────────────────────────────────────

  const contourLevels = useMemo(() => {
    const L0 = 0.5 * (lam1 * theta0[0] * theta0[0] + lam2 * theta0[1] * theta0[1]);
    const maxLevel = Math.max(L0 * 1.2, 1);
    const levels: number[] = [];
    for (let i = 1; i <= NUM_CONTOURS; i++) {
      levels.push((maxLevel * i) / NUM_CONTOURS);
    }
    return levels;
  }, [lam1, lam2, theta0]);

  // ── Click handler for contour plot ──────────────────────────

  const handleContourClick = useCallback(
    (e: MouseEvent<SVGSVGElement>) => {
      const svgEl = e.currentTarget;
      const rect = svgEl.getBoundingClientRect();
      const leftPanelW = Math.max(0, (width * 0.55) - 4);
      const innerW = leftPanelW - margin.left - margin.right;
      const totalH = Math.min(Math.max(width * 0.45, 280), 400);
      const innerH = totalH - margin.top - margin.bottom;
      if (innerW <= 0 || innerH <= 0) return;

      // Determine the plot bounds from theta0 range
      const bound = Math.max(Math.abs(theta0[0]), Math.abs(theta0[1]), 2) * 1.5;

      const xPx = e.clientX - rect.left - margin.left;
      const yPx = e.clientY - rect.top - margin.top;

      const xVal = (xPx / innerW) * 2 * bound - bound;
      const yVal = bound - (yPx / innerH) * 2 * bound;

      if (
        xVal >= -bound &&
        xVal <= bound &&
        yVal >= -bound &&
        yVal <= bound
      ) {
        setTheta0([
          Math.round(xVal * 10) / 10,
          Math.round(yVal * 10) / 10,
        ]);
      }
    },
    [width, theta0],
  );

  // ── D3: Contour plot (left panel) ───────────────────────────

  const contourRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (width === 0) return;

      const leftPanelW = Math.max(0, (width * 0.55) - 4);
      const totalH = Math.min(Math.max(width * 0.45, 280), 400);
      const innerW = leftPanelW - margin.left - margin.right;
      const innerH = totalH - margin.top - margin.bottom;
      if (innerW <= 0 || innerH <= 0) return;

      svg.attr('width', leftPanelW).attr('height', totalH);

      const g = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      // Plot domain
      const bound = Math.max(Math.abs(theta0[0]), Math.abs(theta0[1]), 2) * 1.5;
      const xScale = d3.scaleLinear().domain([-bound, bound]).range([0, innerW]);
      const yScale = d3.scaleLinear().domain([-bound, bound]).range([innerH, 0]);

      // Axes
      g.append('g')
        .attr('transform', `translate(0,${innerH})`)
        .call(d3.axisBottom(xScale).ticks(5))
        .selectAll('text')
        .style('font-size', '10px');
      g.call(d3.axisLeft(yScale).ticks(5))
        .selectAll('text')
        .style('font-size', '10px');

      // Axis labels
      g.append('text')
        .attr('x', innerW / 2)
        .attr('y', innerH + 36)
        .attr('text-anchor', 'middle')
        .style('font-size', '11px')
        .style('fill', '#374151')
        .text('\u03B8\u2081');
      g.append('text')
        .attr('x', -innerH / 2)
        .attr('y', -38)
        .attr('text-anchor', 'middle')
        .attr('transform', 'rotate(-90)')
        .style('font-size', '11px')
        .style('fill', '#374151')
        .text('\u03B8\u2082');

      // Title
      g.append('text')
        .attr('x', innerW / 2)
        .attr('y', -8)
        .attr('text-anchor', 'middle')
        .style('font-size', '11px')
        .style('fill', '#374151')
        .text('Loss contours + trajectory');

      // Draw contour ellipses
      // L = c means ½(λ₁θ₁² + λ₂θ₂²) = c, so θ₁²/(2c/λ₁) + θ₂²/(2c/λ₂) = 1
      const contourColor = d3.scaleLinear<string>()
        .domain([0, contourLevels.length - 1])
        .range([CONTOUR_LO, CONTOUR_HI]);

      contourLevels.forEach((c, idx) => {
        const a = Math.sqrt(2 * c / lam1); // semi-axis along theta1
        const b = Math.sqrt(2 * c / lam2); // semi-axis along theta2

        // Draw the ellipse using parametric points
        const nEllipsePts = 120;
        const ellipsePts: [number, number][] = [];
        for (let i = 0; i <= nEllipsePts; i++) {
          const angle = (2 * Math.PI * i) / nEllipsePts;
          ellipsePts.push([a * Math.cos(angle), b * Math.sin(angle)]);
        }

        const ellipseLine = d3
          .line<[number, number]>()
          .x((d) => xScale(d[0]))
          .y((d) => yScale(d[1]));

        g.append('path')
          .attr('d', ellipseLine(ellipsePts))
          .style('fill', 'none')
          .style('stroke', contourColor(idx))
          .style('stroke-width', 1)
          .style('stroke-opacity', 0.7);
      });

      // Origin marker
      g.append('circle')
        .attr('cx', xScale(0))
        .attr('cy', yScale(0))
        .attr('r', 3)
        .style('fill', '#374151');

      // Trajectory
      const { th1, th2, isDiscrete } = trajectoryData;
      const trajPts = th1.map((_, i) => ({ x: th1[i], y: th2[i] }));
      const trajLine = d3
        .line<{ x: number; y: number }>()
        .x((d) => xScale(d.x))
        .y((d) => yScale(d.y))
        .defined((d) => isFinite(d.x) && isFinite(d.y));

      const trajColor = isDiscrete ? RED : BLUE;

      g.append('path')
        .attr('d', trajLine(trajPts))
        .style('fill', 'none')
        .style('stroke', trajColor)
        .style('stroke-width', 2);

      // Dots at each discrete step
      if (isDiscrete) {
        trajPts.forEach((pt) => {
          if (isFinite(pt.x) && isFinite(pt.y)) {
            g.append('circle')
              .attr('cx', xScale(pt.x))
              .attr('cy', yScale(pt.y))
              .attr('r', 2.5)
              .style('fill', RED);
          }
        });
      }

      // Initial point (circle)
      if (trajPts.length > 0) {
        g.append('circle')
          .attr('cx', xScale(trajPts[0].x))
          .attr('cy', yScale(trajPts[0].y))
          .attr('r', 5)
          .style('fill', 'none')
          .style('stroke', trajColor)
          .style('stroke-width', 2);
      }

      // Final point (small square)
      if (trajPts.length > 1) {
        const last = trajPts[trajPts.length - 1];
        if (isFinite(last.x) && isFinite(last.y)) {
          const sqSz = 4;
          g.append('rect')
            .attr('x', xScale(last.x) - sqSz)
            .attr('y', yScale(last.y) - sqSz)
            .attr('width', sqSz * 2)
            .attr('height', sqSz * 2)
            .style('fill', trajColor)
            .style('stroke', 'none');
        }
      }

      // Click instruction
      g.append('text')
        .attr('x', innerW)
        .attr('y', innerH - 4)
        .attr('text-anchor', 'end')
        .style('font-size', '10px')
        .style('fill', '#9CA3AF')
        .text('Click to set \u03B8\u2080');
    },
    [width, lam1, lam2, contourLevels, trajectoryData, theta0],
  );

  // ── D3: Loss curve (right panel) ────────────────────────────

  const lossRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (width === 0) return;

      const rightPanelW = Math.max(0, (width * 0.45) - 4);
      const totalH = Math.min(Math.max(width * 0.45, 280), 400);
      const innerW = rightPanelW - margin.left - margin.right;
      const innerH = totalH - margin.top - margin.bottom;
      if (innerW <= 0 || innerH <= 0) return;

      svg.attr('width', rightPanelW).attr('height', totalH);

      const g = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const { t, loss, loss1, loss2, isDiscrete } = trajectoryData;
      if (t.length === 0) return;

      const tMax = t[t.length - 1];
      const allLoss = [...loss, ...loss1, ...loss2].filter((v) => v > 0 && isFinite(v));
      if (allLoss.length === 0) return;

      const lossMin = d3.min(allLoss) ?? 1e-10;
      const lossMax = d3.max(allLoss) ?? 1;

      const xScale = d3.scaleLinear().domain([0, tMax]).range([0, innerW]);
      const yScale = d3
        .scaleLog()
        .domain([Math.max(lossMin * 0.5, 1e-14), lossMax * 2])
        .range([innerH, 0])
        .clamp(true);

      // Axes
      g.append('g')
        .attr('transform', `translate(0,${innerH})`)
        .call(d3.axisBottom(xScale).ticks(5))
        .selectAll('text')
        .style('font-size', '10px');
      g.call(
        d3
          .axisLeft(yScale)
          .ticks(5, '.0e'),
      )
        .selectAll('text')
        .style('font-size', '9px');

      // Axis labels
      g.append('text')
        .attr('x', innerW / 2)
        .attr('y', innerH + 36)
        .attr('text-anchor', 'middle')
        .style('font-size', '11px')
        .style('fill', '#374151')
        .text(isDiscrete ? 'step k' : 't');
      g.append('text')
        .attr('x', -innerH / 2)
        .attr('y', -38)
        .attr('text-anchor', 'middle')
        .attr('transform', 'rotate(-90)')
        .style('font-size', '11px')
        .style('fill', '#374151')
        .text('L(\u03B8)');

      // Title
      g.append('text')
        .attr('x', innerW / 2)
        .attr('y', -8)
        .attr('text-anchor', 'middle')
        .style('font-size', '11px')
        .style('fill', '#374151')
        .text('Loss curve (log scale)');

      // Line generator (filter out zero/negative for log scale)
      const makeLine = (yArr: number[]) => {
        const pts = t.map((tv, i) => ({ x: tv, y: yArr[i] }));
        return d3
          .line<{ x: number; y: number }>()
          .x((d) => xScale(d.x))
          .y((d) => yScale(d.y))
          .defined((d) => d.y > 0 && isFinite(d.y))(pts);
      };

      // Total loss (solid)
      g.append('path')
        .attr('d', makeLine(loss))
        .style('fill', 'none')
        .style('stroke', isDiscrete ? RED : BLUE)
        .style('stroke-width', 2.2);

      // Per-component losses (dashed)
      g.append('path')
        .attr('d', makeLine(loss1))
        .style('fill', 'none')
        .style('stroke', GREEN)
        .style('stroke-width', 1.5)
        .style('stroke-dasharray', '5,3');

      g.append('path')
        .attr('d', makeLine(loss2))
        .style('fill', 'none')
        .style('stroke', ORANGE)
        .style('stroke-width', 1.5)
        .style('stroke-dasharray', '5,3');

      // Dots for discrete mode
      if (isDiscrete) {
        t.forEach((tv, i) => {
          if (loss[i] > 0 && isFinite(loss[i])) {
            g.append('circle')
              .attr('cx', xScale(tv))
              .attr('cy', yScale(loss[i]))
              .attr('r', 2)
              .style('fill', RED);
          }
        });
      }

      // Legend
      const legend = g.append('g').attr('transform', `translate(${innerW - 115}, 8)`);
      const items = [
        { color: isDiscrete ? RED : BLUE, label: 'Total L(\u03B8)', dash: '' },
        { color: GREEN, label: '\u00BD\u03BB\u2081\u03B8\u2081\u00B2', dash: '5,3' },
        { color: ORANGE, label: '\u00BD\u03BB\u2082\u03B8\u2082\u00B2', dash: '5,3' },
      ];
      items.forEach((item, i) => {
        const row = legend.append('g').attr('transform', `translate(0, ${i * 16})`);
        row
          .append('line')
          .attr('x1', 0)
          .attr('y1', 0)
          .attr('x2', 16)
          .attr('y2', 0)
          .style('stroke', item.color)
          .style('stroke-width', 2)
          .style('stroke-dasharray', item.dash);
        row
          .append('text')
          .attr('x', 20)
          .attr('y', 4)
          .style('font-size', '10px')
          .style('fill', '#374151')
          .text(item.label);
      });
    },
    [width, trajectoryData],
  );

  // ── JSX ─────────────────────────────────────────────────────

  return (
    <div ref={containerRef} style={{ width: '100%', maxWidth: 860 }}>
      {/* Controls */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
          marginBottom: 10,
        }}
      >
        <label style={{ fontSize: 13, color: '#374151' }}>
          Preset:&nbsp;
          <select
            value={selectedIdx}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => {
              const idx = Number(e.target.value);
              setSelectedIdx(idx);
              const p = PRESETS[idx];
              setLam1(p.eigenvalues[0]);
              setLam2(p.eigenvalues[1]);
              setTheta0([3, 2]);
              setEta(0.1);
            }}
            style={{ fontSize: 13, padding: '2px 6px' }}
          >
            {PRESETS.map((p, i) => (
              <option key={p.name} value={i}>
                {p.label}
              </option>
            ))}
          </select>
        </label>

        <label style={{ fontSize: 13, color: '#374151' }}>
          &#x03BB;&#x2081; =&nbsp;
          <input
            type="range"
            min={0.1}
            max={10}
            step={0.1}
            value={lam1}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setLam1(Number(e.target.value))}
            style={{ width: 70, verticalAlign: 'middle' }}
          />
          <span style={{ fontSize: 11, color: '#6b7280', marginLeft: 4 }}>
            {lam1.toFixed(1)}
          </span>
        </label>

        <label style={{ fontSize: 13, color: '#374151' }}>
          &#x03BB;&#x2082; =&nbsp;
          <input
            type="range"
            min={0.1}
            max={10}
            step={0.1}
            value={lam2}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setLam2(Number(e.target.value))}
            style={{ width: 70, verticalAlign: 'middle' }}
          />
          <span style={{ fontSize: 11, color: '#6b7280', marginLeft: 4 }}>
            {lam2.toFixed(1)}
          </span>
        </label>

        <label style={{ fontSize: 13, color: '#374151' }}>
          Mode:&nbsp;
          <select
            value={mode}
            onChange={(e: ChangeEvent<HTMLSelectElement>) =>
              setMode(e.target.value as 'continuous' | 'discrete')
            }
            style={{ fontSize: 13, padding: '2px 6px' }}
          >
            <option value="continuous">Continuous</option>
            <option value="discrete">Discrete (GD)</option>
          </select>
        </label>

        {mode === 'discrete' && (
          <label style={{ fontSize: 13, color: '#374151' }}>
            &#x03B7; =&nbsp;
            <input
              type="range"
              min={0.001}
              max={0.5}
              step={0.001}
              value={eta}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setEta(Number(e.target.value))}
              style={{ width: 70, verticalAlign: 'middle' }}
            />
            <span style={{ fontSize: 11, color: '#6b7280', marginLeft: 4 }}>
              {eta.toFixed(3)}
            </span>
          </label>
        )}
      </div>

      {/* Two panels */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ flex: '1 1 55%', minWidth: 0 }}>
          <svg ref={contourRef} style={{ cursor: 'crosshair' }} onClick={handleContourClick} />
        </div>
        <div style={{ flex: '1 1 40%', minWidth: 0 }}>
          <svg ref={lossRef} />
        </div>
      </div>

      {/* Info line */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
          justifyContent: 'space-between',
          marginTop: 8,
          fontSize: 12,
          color: '#374151',
        }}
      >
        <span>
          Condition number: <strong>{'\u03BA'} = {conditionNumber.toFixed(1)}</strong>
        </span>
        <span>
          {'\u03B8'}{'\u2080'} = ({theta0[0].toFixed(1)}, {theta0[1].toFixed(1)})
        </span>
        {mode === 'discrete' && (
          <span>
            Stable range: {'\u03B7'} {'<'} {(2 / Math.max(lam1, lam2)).toFixed(3)}
          </span>
        )}
      </div>

      {/* Description */}
      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>
        {PRESETS[selectedIdx].description}
      </div>
    </div>
  );
}
