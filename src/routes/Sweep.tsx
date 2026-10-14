import { Check, X } from 'lucide-react';
import { useMemo, useState, type CSSProperties } from 'react';
import { Icon } from '../components/Icon';
import { MobileBar } from '../components/MobileBar';
import { Skeleton, SkeletonGroup } from '../components/Skeleton';
import { Stars } from '../components/Stars';
import { StepResult } from '../components/StepResult';
import { TextLink } from '../components/TextLink';
import { pick } from '../copy';
import { SCENE_H, SCENE_W, sweepHint, sweepResult, type Chapter } from '../engine/chapter';
import { starsFor } from '../engine/stars';
import { submitPlay } from '../lib/api';
import { useAuth } from '../lib/auth';
import { loadChapterStars, recordChapterStars } from '../lib/chapterStore';
import { useCase } from '../lib/cold';
import { markGuestPlayed, playKey } from '../lib/guestLimit';
import { markPlayedToday } from '../lib/playDays';
import { SCENES } from '../scenes';
import page from './Step.module.css';
import { Onward } from './Onward';
import { Marks } from './StepMarks';
import { wayOn } from './stepWay';
import styles from './Sweep.module.css';

const pct = (v: number, of: number) => `${(v / of) * 100}%`;
/** The clock, read when the player acts, never while drawing. */
const now = (): number => Date.now();

/**
 * Sweep the room (SPEC section 6, Sweep the room): a drawn room, and the player taps what could matter. Most of it
 * is only the room. A tap on the room costs a star, never the lead. A tip-off points at a quarter of the room,
 * never at the thing. "I'm done" ends it, and what was missed is shown. It ends as any step does.
 */
export function Sweep({ chapter, at, solved }: { chapter: Chapter; at: number; solved: number }) {
  const { cold, sid, base } = useCase(chapter.id);
  const step = chapter.steps[at - 1]!;
  const room = step.room!;
  const auth = useAuth();
  const [best, setBest] = useState<number>(() => loadChapterStars(sid)[at] ?? 0);
  const [done, setDone] = useState(best > 0);
  const [picks, setPicks] = useState<number[]>([]);
  const [hints, setHints] = useState<number[]>([]);
  const [quarter, setQuarter] = useState(-1);
  const [loaded, setLoaded] = useState(false);
  const [msg, setMsg] = useState('');
  const [start] = useState(now);
  const result = sweepResult(room, picks)!;
  const found = useMemo(() => new Set(picks.filter((p) => room.things[p]!.evidence)), [picks, room]);

  const finish = (all: number[]) => {
    const r = sweepResult(room, all)!;
    setBest(recordChapterStars(sid, at, starsFor({ finished: true, found: r.found, total: r.total, hints: hints.length, wrongs: r.wrongs })));
    setDone(true);
    setQuarter(-1);
    if (!auth.session && !cold) markGuestPlayed(playKey(chapter.id, undefined, at));
    markPlayedToday();
    if (auth.session && !cold) void submitPlay({ game: { type: 'case', id: chapter.id, step: at, picked: all }, log: { events: [], hints, finish: Math.max(1, now() - start) } });
  };

  const tap = (i: number) => {
    if (done || picks.includes(i)) return;
    const next = [...picks, i];
    setPicks(next);
    setMsg('');
    if (room.things[i]!.evidence) {
      setQuarter(-1);
      if (sweepResult(room, next)!.found === result.total) finish(next);
    }
  };

  const hint = () => {
    // Asked again while the corner is shown, it costs nothing.
    if (quarter >= 0) return;
    setHints((h) => [...h, Math.max(0, now() - start)]);
    setQuarter(sweepHint(room, found));
    setMsg(pick('sweepHint'));
  };

  const again = () => {
    setDone(false);
    setPicks([]);
    setHints([]);
    setQuarter(-1);
    setMsg('');
  };

  return (
    <div className={page.screen} data-step={at} data-sweep={done ? 'done' : 'open'} data-finished={done || undefined}>
      <div className={page.top}>
        <TextLink to={base}>The board</TextLink>
        <Marks chapter={chapter} at={at} solved={Math.max(solved, done ? at : 0)} />
      </div>
      <h1 className={page.title}>{step.place}</h1>

      {done && (
        <div className={page.end} data-step-end>
          <Stars value={best as 0 | 1 | 2 | 3} size={20} />
          <StepResult chapter={chapter} at={at} stars={best} />
          {step.lead && (
            <p className={page.lead} data-lead>
              {step.lead}
            </p>
          )}
          <Onward to={`${base}/${at + 1}`} label={wayOn(chapter, at)} stars={best} onAgain={again} />
        </div>
      )}

      <div className={styles.room} data-room={room.scene}>
        {!loaded && (
          <SkeletonGroup className={styles.wait}>
            <Skeleton width="100%" height={0} />
          </SkeletonGroup>
        )}
        <img src={SCENES[room.scene]} alt="" className={styles.scene} onLoad={() => setLoaded(true)} draggable={false} />
        {quarter >= 0 && <span className={styles.quarter} data-quarter={quarter} aria-hidden="true" />}
        {room.things.map((t, i) => {
          const tapped = picks.includes(i);
          const state = t.evidence ? (found.has(i) ? 'found' : done ? 'missed' : 'open') : tapped ? 'wrong' : 'open';
          const box: CSSProperties = { left: pct(t.box[0], SCENE_W), top: pct(t.box[1], SCENE_H), width: pct(t.box[2], SCENE_W), height: pct(t.box[3], SCENE_H) };
          return (
            <button
              key={t.name}
              type="button"
              className={styles.thing}
              style={box}
              aria-label={t.name}
              aria-pressed={tapped}
              disabled={done || tapped}
              onClick={() => tap(i)}
              data-thing={i}
              data-state={state}
              data-evidence={t.evidence || undefined}
            >
              {state === 'found' && (
                <span className={styles.mark}>
                  <Icon icon={Check} size={16} />
                </span>
              )}
              {state === 'wrong' && (
                <span className={styles.mark}>
                  <Icon icon={X} size={16} />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {!done && (
        <div className={page.actions} data-sweep-actions>
          <TextLink onClick={hint}>Ask for a tip-off</TextLink>
          <TextLink onClick={() => finish(picks)}>I'm done</TextLink>
          <span className={page.count}>
            {result.found} of {result.total}
          </span>
        </div>
      )}
      <p className={page.sr} aria-live="polite" role="status">
        {msg}
      </p>
      {/* On a phone the bar under the thumb has the tip-off and done, so the row above goes. */}
      {!done && (
        <MobileBar
          count={`${result.found} of ${result.total}`}
          progress={result.total > 0 ? result.found / result.total : 0}
          time={null}
          message={msg || 'Tap what matters. Most of it is only the room.'}
          onHint={hint}
          onDone={() => finish(picks)}
        />
      )}
    </div>
  );
}
