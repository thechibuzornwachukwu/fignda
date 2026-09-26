import { Link } from 'react-router-dom';
import styles from './GameRow.module.css';

type Props = {
  to: string;
  /** Left column, hidden under 760. Omit for the compact landing list. */
  category?: string;
  title: string;
  /** "N words · Level" */
  meta: string;
  size?: 'lg' | 'md';
};

export function GameRow({ to, category, title, meta, size = 'lg' }: Props) {
  return (
    <li className={styles.item}>
      <Link to={to} className={size === 'md' ? styles.rowMd : styles.row}>
        {category != null && <span className={styles.cat}>{category}</span>}
        <span className={size === 'md' ? styles.titleMd : styles.title}>{title}</span>
        <span className={styles.meta}>{meta}</span>
      </Link>
    </li>
  );
}
