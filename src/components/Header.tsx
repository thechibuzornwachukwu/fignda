import { useRef } from 'react';
import { useTucked } from '../lib/useTucked';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useUnread } from '../lib/useUnread';
import { Button } from './Button';
import { Icon } from './Icon';
import { Logo, LogoMark } from './Logo';
import { ThemeToggle } from './ThemeToggle';
import { Avatar } from './Avatar';
import styles from './Header.module.css';

const navCls = ({ isActive }: { isActive: boolean }) =>
  [styles.navLink, isActive && styles.active].filter(Boolean).join(' ');

function AccountLink() {
  const { profile, loading } = useAuth();
  const { pathname } = useLocation();
  if (profile) {
    const first = profile.name.split(/\s+/)[0];
    return (
      <Link to={`/u/${profile.handle}`} className={styles.account} aria-label={`${first}, your profile`}>
        <Avatar handle={profile.handle} size={28} />
        {/* On a phone the face is enough; the name would push the header onto a second row. */}
        <span className={styles.accountName}>{first}</span>
      </Link>
    );
  }
  // A session is being read: nobody knows yet who this is, so the link does not guess "Sign in".
  if (loading) return null;
  const next = pathname.startsWith('/signin') ? '' : `?next=${encodeURIComponent(pathname)}`;
  return (
    <Link to={`/signin${next}`} className={styles.account}>
      Sign in
    </Link>
  );
}

/** The bell. Signed in only. A count sits on it while there is something new. */
function NotificationsLink() {
  const { profile } = useAuth();
  const { pathname } = useLocation();
  const unread = useUnread(pathname);
  if (!profile) return null;
  return (
    <Link
      to="/notifications"
      className={styles.bell}
      aria-label={unread ? `Notifications, ${unread} new` : 'Notifications'}
      aria-current={pathname === '/notifications' ? 'page' : undefined}
    >
      <Icon icon={Bell} size={18} />
      {unread > 0 && (
        <span className={styles.count} aria-hidden="true">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </Link>
  );
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
              Cases
            </NavLink>
            <NavLink to="/leaderboard" className={navCls}>
              Ranks
            </NavLink>
            <NavLink to="/players" className={navCls}>
              Squad
            </NavLink>
          </nav>
        )}
        <div className={styles.spacer} />
        <div className={styles.end}>
          <span className={landing ? styles.acct : `${styles.acct} ${styles.appOnly}`}>
            <AccountLink />
          </span>
          <NotificationsLink />
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
