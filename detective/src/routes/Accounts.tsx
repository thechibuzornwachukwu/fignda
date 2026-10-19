import { ArrowLeft, Check } from 'lucide-react';
import { useId, useState } from 'react';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { IconLink } from '../components/IconLink';
import { pick } from '../copy';
import { pickStep, type Chapter, type Progress } from '../engine/chapter';
import { submitPlay } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useCase } from '../lib/cold';
import { loadChapterStars, recordChapterStars } from '../lib/chapterStore';
import { Ending } from './Ending';
import styles from './Accounts.module.css';
import screen from './LineUp.module.css';

/**
 * Which account fits (SPEC section 6, Which account fits): the last step of a case that weighs what could have
 * happened. 3 tellings of the same night, as a stack of 3 files with 1 open at a time, and 1 stands. A wrong
 * pick shows the find that strikes it out. After 2 wrong picks the one left stands anyway, so nobody is locked
 * out. Then the ending.
 */
export function Accounts({ chapter, progress }: { chapter: Chapter; progress: Progress }) {
  const { cold, sid, base } = useCase(chapter.id);
  const last = chapter.steps.length;
  const step = chapter.steps[last - 1]!;
  const accounts = step.accounts ?? [];
  const choice = pickStep(step)!;
  const [stars, setStars] = useState<number>(() => loadChapterStars(sid)[last] ?? 0);
  const [wrong, setWrong] = useState<number[]>([]);
  // The file that is open. It is the one a pick names.
  const [front, setFront] = useState(0);
  const [msg, setMsg] = useState('');
  // Weighed on this visit: the files stay on screen, struck out, until the player goes on to the ending.
  const [weighed, setWeighed] = useState(false);
  const auth = useAuth();
  const panel = useId();
  const left = choice.tries - wrong.length;
  const finds = chapter.steps.slice(0, progress.solved).flatMap((s) => (s.pin ? [s.pin] : []));

  // Signed in, the picks are sent once the case is closed, and the server works out the stars itself.
  const close = (picks: number[], wrongs: number) => {
    setStars(recordChapterStars(sid, last, choice.stars(wrongs)));
    setWeighed(true);
    setFront(choice.right);
    if (auth.session && !cold) void submitPlay({ game: { type: 'case', id: chapter.id, step: last, picked: picks }, log: { events: [], hints: [], finish: 1 } });
  };

  const say = () => {
    if (wrong.includes(front)) return;
    if (front === choice.right) {
      close([...wrong, front], wrong.length);
      return;
    }
    const next = [...wrong, front];
    setWrong(next);
    if (next.length >= choice.tries) {
      setMsg(pick('accountsOut'));
      close(next, next.length);
    }
  };

  if (stars > 0 && !weighed) return <Ending chapter={chapter} stars={stars} />;

  const closed = stars > 0;
  const state = (i: number): 'stands' | 'struck' | 'open' => (closed ? (i === choice.right ? 'stands' : 'struck') : wrong.includes(i) ? 'struck' : 'open');
  const open = accounts[front];
  const struckBy = chapter.steps[(open?.struckBy ?? 0) - 1]?.pin ?? '';

  return (
    <div className={screen.screen} data-accounts={closed ? 'weighed' : 'open'}>
      <div className={screen.top}>
        <IconLink to={base} icon={ArrowLeft} label="The board" />
        <span className={screen.tries} role="img" aria-label={left === 1 ? '1 try left' : `${left} tries left`} data-tries={left}>
          {Array.from({ length: choice.tries }, (_, i) => (
            <span key={i} className={screen.pip} data-spent={i >= left || undefined} />
          ))}
        </span>
      </div>
      <h1 className={screen.title}>Which account fits?</h1>
      <div className={styles.files}>
        <div className={styles.tabs} role="tablist" aria-label="The 3 accounts">
          {accounts.map((_, i) => (
            <button key={i} type="button" role="tab" className={styles.tab} aria-selected={front === i} aria-controls={panel} aria-label={`Account ${i + 1}`} onClick={() => setFront(i)} data-account={i} data-state={state(i)}>
              {state(i) === 'stands' ? <Icon icon={Check} size={18} /> : i + 1}
            </button>
          ))}
        </div>
        <div id={panel} className={styles.file} role="tabpanel" aria-live="polite" data-file={state(front)}>
          <p className={styles.text}>{open?.text}</p>
          {state(front) === 'struck' && (
            <span className={styles.strike} data-struck-by>
              <span className={styles.sr}>Struck out by: </span>
              {struckBy}
            </span>
          )}
        </div>
      </div>
      <ul className={styles.finds} aria-label="Found so far">
        {finds.map((f) => (
          <li key={f} className={styles.find}>
            {f}
          </li>
        ))}
      </ul>
      <div className={screen.actions}>
        {closed ? (
          <Button variant="accent" onClick={() => setWeighed(false)}>
            See how it ends
          </Button>
        ) : (
          <Button variant="accent" onClick={say} disabled={wrong.includes(front)}>
            This one stands
          </Button>
        )}
      </div>
      <p className={screen.line} aria-live="polite" role="status">
        {msg}
      </p>
    </div>
  );
}
