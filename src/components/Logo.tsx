import styles from './Logo.module.css';
import { LOGO_G, LOGO_REST, LOGO_SHADE, MARK_BOX, WORDMARK_BOX } from './logoPaths';

type Props = { height?: number; className?: string };

/** The Gazecraft mark from SPEC section 1: the G on its lime shade. Never redraw. */
export function LogoMark({ height = 30, className }: Props) {
  return (
    <svg
      width={(height * MARK_BOX[2]) / MARK_BOX[3]}
      height={height}
      viewBox={MARK_BOX.join(' ')}
      aria-hidden="true"
      focusable="false"
      className={[styles.logo, className].filter(Boolean).join(' ')}
    >
      <path d={LOGO_SHADE} fill="var(--accent)" />
      <path d={LOGO_G} fill="currentColor" />
    </svg>
  );
}

/** The wordmark: GAZECRAFT with the mark as its first letter. Height includes the shade; capitals are 88% of it. */
export function Logo({ height = 22, className }: Props) {
  return (
    <svg
      width={(height * WORDMARK_BOX[2]) / WORDMARK_BOX[3]}
      height={height}
      viewBox={WORDMARK_BOX.join(' ')}
      role="img"
      aria-label="Gazecraft"
      focusable="false"
      className={[styles.logo, className].filter(Boolean).join(' ')}
    >
      <path d={LOGO_SHADE} fill="var(--accent)" />
      <path d={LOGO_G + LOGO_REST} fill="currentColor" />
    </svg>
  );
}
