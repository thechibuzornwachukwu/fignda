import { useEffect, useRef, useState, type RefObject } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { isPuzzle } from '../lib/routes';
import { Button } from './Button';
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
        <span className={styles.avatar} aria-hidden='true'>
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

/** Scroll this far in one direction before the header moves. Stops jitter from small wobbles. */
const TOLERANCE = 8;

/**
 * Quick return (Material "enterAlways", headroom.js): hide on scroll down, show on any scroll up.
 * Always shown near the top, and whenever focus is inside it so keyboard users never lose it.
 */
function useTucked(ref: RefObject<HTMLElement | null>, pathname: string) {
  const [tucked, setTucked] = useState(false);
  const [prevPath, setPrevPath] = useState(pathname);
  if (prevPath !== pathname) {
    setPrevPath(pathname);
    setTucked(false);
  }

  useEffect(() => {
    let last = window.scrollY;
    let frame = 0;
    const update = () => {
      frame = 0;
      const y = window.scrollY;
      const d = y - last;
      if (Math.abs(d) < TOLERANCE) return;
      const el = ref.current;
      const height = el?.offsetHeight ?? 0;
      const focused = !!el && el.contains(document.activeElement);
      setTucked(d > 0 && y > height && !focused);
      last = y;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const onFocus = () => setTucked(false);
    const el = ref.current;
    window.addEventListener('scroll', onScroll, { passive: true });
    el?.addEventListener('focusin', onFocus);
    return () => {
      window.removeEventListener('scroll', onScroll);
      el?.removeEventListener('focusin', onFocus);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [ref]);

  return tucked;
}

/**
 * Two headers, by context. The landing page is a pitch: its own sections and one way in.
 * Everywhere else is the app: where to play, who is winning, who is playing.
 */
export function Header() {
  const { pathname } = useLocation();
  const landing = pathname === '/';
  const ref = useRef<HTMLElement>(null);
  const tucked = useTucked(ref, pathname);

  return (
    <header ref={ref} className={[styles.header, tucked && styles.tucked].filter(Boolean).join(' ')} data-tucked={tucked || undefined}>
      <div className={styles.inner}>
        <Link to="/" className={styles.home} aria-label="Fignda home">
          <Logo />
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
          <nav className={[styles.nav, styles.app, isPuzzle(pathname) && styles.focus].filter(Boolean).join(' ')} aria-label="Main">
            <NavLink to="/play" className={navCls}>
              Games
            </NavLink>
            <NavLink to="/leaderboard" className={navCls}>
              Leaders
            </NavLink>
            <NavLink to="/players" className={navCls}>
              Players
            </NavLink>
          </nav>
        )}
        <div className={styles.spacer} />
        <div className={styles.end}>
          <span className={landing ? styles.acct : `${styles.acct} ${styles.appOnly}`}>
            <AccountLink />
          </span>
          <ThemeToggle />
          {landing && (
            <Button to="/play" size="sm">
              Play
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
