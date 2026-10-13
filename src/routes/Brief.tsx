import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '../components/Button';
import { CaseBoard } from '../components/CaseBoard';
import { PartnerNote } from '../components/PartnerNote';
import { TextLink } from '../components/TextLink';
import { pick } from '../copy';
import { chapterProgress } from '../engine/chapter';
import { getChapter } from '../games/chapters';
import { loadChapterStars } from '../lib/chapterStore';
import styles from './Brief.module.css';

/** "The store room" after "Go to": "the store room". */
const toPlace = (place: string): string => (/^The /.test(place) ? `the ${place.slice(4)}` : place);

/**
 * /case/:id. The brief of a written chapter: what is missing, where, what was left behind and who could have, on
 * the case board, as far as this player has filled it, and one way on: the step that is open. Reached by its link
 * only until the line-up can be played.
 */
export function Brief() {
  const { id = '' } = useParams();
  const chapter = getChapter(id);
  const missing = useMemo(() => pick('briefMissing'), []);

  if (!chapter)
    return (
      <div className={styles.screen} data-brief="missing">
        <PartnerNote moment="empty" layout="screen" title="No such case">
          <p>{missing}</p>
          <TextLink to="/play">Back to cases</TextLink>
        </PartnerNote>
      </div>
    );

  const progress = chapterProgress(chapter, loadChapterStars(chapter.id));
  const next = Math.min(progress.solved + 1, chapter.steps.length);

  return (
    <div className={styles.screen} data-brief={chapter.id}>
      <TextLink to="/play">Cases</TextLink>
      <h1 className={styles.title}>{chapter.title}</h1>
      <CaseBoard chapter={chapter} solved={progress.solved} cleared={progress.cleared} />
      <Button variant="accent" to={`/case/${chapter.id}/${next}`}>
        {progress.solved === 0 ? `Go to ${toPlace(chapter.steps[0]!.place)}` : progress.solved === chapter.steps.length ? 'See the line-up' : 'Carry on'}
      </Button>
      <ul className={styles.brief}>
        {chapter.brief.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  );
}
