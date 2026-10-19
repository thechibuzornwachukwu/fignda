import { ArrowLeft, Check } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { Segmented } from '../components/Segmented';
import { Stars } from '../components/Stars';
import { StepResult } from '../components/StepResult';
import { IconLink } from '../components/IconLink';
import { pick } from '../copy';
import { claimPick, pickStep, type Chapter } from '../engine/chapter';
import { submitPlay } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useCase } from '../lib/cold';
import { loadChapterStars, recordChapterStars } from '../lib/chapterStore';
import { markGuestPlayed, playKey } from '../lib/guestLimit';
import styles from './Claim.module.css';
import page from './Step.module.css';
import { Onward } from './Onward';
import { Marks } from './StepMarks';
import { wayOn } from './stepWay';

type Verdict = '' | 'yes' | 'no';

/**
 * Could it be done (SPEC section 6, Could it be done): a claim set against 2 facts already on the board. The
 * player says whether it could be done and which fact decides it. A wrong verdict costs a star and never the
 * lead: after 2 the answer is shown anyway. It ends as any step does, on its fact and its lead.
 */
export function Claim({ chapter, at, solved }: { chapter: Chapter; at: number; solved: number }) {
  const { cold, sid, base } = useCase(chapter.id);
  const step = chapter.steps[at - 1]!;
  const claim = step.claim!;
  const choice = pickStep(step)!;
  const auth = useAuth();
  const [best, setBest] = useState<number>(() => loadChapterStars(sid)[at] ?? 0);
  const [done, setDone] = useState(best > 0);
  const [wrong, setWrong] = useState<number[]>([]);
  const [fact, setFact] = useState(-1);
  const [verdict, setVerdict] = useState<Verdict>('');
  const [msg, setMsg] = useState('');
  const ready = fact >= 0 && verdict !== '';
  const said = ready ? claimPick(fact, verdict === 'yes') : -1;
  const left = choice.tries - wrong.length;

  // Signed in, the verdicts are sent once the step is done, and the server works out the stars itself.
  const finish = (picks: number[], wrongs: number) => {
    setBest(recordChapterStars(sid, at, choice.stars(wrongs)));
    setDone(true);
    if (!auth.session && !cold) markGuestPlayed(playKey(chapter.id, undefined, at));
    if (auth.session && !cold) void submitPlay({ game: { type: 'case', id: chapter.id, step: at, picked: picks }, log: { events: [], hints: [], finish: 1 } });
  };

  const say = () => {
    if (!ready || wrong.includes(said)) return;
    if (said === choice.right) {
      setMsg('');
      finish([...wrong, said], wrong.length);
      return;
    }
    const next = [...wrong, said];
    setWrong(next);
    if (next.length >= choice.tries) {
      setMsg(pick('claimOut'));
      finish(next, next.length);
    } else setMsg(pick('claimWrong'));
  };

  const again = () => {
    setDone(false);
    setWrong([]);
    setFact(-1);
    setVerdict('');
    setMsg('');
  };

  return (
    <div className={page.screen} data-step={at} data-claim={done ? 'done' : 'open'} data-finished={done || undefined}>
      <div className={page.top}>
        <IconLink to={base} icon={ArrowLeft} label="The board" />
        <Marks chapter={chapter} at={at} solved={Math.max(solved, done ? at : 0)} />
      </div>
      <h1 className={page.title}>{step.place}</h1>

      {done ? (
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
      ) : (
        <blockquote className={styles.says} data-claim-says>
          &ldquo;{claim.says}&rdquo;
        </blockquote>
      )}

      <ul className={styles.facts} aria-label="Which fact decides it">
        {claim.facts.map((f, i) => {
          const decides = done && !!f.decides;
          const body = (
            <>
              <span className={styles.text}>{f.text}</span>
              {decides && (
                <span className={styles.tick}>
                  <Icon icon={Check} size={18} label="This decides it" />
                </span>
              )}
            </>
          );
          return (
            <li key={i} className={styles.fact} data-fact-pick={i} data-state={decides ? 'decides' : !done && fact === i ? 'picked' : 'open'}>
              {done ? (
                body
              ) : (
                <button type="button" className={styles.choose} aria-pressed={fact === i} onClick={() => setFact(i)}>
                  {body}
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {done ? (
        <p className={styles.stamp} data-verdict={claim.possible ? 'yes' : 'no'}>
          {claim.possible ? 'It could be done' : 'It could not be done'}
        </p>
      ) : (
        <>
          <div className={styles.verdict}>
            <Segmented<Verdict>
              label="Could it be done?"
              hideLabel
              options={[
                ['yes', 'Could be done'],
                ['no', 'Could not'],
              ]}
              value={verdict}
              onChange={setVerdict}
            />
          </div>
          <div className={styles.actions}>
            <span className={styles.tries} role="img" aria-label={left === 1 ? '1 try left' : `${left} tries left`} data-tries={left}>
              {Array.from({ length: choice.tries }, (_, i) => (
                <span key={i} className={styles.pip} data-spent={i >= left || undefined} />
              ))}
            </span>
            <Button variant="accent" onClick={say} disabled={!ready || wrong.includes(said)}>
              Say so
            </Button>
          </div>
          <p className={page.line} aria-live="polite" role="status">
            {msg}
          </p>
        </>
      )}
    </div>
  );
}
