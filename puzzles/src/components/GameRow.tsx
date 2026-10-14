import { Link } from 'react-router-dom';
import { Stars } from './Stars';
import styles from './GameRow.module.css';

type Props = {
  to: string;
  /** Left column, hidden under 760. Omit for the compact landing list. */
  category?: string;
  title: string;
  /** "N words · Level" */
  meta: string;
  size?: 'lg' | 'md';
  /** Best stars on a finished puzzle. 0 or absent shows nothing. */
  stars?: number;
  /** "With NAME", under the title. */
  sponsor?: string;
};

export function GameRow({ to, category, title, meta, size = 'lg', stars = 0, sponsor }: Props) {
  return (
    <li className={styles.item}>
      <Link to={to} className={size === 'md' ? styles.rowMd : styles.row}>
        {category != null && <span className={styles.cat}>{category}</span>}
        <span className={size === 'md' ? styles.titleMd : styles.title}>
          {title}
          {sponsor && <span className={styles.with}>{sponsor}</span>}
        </span>
        <span className={styles.meta}>{meta}</span>
        {stars > 0 && <Stars value={stars} />}
      </Link>
    </li>
  );
}
