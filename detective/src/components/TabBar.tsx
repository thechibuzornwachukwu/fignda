import { Link, NavLink, useLocation } from 'react-router-dom';
import { useRef, type ReactNode } from 'react';
import { Check, FolderSearch, Notebook, Play, Settings, Trophy } from 'lucide-react';
import { playNext } from '../lib/playNext';
import { hasTabBar } from '../lib/routes';
import { useTucked } from '../lib/useTucked';
import { Icon } from './Icon';
import styles from './TabBar.module.css';

/**
 * Phones only: a floating dock within thumb reach. Desktop has the same places in the header.
 * - Play, raised in the middle: the step of the case that is open, one tap from anywhere.
 * - Cases first, where the game lives. Your Notebook beside it. Ranks and Settings on the far side.
 * It slides below the screen on a scroll down and back on any scroll up.
 */
export function TabBar() {
  const { pathname } = useLocation();
  const ref = useRef<HTMLElement>(null);
  const tucked = useTucked(ref, pathname, true);
  if (!hasTabBar(pathname)) return null;
  const play = playNext();
  return (
    <nav ref={ref} className={[styles.bar, tucked && styles.tucked].filter(Boolean).join(' ')} aria-label="Tabs" data-tucked={tucked || undefined}>
      <Tab to="/cases" icon={<Icon icon={FolderSearch} size={20} />} label="Cases" />
      <Tab to="/notebook" icon={<Icon icon={Notebook} size={20} />} label="Notebook" />
      <Link to={play.to} className={styles.play} data-done={play.kind === 'done' || undefined} data-play={play.kind} aria-label={play.name}>
        <span className={styles.disc}>
          <Icon icon={play.kind === 'done' ? Check : Play} size="em" />
        </span>
        <span className={styles.label}>Play</span>
      </Link>
      <Tab to="/ranks" icon={<Icon icon={Trophy} size={20} />} label="Ranks" />
      <Tab to="/settings" icon={<Icon icon={Settings} size={20} />} label="Settings" />
    </nav>
  );
}

function Tab({ to, icon, label }: { to: string; icon: ReactNode; label: string }) {
  return (
    <NavLink to={to} className={({ isActive }) => [styles.tab, isActive && styles.on].filter(Boolean).join(' ')}>
      <span className={styles.pill}>{icon}</span>
      <span className={styles.label}>{label}</span>
    </NavLink>
  );
}
