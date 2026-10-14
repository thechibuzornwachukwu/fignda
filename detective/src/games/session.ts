// Play state for one step on a board. Transitions are pure and take the copy picker as a parameter,
// so feedback lines are picked exactly once per action (never inside a React updater).

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as copyDefault from '../copy';
import type { HintKind } from '../engine/hint';
import { durationMs, scrollToTop } from '../lib/media';
import { chime } from '../lib/sound';
import type { Evaluation, GameModule } from './registry';
import { loadResume, returned, saveResume, withoutAway } from './resume';

export type FoundEntry = { key: string; label: string; span: [number, number] };

export type SavedSession = {
  /** In find order. */
  found: FoundEntry[];
  hinted: string[];
  hints: number;
  /** Wrong picks. A clean read has none. */
  wrongs: number;
  hintLi: number;
  streak: number;
  lastFindAt: number | null;
  startAt: number;
  endAt: number | null;
  /** Picked once at finish, then fixed. */
  resultTitle: string | null;
  /** Play log for server verification: selections and hint times, ms since start. */
  log?: PlayLog;
  /** In storage only: when the player left an unfinished game. The time since then is not on its clock. */
  leftAt?: number;
  /** The finished play has gone to the server. Kept so a result opened again is never sent twice. */
  sent?: boolean;
};

export type PlayLog = { events: Array<{ a: number; b: number; t: number }>; hints: number[] };

export type Session = SavedSession & { msg: string };

export type Copy = Pick<typeof copyDefault, 'pick' | 'onFound' | 'resultTitle'>;

export const newSession = (now: number): Session => ({
  found: [],
  hinted: [],
  hints: 0,
  wrongs: 0,
  hintLi: -1,
  streak: 0,
  lastFindAt: null,
  startAt: now,
  endAt: null,
  resultTitle: null,
  log: { events: [], hints: [] },
  msg: '',
});

export const isFinished = (s: SavedSession) => s.endAt != null;

type Ctx = { now: number; total: number; copy: Copy; /** A number board: a wrong run is told in its own words. */ sums?: boolean };

export function applyPick(s: Session, ev: Evaluation, { now, total, copy, sums = false }: Ctx): Session {
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
      return { ...s, msg: copy.pick(sums ? 'closeSums' : 'close') };
    case 'wrong':
      return { ...s, streak: 0, wrongs: s.wrongs + 1, msg: copy.pick(sums ? 'wrongSums' : 'wrong') };
    case 'ignore':
      return { ...s, msg: '' };
  }
}

/** The line a hint of each kind says. They cost the same and mark the same thing: one first letter. */
export const HINT_POOL = { first: 'hint', longest: 'hintLongest', shortest: 'hintShortest', near: 'hintNear' } as const;

export function applyHint(s: Session, target: { key: string; at: number } | null, copy: Copy, kind: HintKind = 'first'): Session {
  if (isFinished(s) || !target) return s;
  // The hand is already on this letter. Asking again says so and costs nothing.
  if (s.hintLi === target.at) return { ...s, msg: copy.pick('hintStill') };
  return {
    ...s,
    hints: s.hints + 1,
    hinted: s.hinted.includes(target.key) ? s.hinted : [...s.hinted, target.key],
    hintLi: target.at,
    streak: 0,
    msg: copy.pick(HINT_POOL[kind]),
  };
}

export function applyFinish(s: Session, now: number, total: number, copy: Copy): Session {
  if (isFinished(s)) return s;
  return { ...s, endAt: now, hintLi: -1, msg: '', resultTitle: copy.resultTitle(s.found.length, total) };
}

export function secondsOf(s: SavedSession, now: number): number {
  return Math.max(0, Math.floor(((s.endAt ?? now) - s.startAt) / 1000));
}

/** Keep only entries that still match this puzzle's answers. */
function sanitize(saved: SavedSession, keys: ReadonlySet<string>): Session {
  const seen = new Set<string>();
  const found = (saved.found ?? []).filter((f) => keys.has(f.key) && !seen.has(f.key) && seen.add(f.key));
  return { ...newSession(Date.now()), ...saved, wrongs: saved.wrongs ?? 0, found, msg: '' };
}

/** Whether a pick goes in the play log. A word picked twice is not a second find, and the server refuses a
 * whole play for one, so repeats and too-short picks are left out. */
export const isLogged = (ev: Evaluation) => ev.kind !== 'already' && ev.kind !== 'ignore';

/** Append to the play log, capped at the server's 500 event limit. */
function withLog(next: Session, cur: Session, add: (l: PlayLog) => PlayLog): Session {
  const l = cur.log ?? { events: [], hints: [] };
  if (l.events.length + l.hints.length >= 500) return next;
  return { ...next, log: add(l) };
}

type Options<P> = {
  mod: GameModule<P>;
  puzzle: P;
  /** A name for this game. An unfinished game is kept under it and carried on. */
  resumeId?: string;
  /** How the player's pet chooses the answer a hint marks. Read when the hint is asked for. */
  hintKind?: () => HintKind;
  /** Called just before a find is committed (WordList FLIP capture). */
  beforeHit?: (key: string) => void;
  /** Called once for each new game: a first visit, or "Play again". Never for a game carried on from before. */
  onStart?: () => void;
  /** Called once, from the pick or the button that ended the game. */
  onFinish?: (s: Session) => void;
  copy?: Copy;
};

export function useGameSession<P>({ mod, puzzle, resumeId, hintKind, beforeHit, onStart, onFinish, copy = copyDefault }: Options<P>) {
  const onStartRef = useRef(onStart);
  const onFinishRef = useRef(onFinish);
  useLayoutEffect(() => {
    onStartRef.current = onStart;
    onFinishRef.current = onFinish;
  });
  const kept = resumeId != null;
  const answers = mod.answers(puzzle);
  const total = answers.length;

  // How this visit began: a new game, or one carried on from before (and whether it had anything to show for it).
  const [opened] = useState((): { s: Session; how: 'new' | 'carried' | 'carried-on' } => {
    const now = Date.now();
    const stored = resumeId != null ? loadResume(resumeId, now) : null;
    if (!stored) return { s: newSession(now), how: 'new' };
    const saved = sanitize(returned(stored, now), new Set(answers.map((a) => a.key)));
    return { s: saved, how: !isFinished(saved) && (saved.found.length > 0 || saved.hints > 0) ? 'carried-on' : 'carried' };
  });
  const [s, setS] = useState<Session>(opened.s);
  const began = useRef<'new' | 'carried' | 'carried-on' | null>(opened.how);

  const ref = useRef(s);
  /** Store the game. With `leftAt` when the player is leaving it: the time from then on is time away. */
  const keep = useCallback(
    (next: Session, leftAt?: number) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { msg: _m, ...game } = next;
      const saved: SavedSession = leftAt == null ? game : { ...game, leftAt };
      // A finished game is kept too: its result is still there on the next visit.
      if (resumeId != null) saveResume(resumeId, saved);
    },
    [resumeId],
  );
  const commit = useCallback(
    (next: Session) => {
      if (next === ref.current) return;
      ref.current = next;
      setS(next);
      keep(next);
    },
    [keep],
  );

  // Once per visit: a new game is counted, and a game carried on says so in one line.
  useEffect(() => {
    const how = began.current;
    began.current = null;
    if (how === 'new') onStartRef.current?.();
    else if (how === 'carried-on') commit({ ...ref.current, msg: copy.pick('resumed') });
    // The player is back on it: the stored copy stops saying they are away.
    else if (how === 'carried') keep(ref.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Time away is not time on the puzzle. Leaving (another page, another app, a locked phone, a closed tab)
  // keeps the game and stops its clock; coming back starts the clock where it stopped.
  useEffect(() => {
    if (!kept) return;
    let awayAt: number | null = null;
    const leave = () => {
      const cur = ref.current;
      if (awayAt != null || isFinished(cur)) return;
      awayAt = Date.now();
      keep(cur, awayAt);
    };
    const back = () => {
      if (awayAt == null) return;
      const now = Date.now();
      const cur = ref.current;
      const next = withoutAway(cur, now - awayAt, now);
      awayAt = null;
      // Either way the stored copy must stop saying the player is away.
      if (next === cur) keep(cur);
      else commit(next);
    };
    const seen = () => (document.visibilityState === 'hidden' ? leave() : back());
    document.addEventListener('visibilitychange', seen);
    window.addEventListener('pagehide', leave);
    window.addEventListener('pageshow', back);
    return () => {
      document.removeEventListener('visibilitychange', seen);
      window.removeEventListener('pagehide', leave);
      window.removeEventListener('pageshow', back);
      leave();
    };
  }, [kept, keep, commit]);
  const foundSet = useMemo(() => new Set(s.found.map((f) => f.key)), [s.found]);

  const pick = (a: number, b: number) => {
    const cur = ref.current;
    if (isFinished(cur)) return;
    const found = new Set(cur.found.map((f) => f.key));
    const ev = mod.check(puzzle, a, b, found);
    if (ev.kind === 'hit') {
      beforeHit?.(ev.key);
      chime();
    }
    const now = Date.now();
    const picked = applyPick(cur, ev, { now, total, copy, sums: mod.family === 'quantitative' });
    const logged = isLogged(ev)
      ? withLog(picked, cur, (l) => ({ ...l, events: [...l.events, { a, b, t: now - cur.startAt }] }))
      : picked;
    const next = logged;
    commit(next);
    if (isFinished(next)) {
      onFinishRef.current?.(next);
      window.setTimeout(scrollToTop, durationMs('--dur-slower'));
    }
  };

  const say = (msg: string) => commit({ ...ref.current, msg });

  /** The finished play is on its way to the server. Stored at once, so a reload in between sends nothing again. */
  const markSent = () => {
    if (isFinished(ref.current) && !ref.current.sent) commit({ ...ref.current, sent: true });
  };

  const hint = () => {
    const cur = ref.current;
    const found = new Set(cur.found.map((f) => f.key));
    const kind = hintKind?.() ?? 'first';
    // Where the player was last looking: their last find.
    const lastAt = cur.found.length ? cur.found[cur.found.length - 1]!.span[0] : null;
    const next = applyHint(cur, mod.hint(puzzle, found, kind, lastAt), copy, kind);
    // Only a hint that was charged goes in the play log, so the server counts what the player paid for.
    commit(next.hints === cur.hints ? next : withLog(next, cur, (l) => ({ ...l, hints: [...l.hints, Date.now() - cur.startAt] })));
  };

  const finish = () => {
    const cur = ref.current;
    const next = applyFinish(cur, Date.now(), total, copy);
    commit(next);
    if (next !== cur) onFinishRef.current?.(next);
    scrollToTop();
  };

  const tapStart = () => commit({ ...ref.current, msg: copy.pick(mod.family === 'quantitative' ? 'tapNextSums' : 'tapNext') });
  const dragStart = () => {
    if (ref.current.msg) commit({ ...ref.current, msg: '' });
  };

  const replay = () => {
    commit(newSession(Date.now()));
    onStartRef.current?.();
    window.scrollTo(0, 0);
  };

  return { s, foundSet, total, answers, finished: isFinished(s), pick, say, markSent, hint, finish, tapStart, dragStart, replay };
}
