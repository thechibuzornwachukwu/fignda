import { useRef } from 'react';
import { hasTabBar } from '../lib/routes';
import { useTucked } from '../lib/useTucked';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { playNext } from '../lib/playNext';
import { Button } from './Button';
import { Logo, LogoMark } from './Logo';
import { ThemeToggle } from './ThemeToggle';
import { Avatar } from './Avatar';
import { Skeleton } from './Skeleton';
import styles from './Header.module.css';

const navCls = ({ isActive }: { isActive: boolean }) =>
  [styles.navLink, isActive && styles.active].filter(Boolean).join(' ');

function AccountLink() {
  const { profile, loading } = useAuth();
  const { pathname } = useLocation();
  if (profile) {
    const first = profile.name.split(/\s+/)[0];
    return (
      <Link to="/me" className={styles.account} aria-label={`${first}, your profile`}>
        <Avatar handle={profile.handle} size={28} />
        {/* On a phone the face is enough; the name would push the header onto a second row. */}
        <span className={styles.accountName}>{first}</span>
      </Link>
    );
  }
  // A session is being read: nobody knows yet who this is, so a face is held for them instead of a guess at "Sign in".
  if (loading) return <Skeleton width={28} height={28} round />;
  const next = pathname.startsWith('/signin') ? '' : `?next=${encodeURIComponent(pathname)}`;
  return (
    <Link to={`/signin${next}`} className={styles.account}>
      Sign in
    </Link>
  );
}

/**
 * Two headers, by context. The landing page is a pitch: its own sections and one way in.
 * Everywhere else is the app, on wide screens only (a phone has the dock): the same places in the same order as the
 * dock, and the same Play, which always knows what is next. Your face leads to You.
 */
export function Header() {
  const { pathname } = useLocation();
  const landing = pathname === '/';
  const ref = useRef<HTMLElement>(null);
  const tucked = useTucked(ref, pathname);
  const play = playNext();

  return (
    <header ref={ref} className={[styles.header, tucked && styles.tucked].filter(Boolean).join(' ')} data-tucked={tucked || undefined} data-app={hasTabBar(pathname) || undefined}>
      <div className={styles.inner}>
        <Link to="/" className={styles.home} aria-label="Gazecraft home">
          <Logo className={styles.wordmark} />
          <LogoMark height={28} className={styles.mark} />
        </Link>
        {landing ? (
          <nav className={styles.nav} aria-label="On this page">
            <Link to="/#how" className={styles.navLink}>
              How it works
            </Link>
            <Link to="/#about" className={styles.navLink}>
              About
            </Link>
          </nav>
        ) : (
          <nav className={styles.nav} aria-label="Main">
            <NavLink to="/play" className={navCls}>
              Puzzles
            </NavLink>
            <NavLink to="/players" className={navCls}>
              People
            </NavLink>
            <NavLink to="/leaderboard" className={navCls}>
              League
            </NavLink>
          </nav>
        )}
        <div className={styles.spacer} />
        <div className={styles.end}>
          <span className={landing ? styles.acct : `${styles.acct} ${styles.appOnly}`}>
            <AccountLink />
          </span>
          <ThemeToggle />
          {landing ? (
            <Button to="/play" size="sm">
              Play
            </Button>
          ) : (
            <span className={styles.appOnly}>
              <Button to={play.to} size="sm" aria-label={play.name}>
                Play
              </Button>
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
