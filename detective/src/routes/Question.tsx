import { ArrowLeft, RotateCcw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Icon } from '../components/Icon';
import { IconLink } from '../components/IconLink';
import { Stars } from '../components/Stars';
import { StepResult } from '../components/StepResult';
import { pick } from '../copy';
import { TALK_TRIES, talkStars, talkWrongs, type Chapter } from '../engine/chapter';
import { submitPlay } from '../lib/api';
import { useAuth } from '../lib/auth';
import { loadChapterStars, recordChapterStars } from '../lib/chapterStore';
import { useCase } from '../lib/cold';
import { markGuestPlayed, playKey } from '../lib/guestLimit';
import page from './Step.module.css';
import { Onward } from './Onward';
import { Marks } from './StepMarks';
import { wayOn } from './stepWay';
import styles from './Question.module.css';

type Line = { by: 'you' | 'them'; text: string };

/**
 * Question them (SPEC section 6, Question them): what a person says, and what to put to them. A question with a
 * reason behind it is answered and costs nothing. One with none ends the talk, and it starts again. A pin from the
 * board shown against what they said makes them say more, if it is the right one. A talk ended or a pin that proves
 * nothing costs a star; after 2 they say it anyway.
 */
export function Question({ chapter, at, solved }: { chapter: Chapter; at: number; solved: number }) {
  const { cold, sid, base } = useCase(chapter.id);
  const step = chapter.steps[at - 1]!;
  const talk = step.talk!;
  const pins = useMemo(() => chapter.steps.slice(0, at - 1).map((s) => s.pin ?? ''), [chapter, at]);
  const auth = useAuth();
  const [best, setBest] = useState<number>(() => loadChapterStars(sid)[at] ?? 0);
  const [done, setDone] = useState(best > 0);
  const [moves, setMoves] = useState<number[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [over, setOver] = useState(false);
  const right = talk.asks.length + talk.show.from - 1;
  const wrongs = moves.filter((m) => (m < talk.asks.length ? talk.asks[m]!.ends === true : m !== right)).length;

  // Graded by the engine the Worker grades it with.
  const finish = (next: number[]) => {
    setBest(recordChapterStars(sid, at, talkStars(talkWrongs(talk, at - 1, next))));
    setDone(true);
    if (!auth.session && !cold) markGuestPlayed(playKey(chapter.id, undefined, at));
    if (auth.session && !cold) void submitPlay({ game: { type: 'case', id: chapter.id, step: at, picked: next }, log: { events: [], hints: [], finish: 1 } });
  };

  const move = (m: number) => {
    if (done || over || moves.includes(m)) return;
    const next = [...moves, m];
    setMoves(next);
    if (m < talk.asks.length) {
      const ask = talk.asks[m]!;
      setLines((l) => [...l, { by: 'you', text: ask.text }, { by: 'them', text: ask.answer }]);
      if (!ask.ends) return;
      if (wrongs + 1 >= TALK_TRIES) return said(next);
      setOver(true);
      return;
    }
    const shown = { by: 'you' as const, text: `You show: ${pins[m - talk.asks.length]}` };
    if (m === right) {
      setLines((l) => [...l, shown, { by: 'them', text: talk.show.answer }]);
      return finish(next);
    }
    setLines((l) => [...l, shown, { by: 'them', text: pick('talkShrug') }]);
    if (wrongs + 1 >= TALK_TRIES) said(next);
  };

  // Out of tries: they say it anyway, and the step is done.
  const said = (next: number[]) => {
    setLines((l) => [...l, { by: 'them', text: talk.show.answer }]);
    finish(next);
  };

  const restart = () => {
    setOver(false);
    setLines([]);
  };

  const again = () => {
    setDone(false);
    setMoves([]);
    setLines([]);
    setOver(false);
  };

  return (
    <div className={page.screen} data-step={at} data-question={done ? 'done' : 'open'} data-finished={done || undefined}>
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

      {/* What they told the detective, as written in the notebook, then the talk under it. */}
      <figure className={styles.notebook}>
        <figcaption className={styles.name}>{talk.name}</figcaption>
        <blockquote className={styles.says}>{talk.says}</blockquote>
        {lines.length > 0 && (
          <ol className={styles.talk} aria-live="polite">
            {lines.map((l, i) => (
              <li key={i} className={styles.line} data-by={l.by}>
                {l.text}
              </li>
            ))}
          </ol>
        )}
      </figure>

      {!done && over && (
        <div className={styles.over} data-over>
          <p className={page.line}>{pick('talkOver')}</p>
          <button type="button" className={styles.restart} onClick={restart} aria-label="Start the talk again" data-restart>
            <Icon icon={RotateCcw} size={18} />
          </button>
        </div>
      )}

      {!done && !over && (
        <>
          <ul className={styles.asks} aria-label="Ask">
            {talk.asks.map((a, i) => (
              <li key={i}>
                <button type="button" className={styles.ask} onClick={() => move(i)} disabled={moves.includes(i)} data-ask={i}>
                  {a.text}
                </button>
              </li>
            ))}
          </ul>
          <ul className={styles.pins} aria-label="Show a pin from the board">
            {pins.map((p, i) => {
              const m = talk.asks.length + i;
              return (
                <li key={i}>
                  <button type="button" className={styles.pin} onClick={() => move(m)} disabled={moves.includes(m)} data-pin={i} data-struck={(moves.includes(m) && m !== right) || undefined}>
                    {p}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
