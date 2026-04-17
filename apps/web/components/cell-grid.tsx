// @ts-nocheck -- pre-existing unchecked-index-access in animation code; track cleanup separately.
'use client';

import { useEffect, useMemo, useRef } from 'react';
import { cn } from '@/lib/utils';

export type CellGridProps = {
  /** Number of rows. Ignored if `rowsDef` is provided. */
  rows?: number;
  /** [min, max] cells per row for procedural layouts. */
  cellsPerRow?: [number, number];
  /** [min, max] fr weight per cell for procedural layouts. */
  weightRange?: [number, number];
  /** Explicit row definitions: outer = rows, inner = column fr weights. Overrides procedural props. */
  rowsDef?: number[][];
  /** Deterministic seed for procedural layout + color placement. */
  seed?: number;
  /** Opacity at rest (0–1). The pattern is faintly visible even with no interaction. */
  baseFill?: number;
  /** Color palette — cells pick one at init. */
  palette?: string[];
  /** Distribution over the palette. Must sum to 1 and match `palette.length`. */
  paletteWeights?: number[];
  /** Tint that fills each cell pre-hover. Defaults to `white`. */
  background?: string;
  /** If false, cursor proximity is ignored and only ambient animation runs. */
  interactive?: boolean;
  /** If false, ambient pulses/bursts/sweeps are disabled (static grid). */
  animate?: boolean;
  /** Pointer source — `'window'` lights cells as the cursor moves anywhere on the page; `'self'` only within the grid. */
  pointerScope?: 'window' | 'self';
  /** Gap between cells. */
  gap?: string | number;
  className?: string;
};

const DEFAULT_PALETTE = [
  'oklch(0.975 0.016 265)', // pale blue
  'oklch(0.935 0.05 265)', // soft blue
  'oklch(0.66 0.21 265)', // bright blue (cavalry primary)
  'oklch(0.48 0.22 265)', // deep blue
  'oklch(0.85 0.13 340)', // pink pop
];
const DEFAULT_WEIGHTS = [0.18, 0.27, 0.31, 0.18, 0.06];
const BASE_FILL_DEFAULT = 0.14;

function pseudo(a: number, b: number, seed: number): number {
  const x = Math.sin(a * 12.9898 + b * 78.233 + seed * 37.7191) * 43758.5453;
  return x - Math.floor(x);
}

function generateRowsDef(
  rows: number,
  cellsPerRow: [number, number],
  weightRange: [number, number],
  seed: number,
): number[][] {
  const [minCells, maxCells] = cellsPerRow;
  const [minW, maxW] = weightRange;
  const out: number[][] = [];
  for (let r = 0; r < rows; r++) {
    const cellCount =
      minCells + Math.floor(pseudo(r, 0, seed) * (maxCells - minCells + 1));
    const widths: number[] = [];
    for (let c = 0; c < cellCount; c++) {
      widths.push(minW + Math.floor(pseudo(r, c + 1, seed) * (maxW - minW + 1)));
    }
    out.push(widths);
  }
  return out;
}

function pickColor(
  row: number,
  col: number,
  seed: number,
  palette: string[],
  weights: number[],
): string {
  const f = pseudo(row, col, seed);
  let acc = 0;
  for (let i = 0; i < weights.length; i++) {
    acc += weights[i];
    if (f < acc) return palette[i];
  }
  return palette[palette.length - 1];
}

type CellMeta = {
  row: number;
  col: number;
  colsInRow: number;
  colFracStart: number;
  colFracEnd: number;
  colFracMid: number;
};

type Sweep = {
  kind: 'row' | 'col';
  axis: number;
  xFrac: number;
  startTime: number;
  duration: number;
  direction: 1 | -1;
};

export function CellGrid({
  rows = 10,
  cellsPerRow = [5, 8],
  weightRange = [1, 5],
  rowsDef,
  seed = 1,
  baseFill = BASE_FILL_DEFAULT,
  palette = DEFAULT_PALETTE,
  paletteWeights = DEFAULT_WEIGHTS,
  background = 'white',
  interactive = true,
  animate = true,
  pointerScope = 'window',
  gap = '1px',
  className,
}: CellGridProps) {
  const resolvedRows = useMemo(
    () => rowsDef ?? generateRowsDef(rows, cellsPerRow, weightRange, seed),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rowsDef, rows, cellsPerRow[0], cellsPerRow[1], weightRange[0], weightRange[1], seed],
  );

  const grid = useMemo(() => {
    const rowCount = resolvedRows.length;
    const meta: CellMeta[] = [];
    for (let r = 0; r < rowCount; r++) {
      const widths = resolvedRows[r];
      const total = widths.reduce((a, b) => a + b, 0) || 1;
      let accum = 0;
      for (let c = 0; c < widths.length; c++) {
        const start = accum / total;
        accum += widths[c];
        const end = accum / total;
        meta.push({
          row: r,
          col: c,
          colsInRow: widths.length,
          colFracStart: start,
          colFracEnd: end,
          colFracMid: (start + end) / 2,
        });
      }
    }
    const total = meta.length;
    const rowIndices: number[][] = Array.from({ length: rowCount }, () => []);
    for (let i = 0; i < total; i++) rowIndices[meta[i].row].push(i);

    const neighbors: number[][] = [];
    for (let i = 0; i < total; i++) {
      const m = meta[i];
      const n: number[] = [];
      const rowCells = rowIndices[m.row];
      if (m.col > 0) n.push(rowCells[m.col - 1]);
      if (m.col < m.colsInRow - 1) n.push(rowCells[m.col + 1]);
      for (const adj of [m.row - 1, m.row + 1]) {
        if (adj < 0 || adj >= rowCount) continue;
        for (const j of rowIndices[adj]) {
          const jm = meta[j];
          if (jm.colFracStart < m.colFracEnd && jm.colFracEnd > m.colFracStart) {
            n.push(j);
          }
        }
      }
      neighbors.push(n);
    }
    return { meta, rowIndices, neighbors, total, rowCount };
  }, [resolvedRows]);

  const colors = useMemo(
    () => grid.meta.map((m) => pickColor(m.row, m.col, seed, palette, paletteWeights)),
    [grid.meta, seed, palette, paletteWeights],
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const cellsRef = useRef<(HTMLDivElement | null)[]>([]);
  const centersRef = useRef<{ x: number; y: number }[]>([]);
  const fillsRef = useRef<number[]>([]);
  const pulsesRef = useRef<number[]>([]);
  const firedRef = useRef<boolean[]>([]);
  const sweepsRef = useRef<Sweep[]>([]);
  const nextSweepAtRef = useRef(0);
  const mouseRef = useRef<{ x: number; y: number; active: boolean }>({
    x: 0,
    y: 0,
    active: false,
  });
  const rafRef = useRef<number | null>(null);
  const maxDistRef = useRef(200);

  useEffect(() => {
    fillsRef.current = new Array(grid.total).fill(baseFill);
    pulsesRef.current = new Array(grid.total).fill(0);
    firedRef.current = new Array(grid.total).fill(false);
    cellsRef.current.length = grid.total;
  }, [grid.total, baseFill]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const measure = () => {
      const rect = container.getBoundingClientRect();
      maxDistRef.current = Math.min(rect.width, rect.height) * 0.55;
      centersRef.current = cellsRef.current.map((cell) => {
        if (!cell) return { x: 0, y: 0 };
        const r = cell.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      });
    };

    measure();

    const scheduleNextSweep = (time: number) => {
      nextSweepAtRef.current = time + 2800 + Math.random() * 3200;
    };
    scheduleNextSweep(performance.now());

    const tick = (time: number) => {
      const pulses = pulsesRef.current;
      const fired = firedRef.current;
      const { meta, rowIndices, neighbors, total, rowCount } = grid;

      if (animate) {
        if (Math.random() < 0.035) {
          const idx = Math.floor(Math.random() * total);
          pulses[idx] = Math.max(pulses[idx], 0.75 + Math.random() * 0.25);
        }
        if (Math.random() < 0.0035) {
          const idx = Math.floor(Math.random() * total);
          pulses[idx] = Math.max(pulses[idx], 0.95);
          for (const j of neighbors[idx]) {
            pulses[j] = Math.max(pulses[j], 0.7 + Math.random() * 0.15);
          }
        }
        if (time >= nextSweepAtRef.current) {
          const isCol = Math.random() < 0.5;
          sweepsRef.current.push({
            kind: isCol ? 'col' : 'row',
            axis: Math.floor(Math.random() * rowCount),
            xFrac: Math.random(),
            startTime: time,
            duration: 500 + Math.random() * 450,
            direction: Math.random() < 0.5 ? 1 : -1,
          });
          scheduleNextSweep(time);
        }

        sweepsRef.current = sweepsRef.current.filter((s) => {
          const elapsed = time - s.startTime;
          const progress = elapsed / s.duration;
          if (progress >= 1.15) return false;
          const headFrac = s.direction === 1 ? progress : 1 - progress;

          if (s.kind === 'row') {
            const trail = 0.18;
            for (const j of rowIndices[s.axis] ?? []) {
              const m = meta[j];
              if (!m) continue;
              const dist = Math.abs(m.colFracMid - headFrac);
              if (dist < trail) {
                const intensity = 0.9 * (1 - dist / trail);
                if (intensity > (pulses[j] ?? 0)) pulses[j] = intensity;
              }
            }
          } else {
            const trail = 0.22;
            for (let r = 0; r < rowCount; r++) {
              const rowFrac = rowCount === 1 ? 0 : r / (rowCount - 1);
              const dist = Math.abs(rowFrac - headFrac);
              if (dist >= trail) continue;
              const cells = rowIndices[r];
              if (!cells || cells.length === 0) continue;
              let target = cells[0]!;
              for (const ci of cells) {
                const m = meta[ci];
                if (!m) continue;
                if (s.xFrac >= m.colFracStart && s.xFrac <= m.colFracEnd) {
                  target = ci;
                  break;
                }
              }
              const intensity = 0.9 * (1 - dist / trail);
              if (intensity > (pulses[target] ?? 0)) pulses[target] = intensity;
            }
          }
          return true;
        });

        for (let i = 0; i < total; i++) {
          const p = pulses[i] ?? 0;
          if (p < 0.06) fired[i] = false;
          if (fired[i] || p < 0.55) continue;
          fired[i] = true;
          for (const j of neighbors[i] ?? []) {
            if (Math.random() < 0.55) {
              const inherited = p * (0.68 + Math.random() * 0.12);
              if (inherited > (pulses[j] ?? 0)) pulses[j] = inherited;
            }
          }
        }

        for (let i = 0; i < total; i++) {
          const pv = pulses[i] ?? 0;
          const next = pv * 0.965;
          pulses[i] = next < 0.002 ? 0 : next;
        }
      }

      const { x, y, active } = mouseRef.current;
      const centers = centersRef.current;
      const fills = fillsRef.current;
      const maxDist = maxDistRef.current;

      for (let i = 0; i < total; i++) {
        const cell = cellsRef.current[i];
        if (!cell) continue;
        let cursorTarget = baseFill;
        if (interactive && active) {
          const c = centers[i];
          if (c) {
            const d = Math.hypot(x - c.x, y - c.y);
            const proximity = Math.max(0, 1 - d / maxDist);
            cursorTarget = baseFill + (1 - baseFill) * proximity * proximity;
          }
        }
        const pulseFill = baseFill + (pulses[i] ?? 0) * (1 - baseFill);
        const target = Math.min(1, Math.max(cursorTarget, pulseFill));
        const curr = fills[i] ?? baseFill;
        const next = curr + (target - curr) * 0.28;
        fills[i] = next;
        cell.style.setProperty('--fill', next.toFixed(3));
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    const onMove = (e: PointerEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY, active: true };
    };
    const onLeave = () => {
      mouseRef.current.active = false;
    };
    const onScroll = () => measure();
    const onResize = () => measure();

    const pointerTarget: Window | HTMLDivElement = pointerScope === 'self' ? container : window;
    if (interactive) {
      pointerTarget.addEventListener('pointermove', onMove as EventListener);
      pointerTarget.addEventListener('pointerleave', onLeave as EventListener);
    }
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onScroll, { passive: true });
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (interactive) {
        pointerTarget.removeEventListener('pointermove', onMove as EventListener);
        pointerTarget.removeEventListener('pointerleave', onLeave as EventListener);
      }
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onScroll);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [grid, baseFill, interactive, animate, pointerScope]);

  const { rowCount, rowIndices } = grid;

  return (
    <div
      ref={containerRef}
      aria-hidden
      className={cn('relative grid h-full w-full select-none', className)}
      style={{
        gridTemplateRows: `repeat(${rowCount}, 1fr)`,
        gap,
      }}
    >
      {resolvedRows.map((widths, rowIdx) => (
        <div
          key={rowIdx}
          className="grid"
          style={{
            gridTemplateColumns: widths.map((w) => `${w}fr`).join(' '),
            gap,
          }}
        >
          {widths.map((_, colIdx) => {
            const cellIdx = rowIndices[rowIdx]?.[colIdx];
            if (cellIdx === undefined) return null;
            const color = colors[cellIdx];
            return (
              <div
                key={colIdx}
                ref={(el) => {
                  cellsRef.current[cellIdx] = el;
                }}
                className="relative overflow-hidden"
                style={{
                  backgroundColor: background,
                  ['--fill' as string]: baseFill,
                }}
              >
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundColor: color,
                    opacity: 'var(--fill)',
                  }}
                />
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
