import { useMemo, useState } from 'react';
import { characterFor } from '../avatar/draw';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { CaseBoard } from '../components/CaseBoard';
import { Stars } from '../components/Stars';
import { StepResult } from '../components/StepResult';
import { TextLink } from '../components/TextLink';
import { pick } from '../copy';
import { LINEUP_TRIES, lineupStars, roleLabel, type Chapter, type Progress } from '../engine/chapter';
import { useAuth } from '../lib/auth';
import { loadChapterStars, recordChapterStars } from '../lib/chapterStore';
import styles from './LineUp.module.css';

/** "The Long Spoon" inside a question: "the Long Spoon". */
const inLine = (name: string): string => (/^The /.test(name) ? `the ${name.slice(4)}` : name);

/**
 * The last step of a "who did it" (SPEC section 6, Line-up): name who is left. Whoever the evidence cleared cannot
 * be named. 2 tries, then the mask comes off anyway, so nobody is locked out. Then the ending.
 */
export function LineUp({ chapter, progress }: { chapter: Chapter; progress: Progress }) {
  const last = chapter.steps.length;
  const [stars, setStars] = useState<number>(() => loadChapterStars(chapter.id)[last] ?? 0);
  const [wrong, setWrong] = useState<string[]>([]);
  const [picked, setPicked] = useState('');
  const [msg, setMsg] = useState('');
  const auth = useAuth();
  const guest = auth.enabled && !auth.profile;
  const keep = useMemo(() => pick('chapterKeep'), []);
  const culprit = chapter.suspects.find((s) => s.who === chapter.culprit)!;
  const chosen = chapter.suspects.find((s) => s.who === picked);
  const left = LINEUP_TRIES - wrong.length;

  const name = () => {
    if (!chosen) return;
    if (chosen.who === chapter.culprit) {
      setStars(recordChapterStars(chapter.id, last, lineupStars(wrong.length)));
      return;
    }
    const next = [...wrong, chosen.who];
    setWrong(next);
    setPicked('');
    if (next.length >= LINEUP_TRIES) {
      setMsg(pick('unmaskOut'));
      setStars(recordChapterStars(chapter.id, last, lineupStars(next.length)));
    } else setMsg(pick('lineupWrong', { name: chosen.name }));
  };

  if (stars > 0)
    return (
      <div className={styles.screen} data-lineup="closed">
        <div className={styles.top}>
          <TextLink to={`/case/${chapter.id}`}>The board</TextLink>
          <Stars value={stars as 0 | 1 | 2 | 3} size={20} />
        </div>
        <h1 className={styles.title}>Case closed</h1>
        {msg && <p className={styles.line}>{msg}</p>}
        <div className={styles.reveal}>
          <span className={styles.culprit} data-culprit-photo>
            <Avatar parts={characterFor(`${chapter.id}~${culprit.who}`, culprit.look)} size={96} />
            <span className={styles.name}>{culprit.name}</span>
            <span className={styles.role}>{roleLabel(culprit.who)}</span>
          </span>
          <p className={styles.slip} data-found>
            {chapter.ending.found}
          </p>
        </div>
        <blockquote className={styles.confession} data-confession>
          &ldquo;{chapter.ending.confession}&rdquo;
        </blockquote>
        <p className={styles.after} data-after>
          {chapter.ending.after}
        </p>
        <Button variant="accent" to="/play">
          Back to cases
        </Button>
        {guest && (
          <p className={styles.line} data-keep>
            {keep} <TextLink to={`/welcome?from=${encodeURIComponent('/play')}`}>Choose your look</TextLink>
          </p>
        )}
      </div>
    );

  return (
    <div className={styles.screen} data-lineup="open">
      <div className={styles.top}>
        <TextLink to={`/case/${chapter.id}`}>The board</TextLink>
        <span className={styles.tries} role="img" aria-label={left === 1 ? '1 try left' : `${left} tries left`} data-tries={left}>
          {Array.from({ length: LINEUP_TRIES }, (_, i) => (
            <span key={i} className={styles.pip} data-spent={i >= left || undefined} />
          ))}
        </span>
      </div>
      <h1 className={styles.title}>Who took {inLine(chapter.item.name)}?</h1>
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
