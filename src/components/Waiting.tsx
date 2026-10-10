import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { guestAvatar } from '../avatar/guest';
import { pick } from '../copy';
import { useAuth } from '../lib/auth';
import { Avatar } from './Avatar';
import { Partner } from './Partner';
import { TextLink } from './TextLink';
import { WAIT_LINE_MS } from './useDelayedWaiting';
import styles from './Waiting.module.css';

type Props = {
  /** `full` fills the page area, avatar at 88. `inline` sits inside a page, avatar at 40 with the dots beside it. */
  size?: 'full' | 'inline';
  /** Which lines to show. `waitingMake` while a puzzle is being written. */
  pool?: 'waiting' | 'waitingMake';
  /** Shows the Cancel link. */
  onCancel?: () => void;
  /** Full only: lie over the page under the header, for a wait started from inside a page. Holds the keyboard. */
  cover?: boolean;
  /** Move focus here on open and back to where it was on close. */
  takeFocus?: boolean;
};

const SIZE = { full: 88, inline: 40 } as const;

/**
 * The one waiting screen: the player's avatar, 3 dots, one line and (when it can be stopped) Cancel.
 * Mount it through `useDelayedWaiting`, so a wait under 1 second never shows it.
 */
export function Waiting({ size = 'full', pool = 'waiting', onCancel, cover = false, takeFocus = false }: Props) {
  const { profile } = useAuth();
  const ref = useRef<HTMLDivElement>(null);
  const [line, setLine] = useState(() => pick(pool));
  // Guests, and signed in players whose profile has not arrived: their own design, else a starter. Same size, so the swap does not jump.
  const starter = useMemo(() => guestAvatar(), []);

  useEffect(() => {
    const t = setInterval(() => setLine(pick(pool)), WAIT_LINE_MS);
    return () => clearInterval(t);
  }, [pool]);

  useEffect(() => {
    if (!takeFocus) return;
    const before = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    ref.current?.focus();
    return () => {
      if (before?.isConnected) before.focus();
    };
  }, [takeFocus]);

  const covering = cover && size === 'full';

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!covering) return;
    if (e.key === 'Escape' && onCancel) {
      e.preventDefault();
      onCancel();
    }
    // The page underneath is hidden, so Tab stays here: Cancel, or the screen itself.
    if (e.key === 'Tab') {
      e.preventDefault();
      (ref.current?.querySelector('button') ?? ref.current)?.focus();
    }
  };

  return (
    <div ref={ref} className={[styles.waiting, styles[size], covering && styles.cover].filter(Boolean).join(' ')} data-waiting={size} tabIndex={-1} onKeyDown={onKeyDown}>
      <span className={styles.pair}>
        <span className={styles.bob}>{profile ? <Avatar handle={profile.handle} size={SIZE[size]} /> : <Avatar parts={starter} size={SIZE[size]} />}</span>
        {/* The partner thinks it over beside the player. Not on the small one: there is no room. */}
        {size === 'full' && <Partner moment="loading" size={SIZE.full} />}
      </span>
      <span className={styles.dots} aria-hidden="true">
        <span className={styles.dot} />
        <span className={styles.dot} />
        <span className={styles.dot} />
      </span>
      <p className={styles.line} role="status">
        {line}
      </p>
      {onCancel && (
        <TextLink onClick={onCancel} className={styles.cancel}>
          Cancel
        </TextLink>
      )}
    </div>
  );
}
