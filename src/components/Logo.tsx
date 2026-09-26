import styles from './Logo.module.css';

type MarkProps = { size?: number; className?: string };

/** The Fignda mark from SPEC section 1. Never redraw. */
export function LogoMark({ size = 30, className }: MarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={[styles.mark, className].filter(Boolean).join(' ')}
    >
      <g transform="translate(1 2)">
        <circle cx="27" cy="30" r="13" fill="var(--accent)" stroke="currentColor" strokeWidth="7" />
        <path
          d="M40 30V14a10 10 0 0 1 10-10h3M40 20h12M40 30v15a11 11 0 0 1-11 11h-5"
          stroke="currentColor"
          strokeWidth="7"
        />
      </g>
    </svg>
  );
}

/** Lockup: mark 30 + "fignda" 18/800, gap 10. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={[styles.lockup, className].filter(Boolean).join(' ')}>
      <LogoMark size={30} />
      <span className={styles.word}>fignda</span>
    </span>
  );
}
