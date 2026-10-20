import { NavLink, useLocation } from 'react-router-dom';
import { useMemo, useRef, type ReactNode } from 'react';
import { Check, House, Play, Trophy, Users } from 'lucide-react';
import { guestAvatar } from '../avatar/guest';
import { useAuth } from '../lib/auth';
import { playNext } from '../lib/playNext';
import { hasTabBar } from '../lib/routes';
import { useTucked } from '../lib/useTucked';
import { useUnread } from '../lib/useUnread';
import { Avatar } from './Avatar';
import { Icon } from './Icon';
import styles from './TabBar.module.css';

/**
 * Phones only: a slim dock of icons, as Duolingo has. Each tab says what it is by its icon alone, and carries its
 * name for screen readers. Home, Your People, Your League, Play, You. Play is one tab among the 5: it leads to the next
 * puzzle, and nothing on the bar is raised above the rest. Desktop keeps the header links.
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
  const play = playNext();
  return (
    <nav ref={ref} className={[styles.bar, tucked && styles.tucked].filter(Boolean).join(' ')} aria-label="Tabs" data-tucked={tucked || undefined}>
      <Tab to="/play" icon={<Icon icon={House} size={20} />} label="Home" />
      <Tab to="/players" icon={<Icon icon={Users} size={20} />} label={news ? `Your People, ${unread} new` : 'Your People'} dot={news} />
      <Tab to="/leaderboard" icon={<Icon icon={Trophy} size={20} />} label="Your League" />
      {/* Every pack finished: a tick, back to the packs. */}
      <Tab to={play.to} icon={<Icon icon={play.kind === 'done' ? Check : Play} size={20} />} label={play.name} data={{ 'data-play': play.kind, ...(play.kind === 'done' ? { 'data-done': 'true' } : {}) }} />
      <Tab to="/me" icon={profile ? <Avatar handle={profile.handle} size={24} /> : <Avatar parts={starter} size={24} />} label="You" active={onYou} />
    </nav>
  );
}

function Tab({ to, icon, label, active, dot, data }: { to: string; icon: ReactNode; label: string; active?: boolean; dot?: boolean; data?: Record<string, string> }) {
  return (
    <NavLink
      to={to}
      end={to === '/play'}
      className={({ isActive }) => [styles.tab, (active ?? isActive) && styles.on].filter(Boolean).join(' ')}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      {...data}
    >
      <span className={styles.pill}>
        {icon}
        {dot && <span className={styles.dot} aria-hidden="true" />}
      </span>
    </NavLink>
  );
}
