import type { ReactNode } from 'react';
import styles from './Skeleton.module.css';

/** One grey shape standing where content is on its way. Decorative: the group around it says "Loading". */
export function Skeleton({ width = '100%', height = 14, round = false }: { width?: number | string; height?: number; round?: boolean }) {
  return <span className={styles.bone} data-round={round || undefined} style={{ width, height }} aria-hidden="true" />;
}

/** What a set of shapes sits in: busy to a screen reader, with one word for what is happening. */
export function SkeletonGroup({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={[styles.group, className].filter(Boolean).join(' ')} aria-busy="true" data-skeleton>
      <span className={styles.srOnly}>Loading.</span>
      {children}
    </div>
  );
}

const WIDTHS = ['46%', '62%', '38%', '54%'];

/**
 * A list on its way: a board, players, notifications, circles. `avatar` is the size of the picture each row
 * leads with (0 for none), `sub` a second line under the name, `stat` the number at the far end.
 */
export function SkeletonList({ rows = 5, avatar = 0, sub = false, stat = true }: { rows?: number; avatar?: number; sub?: boolean; stat?: boolean }) {
  return (
    <SkeletonGroup className={styles.list}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className={styles.row}>
          {avatar > 0 && <Skeleton width={avatar} height={avatar} round />}
          <span className={styles.lines}>
            <Skeleton width={WIDTHS[i % WIDTHS.length]} height={16} />
            {sub && <Skeleton width="28%" height={12} />}
          </span>
          {stat && <Skeleton width={48} />}
        </div>
      ))}
    </SkeletonGroup>
  );
}

/** A row of pills on its way: badges. */
export function SkeletonPills({ count = 4 }: { count?: number }) {
  return (
    <SkeletonGroup className={styles.pills}>
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} width={i % 2 ? 96 : 128} height={28} round />
      ))}
    </SkeletonGroup>
  );
}
