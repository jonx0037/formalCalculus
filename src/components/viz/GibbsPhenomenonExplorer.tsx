import { useState, useMemo, useCallback, type ChangeEvent } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { functionColors, regionColors } from './shared/colorScales';
import { getFourierPresets, GIBBS_CONSTANT } from '../../data/fourier-series-data';
import type { FourierPreset } from '../../data/fourier-series-data';

// ── Constants ─────────────────────────────────────────────

const margin = { top: 20, right: 20, bottom: 40, left: 50 };
const GAP = 16;
const PARTIAL_SUM_COLOR = '#F59E0B';
const MIN_N = 5;
const MAX_N = 200;
const DEFAULT_N = 20;

// ── Helpers ───────────────────────────────────────────────

/** Evaluate the Fourier partial sum S_n(x) for a given preset. */
function fourierPartialSum(preset: FourierPreset, x: number, n: number): number {
  let Sn = preset.an(0) / 2;
  for (let k = 1; k <= n; k++) {
    Sn += preset.an(k) * Math.cos(k * x) + preset.bn(k) * Math.sin(k * x);
  }
  return Sn;
}

/**
 * For a given preset and jump location, determine the target value
 * just after the jump (the "right limit" the partial sum overshoots toward).
 */
function getTargetValueAfterJump(preset: FourierPreset, jumpLoc: number): number {
  const eps = 0.001;
  return preset.f(jumpLoc + eps);
}

/**
 * For a given preset and jump location, determine the target value
 * just before the jump (the "left limit").
 */
function getTargetValueBeforeJump(preset: FourierPreset, jumpLoc: number): number {
  const eps = 0.001;
  return preset.f(jumpLoc - eps);
}

/**
 * Find the max of S_m(x) in a small window after the jump location.
 * Returns { maxVal, maxX }.
 */
function findOvershootMax(
  preset: FourierPreset,
  jumpLoc: number,
  m: number,
  gridPts: number = 200,
): { maxVal: number; maxX: number } {
  const xMin = jumpLoc + 0.001;
  const xMax = jumpLoc + 2 * Math.PI / (m + 0.5);
  if (xMax <= xMin) return { maxVal: fourierPartialSum(preset, xMin, m), maxX: xMin };

  const step = (xMax - xMin) / gridPts;
  let maxVal = -Infinity;
  let maxX = xMin;
  for (let i = 0; i <= gridPts; i++) {
    const x = xMin + i * step;
    const val = fourierPartialSum(preset, x, m);
    if (val > maxVal) {
      maxVal = val;
      maxX = x;
    }
  }
  return { maxVal, maxX };
}

/**
 * For presets where the jump goes downward (target after < target before),
 * we look for the minimum (undershoot) instead.
 */
function findUndershootMin(
  preset: FourierPreset,
  jumpLoc: number,
  m: number,
  gridPts: number = 200,
): { minVal: number; minX: number } {
  const xMin = jumpLoc + 0.001;
  const xMax = jumpLoc + 2 * Math.PI / (m + 0.5);
  if (xMax <= xMin) return { minVal: fourierPartialSum(preset, xMin, m), minX: xMin };

  const step = (xMax - xMin) / gridPts;
  let minVal = Infinity;
  let minX = xMin;
  for (let i = 0; i <= gridPts; i++) {
    const x = xMin + i * step;
    const val = fourierPartialSum(preset, x, m);
    if (val < minVal) {
      minVal = val;
      minX = x;
    }
  }
  return { minVal, minX };
}

// ── Interfaces ────────────────────────────────────────────

interface OvershootPoint {
  n: number;
  ratio: number;
}

// ── Component ─────────────────────────────────────────────

export default function GibbsPhenomenonExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();
  const height = Math.min(width * 0.55, 400);

  // Filter to only presets with jump discontinuities
  const jumpPresets = useMemo(
    () => getFourierPresets().filter((p) => p.hasJumpDiscontinuity),
    [],
  );

  const [presetIdx, setPresetIdx] = useState(0);
  const [n, setN] = useState(DEFAULT_N);
  const [zoomLevel, setZoomLevel] = useState(0.5);

  const preset = jumpPresets[presetIdx];

  // Select the jump with the largest |f(x⁺) - f(x⁻)| for the most dramatic Gibbs demo
  const { jumpLoc, targetAfter, targetBefore } = useMemo(() => {
    let bestLoc = preset.jumpLocations[0];
    let bestA = getTargetValueAfterJump(preset, bestLoc);
    let bestB = getTargetValueBeforeJump(preset, bestLoc);
    let bestJump = Math.abs(bestA - bestB);

    for (let i = 1; i < preset.jumpLocations.length; i++) {
      const loc = preset.jumpLocations[i];
      const a = getTargetValueAfterJump(preset, loc);
      const b = getTargetValueBeforeJump(preset, loc);
      const jump = Math.abs(a - b);
      if (jump > bestJump) {
        bestLoc = loc;
        bestA = a;
        bestB = b;
        bestJump = jump;
      }
    }
    return { jumpLoc: bestLoc, targetAfter: bestA, targetBefore: bestB };
  }, [preset]);

  const jumpGoesUp = targetAfter > targetBefore;
  const jumpSize = Math.abs(targetAfter - targetBefore);
  const midpoint = (targetAfter + targetBefore) / 2;

  // ── LEFT PANEL DATA: Partial sum near the jump ──────────

  const leftPanelData = useMemo(() => {
    // x-window around the jump: from just past the jump to some distance
    // controlled by zoom. At zoom=0 we show a tiny window; at zoom=1 we show up to pi.
    const windowMin = Math.PI / (n + 0.5);
    const windowMax = Math.PI;
    const halfWindow = windowMin + zoomLevel * (windowMax - windowMin);

    const xMin = jumpLoc - halfWindow * 0.3;
    const xMax = jumpLoc + halfWindow;

    const numPts = 500;
    const step = (xMax - xMin) / numPts;

    const partialSumPts: { x: number; sn: number }[] = [];
    const targetPts: { x: number; fx: number }[] = [];

    for (let i = 0; i <= numPts; i++) {
      const x = xMin + i * step;
      partialSumPts.push({ x, sn: fourierPartialSum(preset, x, n) });
      targetPts.push({ x, fx: preset.f(x) });
    }

    // Find the actual overshoot max
    let overshootVal: number;
    let overshootX: number;

    if (jumpGoesUp) {
      const { maxVal, maxX } = findOvershootMax(preset, jumpLoc, n);
      overshootVal = maxVal;
      overshootX = maxX;
    } else {
      const { minVal, minX } = findUndershootMin(preset, jumpLoc, n);
      overshootVal = minVal;
      overshootX = minX;
    }

    return { partialSumPts, targetPts, xMin, xMax, overshootVal, overshootX };
  }, [preset, n, zoomLevel, jumpLoc, jumpGoesUp]);

  // ── RIGHT PANEL DATA: Overshoot ratio vs n ─────────────

  const overshootData = useMemo(() => {
    const pts: OvershootPoint[] = [];
    const halfJump = jumpSize / 2;

    for (let m = MIN_N; m <= n; m++) {
      let ratio: number;

      if (jumpGoesUp) {
        const { maxVal } = findOvershootMax(preset, jumpLoc, m, 200);
        // Universal normalization: (extremum - midpoint) / halfJump
        // This converges to GIBBS_CONSTANT ≈ 1.179 for ANY jump size/offset
        ratio = halfJump > 1e-10 ? (maxVal - midpoint) / halfJump : 1;
      } else {
        const { minVal } = findUndershootMin(preset, jumpLoc, m, 200);
        // For downward jumps: the undershoot goes below midpoint
        ratio = halfJump > 1e-10 ? (midpoint - minVal) / halfJump : 1;
      }

      if (isFinite(ratio) && Math.abs(ratio) < 10) {
        pts.push({ n: m, ratio });
      }
    }

    return pts;
  }, [preset, n, jumpLoc, jumpGoesUp, jumpSize, midpoint]);

  // Current overshoot readout
  const currentOvershoot = useMemo(() => {
    if (jumpGoesUp) {
      const { maxVal } = findOvershootMax(preset, jumpLoc, n);
      const ratio = targetAfter !== 0 ? maxVal / targetAfter : maxVal;
      return { maxVal, ratio };
    }
    const { minVal } = findUndershootMin(preset, jumpLoc, n);
    const ratio = targetAfter !== 0 ? minVal / targetAfter : minVal;
    return { maxVal: minVal, ratio };
  }, [preset, n, jumpLoc, jumpGoesUp, targetAfter]);

  // ── Handlers ────────────────────────────────────────────

  const handlePresetChange = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      setPresetIdx(Number(e.target.value));
      setN(DEFAULT_N);
      setZoomLevel(0.5);
    },
    [],
  );

  // ── D3 rendering ────────────────────────────────────────

  const isNarrow = width < 550;
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;
  const panelW = isNarrow ? innerW : (innerW - GAP) / 2;
  const panelH = isNarrow ? Math.floor(innerH / 2) - GAP / 2 : innerH;
  const svgHeight = isNarrow ? margin.top + panelH * 2 + GAP + margin.bottom : height;

  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (width <= 0 || height <= 0 || panelW < 40) return;

      // ── LEFT PANEL: Zoomed overshoot view ───────────

      const leftG = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const { partialSumPts, targetPts, xMin, xMax, overshootVal, overshootX } = leftPanelData;

      // Scales
      const xScaleL = d3.scaleLinear().domain([xMin, xMax]).range([0, panelW]);

      const allYLeft = [
        ...partialSumPts.map((d) => d.sn),
        ...targetPts.map((d) => d.fx),
      ].filter((v) => isFinite(v));
      const yExtL = d3.extent(allYLeft) as [number, number];
      const yRangeL = yExtL[1] - yExtL[0];
      const yPadL = (yRangeL * 0.12) || 0.2;
      const yScaleL = d3
        .scaleLinear()
        .domain([yExtL[0] - yPadL, yExtL[1] + yPadL])
        .range([panelH, 0]);

      // Clip path
      const defs = svg.append('defs');
      defs
        .append('clipPath')
        .attr('id', 'clip-gibbs-left')
        .append('rect')
        .attr('width', panelW)
        .attr('height', panelH);

      const leftClip = leftG.append('g').attr('clip-path', 'url(#clip-gibbs-left)');

      // Overshoot region fill: area between partial sum and target above the jump
      // We shade the region where the partial sum exceeds the target after the jump
      const overshootRegion = partialSumPts.filter((d) => {
        if (jumpGoesUp) {
          return d.x > jumpLoc && d.sn > targetAfter;
        }
        return d.x > jumpLoc && d.sn < targetAfter;
      });

      if (overshootRegion.length > 1) {
        const areaGen = jumpGoesUp
          ? d3
              .area<{ x: number; sn: number }>()
              .x((d) => xScaleL(d.x))
              .y0(() => yScaleL(targetAfter))
              .y1((d) => yScaleL(d.sn))
          : d3
              .area<{ x: number; sn: number }>()
              .x((d) => xScaleL(d.x))
              .y0((d) => yScaleL(d.sn))
              .y1(() => yScaleL(targetAfter));

        leftClip
          .append('path')
          .datum(overshootRegion)
          .attr('d', areaGen)
          .style('fill', regionColors.errorFill)
          .style('fill-opacity', 0.5)
          .style('stroke', 'none');
      }

      // Target function curve
      const targetLine = d3
        .line<{ x: number; fx: number }>()
        .x((d) => xScaleL(d.x))
        .y((d) => yScaleL(d.fx))
        .defined((d) => isFinite(d.fx));

      // We draw the target in two segments to show the jump gap
      const targetBefore_ = targetPts.filter((d) => d.x < jumpLoc - 0.002);
      const targetAfter_ = targetPts.filter((d) => d.x > jumpLoc + 0.002);

      if (targetBefore_.length > 1) {
        leftClip
          .append('path')
          .datum(targetBefore_)
          .attr('d', targetLine)
          .style('fill', 'none')
          .style('stroke', functionColors[0])
          .style('stroke-width', 2)
          .style('stroke-opacity', 0.8);
      }

      if (targetAfter_.length > 1) {
        leftClip
          .append('path')
          .datum(targetAfter_)
          .attr('d', targetLine)
          .style('fill', 'none')
          .style('stroke', functionColors[0])
          .style('stroke-width', 2)
          .style('stroke-opacity', 0.8);
      }

      // Open/closed circles at the discontinuity
      const yBeforeJump = yScaleL(targetBefore);
      const yAfterJump = yScaleL(targetAfter);
      const xJumpPx = xScaleL(jumpLoc);

      if (xJumpPx >= 0 && xJumpPx <= panelW) {
        // Closed circle on the "landing" side (the value f approaches from one side)
        leftClip
          .append('circle')
          .attr('cx', xJumpPx)
          .attr('cy', yAfterJump)
          .attr('r', 4)
          .style('fill', functionColors[0])
          .style('stroke', functionColors[0])
          .style('stroke-width', 1.5);

        // Open circle on the "departure" side
        leftClip
          .append('circle')
          .attr('cx', xJumpPx)
          .attr('cy', yBeforeJump)
          .attr('r', 4)
          .style('fill', 'var(--color-surface, white)')
          .style('stroke', functionColors[0])
          .style('stroke-width', 1.5);
      }

      // Jump height dashed line
      const jumpTarget = jumpGoesUp ? targetAfter : targetAfter;
      const yJumpLine = yScaleL(jumpTarget);
      leftClip
        .append('line')
        .attr('x1', 0)
        .attr('x2', panelW)
        .attr('y1', yJumpLine)
        .attr('y2', yJumpLine)
        .style('stroke', '#9CA3AF')
        .style('stroke-dasharray', '4,3')
        .style('stroke-width', 1);

      // Partial sum curve (orange)
      const snLine = d3
        .line<{ x: number; sn: number }>()
        .x((d) => xScaleL(d.x))
        .y((d) => yScaleL(d.sn))
        .defined((d) => isFinite(d.sn));

      leftClip
        .append('path')
        .datum(partialSumPts)
        .attr('d', snLine)
        .style('fill', 'none')
        .style('stroke', PARTIAL_SUM_COLOR)
        .style('stroke-width', 2);

      // Mark the max overshoot point
      if (isFinite(overshootVal) && overshootX >= xMin && overshootX <= xMax) {
        leftClip
          .append('circle')
          .attr('cx', xScaleL(overshootX))
          .attr('cy', yScaleL(overshootVal))
          .attr('r', 5)
          .style('fill', '#EF4444')
          .style('stroke', 'white')
          .style('stroke-width', 1.5);
      }

      // Axes
      leftG
        .append('g')
        .attr('transform', `translate(0,${panelH})`)
        .call(d3.axisBottom(xScaleL).ticks(Math.min(5, Math.floor(panelW / 60))))
        .call((a) => {
          a.select('.domain').style('stroke', 'var(--color-border)');
          a.selectAll('.tick line').style('stroke', 'var(--color-border)');
          a.selectAll('.tick text')
            .style('fill', 'var(--color-text-muted)')
            .style('font-size', '10px');
        });

      leftG
        .append('g')
        .call(d3.axisLeft(yScaleL).ticks(5))
        .call((a) => {
          a.select('.domain').style('stroke', 'var(--color-border)');
          a.selectAll('.tick line').style('stroke', 'var(--color-border)');
          a.selectAll('.tick text')
            .style('fill', 'var(--color-text-muted)')
            .style('font-size', '10px');
        });

      // Axis labels
      leftG
        .append('text')
        .attr('x', panelW / 2)
        .attr('y', panelH + 32)
        .attr('text-anchor', 'middle')
        .style('fill', 'var(--color-text-muted)')
        .style('font-size', '11px')
        .text('x');

      leftG
        .append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -panelH / 2)
        .attr('y', -38)
        .attr('text-anchor', 'middle')
        .style('fill', 'var(--color-text-muted)')
        .style('font-size', '11px')
        .text('S\u2099(x)');

      // Panel title
      leftG
        .append('text')
        .attr('x', panelW / 2)
        .attr('y', -6)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('font-weight', '600')
        .style('fill', 'var(--color-text)')
        .text('Overshoot near jump');

      // ── RIGHT PANEL: Overshoot ratio vs n ──────────

      const rightX = isNarrow ? 0 : panelW + GAP;
      const rightY = isNarrow ? panelH + GAP : 0;

      const rightG = svg
        .append('g')
        .attr('transform', `translate(${margin.left + rightX},${margin.top + rightY})`);

      // Clip path
      defs
        .append('clipPath')
        .attr('id', 'clip-gibbs-right')
        .append('rect')
        .attr('width', panelW)
        .attr('height', panelH);

      const rightClip = rightG.append('g').attr('clip-path', 'url(#clip-gibbs-right)');

      if (overshootData.length > 1) {
        // Scales
        const xExtent = d3.extent(overshootData, (d) => d.n) as [number, number];
        const xScaleR = d3.scaleLinear().domain([xExtent[0] - 1, xExtent[1] + 1]).range([0, panelW]);

        const yValues = overshootData.map((d) => d.ratio).filter((v) => isFinite(v));
        // Include Gibbs constant and 1.0 in extent calculation
        yValues.push(GIBBS_CONSTANT, 1.0);
        const yExtR = d3.extent(yValues) as [number, number];
        const yRangeR = yExtR[1] - yExtR[0];
        const yPadR = (yRangeR * 0.15) || 0.1;
        const yScaleR = d3
          .scaleLinear()
          .domain([Math.min(yExtR[0] - yPadR, 0.85), yExtR[1] + yPadR])
          .range([panelH, 0]);

        // 9% overshoot band (between 1.0 and GIBBS_CONSTANT)
        const bandY0 = yScaleR(1.0);
        const bandY1 = yScaleR(GIBBS_CONSTANT);
        const bandTop = Math.min(bandY0, bandY1);
        const bandHeight = Math.abs(bandY0 - bandY1);

        rightClip
          .append('rect')
          .attr('x', 0)
          .attr('y', bandTop)
          .attr('width', panelW)
          .attr('height', bandHeight)
          .style('fill', '#FEF3C7')
          .style('fill-opacity', 0.5);

        // Horizontal line at 1.0
        rightClip
          .append('line')
          .attr('x1', 0)
          .attr('x2', panelW)
          .attr('y1', yScaleR(1.0))
          .attr('y2', yScaleR(1.0))
          .style('stroke', '#9CA3AF')
          .style('stroke-dasharray', '3,3')
          .style('stroke-width', 1);

        // Gibbs asymptote line (red dashed)
        rightClip
          .append('line')
          .attr('x1', 0)
          .attr('x2', panelW)
          .attr('y1', yScaleR(GIBBS_CONSTANT))
          .attr('y2', yScaleR(GIBBS_CONSTANT))
          .style('stroke', '#DC2626')
          .style('stroke-dasharray', '6,4')
          .style('stroke-width', 1.5);

        // Asymptote label
        rightG
          .append('text')
          .attr('x', panelW - 4)
          .attr('y', yScaleR(GIBBS_CONSTANT) - 6)
          .attr('text-anchor', 'end')
          .style('fill', '#DC2626')
          .style('font-size', '10px')
          .style('font-weight', '600')
          .text('\u2248 1.179 (9% overshoot)');

        // Scatter points of actual overshoot ratio
        rightClip
          .selectAll('.overshoot-dot')
          .data(overshootData)
          .join('circle')
          .attr('class', 'overshoot-dot')
          .attr('cx', (d) => xScaleR(d.n))
          .attr('cy', (d) => yScaleR(d.ratio))
          .attr('r', 2.5)
          .style('fill', PARTIAL_SUM_COLOR)
          .style('opacity', 0.7);

        // Connecting line through dots
        const ratioLine = d3
          .line<OvershootPoint>()
          .x((d) => xScaleR(d.n))
          .y((d) => yScaleR(d.ratio))
          .defined((d) => isFinite(d.ratio));

        rightClip
          .append('path')
          .datum(overshootData)
          .attr('d', ratioLine)
          .style('fill', 'none')
          .style('stroke', PARTIAL_SUM_COLOR)
          .style('stroke-width', 1.5)
          .style('stroke-opacity', 0.6);

        // Axes
        rightG
          .append('g')
          .attr('transform', `translate(0,${panelH})`)
          .call(d3.axisBottom(xScaleR).ticks(Math.min(6, Math.floor(panelW / 50))))
          .call((a) => {
            a.select('.domain').style('stroke', 'var(--color-border)');
            a.selectAll('.tick line').style('stroke', 'var(--color-border)');
            a.selectAll('.tick text')
              .style('fill', 'var(--color-text-muted)')
              .style('font-size', '10px');
          });

        rightG
          .append('g')
          .call(d3.axisLeft(yScaleR).ticks(5))
          .call((a) => {
            a.select('.domain').style('stroke', 'var(--color-border)');
            a.selectAll('.tick line').style('stroke', 'var(--color-border)');
            a.selectAll('.tick text')
              .style('fill', 'var(--color-text-muted)')
              .style('font-size', '10px');
          });

        // Axis labels
        rightG
          .append('text')
          .attr('x', panelW / 2)
          .attr('y', panelH + 32)
          .attr('text-anchor', 'middle')
          .style('fill', 'var(--color-text-muted)')
          .style('font-size', '11px')
          .text('n');

        rightG
          .append('text')
          .attr('transform', 'rotate(-90)')
          .attr('x', -panelH / 2)
          .attr('y', -38)
          .attr('text-anchor', 'middle')
          .style('fill', 'var(--color-text-muted)')
          .style('font-size', '11px')
          .text('max(S\u2099) / target');
      } else {
        rightG
          .append('text')
          .attr('x', panelW / 2)
          .attr('y', panelH / 2)
          .attr('text-anchor', 'middle')
          .style('fill', 'var(--color-text-muted)')
          .style('font-size', '12px')
          .text('Increase n to see overshoot data');
      }

      // Panel title (right)
      rightG
        .append('text')
        .attr('x', panelW / 2)
        .attr('y', -6)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('font-weight', '600')
        .style('fill', 'var(--color-text)')
        .text('Overshoot ratio vs n');
    },
    [width, height, leftPanelData, overshootData, panelW, panelH, isNarrow, preset, n, jumpLoc, jumpGoesUp, targetAfter, targetBefore],
  );

  // ── Readout values ──────────────────────────────────────

  const overshootStr = isFinite(currentOvershoot.maxVal)
    ? currentOvershoot.maxVal.toFixed(4)
    : 'N/A';
  const ratioStr = isFinite(currentOvershoot.ratio)
    ? currentOvershoot.ratio.toFixed(4)
    : 'N/A';

  return (
    <div ref={containerRef} className="w-full my-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4 mb-3">
        <label className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Signal:
          <select
            value={presetIdx}
            onChange={handlePresetChange}
            className="ml-2 px-2 py-1 rounded text-sm"
            style={{
              background: 'var(--color-surface-alt)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
            }}
          >
            {jumpPresets.map((p, i) => (
              <option key={p.name} value={i}>
                {p.label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          n = {n}
          <input
            type="range"
            min={MIN_N}
            max={MAX_N}
            step={1}
            value={n}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setN(Number(e.target.value))}
            className="ml-2 w-28"
          />
        </label>

        <label className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Zoom:
          <input
            type="range"
            min={0.05}
            max={1}
            step={0.01}
            value={zoomLevel}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setZoomLevel(Number(e.target.value))}
            className="ml-2 w-24"
          />
        </label>
      </div>

      {/* SVG */}
      <svg ref={svgRef} width={width} height={svgHeight} />

      {/* Legend / readout */}
      <div className="flex flex-wrap gap-4 mt-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
        <span>
          <span style={{ color: functionColors[0] }}>{'\u2500'}</span> Target f(x)
        </span>
        <span>
          <span style={{ color: PARTIAL_SUM_COLOR }}>{'\u2500'}</span> S<sub>{n}</sub>(x)
        </span>
        <span>
          <span style={{ color: '#DC2626' }}>{'\u2500'}</span> Gibbs limit{' '}
          {'\u2248'} {GIBBS_CONSTANT.toFixed(3)}
        </span>
      </div>

      <div
        className="mt-2 text-xs font-mono px-3 py-2 rounded"
        style={{
          color: 'var(--color-text)',
          background: 'var(--color-surface-alt)',
          border: '1px solid var(--color-border)',
        }}
      >
        n = {n}, max overshoot = {overshootStr}, ratio = {ratioStr}, position{' '}
        {'\u2248'} {'\u03C0'}/{n}
      </div>
    </div>
  );
}
