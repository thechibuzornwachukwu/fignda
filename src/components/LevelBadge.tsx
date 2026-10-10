import { useEffect, useMemo, useState } from 'react';
import { pick } from '../copy';
import { levelFor } from '../engine/level';
import { Ring } from './Ring';
import styles from './LevelBadge.module.css';

type Props = {
  /** Lifetime points. Missing, null or not a number: level 1 with an empty ring. */
  points?: number | null;
  /** `sm`: the ring and the rank name, beside an avatar. `md`: also the points into the level. */
  size?: 'sm' | 'md';
  /** The moment a level is reached: the ring fills to closed and a `levelUp` line replaces the points. */
  levelUp?: boolean;
  className?: string;
};

const RING = { sm: 32, md: 44 } as const;

/** The player's level: the number inside a ring of progress to the next one, and the name of its rank. */
export function LevelBadge({ points, size = 'md', levelUp = false, className }: Props) {
  const safe = typeof points === 'number' && Number.isFinite(points) ? points : 0;
  const { level, into, need, rank } = levelFor(safe);
  const progress = need > 0 ? into / need : 0;

  // A level-up starts from where the ring was and fills on the next frame, so the Ring's own transition draws it.
  const [filled, setFilled] = useState(false);
  useEffect(() => {
    if (!levelUp) return;
    const frame = requestAnimationFrame(() => setFilled(true));
    return () => {
      cancelAnimationFrame(frame);
      setFilled(false);
    };
  }, [levelUp, level]);

  const line = useMemo(() => pick('levelUp', { n: level }), [level]);
  const label = levelUp ? `Level ${level}, ${rank}. Level reached.` : `Level ${level}, ${rank}. ${into} of ${need} points to level ${level + 1}.`;

  return (
    <span className={[styles.badge, styles[size], className].filter(Boolean).join(' ')} data-level={level} data-level-up={levelUp || undefined}>
      <span className={styles.dial}>
        <Ring value={levelUp ? (filled ? 1 : progress) : progress} size={RING[size]} label={label} />
        <span className={styles.number} aria-hidden="true">
          {level}
        </span>
      </span>
      <span className={styles.text}>
        <span className={styles.rank}>{rank}</span>
        {size === 'md' && (
          <span className={styles.points} aria-hidden={levelUp ? undefined : true}>
            {levelUp ? line : `${into} / ${need}`}
          </span>
        )}
      </span>
    </span>
  );
}
