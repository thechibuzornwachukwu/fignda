import { Check } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { Segmented } from '../components/Segmented';
import { Stars } from '../components/Stars';
import { StepResult } from '../components/StepResult';
import { TextLink } from '../components/TextLink';
import { pick } from '../copy';
import { claimPick, pickStep, type Chapter } from '../engine/chapter';
import { submitPlay } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useCase } from '../lib/cold';
import { loadChapterStars, recordChapterStars } from '../lib/chapterStore';
import { loadFlow } from '../lib/firstMinute';
import { markGuestPlayed, playKey } from '../lib/guestLimit';
import { markPlayedToday } from '../lib/playDays';
import styles from './Claim.module.css';
import page from './Step.module.css';
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
  const { pathname } = useLocation();
  // Play first: the character and the pet are asked after the first result, not before.
  const [lookAsk] = useState(() => !loadFlow().character);
  const askLook = auth.enabled && !auth.session && lookAsk;
  const lookLine = useMemo(() => pick('guestLook'), []);
  const ready = fact >= 0 && verdict !== '';
  const said = ready ? claimPick(fact, verdict === 'yes') : -1;
  const left = choice.tries - wrong.length;

  // Signed in, the verdicts are sent once the step is done, and the server works out the stars itself.
  const finish = (picks: number[], wrongs: number) => {
    setBest(recordChapterStars(sid, at, choice.stars(wrongs)));
    setDone(true);
    if (!auth.session && !cold) markGuestPlayed(playKey(chapter.id, undefined, at));
    markPlayedToday();
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
        <TextLink to={base}>The board</TextLink>
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
          <div className={page.actions}>
            <Button variant="accent" to={`${base}/${at + 1}`}>
              {wayOn(chapter, at)}
            </Button>
            <TextLink onClick={again}>Play it again</TextLink>
          </div>
          {askLook && (
            <p className={page.line} data-look-ask>
              {lookLine} <TextLink to={`/welcome?from=${encodeURIComponent(pathname)}`}>Choose your look</TextLink>
            </p>
          )}
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
            <Button variant="accent" onClick={say} disabled={!ready || wrong.includes(said)}>
              Say so
            </Button>
            <span className={styles.tries} role="img" aria-label={left === 1 ? '1 try left' : `${left} tries left`} data-tries={left}>
              {Array.from({ length: choice.tries }, (_, i) => (
                <span key={i} className={styles.pip} data-spent={i >= left || undefined} />
              ))}
            </span>
          </div>
          <p className={page.line} aria-live="polite" role="status">
            {msg}
          </p>
        </>
      )}
    </div>
  );
}
