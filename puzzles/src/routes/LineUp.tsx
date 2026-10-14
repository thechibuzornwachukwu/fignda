import { useState } from 'react';
import { Button } from '../components/Button';
import { CaseBoard } from '../components/CaseBoard';
import { StepResult } from '../components/StepResult';
import { TextLink } from '../components/TextLink';
import { pick } from '../copy';
import { LINEUP_TRIES, lineupStars, type Chapter, type Progress } from '../engine/chapter';
import { submitPlay } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useCase } from '../lib/cold';
import { loadChapterStars, recordChapterStars } from '../lib/chapterStore';
import { markPlayedToday } from '../lib/playDays';
import { Ending } from './Ending';
import styles from './LineUp.module.css';

/** "The Long Spoon" inside a question: "the Long Spoon". */
const inLine = (name: string): string => (/^The /.test(name) ? `the ${name.slice(4)}` : name);

/**
 * The last step of a "who did it" (SPEC section 6, Line-up): name who is left. Whoever the evidence cleared cannot
 * be named. 2 tries, then the mask comes off anyway, so nobody is locked out. Then the ending.
 */
export function LineUp({ chapter, progress }: { chapter: Chapter; progress: Progress }) {
  const { cold, sid, base } = useCase(chapter.id);
  const last = chapter.steps.length;
  const [stars, setStars] = useState<number>(() => loadChapterStars(sid)[last] ?? 0);
  const [wrong, setWrong] = useState<string[]>([]);
  const [picked, setPicked] = useState('');
  const [msg, setMsg] = useState('');
  const auth = useAuth();
  const chosen = chapter.suspects.find((s) => s.who === picked);
  const left = LINEUP_TRIES - wrong.length;

  // Signed in, the names tried are sent once the case is closed, and the server works out the stars itself.
  const send = (named: string[]) => {
    if (auth.session && !cold) void submitPlay({ game: { type: 'case', id: chapter.id, step: last, named }, log: { events: [], hints: [], finish: 1 } });
  };

  const name = () => {
    if (!chosen) return;
    markPlayedToday();
    if (chosen.who === chapter.culprit) {
      setStars(recordChapterStars(sid, last, lineupStars(wrong.length)));
      send([...wrong, chosen.who]);
      return;
    }
    const next = [...wrong, chosen.who];
    setWrong(next);
    setPicked('');
    if (next.length >= LINEUP_TRIES) {
      setMsg(pick('unmaskOut'));
      setStars(recordChapterStars(sid, last, lineupStars(next.length)));
      send(next);
    } else setMsg(pick('lineupWrong', { name: chosen.name }));
  };

  if (stars > 0) return <Ending chapter={chapter} stars={stars} msg={msg} />;

  return (
    <div className={styles.screen} data-lineup="open">
      <div className={styles.top}>
        <TextLink to={base}>The board</TextLink>
        <span className={styles.tries} role="img" aria-label={left === 1 ? '1 try left' : `${left} tries left`} data-tries={left}>
          {Array.from({ length: LINEUP_TRIES }, (_, i) => (
            <span key={i} className={styles.pip} data-spent={i >= left || undefined} />
          ))}
        </span>
      </div>
      <h1 className={styles.title}>{chapter.ask ?? `Who took ${inLine(chapter.item.name)}?`}</h1>
      <CaseBoard chapter={chapter} solved={progress.solved} cleared={progress.cleared} ruledOut={wrong} picked={picked} onPick={setPicked} />
      <StepResult chapter={chapter} at={last} stars={0} />
      <div className={styles.actions}>
        <Button variant="accent" onClick={name} disabled={!chosen}>
          {chosen ? `Name ${chosen.name}` : 'Pick who is left'}
        </Button>
      </div>
      <p className={styles.line} aria-live="polite" role="status">
        {msg}
      </p>
    </div>
  );
}
