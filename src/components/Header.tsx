import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';
import styles from './Header.module.css';

const navCls = ({ isActive }: { isActive: boolean }) =>
  [styles.navLink, isActive && styles.active].filter(Boolean).join(' ');

function AccountLink() {
  const { profile } = useAuth();
  const { pathname } = useLocation();
  if (profile) {
    return (
      <Link to={`/u/${profile.handle}`} className={styles.account}>
        <span className={styles.avatar} aria-hidden="true">
          {profile.name.charAt(0).toUpperCase()}
        </span>
        {profile.name.split(/\s+/)[0]}
      </Link>
    );
  }
  const next = pathname.startsWith('/signin') ? '' : `?next=${encodeURIComponent(pathname)}`;
  return (
    <Link to={`/signin${next}`} className={styles.account}>
      Sign in
    </Link>
  );
}

export function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link to="/" className={styles.home} aria-label="Fignda home">
          <Logo />
        </Link>
        <nav className={styles.nav} aria-label="Main">
          <NavLink to="/play" className={navCls}>
            Games
          </NavLink>
          <Link to="/#how" className={styles.navLink}>
            How it works
          </Link>
          <Link to="/#about" className={styles.navLink}>
            About
          </Link>
        </nav>
        <div className={styles.spacer} />
        <div className={styles.end}>
          <AccountLink />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
