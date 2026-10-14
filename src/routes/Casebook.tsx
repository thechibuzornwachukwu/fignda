import { Award, Check, Eye, Lock } from 'lucide-react';
import { useId, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { chapterProgress } from '../engine/chapter';
import { CASEBOOK, chapters, interludes } from '../games/chapters';
import { loadChapterStars } from '../lib/chapterStore';
import { caseClosed, coldSealed } from '../lib/cold';
import styles from './Casebook.module.css';

/**
 * The casebook on Cases (SPEC section 6, Casebook): a place and its cases, in order, on 1 path. Each case is a
 * file. Closed files fold to a row, with a gold seal once worked cold. The open one shows its steps as marks and
 * the way in. The rest are shut. An interlude is a small mark between 2 files.
 */
export function Casebook() {
  const headId = useId();
  const rows = useMemo(() => {
    // The first case that is not closed is the one being worked. Every case after it is shut.
    const at = chapters.findIndex((c) => !caseClosed(c));
    return chapters.map((chapter, n) => {
      const closed = caseClosed(chapter);
      const state = closed ? ('closed' as const) : n === at ? ('open' as const) : ('locked' as const);
      const between = interludes.filter((i) => i.after === chapter.number).map((i) => ({ i, read: (loadChapterStars(i.id)[1] ?? 0) > 0 }));
      return { chapter, state, sealed: closed && coldSealed(chapter), solved: chapterProgress(chapter, loadChapterStars(chapter.id)).solved, between };
    });
  }, []);
  if (rows.length === 0) return null;
  const written = rows.length;
  // Art never blocks the path: a later case can be released first, so the file still shut is the lowest number missing.
  const numbers = new Set(chapters.map((c) => c.number));
  const missing = Array.from({ length: CASEBOOK.cases }, (_, i) => i + 1).find((n) => !numbers.has(n));

  return (
    <section className={styles.book} aria-labelledby={headId} data-casebook={CASEBOOK.id}>
      <h2 id={headId} className={styles.banner}>
        {CASEBOOK.name}
      </h2>
      <ol className={styles.files}>
        {rows.map(({ chapter, state, sealed, solved, between }) => {
          const steps = chapter.steps.length;
          return (
            <li key={chapter.id} className={styles.slot}>
              {state === 'closed' && (
                <div className={styles.file} data-file={chapter.id} data-state="closed">
                  <span className={styles.done}>
                    <Icon icon={Check} size={18} label="Closed" />
                  </span>
                  <Link to={`/case/${chapter.id}`} className={styles.name}>
                    {chapter.title}
                  </Link>
                  {sealed ? (
                    <Link to={`/cold/${chapter.id}`} className={styles.seal} data-seal aria-label={`${chapter.title}: gold seal. Work it cold again`}>
                      <Icon icon={Award} size={18} />
                    </Link>
                  ) : (
                    <Link to={`/cold/${chapter.id}`} className={styles.cold} data-cold aria-label={`Work ${chapter.title} cold, with no tip-offs`}>
                      <Icon icon={Award} size={18} />
                    </Link>
                  )}
                </div>
              )}
              {state === 'open' && (
                <div className={styles.file} data-chapter={chapter.id} data-state="open">
                  <div className={styles.text}>
                    <h3 className={styles.title}>{chapter.title}</h3>
                    <span className={styles.steps} role="img" aria-label={solved === 0 ? `${steps} steps` : `Step ${solved + 1} of ${steps}`} data-steps>
                      {chapter.steps.map((_, i) => (
                        <span key={i} className={styles.step} data-state={i < solved ? 'done' : i === solved ? 'here' : 'ahead'} />
                      ))}
                    </span>
                  </div>
                  <Button variant="secondary" to={`/case/${chapter.id}`}>
                    {solved > 0 ? 'Carry on' : 'Open the brief'}
                  </Button>
                </div>
              )}
              {state === 'locked' && (
                <div className={styles.file} data-file={chapter.id} data-state="locked">
                  <span className={styles.shut}>
                    <Icon icon={Lock} size={18} label="Not open yet" />
                  </span>
                  <span className={styles.name}>{chapter.title}</span>
                </div>
              )}
              {between.map(({ i, read }) =>
                state === 'closed' ? (
                  <Link key={i.id} to={`/interlude/${i.id}`} className={styles.mark} data-interlude={i.id} data-state={read ? 'read' : 'open'}>
                    <Icon icon={Eye} size={16} />
                    {i.title}
                  </Link>
                ) : (
                  <span key={i.id} className={styles.mark} data-interlude={i.id} data-state="locked">
                    <Icon icon={Eye} size={16} label="An intercept, not open yet" />
                  </span>
                ),
              )}
            </li>
          );
        })}
        {written < CASEBOOK.cases && missing != null && (
          <li className={styles.slot}>
            <div className={styles.file} data-state="unwritten" data-next-file>
              <span className={styles.shut}>
                <Icon icon={Lock} size={18} label="Not written yet" />
              </span>
              <span className={styles.name}>Case {missing}</span>
            </div>
          </li>
        )}
      </ol>
    </section>
  );
}
