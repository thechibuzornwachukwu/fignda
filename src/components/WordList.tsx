import { useImperativeHandle, useLayoutEffect, useRef, type ReactNode, type Ref } from 'react';
import { cssVar, durationMs, prefersReducedMotion } from '../lib/media';
import styles from './WordList.module.css';

export type WordRow = {
  key: string;
  label: string;
  length: number;
  state: 'found' | 'missed' | 'hidden';
  /** Shown in place of the 01, 02 index (the landing demo shows a category). */
  lead?: string;
};

export type WordListHandle = {
  /** Call before a find is committed. The next render FLIPs rows from these positions. */
  capture(movedKey: string): void;
};

type Props = {
  title: string;
  count: string;
  rows: readonly WordRow[];
  /** Daily while playing: only found rows show, with this note under them. */
  moreHiding?: boolean;
  /** Rendered under the list, inside the aside. */
  footer?: ReactNode;
  ref?: Ref<WordListHandle>;
};

export function WordList({ title, count, rows, moreHiding, footer, ref }: Props) {
  const listRef = useRef<HTMLOListElement>(null);
  const pending = useRef<{ tops: Map<string, number>; key: string } | null>(null);

  useImperativeHandle(ref, () => ({
    capture(movedKey) {
      const list = listRef.current;
      if (!list || prefersReducedMotion()) return;
      const tops = new Map<string, number>();
      list.querySelectorAll<HTMLElement>('[data-row]').forEach((el) => {
        tops.set(el.dataset.row!, el.getBoundingClientRect().top);
      });
      pending.current = { tops, key: movedKey };
    },
  }));

  useLayoutEffect(() => {
    const flip = pending.current;
    const list = listRef.current;
    if (!flip || !list) return;
    pending.current = null;
    // Scroll the list to the top first so the found row lands in view.
    list.scrollTop = 0;
    const lead = durationMs('--dur-flip-lead');
    const rest = durationMs('--dur-flip');
    const easing = cssVar('--ease-out') || 'ease-out';
    list.querySelectorAll<HTMLElement>('[data-row]').forEach((el) => {
      const k = el.dataset.row!;
      const prev = flip.tops.get(k);
      if (prev == null || !el.animate) return;
      const dy = prev - el.getBoundingClientRect().top;
      if (Math.abs(dy) < 1) return;
      const moved = k === flip.key;
      el.style.zIndex = moved ? '2' : '1';
      const anim = el.animate([{ transform: `translateY(${dy}px)` }, { transform: 'translateY(0)' }], {
        duration: moved ? lead : rest,
        easing,
      });
      anim.onfinish = anim.oncancel = () => {
        el.style.zIndex = '';
      };
    });
  });

  return (
    <aside className={styles.aside} aria-label={title}>
      <div className={styles.head}>
        <span>{title}</span>
        <span className={styles.count}>{count}</span>
      </div>
      {/* Focusable so keyboard users can scroll a long list. */}
      <ol ref={listRef} className={styles.list} tabIndex={0} aria-label={`${title}, ${count}`}>
        {rows.map((r, i) => (
          <li key={r.key} data-row={r.key} className={styles.row}>
            <span className={styles.index}>{r.lead ?? String(i + 1).padStart(2, '0')}</span>
            {r.state === 'hidden' ? (
              <span className={styles.chip} data-state="hidden">
                <span className={styles.dots} aria-hidden="true">
                  {Array.from({ length: r.length }, (_, k) => (
                    <span key={k} className={styles.dot} />
                  ))}
                </span>
                <span className={styles.sr}>{r.length} letters, not found yet</span>
              </span>
            ) : (
              <span className={styles.chip} data-state={r.state}>
                {r.label}
                {r.state === 'missed' && <span className={styles.sr}>, missed</span>}
              </span>
            )}
          </li>
        ))}
        {moreHiding && <li className={styles.more}>More are hiding. How many? That is the game.</li>}
      </ol>
      {footer}
    </aside>
  );
}
