import { ArrowLeft, Check } from 'lucide-react';
import { useState } from 'react';
import { Icon } from '../components/Icon';
import { Stars } from '../components/Stars';
import { StepResult } from '../components/StepResult';
import { IconLink } from '../components/IconLink';
import { pick } from '../copy';
import { pickStep, type Chapter } from '../engine/chapter';
import { submitPlay } from '../lib/api';
import { useAuth } from '../lib/auth';
import { loadChapterStars, recordChapterStars } from '../lib/chapterStore';
import { useCase } from '../lib/cold';
import { markGuestPlayed, playKey } from '../lib/guestLimit';
import styles from './Chain.module.css';
import page from './Step.module.css';
import { Onward } from './Onward';
import { Marks } from './StepMarks';
import { wayOn } from './stepWay';

/**
 * The missing step (SPEC section 6, The missing step): events in order with 1 gap, and 3 things that could have
 * happened in it. Only 1 fits. A tap picks. A wrong pick is struck out and costs a star, never the lead: after 2
 * the gap is filled anyway. It ends as any step does.
 */
export function Chain({ chapter, at, solved }: { chapter: Chapter; at: number; solved: number }) {
  const { cold, sid, base } = useCase(chapter.id);
  const step = chapter.steps[at - 1]!;
  const chain = step.chain!;
  const choice = pickStep(step)!;
  const auth = useAuth();
  const [best, setBest] = useState<number>(() => loadChapterStars(sid)[at] ?? 0);
  const [done, setDone] = useState(best > 0);
  const [wrong, setWrong] = useState<number[]>([]);
  const [msg, setMsg] = useState('');
  const left = choice.tries - wrong.length;

  // Signed in, the picks are sent once the step is done, and the server works out the stars itself.
  const finish = (picks: number[], wrongs: number) => {
    setBest(recordChapterStars(sid, at, choice.stars(wrongs)));
    setDone(true);
    if (!auth.session && !cold) markGuestPlayed(playKey(chapter.id, undefined, at));
    if (auth.session && !cold) void submitPlay({ game: { type: 'case', id: chapter.id, step: at, picked: picks }, log: { events: [], hints: [], finish: 1 } });
  };

  const choose = (i: number) => {
    if (done || wrong.includes(i)) return;
    if (i === choice.right) return finish([...wrong, i], wrong.length);
    const next = [...wrong, i];
    setWrong(next);
    if (next.length >= choice.tries) {
      setMsg(pick('claimOut'));
      finish(next, next.length);
    }
  };

  const again = () => {
    setDone(false);
    setWrong([]);
    setMsg('');
  };

  const before = chain.events.slice(0, chain.gap);
  const after = chain.events.slice(chain.gap);
  const event = (text: string) => (
    <li key={text} className={styles.event}>
      <span className={styles.dot} />
      <span className={styles.text}>{text}</span>
    </li>
  );

  return (
    <div className={page.screen} data-step={at} data-chain={done ? 'done' : 'open'} data-finished={done || undefined}>
      <div className={page.top}>
        <IconLink to={base} icon={ArrowLeft} label="The board" />
        <Marks chapter={chapter} at={at} solved={Math.max(solved, done ? at : 0)} />
      </div>
      <h1 className={page.title}>{step.place}</h1>

      {done && (
        <div className={page.end} data-step-end>
          <Stars value={best as 0 | 1 | 2 | 3} size={20} />
          {msg && <p className={page.line}>{msg}</p>}
          <StepResult chapter={chapter} at={at} stars={best} />
          {step.lead && (
            <p className={page.lead} data-lead>
              {step.lead}
            </p>
          )}
          <Onward to={`${base}/${at + 1}`} label={wayOn(chapter, at)} stars={best} onAgain={again} />
        </div>
      )}

      <ol className={styles.events} aria-label="What happened, in order">
        {before.map(event)}
        <li className={styles.event} data-gap={done ? 'filled' : 'open'}>
          <span className={styles.dot} />
          {done ? (
            <span className={styles.slip}>
              {chain.options[choice.right]!.text}
              <span className={styles.tick}>
                <Icon icon={Check} size={16} label="This fits" />
              </span>
            </span>
          ) : (
            <span className={styles.gap} role="img" aria-label="Something happened here" />
          )}
        </li>
        {after.map(event)}
      </ol>

      {!done && (
        <>
          <ul className={styles.options} aria-label="What happened in the gap">
            {chain.options.map((o, i) => (
              <li key={i}>
                <button type="button" className={styles.option} onClick={() => choose(i)} disabled={wrong.includes(i)} data-option={i} data-struck={wrong.includes(i) || undefined}>
                  {o.text}
                </button>
              </li>
            ))}
          </ul>
          <span className={styles.tries} role="img" aria-label={left === 1 ? '1 try left' : `${left} tries left`} data-tries={left}>
            {Array.from({ length: choice.tries }, (_, i) => (
              <span key={i} className={styles.pip} data-spent={i >= left || undefined} />
            ))}
          </span>
        </>
      )}
    </div>
  );
}
