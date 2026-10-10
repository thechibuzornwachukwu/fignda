import type { ReactNode } from 'react';
import { NotificationsLink } from './Header';
import styles from './PageHeader.module.css';

type Props = {
  title: string;
  /** One action, on the right. An icon button, a small link, or nothing. */
  action?: ReactNode;
};

/**
 * The top of each tab: the title in the same place at the same size, and one action slot. SPEC section 4.
 * On a phone there is no bar above it, so the bell sits here, last on the right.
 */
export function PageHeader({ title, action }: Props) {
  return (
    <header className={styles.head}>
      <h1 className={styles.title}>{title}</h1>
      <div className={styles.side}>
        {action ? <div className={styles.action}>{action}</div> : null}
        <span className={styles.bell}>
          <NotificationsLink />
        </span>
      </div>
    </header>
  );
}