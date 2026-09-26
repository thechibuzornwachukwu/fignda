import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import type { Char } from '../engine/text';
import { Letter, type LetterState } from './Letter';
import styles from './Puzzle.module.css';

export type Span = readonly [number, number];

export type PuzzleProps = {
  chars: readonly Char[];
  /** Letter stream length. */
  letters: number;
  /** Found selections, in find order. */
  found: readonly Span[];
  /** Shaded after finish. */
  missed: readonly Span[];
  /** Letter index carrying the hint mark, or -1. */
  hintLi: number;
  disabled: boolean;
  /** A finished selection, either direction. The shell evaluates it. */
  onPick: (a: number, b: number) => void;
  /** Touch: first letter tapped. */
  onTapStart: () => void;
  /** Mouse or pen drag started. */
  onDragStart: () => void;
  describedBy?: string;
  /** Accessible name. Defaults to "Puzzle text". */
  label?: string;
  /** `hero` is the larger landing demo type. */
  size?: 'game' | 'hero';
};

type Sel = { a: number; b: number };

const TAP_SLOP = 10;
/** A touch that moves this far sideways before it moves vertically becomes a swipe selection. */
const SWIPE_START = 8;

/** Holding still this long on a letter starts a selection in any direction. */
const LONG_PRESS_MS = 260;
/** A first move counts as a selection when sideways travel is at least this share of vertical travel. */
const SELECT_BIAS = 0.75;
/** How far above the finger the selection bubble sits. */
const BUBBLE_LIFT = 72;

function liAt(x: number, y: number): number {
  const el = document.elementFromPoint(x, y);
  const t = el?.closest<HTMLElement>('[data-li]');
  return t ? Number(t.dataset.li) : -1;
}

/** The letter under a finger, or the nearest one above or below when it sits between lines. */
function liNear(x: number, y: number): number {
  for (const dy of [0, -8, 8, -16, 16]) {
    const li = liAt(x, y + dy);
    if (li >= 0) return li;
  }
  return -1;
}

/**
 * The hidden-words board. One span per character.
 * Mouse/pen: drag. Touch: swipe sideways across letters, or tap first letter then last. Keyboard: arrows move a caret,
 * Shift+arrows extend, Enter checks, Escape clears.
 */
export function Puzzle({
  chars,
  letters,
  found,
  missed,
  hintLi,
  disabled,
  onPick,
  onTapStart,
  onDragStart,
  describedBy,
  label = 'Puzzle text',
  size = 'game',
}: PuzzleProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const [rawSel, setSel] = useState<Sel | null>(null);
  // Any selection in progress is dropped when the game ends.
  const sel = disabled ? null : rawSel;
  const [caret, setCaret] = useState(-1);

  // Latest values for window listeners.
  const selRef = useRef(sel);
  const pickRef = useRef(onPick);
  const dragStartRef = useRef(onDragStart);
  const disabledRef = useRef(disabled);
  useLayoutEffect(() => {
    selRef.current = sel;
    pickRef.current = onPick;
    dragStartRef.current = onDragStart;
    disabledRef.current = disabled;
  });

  const dragging = useRef(false);
  const tapAnchor = useRef<number | null>(null);
  const keyAnchor = useRef<number | null>(null);
  const tapStartRef = useRef(onTapStart);
  useLayoutEffect(() => {
    tapStartRef.current = onTapStart;
  });
  // Where the finger is while a touch selection runs: drives the bubble above the finger.
  const [bubble, setBubble] = useState<{ x: number; y: number } | null>(null);
  const stream = useMemo(() => chars.filter((c) => c.li >= 0).map((c) => c.ch).join(''), [chars]);

  useEffect(() => {
    if (!disabled) return;
    dragging.current = false;
    tapAnchor.current = null;
    keyAnchor.current = null;
  }, [disabled]);

  // Mouse and pen: drag with pointer events.
  useEffect(() => {
    const move = (e: globalThis.PointerEvent) => {
      if (!dragging.current || e.pointerType === 'touch') return;
      const li = liAt(e.clientX, e.clientY);
      const s = selRef.current;
      if (li < 0 || !s || li === s.b) return;
      selRef.current = { a: s.a, b: li };
      setSel(selRef.current);
    };
    const up = (e: globalThis.PointerEvent) => {
      if (!dragging.current || e.pointerType === 'touch') return;
      dragging.current = false;
      const s = selRef.current;
      setSel(null);
      if (s) pickRef.current(s.a, s.b);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, []);

  // Touch: native touch events, so a selection can own the gesture. With pointer events alone, iOS cancels a
  // sideways drag the moment it drifts vertically (the page is allowed to scroll), which made selection jumpy.
  //   Sideways first move, or press and hold ~260ms  -> selecting: every move is ours (scroll blocked).
  //   Vertical first move                            -> scrolling: the browser has it.
  //   Still and short                                -> a tap (tap first letter, then last).
  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    type T = { x: number; y: number; li: number; mode: 'pending' | 'select' | 'scroll'; timer: number | null; raf: number | null; px: number; py: number };
    let t: T | null = null;

    const endSelect = (commit: boolean) => {
      dragging.current = false;
      const s = selRef.current;
      setSel(null);
      setBubble(null);
      if (commit && s) pickRef.current(s.a, s.b);
    };
    const begin = () => {
      if (!t || t.li < 0) return;
      t.mode = 'select';
      tapAnchor.current = null;
      keyAnchor.current = null;
      dragging.current = true;
      selRef.current = { a: t.li, b: t.li };
      setSel(selRef.current);
      setBubble({ x: t.px, y: t.py });
      dragStartRef.current();
      navigator.vibrate?.(8);
    };
    const reset = () => {
      if (t?.timer) window.clearTimeout(t.timer);
      if (t?.raf) cancelAnimationFrame(t.raf);
      t = null;
    };

    const start = (e: TouchEvent) => {
      reset();
      if (disabledRef.current || e.touches.length !== 1) return;
      const p = e.touches[0]!;
      const li = liNear(p.clientX, p.clientY);
      t = { x: p.clientX, y: p.clientY, px: p.clientX, py: p.clientY, li, mode: 'pending', timer: null, raf: null };
      if (li >= 0) t.timer = window.setTimeout(() => t?.mode === 'pending' && begin(), LONG_PRESS_MS);
    };
    const move = (e: TouchEvent) => {
      if (!t) return;
      if (e.touches.length !== 1) {
        if (t.mode === 'select') endSelect(false);
        reset();
        return;
      }
      const p = e.touches[0]!;
      t.px = p.clientX;
      t.py = p.clientY;
      if (t.mode === 'pending') {
        const dx = p.clientX - t.x;
        const dy = p.clientY - t.y;
        if (Math.hypot(dx, dy) < SWIPE_START) return;
        if (t.timer) window.clearTimeout(t.timer);
        // Forgiving: a diagonal start still selects. Only a clearly vertical start scrolls.
        if (t.li >= 0 && Math.abs(dx) >= Math.abs(dy) * SELECT_BIAS) begin();
        else t.mode = 'scroll';
      }
      if (t.mode !== 'select') return;
      e.preventDefault(); // the gesture is a selection now: no scrolling, no cancel
      if (t.raf != null) return;
      t.raf = requestAnimationFrame(() => {
        if (!t) return;
        t.raf = null;
        setBubble({ x: t.px, y: t.py });
        const li = liNear(t.px, t.py);
        const s = selRef.current;
        if (li < 0 || !s || li === s.b) return;
        selRef.current = { a: s.a, b: li };
        setSel(selRef.current);
      });
    };
    const end = (e: TouchEvent) => {
      if (!t) return;
      const cur = t;
      reset();
      if (cur.mode === 'select') {
        // A fast flick can lift before the next frame runs: settle on the letter under the last point.
        // (touchend coordinates are not reliable everywhere; the last move is.)
        const li = liNear(cur.px, cur.py);
        const s = selRef.current;
        if (li >= 0 && s) selRef.current = { a: s.a, b: li };
        return endSelect(true);
      }
      if (cur.mode !== 'pending' || cur.li < 0 || disabledRef.current) return;
      const p = e.changedTouches[0];
      if (p && Math.hypot(p.clientX - cur.x, p.clientY - cur.y) > TAP_SLOP) return;
      // A tap: first letter, then last.
      if (tapAnchor.current == null) {
        tapAnchor.current = cur.li;
        setSel({ a: cur.li, b: cur.li });
        tapStartRef.current();
      } else {
        const a = tapAnchor.current;
        tapAnchor.current = null;
        setSel(null);
        pickRef.current(a, cur.li);
      }
    };
    const cancel = () => {
      if (t?.mode === 'select') endSelect(false);
      reset();
    };
    const noMenu = (e: Event) => e.preventDefault();

    board.addEventListener('touchstart', start, { passive: true });
    board.addEventListener('touchmove', move, { passive: false });
    board.addEventListener('touchend', end);
    board.addEventListener('touchcancel', cancel);
    board.addEventListener('contextmenu', noMenu);
    return () => {
      reset();
      board.removeEventListener('touchstart', start);
      board.removeEventListener('touchmove', move);
      board.removeEventListener('touchend', end);
      board.removeEventListener('touchcancel', cancel);
      board.removeEventListener('contextmenu', noMenu);
    };
  }, []);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (disabled || e.pointerType === 'touch') return;
    const li = liAt(e.clientX, e.clientY);
    if (e.button !== 0 || li < 0) return;
    e.preventDefault();
    tapAnchor.current = null;
    keyAnchor.current = null;
    dragging.current = true;
    setSel({ a: li, b: li });
    onDragStart();
  };

  const letterEl = (li: number) => boardRef.current?.querySelector<HTMLElement>(`[data-li="${li}"]`) ?? null;

  /** Letter on the line above or below, nearest horizontally. */
  const vertical = (from: number, dir: 1 | -1): number => {
    const cur = letterEl(from)?.getBoundingClientRect();
    if (!cur) return from;
    const cx = cur.left + cur.width / 2;
    let lineTop: number | null = null;
    let best = from;
    let bestDx = Infinity;
    for (let li = from + dir; li >= 0 && li < letters; li += dir) {
      const r = letterEl(li)!.getBoundingClientRect();
      if (lineTop == null) {
        if (Math.abs(r.top - cur.top) < 2) continue;
        lineTop = r.top;
      } else if (Math.abs(r.top - lineTop) >= 2) break;
      const dx = Math.abs(r.left + r.width / 2 - cx);
      if (dx < bestDx) {
        bestDx = dx;
        best = li;
      }
    }
    return best;
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    const from = caret < 0 ? 0 : caret;
    let next: number;
    if (e.key === 'ArrowRight') next = Math.min(letters - 1, from + 1);
    else if (e.key === 'ArrowLeft') next = Math.max(0, from - 1);
    else if (e.key === 'ArrowDown') next = vertical(from, 1);
    else if (e.key === 'ArrowUp') next = vertical(from, -1);
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (sel) {
        keyAnchor.current = null;
        setSel(null);
        onPick(sel.a, sel.b);
      }
      return;
    } else if (e.key === 'Escape') {
      keyAnchor.current = null;
      tapAnchor.current = null;
      setSel(null);
      return;
    } else return;

    e.preventDefault();
    if (e.shiftKey) {
      if (keyAnchor.current == null) keyAnchor.current = from;
      setSel({ a: keyAnchor.current, b: next });
    } else {
      keyAnchor.current = null;
      setSel(null);
    }
    setCaret(next);
  };

  useEffect(() => {
    if (caret < 0 || document.activeElement !== boardRef.current) return;
    letterEl(caret)?.scrollIntoView({ block: 'nearest' });
  }, [caret]);

  const states = useMemo(() => {
    // Per-letter owner ids so a space only bridges two letters of the same word.
    const own = new Int32Array(letters);
    found.forEach(([a, b], i) => {
      for (let k = a; k <= b; k++) own[k] = i + 1;
    });
    const miss = new Int32Array(letters);
    missed.forEach(([a, b], i) => {
      for (let k = a; k <= b; k++) if (!own[k]) miss[k] = i + 1;
    });
    const sa = sel ? Math.min(sel.a, sel.b) : -1;
    const sb = sel ? Math.max(sel.a, sel.b) : -1;
    const key = (li: number) =>
      sa >= 0 && li >= sa && li <= sb ? 's' : own[li] ? 'f' + own[li] : miss[li] ? 'm' + miss[li] : '';
    const kind = (k: string): LetterState =>
      k === 's' ? 'selecting' : k[0] === 'f' ? 'found' : k[0] === 'm' ? 'missed' : '';
    return chars.map((c) => {
      if (c.li >= 0) return kind(key(c.li));
      const p = c.prev ?? -1;
      const n = c.next ?? -1;
      if (p < 0 || n < 0) return '';
      const k = key(p);
      return k && k === key(n) ? kind(k) : '';
    });
  }, [chars, letters, found, missed, sel]);

  return (
    <div
      ref={boardRef}
      className={size === 'hero' ? styles.hero : styles.board}
      tabIndex={disabled ? -1 : 0}
      aria-label={label}
      aria-describedby={describedBy}
      aria-disabled={disabled || undefined}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      onFocus={() => caret < 0 && setCaret(0)}
    >
      {chars.map((c, i) => (
        <Letter
          key={i}
          ch={c.ch}
          li={c.li}
          state={states[i]!}
          hint={c.li >= 0 && c.li === hintLi}
          caret={c.li >= 0 && c.li === caret}
        />
      ))}
      {bubble && sel && (
        // The finger covers the letters it selects: show them above it, as word games do.
        <span
          className={styles.bubble}
          aria-hidden="true"
          style={{
            left: Math.min(Math.max(bubble.x, 64), window.innerWidth - 64),
            top: Math.max(bubble.y - BUBBLE_LIFT, 8),
          }}
        >
          {stream.slice(Math.min(sel.a, sel.b), Math.max(sel.a, sel.b) + 1).toUpperCase()}
        </span>
      )}
    </div>
  );
}
