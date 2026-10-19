import { ArrowLeft } from 'lucide-react';
import { useMemo, useState, type CSSProperties } from 'react';
import { Stars } from '../components/Stars';
import { StepResult } from '../components/StepResult';
import { IconLink } from '../components/IconLink';
import { tornOf, tornStars, tornWrongs, type Chapter } from '../engine/chapter';
import { submitPlay } from '../lib/api';
import { useAuth } from '../lib/auth';
import { loadChapterStars, recordChapterStars } from '../lib/chapterStore';
import { useCase } from '../lib/cold';
import { markGuestPlayed, playKey } from '../lib/guestLimit';
import page from './Step.module.css';
import { Onward } from './Onward';
import { Marks } from './StepMarks';
import { wayOn } from './stepWay';
import styles from './TornPage.module.css';

/** The 5 points of a tear, top to bottom, as an edge the 2 halves share: each offset is a step of --space-1. */
const STOPS = ['0%', '25%', '50%', '75%', '100%'];
const dent = (n: number) => `calc(var(--space-1) * ${n})`;
const leftEdge = (e: number[]): CSSProperties => ({
  clipPath: `polygon(0 0, ${STOPS.map((y, i) => `calc(100% - ${dent(e[i]!)}) ${y}`).join(', ')}, 0 100%)`,
});
// The right half's edge is the left's turned inside out (3 less each offset), so set 3 steps over the left one the
// 2 tears close up with no gap.
const rightEdge = (e: number[]): CSSProperties => ({
  clipPath: `polygon(${dent(3 - e[0]!)} 0, 100% 0, 100% 100%, ${STOPS.map((y, i) => `${dent(3 - e[i]!)} ${y}`)
    .reverse()
    .join(', ')})`,
});

/**
 * The torn page (SPEC section 6, The torn page): a page torn top to bottom. The left halves are in order, and the
 * right halves are handed back out of order. The line that is open takes the next half tapped. A line gets 1 pick:
 * a wrong half goes back to the pile, the right one is set in its place, and it costs a star, never the lead.
 */
export function TornPage({ chapter, at, solved }: { chapter: Chapter; at: number; solved: number }) {
  const { cold, sid, base } = useCase(chapter.id);
  const step = chapter.steps[at - 1]!;
  const torn = useMemo(() => tornOf(chapter, at)!, [chapter, at]);
  const auth = useAuth();
  const [best, setBest] = useState<number>(() => loadChapterStars(sid)[at] ?? 0);
  const [done, setDone] = useState(best > 0);
  const [picks, setPicks] = useState<number[]>([]);
  const line = done ? -1 : picks.length;
  // A half is on the page once its line is done, whichever half was picked for it.
  const placed = new Set(done ? torn.order : torn.order.slice(0, picks.length));

  const set = (r: number) => {
    if (done || placed.has(r)) return;
    const next = [...picks, r];
    setPicks(next);
    if (next.length < torn.lefts.length) return;
    setBest(recordChapterStars(sid, at, tornStars(tornWrongs(torn, next))));
    setDone(true);
    if (!auth.session && !cold) markGuestPlayed(playKey(chapter.id, undefined, at));
    if (auth.session && !cold) void submitPlay({ game: { type: 'case', id: chapter.id, step: at, picked: next }, log: { events: [], hints: [], finish: 1 } });
  };

  const again = () => {
    setDone(false);
    setPicks([]);
  };

  return (
    <div className={page.screen} data-step={at} data-torn={done ? 'done' : 'open'} data-finished={done || undefined}>
      <div className={page.top}>
        <IconLink to={base} icon={ArrowLeft} label="The board" />
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

      <ol className={styles.page} aria-label="The page">
        {torn.lefts.map((left, k) => {
          const whole = done || k < picks.length;
          const wrong = whole && !done && picks[k] !== torn.order[k];
          return (
            <li key={k} className={styles.line} data-line={k} data-state={whole ? (wrong ? 'mended' : 'whole') : k === line ? 'open' : 'ahead'}>
              <span className={styles.left} style={leftEdge(torn.edges[k]!)}>
                {left}
              </span>
              {whole ? (
                <span className={styles.right} style={rightEdge(torn.edges[k]!)}>
                  {torn.rights[torn.order[k]!]}
                </span>
              ) : (
                <span className={styles.gap} aria-label={k === line ? 'The next half goes here' : undefined} />
              )}
            </li>
          );
        })}
      </ol>

      {!done && (
        <ul className={styles.pile} aria-label="Torn halves">
          {torn.rights.map((r, i) =>
            placed.has(i) ? null : (
              <li key={i}>
                <button type="button" className={styles.right} style={rightEdge(torn.edges[torn.order.indexOf(i)]!)} onClick={() => set(i)} data-half={i}>
                  {r}
                </button>
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  );
}
