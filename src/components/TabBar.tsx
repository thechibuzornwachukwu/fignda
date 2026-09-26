import { NavLink, useLocation } from 'react-router-dom';
import { Gamepad2, Trophy, UserRound, Users, type LucideIcon } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { hasTabBar } from '../lib/routes';
import { Icon } from './Icon';
import styles from './TabBar.module.css';

/**
 * Phones only: the app's four places within thumb reach, icon over label. Desktop keeps the header links.
 * Visible navigation, not a hamburger (NN/g: hidden navigation is found about half as often).
 */
export function TabBar() {
  const { pathname } = useLocation();
  const { profile } = useAuth();
  if (!hasTabBar(pathname)) return null;
  const you = profile ? `/u/${profile.handle}` : `/signin?next=${encodeURIComponent(pathname)}`;
  const onYou = pathname.startsWith('/u/') || pathname === '/settings' || pathname === '/signin';
  return (
    <nav className={styles.bar} aria-label="Tabs">
      <Tab to="/play" icon={Gamepad2} label="Games" />
      <Tab to="/leaderboard" icon={Trophy} label="Leaders" />
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
      <Icon icon={icon} size={20} />
      <span className={styles.label}>{label}</span>
    </NavLink>
  );
}
