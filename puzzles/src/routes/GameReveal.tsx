import { useId, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Icon } from '../components/Icon';
import type { RevealItem } from '../games/registry';
import styles from './GameReveal.module.css';

type Props = {
  /** Missed answers in reading order. Parts come from the engine. */
  items: readonly RevealItem[];
  /** "Your picks ran across 2 of these." */
  past?: string;
};

/** After the game: each missed word shown where it hides, one at a time. */
export function GameReveal({ items, past }: Props) {
  const id = useId();
  const [at, setAt] = useState(0);
  const n = items.length;
  if (!n) return null;
  const i = Math.min(at, n - 1);
  const item = items[i]!;
  const step = (by: number) => setAt((i + by + n) % n);
  return (
    <section className={styles.reveal} aria-labelledby={id}>
      <div className={styles.head}>
        <h3 id={id} className={styles.title}>
          What you missed
        </h3>
        {n > 1 && (
          <div className={styles.nav}>
            <span className={styles.count}>
              {i + 1} of {n}
            </span>
            <button type="button" className={styles.step} aria-label="Previous missed word" onClick={() => step(-1)}>
              <Icon icon={ChevronLeft} size={18} />
            </button>
            <button type="button" className={styles.step} aria-label="Next missed word" onClick={() => step(1)}>
              <Icon icon={ChevronRight} size={18} />
            </button>
          </div>
        )}
      </div>
      <p className={styles.item} role="status">
        <span className={styles.word}>{item.label}</span>
        <span className={styles.where}>
          {item.parts.map((p, k) =>
            p.hit ? (
              <mark key={k} className={styles.hit}>
                {p.text}
              </mark>
            ) : (
              <span key={k}>{p.text}</span>
            ),
          )}
        </span>
      </p>
      {past && <p className={styles.past}>{past}</p>}
    </section>
  );
}
