import { Link, NavLink, useLocation } from 'react-router-dom';
import { Check, Gamepad2, Play, Trophy, UserRound, Users, type LucideIcon } from 'lucide-react';
import { dayNo } from '../engine/daily';
import { loadDaily } from '../games/daily';
import { isFinished } from '../games/session';
import { useAuth } from '../lib/auth';
import { hasTabBar } from '../lib/routes';
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
      <Tab to="/play" icon={Gamepad2} label="Games" />
      <Tab to="/leaderboard" icon={Trophy} label="Leaders" />
      <Link to={`/d/${n}`} className={styles.play} data-done={done || undefined} aria-label={done ? "Today's daily, done" : "Play today's daily"}>
        <span className={styles.disc}>
          <Icon icon={done ? Check : Play} size="em" />
        </span>
        <span className={styles.label}>Daily</span>
      </Link>
      <Tab to="/players" icon={Users} label="Players" />
      <Tab to={you} icon={UserRound} label={profile ? 'You' : 'Sign in'} active={onYou} />
    </nav>
  );
}

function Tab({ to, icon, label, active }: { to: string; icon: LucideIcon; label: string; active?: boolean }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => [styles.tab, (active ?? isActive) && styles.on].filter(Boolean).join(' ')}
      aria-current={active ? 'page' : undefined}
    >
      <span className={styles.pill}>
        <Icon icon={icon} size={20} />
      </span>
      <span className={styles.label}>{label}</span>
    </NavLink>
  );
}
