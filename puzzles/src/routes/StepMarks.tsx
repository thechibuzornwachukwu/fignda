import type { Chapter } from '../engine/chapter';
import styles from './Step.module.css';

/** The marks at the top right: one a step, a records step square, the last one largest. */
export function Marks({ chapter, at, solved }: { chapter: Chapter; at: number; solved: number }) {
  return (
    <ol className={styles.marks} aria-label={`${chapter.title}, step ${at} of ${chapter.steps.length}`} data-marks>
      {chapter.steps.map((s, i) => (
        <li
          key={i}
          className={styles.mark}
          data-kind={i === chapter.steps.length - 1 ? 'last' : s.method === 'buried-sums' ? 'sums' : 'words'}
          data-state={i + 1 === at ? 'here' : i < solved ? 'done' : 'ahead'}
          aria-hidden="true"
        />
      ))}
    </ol>
  );
}
