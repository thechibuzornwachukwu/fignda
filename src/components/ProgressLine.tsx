import styles from './ProgressLine.module.css';

type Props = {
  /** 0 to 1 */
  value: number;
  label: string;
  className?: string;
};

export function ProgressLine({ value, label, className }: Props) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div
      className={[styles.track, className].filter(Boolean).join(' ')}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
    >
      <div className={styles.fill} style={{ width: `${pct}%` }} />
    </div>
  );
}
