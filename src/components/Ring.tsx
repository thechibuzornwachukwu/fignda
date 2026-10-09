import styles from './Ring.module.css';

/** One part of a segmented ring. `rest` is a day off that still counts: drawn dashed and thin, never by colour alone. */
export type RingPart = 'done' | 'rest' | 'empty';

type Props = {
  /** 0 to 1. Ignored when `parts` is given. */
  value?: number;
  /** A segmented ring, first part at 12 o'clock, clockwise. */
  parts?: readonly RingPart[];
  label: string;
  size?: number;
  className?: string;
};

const C = 12;
const R = 10;
/** Degrees left open between two parts. */
const GAP = 12;
const DASHES = 3;

/** An open circle that fills. Lime only when it closes, since lime means found. */
export function Ring({ value = 0, parts, label, size = 20, className }: Props) {
  const cls = [styles.ring, className].filter(Boolean).join(' ');

  if (parts) {
    const n = parts.length;
    const slot = n ? 360 / n : 360;
    const gap = n > 1 ? GAP : 0;
    const seg = slot - gap;
    const off = 360 - seg;
    const dash = seg / (DASHES * 2 - 1);
    // Dash, space, dash, space, dash, then nothing until the part ends.
    const dashed = `${Array.from({ length: DASHES * 2 - 1 }, () => dash).join(' ')} ${off}`;
    const closed = n > 0 && parts.every((p) => p !== 'empty') && parts.includes('done');
    return (
      <svg className={cls} role="img" aria-label={label} data-closed={closed} width={size} height={size} viewBox="0 0 24 24">
        {parts.map((p, i) => (
          <circle
            key={i}
            className={styles[p]}
            data-part={p}
            cx={C}
            cy={C}
            r={R}
            pathLength={360}
            strokeWidth={p === 'done' ? 2.5 : 1.5}
            strokeDasharray={p === 'rest' ? dashed : `${seg} ${off}`}
            transform={`rotate(${-90 + i * slot + gap / 2} ${C} ${C})`}
          />
        ))}
      </svg>
    );
  }

  // 0 of 0 divides to NaN: an empty ring, never a broken one.
  const pct = Number.isFinite(value) ? Math.round(Math.min(1, Math.max(0, value)) * 100) : 0;
  return (
    <svg
      className={cls}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      data-closed={pct === 100}
      width={size}
      height={size}
      viewBox="0 0 24 24"
    >
      <circle className={styles.track} cx={C} cy={C} r={R} strokeWidth={2.5} />
      <circle
        className={styles.fill}
        cx={C}
        cy={C}
        r={R}
        pathLength={100}
        strokeWidth={2.5}
        strokeDasharray="100"
        style={{ strokeDashoffset: 100 - pct }}
        transform={`rotate(-90 ${C} ${C})`}
      />
    </svg>
  );
}
