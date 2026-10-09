import type { ReactNode } from 'react';
import styles from './PageHeader.module.css';

type Props = {
  title: string;
  /** One action, on the right. A TextLink, or nothing. */
  action?: ReactNode;
};

/** The top of each tab: the title in the same place at the same size, and one action slot. SPEC section 4. */
export function PageHeader({ title, action }: Props) {
  return (
    <header className={styles.head}>
      <h1 className={styles.title}>{title}</h1>
      {action ? <div className={styles.action}>{action}</div> : null}
    </header>
  );
}
