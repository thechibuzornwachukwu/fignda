import { useLocation } from 'react-router-dom';
import { GUEST_GAMES } from '../lib/guestLimit';
import { Button } from './Button';
import { Partner } from './Partner';
import { TextLink } from './TextLink';
import styles from './GuestWall.module.css';

/** A guest who has played their games: one screen, one way on. Nothing they earned is lost. */
export function GuestWall() {
  const { pathname } = useLocation();
  return (
    <div className={styles.wall} data-guest-wall>
      <Partner moment="hello" size={120} />
      <h1 className={styles.title}>Sign in to keep playing</h1>
      <p className={styles.lead}>
        You have played {GUEST_GAMES} games as a guest. Sign in and the case carries on, with your stars, your detective and your pet. We send a code to your email. No password.
      </p>
      <Button variant="accent" to={`/welcome?from=${encodeURIComponent(pathname)}`}>
        Sign in
      </Button>
      <TextLink to="/play">Back to cases</TextLink>
    </div>
  );
}