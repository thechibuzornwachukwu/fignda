import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CaseBoard } from '../components/CaseBoard';
import { PageHeader } from '../components/PageHeader';
import { PartnerNote } from '../components/PartnerNote';
import { TextLink } from '../components/TextLink';
import { pick } from '../copy';
import { chapterProgress } from '../engine/chapter';
import { chapters } from '../games/chapters';
import { loadChapterStars } from '../lib/chapterStore';
import { openCase } from '../lib/firstCase';
import styles from './Notebook.module.css';

/**
 * /notebook. Your Notebook (SPEC section 6): everything found, in 1 place. Every case worked, in the order of the
 * casebook, as its own board: the clues pinned, the people met, who is cleared, and the lead that is open. A case
 * not started is not in it.
 */
export function Notebook() {
  const worked = useMemo(
    () =>
      chapters
        .map((chapter) => ({ chapter, progress: chapterProgress(chapter, loadChapterStars(chapter.id)) }))
        .filter(({ progress }) => progress.solved > 0),
    [],
  );
  const empty = useMemo(() => pick('notebookEmpty'), []);

  if (worked.length === 0)
    return (
      <div className={styles.screen} data-notebook="empty">
        <PartnerNote moment="empty" layout="screen" title="Nothing in it yet">
          <p>{empty}</p>
          <TextLink to={openCase()?.to ?? '/cases'}>Open your case</TextLink>
        </PartnerNote>
      </div>
    );

  return (
    <div className={styles.screen} data-notebook={worked.length}>
      <PageHeader title="Your Notebook" />
      <ol className={styles.cases}>
        {worked.map(({ chapter, progress }) => {
          const closed = progress.solved >= chapter.steps.length;
          const lead = closed ? null : chapter.steps[progress.solved - 1]?.lead;
          return (
            <li key={chapter.id} className={styles.case} data-case={chapter.id} data-closed={closed || undefined}>
              <Link to={`/case/${chapter.id}`} className={styles.title}>
                {chapter.title}
              </Link>
              <CaseBoard chapter={chapter} solved={progress.solved} cleared={progress.cleared} />
              {closed ? <span className={styles.stamp}>Case closed</span> : lead && <p className={styles.lead}>{lead}</p>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
