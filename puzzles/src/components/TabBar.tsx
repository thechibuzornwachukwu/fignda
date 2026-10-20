import { NavLink, useLocation } from 'react-router-dom';
import { useMemo, useRef, type ReactNode } from 'react';
import { House, Trophy, Users } from 'lucide-react';
import { guestAvatar } from '../avatar/guest';
import { useAuth } from '../lib/auth';
import { hasTabBar } from '../lib/routes';
import { useTucked } from '../lib/useTucked';
import { useUnread } from '../lib/useUnread';
import { Avatar } from './Avatar';
import { Icon } from './Icon';
import styles from './TabBar.module.css';

/**
 * Phones only: a slim dock of icons, as Duolingo has. Each tab says what it is by its icon alone, and carries its
 * name for screen readers. Home, Your People, Your League, You. No Play tab: Home leads with the next puzzle, so a
 * Play tab would be a second door to the same place. Desktop keeps the header links.
 * It slides below the screen on a scroll down and back on any scroll up, as the header does.
 */
export function TabBar() {
  const { pathname } = useLocation();
  const { profile } = useAuth();
  const ref = useRef<HTMLElement>(null);
  const tucked = useTucked(ref, pathname, true);
  // Something new for you: a dot on Your People, where it is told. Read there, so it never shows there.
  const unread = useUnread(pathname);
  const news = unread > 0 && pathname !== '/players';
  // You: the player's own character, or a guest's.
  const starter = useMemo(() => guestAvatar(), []);
  if (!hasTabBar(pathname)) return null;
  const onYou = pathname === '/me' || pathname.startsWith('/u/') || pathname === '/settings' || pathname === '/signin';
  return (
    <nav ref={ref} className={[styles.bar, tucked && styles.tucked].filter(Boolean).join(' ')} aria-label="Tabs" data-tucked={tucked || undefined}>
      <Tab to="/play" icon={<Icon icon={House} size={20} />} label="Home" hue="home" />
      <Tab to="/players" icon={<Icon icon={Users} size={20} />} hue="people" label={news ? `Your People, ${unread} new` : 'Your People'} dot={news} />
      <Tab to="/leaderboard" icon={<Icon icon={Trophy} size={20} />} label="Your League" hue="league" />
      <Tab to="/me" icon={profile ? <Avatar handle={profile.handle} size={28} /> : <Avatar parts={starter} size={28} />} label="You" hue="you" active={onYou} />
    </nav>
  );
}

/** Each tab is drawn in its own colour, as Duolingo's are, so it is found by colour before it is read. */
function Tab({ to, icon, label, hue, active, dot }: { to: string; icon: ReactNode; label: string; hue: 'home' | 'people' | 'league' | 'you'; active?: boolean; dot?: boolean }) {
  return (
    <NavLink
      to={to}
      end={to === '/play'}
      className={({ isActive }) => [styles.tab, (active ?? isActive) && styles.on].filter(Boolean).join(' ')}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      data-hue={hue}
    >
      <span className={styles.pill}>
        {icon}
        {dot && <span className={styles.dot} aria-hidden="true" />}
      </span>
    </NavLink>
  );
}
