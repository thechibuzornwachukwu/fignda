import { memo, useEffect, useRef } from 'react';
import { Pointer } from 'lucide-react';
import { Icon } from './Icon';
import { prefersReducedMotion } from '../lib/media';
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

/** Room kept clear above and below a hinted letter: the header on top, the phone bar and the hand below. */
const HINT_EDGE = 120;

/** One character of the puzzle. Only letters carry `data-li`. */
export const Letter = memo(function Letter({ ch, li, state, hint, caret }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  // A hint is no help off screen: on a long puzzle the letter is brought into view, the phone bar cleared.
  useEffect(() => {
    const el = ref.current;
    if (!hint || !el || typeof el.scrollIntoView !== 'function') return;
    const r = el.getBoundingClientRect();
    if (r.top >= HINT_EDGE && r.bottom <= window.innerHeight - HINT_EDGE) return;
    el.scrollIntoView({ block: 'center', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }, [hint]);
  return (
    <span
      ref={ref}
      className={styles.letter}
      data-li={li >= 0 ? li : undefined}
      data-state={state || undefined}
      data-hint={hint || undefined}
      data-caret={caret || undefined}
    >
      {ch}
      {/* A hand under the letter: seen on any fill, and never in the way of a drag. */}
      {hint && (
        <span className={styles.hand} aria-hidden="true">
          <Icon icon={Pointer} size="em" />
        </span>
      )}
    </span>
  );
});
