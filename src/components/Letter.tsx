import { memo } from 'react';
import styles from './Letter.module.css';

export type LetterState = '' | 'selecting' | 'found' | 'missed';

type Props = {
  ch: string;
  /** Index in the letter stream, or -1 for a non letter. */
  li: number;
  state: LetterState;
  hint: boolean;
  caret: boolean;
};

/** One character of the puzzle. Only letters carry `data-li`. */
export const Letter = memo(function Letter({ ch, li, state, hint, caret }: Props) {
  return (
    <span
      className={styles.letter}
      data-li={li >= 0 ? li : undefined}
      data-state={state || undefined}
      data-hint={hint || undefined}
      data-caret={caret || undefined}
    >
      {ch}
    </span>
  );
});
