import { Burst } from './Burst';
import { Button } from './Button';
import { Dialog } from './Dialog';
import { Stars } from './Stars';
import { TextLink } from './TextLink';
import styles from './ClueDone.module.css';

type Props = {
  open: boolean;
  onClose: () => void;
  /** The result title, picked once at the finish. */
  title: string;
  stars: number;
  /** What happened, in a few words: "4 of 4 found in 0:42". */
  line: string;
  /** Where the player goes from here. The one accent button. */
  next?: { to: string; label: string };
};

/**
 * The moment a clue is finished, as a popup over the board: what was won, then one way on. It opens once, for
 * the finish itself, never for a result opened again. Closing it leaves the full result underneath.
 */
export function ClueDone({ open, onClose, title, stars, line, next }: Props) {
  return (
    <Dialog open={open} onClose={onClose} label={title}>
      <div className={styles.pop} data-clue-done>
        <div className={styles.head}>
          {/* 3 stars get the paper. Anything less is told plainly. */}
          {stars === 3 && <Burst />}
          <Stars value={stars} size={20} pop className={styles.stars} />
        </div>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.line}>{line}</p>
        <div className={styles.actions}>
          {next && (
            <Button variant="accent" to={next.to}>
              {next.label}
            </Button>
          )}
          <TextLink onClick={onClose}>See the result</TextLink>
        </div>
      </div>
    </Dialog>
  );
}
