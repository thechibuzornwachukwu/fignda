// Play state for one game. Transitions are pure and take the copy picker as a parameter,
// so feedback lines are picked exactly once per action (never inside a React updater).

import { useCallback, useMemo, useRef, useState } from 'react';
import * as copyDefault from '../copy';
import { score } from '../engine/score';
import { durationMs, scrollToTop } from '../lib/media';
import { loadDaily, saveDaily } from './daily';
import type { Evaluation, GameModule } from './registry';

export type FoundEntry = { key: string; label: string; span: [number, number] };

export type SavedSession = {
  /** In find order. */
  found: FoundEntry[];
  hinted: string[];
  hints: number;
  /** Wrong picks. Only the daily counts them. */
  misses: number;
  hintLi: number;
  streak: number;
  lastFindAt: number | null;
  startAt: number;
  endAt: number | null;
  /** Picked once at finish, then fixed. */
  resultTitle: string | null;
};

export type Session = SavedSession & { msg: string };

export type Copy = Pick<typeof copyDefault, 'pick' | 'onFound' | 'resultTitle'>;

export const newSession = (now: number): Session => ({
  found: [],
  hinted: [],
  hints: 0,
  misses: 0,
  hintLi: -1,
  streak: 0,
  lastFindAt: null,
  startAt: now,
  endAt: null,
  resultTitle: null,
  msg: '',
});

export const isFinished = (s: SavedSession) => s.endAt != null;

type Ctx = { now: number; total: number; daily: boolean; copy: Copy };

export function applyPick(s: Session, ev: Evaluation, { now, total, daily, copy }: Ctx): Session {
  if (isFinished(s)) return s;
  switch (ev.kind) {
    case 'hit': {
      const found = [...s.found, { key: ev.key, label: ev.label, span: [ev.span[0], ev.span[1]] as [number, number] }];
      const streak = s.streak + 1;
      const msg = copy.onFound({
        word: ev.label,
        len: ev.key.length,
        foundCount: found.length,
        total,
        streak,
        msSinceLast: s.lastFindAt == null ? null : now - s.lastFindAt,
      });
      const done = found.length === total;
      const hintCovered = s.hintLi >= ev.span[0] && s.hintLi <= ev.span[1];
      return {
        ...s,
        found,
        streak,
        lastFindAt: now,
        msg,
        hintLi: hintCovered || done ? -1 : s.hintLi,
        endAt: done ? now : null,
        resultTitle: done ? copy.resultTitle(found.length, total) : s.resultTitle,
      };
    }
    case 'already':
      return { ...s, msg: copy.pick('already') };
    case 'close':
      // Near miss: no penalty, streak kept.
      return { ...s, msg: copy.pick('close') };
    case 'wrong':
      return daily
        ? { ...s, streak: 0, misses: s.misses + 1, msg: copy.pick('wrongDaily') }
        : { ...s, streak: 0, msg: copy.pick('wrong') };
    case 'ignore':
      return { ...s, msg: '' };
  }
}

export function applyHint(s: Session, target: { key: string; at: number } | null, copy: Copy): Session {
  if (isFinished(s) || !target) return s;
  return {
    ...s,
    hints: s.hints + 1,
    hinted: s.hinted.includes(target.key) ? s.hinted : [...s.hinted, target.key],
    hintLi: target.at,
    streak: 0,
    msg: copy.pick('hint'),
  };
}

export function applyFinish(s: Session, now: number, total: number, copy: Copy): Session {
  if (isFinished(s)) return s;
  return { ...s, endAt: now, hintLi: -1, msg: '', resultTitle: copy.resultTitle(s.found.length, total) };
}

export function secondsOf(s: SavedSession, now: number): number {
  return Math.max(0, Math.floor(((s.endAt ?? now) - s.startAt) / 1000));
}

export function scoreOf(s: SavedSession, total: number, daily: boolean, secs: number): number {
  return score({ found: s.found.length, total, hints: s.hints, misses: daily ? s.misses : 0, secs });
}

/** Keep only entries that still match this puzzle's answers. */
function sanitize(saved: SavedSession, keys: ReadonlySet<string>): Session {
  const seen = new Set<string>();
  const found = (saved.found ?? []).filter((f) => keys.has(f.key) && !seen.has(f.key) && seen.add(f.key));
  return { ...newSession(Date.now()), ...saved, found, msg: '' };
}

type Options<P> = {
  mod: GameModule<P>;
  puzzle: P;
  /** Daily number. Persists every change under `fignda-daily-N`. */
  dailyN?: number;
  /** Called just before a find is committed (WordList FLIP capture). */
  beforeHit?: (key: string) => void;
  copy?: Copy;
};

export function useGameSession<P>({ mod, puzzle, dailyN, beforeHit, copy = copyDefault }: Options<P>) {
  const daily = dailyN != null;
  const answers = mod.answers(puzzle);
  const total = answers.length;

  const [s, setS] = useState<Session>(() => {
    if (daily) {
      const saved = loadDaily(dailyN);
      if (saved) return sanitize(saved, new Set(answers.map((a) => a.key)));
    }
    return newSession(Date.now());
  });

  const ref = useRef(s);
  const commit = useCallback(
    (next: Session) => {
      if (next === ref.current) return;
      ref.current = next;
      setS(next);
      if (dailyN != null) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { msg: _m, ...saved } = next;
        saveDaily(dailyN, saved);
      }
    },
    [dailyN],
  );

  const foundSet = useMemo(() => new Set(s.found.map((f) => f.key)), [s.found]);

  const pick = (a: number, b: number) => {
    const cur = ref.current;
    if (isFinished(cur)) return;
    const found = new Set(cur.found.map((f) => f.key));
    const ev = mod.check(puzzle, a, b, found);
    if (ev.kind === 'hit') beforeHit?.(ev.key);
    const next = applyPick(cur, ev, { now: Date.now(), total, daily, copy });
    commit(next);
    if (isFinished(next)) window.setTimeout(scrollToTop, durationMs('--dur-slower'));
  };

  const hint = () => {
    const cur = ref.current;
    const found = new Set(cur.found.map((f) => f.key));
    commit(applyHint(cur, mod.hint(puzzle, found), copy));
  };

  const finish = () => {
    commit(applyFinish(ref.current, Date.now(), total, copy));
    scrollToTop();
  };

  const tapStart = () => commit({ ...ref.current, msg: copy.pick('tapNext') });
  const dragStart = () => {
    if (ref.current.msg) commit({ ...ref.current, msg: '' });
  };

  const replay = () => {
    if (daily) return;
    commit(newSession(Date.now()));
    window.scrollTo(0, 0);
  };

  return { s, foundSet, total, answers, daily, finished: isFinished(s), pick, hint, finish, tapStart, dragStart, replay };
}
