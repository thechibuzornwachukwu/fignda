import { ArrowLeft } from 'lucide-react';
import { useMemo } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { Button } from '../components/Button';
import { CaseBoard } from '../components/CaseBoard';
import { PartnerNote } from '../components/PartnerNote';
import { IconLink } from '../components/IconLink';
import { TextLink } from '../components/TextLink';
import { pick } from '../copy';
import { chapterProgress } from '../engine/chapter';
import { getChapter } from '../games/chapters';
import { loadChapterStars } from '../lib/chapterStore';
import { caseClosed, caseWay, useCold } from '../lib/cold';
import { caseOpen, openCase } from '../lib/firstCase';
import styles from './Brief.module.css';

/** "The store room" after "Go to": "the store room". */
const toPlace = (place: string): string => (/^The /.test(place) ? `the ${place.slice(4)}` : place);

/**
 * /case/:id. The brief of a written chapter: what is missing, where, what was left behind and who could have, on
 * the case board, as far as this player has filled it, and one way on: the step that is open.
 */
export function Brief() {
  const { id = '' } = useParams();
  const chapter = getChapter(id);
  const missing = useMemo(() => pick('briefMissing'), []);
  const locked = useMemo(() => pick('caseLocked'), []);
  const cold = useCold();

  if (!chapter)
    return (
      <div className={styles.screen} data-brief="missing">
        <PartnerNote moment="empty" layout="screen" title="No such case">
          <p>{missing}</p>
          <TextLink to="/cases">Back to cases</TextLink>
        </PartnerNote>
      </div>
    );

  // A case opens when the one before it is closed: its brief starts from how that one ended.
  if (!caseOpen(chapter))
    return (
      <div className={styles.screen} data-brief="locked">
        <PartnerNote moment="empty" layout="screen" title="Not yet">
          <p>{locked}</p>
          <TextLink to={openCase()?.to ?? '/cases'}>Open the case before it</TextLink>
        </PartnerNote>
      </div>
    );

  // A cold case is a closed case, worked again.
  if (cold && !caseClosed(chapter)) return <Navigate to={`/case/${chapter.id}`} replace />;
  const { sid, base } = caseWay(chapter.id, cold);
  const progress = chapterProgress(chapter, loadChapterStars(sid));
  const closer = chapter.steps[chapter.steps.length - 1]!.method;
  const next = Math.min(progress.solved + 1, chapter.steps.length);

  return (
    <div className={styles.screen} data-brief={chapter.id} data-cold={cold || undefined}>
      <IconLink to="/cases" icon={ArrowLeft} label="Cases" />
      <h1 className={styles.title}>{chapter.title}</h1>
      <CaseBoard chapter={chapter} solved={progress.solved} cleared={progress.cleared} />
      <Button variant="accent" to={`${base}/${next}`}>
        {progress.solved === 0 ? `Go to ${toPlace(chapter.steps[0]!.place)}` : progress.solved === chapter.steps.length ? (closer === 'line-up' ? 'See the line-up' : 'See the ending') : 'Carry on'}
      </Button>
      <ul className={styles.brief}>
        {chapter.brief.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  );
}
