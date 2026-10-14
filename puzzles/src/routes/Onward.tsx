import { RotateCcw } from 'lucide-react';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import styles from './Onward.module.css';

/**
 * The way on from a finished step (SPEC section 6, Step): the accent button to the next place at the right, where
 * the thumb goes on, and the width of the row on a phone. At the left, while there is still a star to earn, a
 * round replay button with no word on it: the arrow says what it does. At 3 stars there is nothing to replay for.
 */
export function Onward({ to, label, stars, onAgain }: { to: string; label: string; stars: number; onAgain: () => void }) {
  return (
    <div className={styles.row} data-onward>
      {stars < 3 && (
        <button type="button" className={styles.again} onClick={onAgain} aria-label="Play it again" data-again>
          <Icon icon={RotateCcw} size={18} />
        </button>
      )}
      <Button variant="accent" to={to} className={styles.on}>
        {label}
      </Button>
    </div>
  );
}
