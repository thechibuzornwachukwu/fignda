import type { CSSProperties } from 'react';
import { Star } from 'lucide-react';
import { Icon, type IconSize } from './Icon';
import { clampStars, MAX_STARS, starsLabel } from './starsLabel';
import styles from './Stars.module.css';

type Props = {
  /** Stars earned, 0 to 3. Anything else (missing, not a number) counts as 0. */
  value?: number | null;
  size?: IconSize;
  /** Earned stars pop in one at a time. For the moment they are won, not for every visit. */
  pop?: boolean;
  className?: string;
};

// The helpers live in starsLabel.ts. Kept here too for screens that already import them from this file.
// eslint-disable-next-line react-refresh/only-export-components
export { clampStars, MAX_STARS, starsLabel } from './starsLabel';

/** 3 stars in a row. Earned ones are filled, the rest are outlines: the count reads by shape, never by colour alone. */
export function Stars({ value, size = 16, pop = false, className }: Props) {
  const n = clampStars(value);
  return (
    <span className={[styles.stars, className].filter(Boolean).join(' ')} role="img" aria-label={starsLabel(n)} data-stars={n} data-pop={pop || undefined}>
      {Array.from({ length: MAX_STARS }, (_, i) => (
        <span key={i} className={i < n ? styles.on : styles.off} data-star={i < n ? 'on' : 'off'} style={{ '--i': i } as CSSProperties}>
          <Icon icon={Star} size={size} />
        </span>
      ))}
    </span>
  );
}
