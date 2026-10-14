import { useMemo, useState } from 'react';
import { Stars } from '../components/Stars';
import { StepResult } from '../components/StepResult';
import { TextLink } from '../components/TextLink';
import { trailOf, trailStars, trailWrongs, type Chapter } from '../engine/chapter';
import { submitPlay } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useCase } from '../lib/cold';
import { loadChapterStars, recordChapterStars } from '../lib/chapterStore';
import { markGuestPlayed, playKey } from '../lib/guestLimit';
import page from './Step.module.css';
import { Onward } from './Onward';
import { Marks } from './StepMarks';
import { wayOn } from './stepWay';
import styles from './Trail.module.css';

/**
 * Walk it back, the trail (SPEC section 6, Walk it back): the places of the case are stops on a line, and the
 * finds are handed back 1 at a time, out of order, to be pinned where each was found. A find gets 1 pick: wrong,
 * it goes where it belongs and costs a star, never the lead. It ends as any step does.
 */
export function Trail({ chapter, at, solved }: { chapter: Chapter; at: number; solved: number }) {
  const { cold, sid, base } = useCase(chapter.id);
  const step = chapter.steps[at - 1]!;
  const trail = useMemo(() => trailOf(chapter, at)!, [chapter, at]);
  const auth = useAuth();
  const [best, setBest] = useState<number>(() => loadChapterStars(sid)[at] ?? 0);
  const [picks, setPicks] = useState<number[]>([]);
  const [done, setDone] = useState(best > 0);
  const inHand = done ? undefined : trail.finds[picks.length];

  // Signed in, the places picked are sent once the walk is done, and the server works out the stars itself.
  const pin = (place: number) => {
    if (!inHand) return;
    const next = [...picks, place];
    setPicks(next);
    if (next.length < trail.finds.length) return;
    setBest(recordChapterStars(sid, at, trailStars(trailWrongs(trail, next))));
    setDone(true);
    if (!auth.session && !cold) markGuestPlayed(playKey(chapter.id, undefined, at));
    if (auth.session && !cold) void submitPlay({ game: { type: 'case', id: chapter.id, step: at, picked: next }, log: { events: [], hints: [], finish: 1 } });
  };

  const again = () => {
    setDone(false);
    setPicks([]);
  };

  return (
    <div className={page.screen} data-step={at} data-trail={done ? 'done' : 'open'} data-finished={done || undefined}>
      <div className={page.top}>
        <TextLink to={base}>The board</TextLink>
        <Marks chapter={chapter} at={at} solved={Math.max(solved, done ? at : 0)} />
      </div>
      <h1 className={page.title}>{step.place}</h1>

      {done ? (
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
      ) : (
        <p className={styles.hand} aria-live="polite" data-in-hand>
          <span className={styles.sr}>Where was this found? </span>
          <span className={styles.slip}>{inHand?.pin}</span>
        </p>
      )}

      <ol className={styles.stops} aria-label="The places of the case, in order">
        {trail.places.map((place, i) => {
          // A find shows at the place it belongs, once it has been handed over. Put elsewhere first, it is marked.
          const k = trail.finds.findIndex((f) => f.place === i);
          const placed = done || k < picks.length;
          const missed = placed && !done && picks[k] !== i;
          const body = (
            <>
              <span className={styles.dot} />
              <span className={styles.place}>{place}</span>
              {placed && (
                <span className={styles.slip} data-placed data-missed={missed || undefined}>
                  {trail.finds[k]!.pin}
                </span>
              )}
            </>
          );
          return (
            <li key={place} className={styles.stop} data-stop={i}>
              {done ? (
                <span className={styles.row}>{body}</span>
              ) : (
                <button type="button" className={styles.row} onClick={() => pin(i)}>
                  {body}
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
