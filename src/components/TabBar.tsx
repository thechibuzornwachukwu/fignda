import { Link, NavLink, useLocation } from 'react-router-dom';
import { useMemo, useRef, type ReactNode } from 'react';
import { Check, FolderSearch, Play, Trophy, Users } from 'lucide-react';
import { guestAvatar } from '../avatar/guest';
import { useAuth } from '../lib/auth';
import { playNext } from '../lib/playNext';
import { hasTabBar } from '../lib/routes';
import { useTucked } from '../lib/useTucked';
import { Avatar } from './Avatar';
import { Icon } from './Icon';
import styles from './TabBar.module.css';

/**
 * Phones only: a floating dock within thumb reach. Visible navigation, not a hamburger (NN/g: hidden
 * navigation is found about half as often). Desktop keeps the header links.
 *
 * The order follows what a player reaches for, nearest the thumb first:
 * - Play, raised in the middle: one tap from anywhere to the next thing to play. Today's daily while it is
 *   unplayed, then the next clue on the path, so the best spot on the screen never goes dead for the day.
 * - Cases, first: where the game lives. People look for home in the first slot.
 * - You, beside Play: the stage with the player's detective and partner. Making a character one's own is what
 *   brings players back to a game like this, so it sits next to the button they press most.
 * - Squad, then Ranks, on the far side: other people. Fewest visits, so furthest from the thumb.
 *
 * It slides below the screen on a scroll down and back on any scroll up, as the header does.
 */
export function TabBar() {
  const { pathname } = useLocation();
  const { profile } = useAuth();
  // Out of the way while reading down, back on the first scroll up and at the end of the page.
  const ref = useRef<HTMLElement>(null);
  const tucked = useTucked(ref, pathname, true);
  // You: the stage. Guests have one too, with their own character on the tab.
  const starter = useMemo(() => guestAvatar(), []);
  if (!hasTabBar(pathname)) return null;
  const onYou = pathname === '/me' || pathname.startsWith('/u/') || pathname === '/settings' || pathname === '/signin';
  // Today's daily, then the next clue. Nothing left at all: a tick, and the way back to the cases.
  const play = playNext();
  return (
    <nav ref={ref} className={[styles.bar, tucked && styles.tucked].filter(Boolean).join(' ')} aria-label="Tabs" data-tucked={tucked || undefined}>
      <Tab to="/play" icon={<Icon icon={FolderSearch} size={20} />} label="Cases" />
      {/* The tab is the player's own character: their design, or a guest's. */}
      <Tab to="/me" icon={profile ? <Avatar handle={profile.handle} size={24} /> : <Avatar parts={starter} size={24} />} label="You" active={onYou} />
      <Link to={play.to} className={styles.play} data-done={play.kind === 'done' || undefined} data-play={play.kind} aria-label={play.name}>
        <span className={styles.disc}>
          <Icon icon={play.kind === 'done' ? Check : Play} size="em" />
        </span>
        <span className={styles.label}>Play</span>
      </Link>
      <Tab to="/players" icon={<Icon icon={Users} size={20} />} label="Squad" />
      <Tab to="/leaderboard" icon={<Icon icon={Trophy} size={20} />} label="Ranks" />
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
