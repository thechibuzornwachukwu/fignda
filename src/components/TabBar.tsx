import { Link, NavLink, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { Check, FolderSearch, Search, Trophy, UserRound, Users } from 'lucide-react';
import { dayNo } from '../engine/daily';
import { loadDaily } from '../games/daily';
import { isFinished } from '../games/session';
import { useAuth } from '../lib/auth';
import { hasTabBar } from '../lib/routes';
import { Avatar } from './Avatar';
import { Icon } from './Icon';
import styles from './TabBar.module.css';

/**
 * Phones only: a floating dock within thumb reach. Four places, icon over label, and today's daily raised in
 * the middle, since playing it is the one thing the app is for. Desktop keeps the header links.
 * Visible navigation, not a hamburger (NN/g: hidden navigation is found about half as often).
 */
export function TabBar() {
  const { pathname } = useLocation();
  const { profile } = useAuth();
  if (!hasTabBar(pathname)) return null;
  const you = profile ? `/u/${profile.handle}` : `/signin?next=${encodeURIComponent(pathname)}`;
  const onYou = pathname.startsWith('/u/') || pathname === '/settings' || pathname === '/signin';
  const n = dayNo();
  const saved = loadDaily(n);
  const done = !!saved && isFinished(saved);
  return (
    <nav className={styles.bar} aria-label="Tabs">
      <Tab to="/play" icon={<Icon icon={FolderSearch} size={20} />} label="Cases" />
      <Tab to="/leaderboard" icon={<Icon icon={Trophy} size={20} />} label="Ranks" />
      <Link to={`/d/${n}`} className={styles.play} data-done={done || undefined} aria-label={done ? "Today's daily, done" : "Play today's daily"}>
        <span className={styles.disc}>
          <Icon icon={done ? Check : Search} size="em" />
        </span>
        <span className={styles.label}>Today</span>
      </Link>
      <Tab to="/players" icon={<Icon icon={Users} size={20} />} label="Squad" />
      {/* Signed in, the tab is the player's own character. */}
      <Tab to={you} icon={profile ? <Avatar handle={profile.handle} size={24} /> : <Icon icon={UserRound} size={20} />} label={profile ? 'You' : 'Sign in'} active={onYou} />
    </nav>
  );
}

function Tab({ to, icon, label, active }: { to: string; icon: ReactNode; label: string; active?: boolean }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => [styles.tab, (active ?? isActive) && styles.on].filter(Boolean).join(' ')}
      aria-current={active ? 'page' : undefined}
    >
      <span className={styles.pill}>
        {icon}
      </span>
      <span className={styles.label}>{label}</span>
    </NavLink>
  );
}
