import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Icon } from './Icon';
import styles from './Footer.module.css';

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <Link to="/play" className={styles.cta}>
          Start playing
          <Icon icon={ArrowRight} size="em" />
        </Link>
        <div className={styles.meta}>
          <span>© 2026 Fignda</span>
        </div>
      </div>
    </footer>
  );
}
