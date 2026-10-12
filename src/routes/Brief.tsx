import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { CaseBoard } from '../components/CaseBoard';
import { PartnerNote } from '../components/PartnerNote';
import { TextLink } from '../components/TextLink';
import { pick } from '../copy';
import { getChapter } from '../games/chapters';
import styles from './Brief.module.css';

/**
 * /case/:id. The brief of a written chapter: what is missing, where, what was left behind and who could have, on
 * the case board. Reached by its link only until the steps of a chapter can be played.
 */
export function Brief() {
  const { id = '' } = useParams();
  const chapter = getChapter(id);
  const missing = useMemo(() => pick('briefMissing'), []);
  const soon = useMemo(() => pick('briefSoon'), []);

  if (!chapter)
    return (
      <div className={styles.screen} data-brief="missing">
        <PartnerNote moment="empty" layout="screen" title="No such case">
          <p>{missing}</p>
          <TextLink to="/play">Back to cases</TextLink>
        </PartnerNote>
      </div>
    );

  return (
    <div className={styles.screen} data-brief={chapter.id}>
      <TextLink to="/play">Cases</TextLink>
      <h1 className={styles.title}>{chapter.title}</h1>
      <CaseBoard chapter={chapter} />
      <ul className={styles.brief}>
        {chapter.brief.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <p className={styles.soon}>{soon}</p>
    </div>
  );
}
