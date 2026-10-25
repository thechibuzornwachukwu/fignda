import { useMemo, useState } from 'react';
import { Check, X } from 'lucide-react';
import rawGroups from '../../data/groups.json';
import { decodePick, encodePick, TILES } from '../engine/groups';
import { Icon } from './Icon';
import type { PuzzleProps } from './Puzzle';
import styles from './GroupsBoard.module.css';

/** Each word's picture (Fluent Emoji 3D, MIT: public/icons/fluent/LICENSE.txt). */
const ICONS = (rawGroups as { icons?: Record<string, string> }).icons ?? {};
const iconOf = (w: string): string | null => (ICONS[w] ? `/icons/fluent/${ICONS[w]}.webp` : null);

/**
 * The Groups board: 16 word tiles. Tap up to 4 and check them. A set found locks in as a row in its own colour;
 * after the end, the sets missed are laid out the same way, muted. It speaks the same (a, b) as every board
 * (src/engine/groups.ts), so the session, the log and the server's replay are the ones every type uses.
 */
export function GroupsBoard({ chars, found, missed, hintLi, disabled, onPick, describedBy, label = 'Word tiles', setNames = {} }: PuzzleProps) {
  // The words, one a line in the text.
  const tiles = useMemo(() => chars.map((c) => c.ch).join('').split('\n'), [chars]);
  const [sel, setSel] = useState<number[]>([]);
  const rows = (spans: readonly (readonly [number, number])[]) =>
    spans.map(([a, b]) => ({ t: decodePick(a, b) ?? [], name: setNames[`${a},${b}`] ?? '' })).filter((r) => r.t.length === 4);
  const done = rows(found);
  const lost = rows(missed);
  const used = new Set([...done, ...lost].flatMap((r) => r.t));
  const open = tiles.map((w, i) => ({ w, i })).filter(({ i }) => !used.has(i));
  // A board of things with a picture each is played by the pictures; any word without one keeps the board in words.
  const pictures = tiles.every((w) => iconOf(w));

  const toggle = (i: number) => {
    if (disabled) return;
    setSel((s) => (s.includes(i) ? s.filter((x) => x !== i) : s.length < 4 ? [...s, i] : s));
  };
  const check = () => {
    if (sel.length !== 4) return;
    const [a, b] = encodePick(sel);
    setSel([]);
    onPick(a, b);
  };

  if (tiles.length !== TILES) return null;
  return (
    <div className={styles.board} role="group" aria-label={label} aria-describedby={describedBy}>
      {[...done.map((r, n) => ({ ...r, n, lost: false })), ...lost.map((r, n) => ({ ...r, n: done.length + n, lost: true }))].map(({ t, name, n, lost: l }) => (
        <div key={t.join('-')} className={styles.set} data-set={(n % 4) + 1} data-lost={l || undefined}>
          {name && <span className={styles.setName}>{name}</span>}
          <span className={styles.setWords}>{t.map((i) => tiles[i]).join(', ')}</span>
        </div>
      ))}
      {open.length > 0 && (
        <div className={styles.grid}>
          {open.map(({ w, i }) => (
            <button
              key={i}
              type="button"
              className={styles.tile}
              data-pic={pictures || undefined}
              aria-pressed={sel.includes(i)}
              data-hint={i === hintLi || undefined}
              disabled={disabled}
              onClick={() => toggle(i)}
            >
              {pictures ? <img className={styles.pic} src={iconOf(w)!} alt={w} width={64} height={64} draggable={false} /> : w}
            </button>
          ))}
        </div>
      )}
      {!disabled && open.length > 0 && (
        <div className={styles.actions}>
          <button type="button" className={styles.clear} aria-label="Clear the picked words" disabled={sel.length === 0} onClick={() => setSel([])}>
            <Icon icon={X} size={18} />
          </button>
          <button type="button" className={styles.check} aria-label={`Check these ${sel.length} words`} disabled={sel.length !== 4} onClick={check}>
            <Icon icon={Check} size={20} />
          </button>
        </div>
      )}
    </div>
  );
}
