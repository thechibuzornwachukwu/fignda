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

function liAt(x: number, y: number): number {
  const el = document.elementFromPoint(x, y);
  const t = el?.closest<HTMLElement>('[data-li]');
  return t ? Number(t.dataset.li) : -1;
}

/**
 * The hidden-words board. One span per character.
 * Mouse/pen: drag. Touch: tap first letter, then last. Keyboard: arrows move a caret,
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
  useLayoutEffect(() => {
    selRef.current = sel;
    pickRef.current = onPick;
  });

  const dragging = useRef(false);
  const touch = useRef<{ x: number; y: number; li: number } | null>(null);
  const tapAnchor = useRef<number | null>(null);
  const keyAnchor = useRef<number | null>(null);

  useEffect(() => {
    if (!disabled) return;
    dragging.current = false;
    tapAnchor.current = null;
    keyAnchor.current = null;
  }, [disabled]);

  useEffect(() => {
    const move = (e: globalThis.PointerEvent) => {
      if (!dragging.current) return;
      const li = liAt(e.clientX, e.clientY);
      const s = selRef.current;
      if (li < 0 || !s || li === s.b) return;
      setSel({ a: s.a, b: li });
    };
    const up = () => {
      if (!dragging.current) return;
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

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    const li = liAt(e.clientX, e.clientY);
    if (e.pointerType === 'touch') {
      // Evaluated on pointerup so a scroll that starts on a letter is not a tap.
      touch.current = { x: e.clientX, y: e.clientY, li };
      return;
    }
    if (e.button !== 0 || li < 0) return;
    e.preventDefault();
    tapAnchor.current = null;
    keyAnchor.current = null;
    dragging.current = true;
    setSel({ a: li, b: li });
    onDragStart();
  };

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'touch') return;
    const t = touch.current;
    touch.current = null;
    if (disabled || !t || t.li < 0) return;
    if (Math.hypot(e.clientX - t.x, e.clientY - t.y) > TAP_SLOP) return;
    if (tapAnchor.current == null) {
      tapAnchor.current = t.li;
      setSel({ a: t.li, b: t.li });
      onTapStart();
    } else {
      const a = tapAnchor.current;
      tapAnchor.current = null;
      setSel(null);
      onPick(a, t.li);
    }
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
      onPointerUp={onPointerUp}
      onPointerCancel={() => (touch.current = null)}
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
    </div>
  );
}
