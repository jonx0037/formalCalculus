/**
 * GramSchmidtAnimator — Topic 33 (Linear Algebra), §3.10.
 *
 * Step-through animation of the Gram-Schmidt process on a basis of ℝ³.
 * For each input vector v_k, the algorithm subtracts off the projections
 * onto the previously-orthonormalized {q_1, ..., q_{k-1}}, leaving an
 * orthogonal u_k, then normalizes to produce q_k. We render the three
 * stages per vector — v_k in grey, projections in orange, u_k in blue,
 * q_k in green — and walk the reader through them with Next / Run-to-end
 * / Reset controls.
 *
 * The 3D-to-2D rendering uses the fixed isometric projectToScreen() helper
 * from shared/linearAlgebra.ts. There is no orbit control; the projection
 * is diagrammatic, intentionally fixed so the reader's attention stays on
 * the algorithm.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useD3 } from './shared/useD3';
import { useResizeObserver } from './shared/useResizeObserver';
import {
  dot,
  gramSchmidt,
  norm,
  projectToScreen,
  scale,
  type Vector,
} from './shared/linearAlgebra';
import {
  getBasisPresets,
  type BasisPreset,
} from '../../data/linear-algebra-data';

// ── Constants ─────────────────────────────────────────────────

const VIEW_HALF = 3;
const SVG_MAX_SIZE = 480;
const SVG_MIN_SIZE = 320;
const margin = { top: 16, right: 16, bottom: 16, left: 16 };

const COLOR_V = '#94a3b8';   // slate-400 — original input v_k
const COLOR_PROJ = '#f59e0b'; // amber-500 — subtracted projection components
const COLOR_U = '#2563eb';   // blue-600  — non-normalized u_k
const COLOR_Q = '#10b981';   // emerald-500 — orthonormal q_k

const STEP_DURATION_MS = 1500;

// ── Types ─────────────────────────────────────────────────────

export interface GramSchmidtAnimatorProps {
  /** Initial basis of ℝ³ (3 linearly independent vectors). Defaults to a skewed basis. */
  initialBasis?: number[][];
}

// The animator walks through these phases. For 3 input vectors there are
// 3 vectors × 3 phases = 9 stages, plus the initial "before any work" stage
// and a final "done" stage = 11 total. We pack them as (k, phase) pairs.
type Phase = 'project' | 'subtract' | 'normalize';

interface Step {
  k: number;       // 1, 2, or 3 — which input vector we're working on
  phase: Phase;    // which phase of the work
}

// ── Helpers ───────────────────────────────────────────────────

function formatNum(n: number, decimals = 2): string {
  if (Math.abs(n) < 1e-9) return '0.00';
  return n.toFixed(decimals);
}

function formatVec(v: Vector, decimals = 2): string {
  return '(' + v.map((x) => formatNum(x, decimals)).join(', ') + ')';
}

// ── Component ─────────────────────────────────────────────────

export default function GramSchmidtAnimator({ initialBasis }: GramSchmidtAnimatorProps) {
  const { ref: containerRef, width: containerWidth } =
    useResizeObserver<HTMLDivElement>();

  const presets = useMemo<BasisPreset[]>(
    () => getBasisPresets().filter((p) => p.ambient === 3),
    [],
  );

  // Default preset is the "Gram-Schmidt-worthy" skewed 3D basis from slice 1.
  const [presetId, setPresetId] = useState<string>('skewed-3d');

  const inputBasis = useMemo<Vector[]>(() => {
    if (initialBasis && initialBasis.length === 3) {
      return initialBasis.map((row) => [...row]);
    }
    const preset = presets.find((p) => p.id === presetId) ?? presets[0];
    return preset.vectors.map((row) => [...row]);
  }, [initialBasis, presets, presetId]);

  // Run Gram-Schmidt once to get all intermediate and final vectors.
  const { Q, intermediate } = useMemo(() => {
    try {
      const result = gramSchmidt(inputBasis, { returnIntermediate: true });
      return { Q: result.Q, intermediate: result.intermediate ?? [] };
    } catch {
      return { Q: [], intermediate: [] };
    }
  }, [inputBasis]);

  // Build the linear sequence of (k, phase) steps the animator walks through.
  // For n input vectors there are 3n steps, plus stage 0 (start) and stage 3n (done).
  const steps = useMemo<Step[]>(() => {
    const out: Step[] = [];
    for (let k = 1; k <= inputBasis.length; k++) {
      out.push({ k, phase: 'project' });
      out.push({ k, phase: 'subtract' });
      out.push({ k, phase: 'normalize' });
    }
    return out;
  }, [inputBasis.length]);

  // stageIndex ranges over [0, steps.length]. 0 = before any work; steps.length = done.
  const [stageIndex, setStageIndex] = useState<number>(0);
  const [running, setRunning] = useState<boolean>(false);
  const [showGramMatrix, setShowGramMatrix] = useState<boolean>(false);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleNext = useCallback(() => {
    setStageIndex((s) => Math.min(steps.length, s + 1));
  }, [steps.length]);

  const handleReset = useCallback(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setRunning(false);
    setStageIndex(0);
  }, []);

  const handleRun = useCallback(() => {
    if (running) return;
    setRunning(true);
    const tick = () => {
      setStageIndex((s) => {
        if (s >= steps.length) {
          setRunning(false);
          return s;
        }
        const next = s + 1;
        if (next < steps.length) {
          timeoutRef.current = setTimeout(tick, STEP_DURATION_MS);
        } else {
          setRunning(false);
        }
        return next;
      });
    };
    timeoutRef.current = setTimeout(tick, STEP_DURATION_MS);
  }, [running, steps.length]);

  const handlePresetChange = useCallback((nextId: string) => {
    setPresetId(nextId);
    handleReset();
  }, [handleReset]);

  // Compute what to render at the current stage.
  // We render every previously-finalized q_i in green, the current intermediate u_k in blue
  // (if available), the current v_k in grey, and the projection components in orange.
  const renderState = useMemo(() => {
    // Number of q's that have been finalized (each "normalize" step finalizes one).
    let finalizedCount = 0;
    let currentK = 0;
    let currentPhase: Phase | 'done' = 'done';
    if (stageIndex >= steps.length) {
      finalizedCount = inputBasis.length;
      currentPhase = 'done';
    } else if (stageIndex > 0) {
      const step = steps[stageIndex - 1];
      currentK = step.k;
      currentPhase = step.phase;
      // After "normalize" of step k, q_k becomes finalized.
      finalizedCount = 0;
      for (let i = 0; i < stageIndex; i++) {
        if (steps[i].phase === 'normalize') finalizedCount += 1;
      }
    }

    // Vector lists to render:
    const finalizedQs = Q.slice(0, finalizedCount);
    const projectionTerms: Array<{ vec: Vector; label: string }> = [];
    let intermediateU: Vector | null = null;
    let currentV: Vector | null = null;

    if (currentK >= 1 && currentPhase !== 'done') {
      currentV = inputBasis[currentK - 1];
      // Build the projection components onto each previously-finalized q_i.
      if (currentPhase === 'project' || currentPhase === 'subtract') {
        for (let i = 0; i < currentK - 1; i++) {
          const coef = dot(currentV, Q[i]);
          projectionTerms.push({
            vec: scale(Q[i], coef),
            label: `⟨v${sub(currentK)}, q${sub(i + 1)}⟩ q${sub(i + 1)}`,
          });
        }
      }
      if (currentPhase === 'subtract' || currentPhase === 'normalize') {
        intermediateU = intermediate[currentK - 1] ?? null;
      }
    }

    return {
      finalizedQs,
      projectionTerms,
      intermediateU,
      currentV,
      currentK,
      currentPhase,
      finalizedCount,
    };
  }, [Q, intermediate, inputBasis, steps, stageIndex]);

  const svgSize = useMemo(() => {
    if (!containerWidth) return SVG_MAX_SIZE;
    return Math.max(SVG_MIN_SIZE, Math.min(SVG_MAX_SIZE, Math.floor(containerWidth)));
  }, [containerWidth]);

  // ── D3 rendering ────────────────────────────────────────────
  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      const innerW = svgSize - margin.left - margin.right;
      const innerH = svgSize - margin.top - margin.bottom;
      if (innerW <= 0 || innerH <= 0) return;

      const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      const xScale = d3.scaleLinear().domain([-VIEW_HALF, VIEW_HALF]).range([0, innerW]);
      const yScale = d3.scaleLinear().domain([-VIEW_HALF, VIEW_HALF]).range([innerH, 0]);

      // Background — light grid.
      for (let i = -2; i <= 2; i++) {
        g.append('line')
          .attr('x1', xScale(i)).attr('x2', xScale(i))
          .attr('y1', 0).attr('y2', innerH)
          .style('stroke', 'var(--color-viz-grid)')
          .style('stroke-width', i === 0 ? 1.0 : 0.5)
          .style('opacity', i === 0 ? 0.55 : 0.2);
        g.append('line')
          .attr('x1', 0).attr('x2', innerW)
          .attr('y1', yScale(i)).attr('y2', yScale(i))
          .style('stroke', 'var(--color-viz-grid)')
          .style('stroke-width', i === 0 ? 1.0 : 0.5)
          .style('opacity', i === 0 ? 0.55 : 0.2);
      }

      // 3D axes — x in red, y in green, z in blue (standard convention).
      const drawAxis = (dir: Vector, color: string, label: string) => {
        const tipScaled = scale(dir, 2.5);
        const [x0, y0] = projectToScreen([0, 0, 0]);
        const [x1, y1] = projectToScreen(tipScaled);
        g.append('line')
          .attr('x1', xScale(x0)).attr('y1', yScale(y0))
          .attr('x2', xScale(x1)).attr('y2', yScale(y1))
          .style('stroke', color)
          .style('stroke-width', 0.8)
          .style('opacity', 0.4)
          .style('stroke-dasharray', '3 3');
        g.append('text')
          .attr('x', xScale(x1) + 4 * Math.sign(x1))
          .attr('y', yScale(y1) - 4)
          .style('fill', color)
          .style('font-size', '10px')
          .style('opacity', 0.7)
          .text(label);
      };
      drawAxis([1, 0, 0], '#dc2626', 'x');
      drawAxis([0, 1, 0], '#10b981', 'y');
      drawAxis([0, 0, 1], '#2563eb', 'z');

      // Helper: draw a 3D vector as a projected arrow.
      const drawArrow = (v: Vector, color: string, opacity = 1, label?: string, dashed = false) => {
        const [x0, y0] = projectToScreen([0, 0, 0]);
        const [x1, y1] = projectToScreen(v);
        const sx0 = xScale(x0);
        const sy0 = yScale(y0);
        const sx1 = xScale(x1);
        const sy1 = yScale(y1);
        const len = Math.hypot(sx1 - sx0, sy1 - sy0);
        if (len < 1) return;

        const line = g.append('line')
          .attr('x1', sx0).attr('y1', sy0)
          .attr('x2', sx1).attr('y2', sy1)
          .style('stroke', color)
          .style('stroke-width', 2.5)
          .style('opacity', opacity);
        if (dashed) line.style('stroke-dasharray', '4 3');

        // Arrowhead.
        const ux = (sx1 - sx0) / len;
        const uy = (sy1 - sy0) / len;
        const headLen = 10;
        const headHalf = 5;
        const hx = sx1 - headLen * ux;
        const hy = sy1 - headLen * uy;
        const px = -uy;
        const py = ux;
        g.append('polygon')
          .attr('points', `${sx1},${sy1} ${hx + headHalf * px},${hy + headHalf * py} ${hx - headHalf * px},${hy - headHalf * py}`)
          .style('fill', color)
          .style('opacity', opacity);

        if (label) {
          g.append('text')
            .attr('x', sx1 + 8 * Math.sign(x1 || 1))
            .attr('y', sy1 - 6)
            .style('fill', color)
            .style('font-size', '11px')
            .style('font-weight', '600')
            .style('opacity', opacity)
            .text(label);
        }
      };

      // 1. Finalized orthonormal vectors (green).
      renderState.finalizedQs.forEach((q, i) => {
        drawArrow(q, COLOR_Q, 1.0, `q${sub(i + 1)}`);
      });

      // 2. Current v_k (grey, dashed when we're moving on to other phases).
      if (renderState.currentV) {
        const opacity = renderState.currentPhase === 'normalize' ? 0.35 : 0.85;
        drawArrow(renderState.currentV, COLOR_V, opacity, `v${sub(renderState.currentK)}`);
      }

      // 3. Projection terms (orange) — shown during "project" and "subtract" phases.
      renderState.projectionTerms.forEach((term) => {
        if (norm(term.vec) > 1e-6) {
          drawArrow(term.vec, COLOR_PROJ, 0.85, term.label, true);
        }
      });

      // 4. Intermediate u_k (blue) — shown during "subtract" and "normalize" phases.
      if (renderState.intermediateU && renderState.currentPhase === 'subtract') {
        drawArrow(renderState.intermediateU, COLOR_U, 0.9, `u${sub(renderState.currentK)}`);
      }
      // During "normalize" phase, u_k becomes q_k (the next-finalized one) — we already
      // render finalizedQs above, but the finalizedCount at this point counts q_k as
      // finalized only on entry to "normalize", so the green q_k is already shown.

      // For the "done" phase, all qs are already shown via finalizedQs.
    },
    [renderState, svgSize],
  );

  // ── Gram matrix Q^T Q ────────────────────────────────────
  const gramMatrix = useMemo(() => {
    const k = renderState.finalizedCount;
    const m: number[][] = [];
    for (let i = 0; i < k; i++) {
      const row: number[] = [];
      for (let j = 0; j < k; j++) {
        row.push(dot(Q[i], Q[j]));
      }
      m.push(row);
    }
    return m;
  }, [Q, renderState.finalizedCount]);

  // ── Render ────────────────────────────────────────────────
  const isDone = stageIndex >= steps.length;

  return (
    <div
      ref={containerRef}
      className="my-6 rounded-lg border p-4"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-alt)' }}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start">
        <div className="flex-shrink-0">
          <svg
            ref={svgRef}
            width={svgSize}
            height={svgSize}
            role="img"
            aria-label="Gram-Schmidt process applied to a basis of R^3, shown step by step"
            style={{
              maxWidth: '100%',
              background: 'var(--color-viz-bg)',
              borderRadius: '0.5rem',
            }}
          />
        </div>

        <div className="flex-1 space-y-3 text-sm">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Input basis
            </label>
            <select
              value={presetId}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="w-full rounded border px-2 py-1"
              style={{
                borderColor: 'var(--color-border-strong)',
                background: 'var(--color-surface)',
                color: 'var(--color-text)',
              }}
            >
              {presets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {presets.find((p) => p.id === presetId)?.notes ?? ''}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleNext}
              disabled={isDone || running}
              className="rounded border px-2 py-1 text-xs disabled:opacity-40"
              style={{
                borderColor: 'var(--color-border-strong)',
                background: 'var(--color-surface)',
                color: 'var(--color-text)',
              }}
            >
              Next step
            </button>
            <button
              type="button"
              onClick={handleRun}
              disabled={isDone || running}
              className="rounded border px-2 py-1 text-xs disabled:opacity-40"
              style={{
                borderColor: 'var(--color-border-strong)',
                background: 'var(--color-surface)',
                color: 'var(--color-text)',
              }}
            >
              {running ? 'Running…' : 'Run to end'}
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="rounded border px-2 py-1 text-xs"
              style={{
                borderColor: 'var(--color-border-strong)',
                background: 'var(--color-surface)',
                color: 'var(--color-text)',
              }}
            >
              Reset
            </button>
          </div>

          <div
            className="rounded px-3 py-2"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Stage {stageIndex} of {steps.length}{' '}
              {isDone && <span className="ml-1 text-emerald-600">— done</span>}
            </div>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {stageDescription(stageIndex, steps, renderState)}
            </p>
          </div>

          <div
            className="rounded px-3 py-2"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Orthonormal basis so far ({renderState.finalizedCount} of {inputBasis.length})
            </div>
            <ul className="space-y-1 font-mono text-xs">
              {renderState.finalizedQs.length === 0 ? (
                <li style={{ color: 'var(--color-text-muted)' }}>(none yet)</li>
              ) : (
                renderState.finalizedQs.map((q, i) => (
                  <li key={i} style={{ color: COLOR_Q }}>
                    q{sub(i + 1)} = {formatVec(q)}
                  </li>
                ))
              )}
            </ul>
          </div>

          <div>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={showGramMatrix}
                onChange={(e) => setShowGramMatrix(e.target.checked)}
              />
              Verify orthonormality (show Gram matrix Q<sup>⊤</sup>Q)
            </label>
            {showGramMatrix && gramMatrix.length > 0 && (
              <div
                className="mt-1 rounded px-2 py-1 font-mono text-xs"
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text)',
                }}
              >
                {gramMatrix.map((row, i) => (
                  <div key={i} className="flex gap-2">
                    {row.map((entry, j) => (
                      <span key={j} className="w-12 text-right">
                        {formatNum(entry, 3)}
                      </span>
                    ))}
                  </div>
                ))}
                <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  Diagonal entries should be 1 (each q is a unit vector); off-diagonals should be 0 (different q's are orthogonal).
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Stage description ─────────────────────────────────────────

function stageDescription(
  stageIndex: number,
  steps: Step[],
  state: {
    currentK: number;
    currentPhase: Phase | 'done';
    projectionTerms: Array<{ label: string }>;
  },
): string {
  if (stageIndex === 0) {
    return 'Three input basis vectors of ℝ³ shown in grey. Click "Next step" to begin Gram-Schmidt — or "Run to end" to animate the whole process.';
  }
  if (stageIndex >= steps.length) {
    return 'Done. The three green q vectors form an orthonormal basis of ℝ³, spanning the same space as the original grey input basis.';
  }
  const step = steps[stageIndex - 1];
  const k = step.k;
  if (k === 1) {
    if (step.phase === 'project') {
      return `Working on v${sub(1)}. There are no previous q's to project onto, so this step is a no-op. Click Next.`;
    }
    if (step.phase === 'subtract') {
      return `u${sub(1)} = v${sub(1)} — nothing to subtract since k = 1. Same vector, in blue.`;
    }
    return `Normalize: q${sub(1)} = u${sub(1)} / ‖u${sub(1)}‖. First orthonormal vector finalized in green.`;
  }
  if (step.phase === 'project') {
    return `Working on v${sub(k)}. Compute the projection of v${sub(k)} onto each previously-finalized q${state.currentK > 1 ? '₁' : ''}…q${sub(k - 1)} (orange arrows).`;
  }
  if (step.phase === 'subtract') {
    return `Subtract the orange projections from v${sub(k)} to get u${sub(k)} (blue), which is orthogonal to every previous q.`;
  }
  return `Normalize: q${sub(k)} = u${sub(k)} / ‖u${sub(k)}‖. Finalized in green; the orthonormal basis grows by one vector.`;
}

// ── Subscript helper ──────────────────────────────────────────

function sub(n: number): string {
  const digits = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];
  return digits[n] ?? String(n);
}
