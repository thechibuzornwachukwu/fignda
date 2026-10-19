import { Link, NavLink } from 'react-router-dom';
import { playNext } from '../lib/playNext';
import { Button } from './Button';
import { ThemeToggle } from './ThemeToggle';
import styles from './Header.module.css';

/** The name of the game until the owner names it. A working name, set as words: there is no logo yet. */
export const GAME_NAME = 'Lantern Row';

/**
 * Wide screens: the name, the places the dock holds on a phone, the theme and Play. A phone has no bar across the
 * top: each screen is its title, and the dock is the way around.
 */
export function Header() {
  const play = playNext();
  const link = ({ isActive }: { isActive: boolean }) => [styles.link, isActive && styles.on].filter(Boolean).join(' ');
  return (
    <header className={styles.bar} data-header>
      <Link to="/" className={styles.name}>
        {GAME_NAME}
      </Link>
      <nav className={styles.nav} aria-label="Main">
        <NavLink to="/cases" className={link}>
          Cases
        </NavLink>
        <NavLink to="/notebook" className={link}>
          Notebook
        </NavLink>
        <NavLink to="/ranks" className={link}>
          Ranks
        </NavLink>
        <NavLink to="/settings" className={link}>
          Settings
        </NavLink>
      </nav>
      <div className={styles.side}>
        <ThemeToggle />
        <Button variant="primary" size="sm" to={play.to} aria-label={play.name}>
          Play
        </Button>
      </div>
    </header>
  );
}
