import { useEffect, useState } from 'react';
import { fetchUnread } from './api';
import { useAuth } from './auth';

const READ = 'fignda:notifications-read';

/** Tell the header the list has been read, so the count clears without a reload. */
export const announceRead = () => window.dispatchEvent(new Event(READ));

/** How often to look again while the tab is open. */
const EVERY_MS = 60_000;

/**
 * Unread notifications for the signed in player. Checked on arrival, on each new page, once a minute while
 * the tab is visible, and when the player comes back to the tab.
 */
export function useUnread(pathname: string): number {
  const auth = useAuth();
  const me = auth.profile?.id;
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!me) return;
    let alive = true;
    const check = () => {
      if (document.visibilityState === 'hidden') return;
      fetchUnread()
        .then((n) => alive && setCount(n))
        .catch(() => {});
    };
    const clear = () => setCount(0);
    check();
    const id = window.setInterval(check, EVERY_MS);
    document.addEventListener('visibilitychange', check);
    window.addEventListener(READ, clear);
    return () => {
      alive = false;
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', check);
      window.removeEventListener(READ, clear);
    };
  }, [me, pathname]);

  return me ? count : 0;
}
