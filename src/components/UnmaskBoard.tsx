import { useEffect, useMemo, useRef } from 'react';
import { POOLS } from '../copy';
import { ALPHABET, UNMASK_TRIES, unmaskSlots } from '../engine/unmask';
import { culpritFor } from '../games/caseFile';
import { Culprit } from './CaseFile';
import type { PuzzleProps } from './Puzzle';
import styles from './UnmaskBoard.module.css';

/**
 * The unmasking board: the culprit in disguise, a line about who they are, the name as it stands with the
 * first letter of each word given, the tries left, and a bank of letters to pick from.
 * A pick is one letter, sent as its place in the alphabet. Typing a letter in the bank picks it too.
 * A hint rings one key that is in the name (`hintLi`, its place in the alphabet).
 */
export function UnmaskBoard({ found, disabled, onPick, describedBy, hintLi, text = '', picked = [], caseId = '', given = '', bank = ALPHABET }: PuzzleProps) {
  const hit = useMemo(() => new Set(found.map(([a]) => ALPHABET[a]!)), [found]);
  const tried = useMemo(() => new Set(picked.map((i) => ALPHABET[i]!)), [picked]);
  const wrong = [...tried].filter((ch) => !hit.has(ch));
  const left = Math.max(0, UNMASK_TRIES - wrong.length);
  const slots = unmaskSlots(text, hit, given);
  const total = new Set([...text.toLowerCase()].filter((ch) => ALPHABET.includes(ch) && !given.includes(ch))).size;
  const lastWrong = wrong[wrong.length - 1] ?? '';
  // What the culprit does all day: the line that goes with who they are.
  const about = useMemo(() => (caseId ? (POOLS.culpritHint[culpritFor(caseId).who] ?? '') : ''), [caseId]);

  // Latest values for the key listener, which is bound once.
  const live = useRef({ disabled, tried, onPick, bank });
  useEffect(() => {
    live.current = { disabled, tried, onPick, bank };
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1) return;
      const ch = e.key.toLowerCase();
      const i = ALPHABET.indexOf(ch);
      const t = e.target as HTMLElement | null;
      const now = live.current;
      if (i < 0 || now.disabled || !now.bank.includes(ch) || now.tried.has(ch) || (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      now.onPick(i, i);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Words stay whole when the name wraps.
  const words: Array<Array<{ ch: string; at: number }>> = [[]];
  slots.forEach((ch, at) => {
    if (text[at] === ' ') words.push([]);
    else words[words.length - 1]!.push({ ch, at });
  });

  return (
    <div className={styles.board} data-unmask data-left={left}>
      <div className={styles.stage}>
        {/* A wrong letter shakes the culprit once: the key changes, so the animation runs again. */}
        <span key={lastWrong} className={styles.suspect} data-shake={lastWrong ? '' : undefined}>
          <Culprit id={caseId} size={112} state="masked" off={total ? hit.size / total : 0} />
        </span>
      </div>

      {about && (
        <p className={styles.about} data-about>
          {about}
        </p>
      )}

      <p className={styles.name} aria-label={`The culprit is the ${slots.map((ch) => ch || 'blank').join(' ')}`}>
        <span className={styles.the}>The</span>
        {words.map((w, wi) => (
          <span key={wi} className={styles.word}>
            {w.map(({ ch, at }) =>
              /[a-z]/i.test(text[at]!) ? (
                <span key={`${at}${ch}`} className={styles.slot} data-filled={ch ? '' : undefined} data-given={given.includes(text[at]!.toLowerCase()) || undefined} data-slot>
                  {ch}
                </span>
              ) : (
                <span key={at} className={styles.given}>
                  {ch}
                </span>
              ),
            )}
          </span>
        ))}
      </p>

      <div className={styles.keys} role="group" aria-label="Letters to pick from" aria-describedby={describedBy}>
        {[...bank].map((ch) => {
          const state = hit.has(ch) ? 'hit' : tried.has(ch) ? 'miss' : undefined;
          const i = ALPHABET.indexOf(ch);
          return (
            <button
              key={ch}
              type="button"
              className={styles.key}
              data-key={ch}
              data-state={state}
              data-hint={(!state && i === hintLi) || undefined}
              disabled={disabled || !!state}
              aria-label={state === 'hit' ? `${ch.toUpperCase()}, in the name` : state === 'miss' ? `${ch.toUpperCase()}, not in the name` : ch.toUpperCase()}
              onClick={() => onPick(i, i)}
            >
              {ch}
            </button>
          );
        })}
      </div>
    </div>
  );
}
